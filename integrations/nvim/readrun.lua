-- Readrun integration: serve current markdown file/folder via `rr serve`,
-- open browser, manage server lifecycle.

local state = { job_id = nil, port = nil, path = nil, url = nil }

local function bin_cmd()
  if vim.env.READRUN_BIN and #vim.env.READRUN_BIN > 0 then
    return { vim.env.READRUN_BIN }
  end
  if vim.fn.executable("rr") == 1 then
    return { "rr" }
  end
  local fallback = "/home/eastill/projects/readrun/src/cli.ts"
  if vim.fn.executable("bun") == 1 and vim.fn.filereadable(fallback) == 1 then
    return { "bun", fallback }
  end
  return nil
end

local function notify(msg, level)
  vim.notify("[readrun] " .. msg, level or vim.log.levels.INFO)
end

local function resolve_target(arg)
  if arg and #arg > 0 then
    return vim.fn.fnamemodify(arg, ":p")
  end
  local buf_name = vim.api.nvim_buf_get_name(0)
  if buf_name ~= "" and vim.fn.filereadable(buf_name) == 1 then
    if vim.bo.filetype == "markdown" or buf_name:match("%.md$") then
      return buf_name
    end
  end
  return vim.fn.getcwd()
end

local function stop_server(silent)
  if state.job_id then
    pcall(vim.fn.jobstop, state.job_id)
    state.job_id = nil
    if not silent then notify("server stopped") end
  elseif not silent then
    notify("no server running", vim.log.levels.WARN)
  end
  state.url = nil
end

local function open_in_browser(url)
  vim.fn.jobstart({ "xdg-open", url }, { detach = true })
end

local function start_server(target)
  local cmd = bin_cmd()
  if not cmd then
    notify("readrun not found (need `rr` on PATH or bun + cli.ts)", vim.log.levels.ERROR)
    return
  end

  if state.job_id then stop_server(true) end

  local port = state.port or 7700
  local launch = vim.list_extend(vim.deepcopy(cmd), { "serve", target, "--port", tostring(port) })

  local opened = false
  state.path = target
  state.port = port
  state.url = "http://localhost:" .. port .. "/"

  local function on_output(_, data)
    if not data then return end
    for _, line in ipairs(data) do
      if line and #line > 0 then
        local url = line:match("https?://%S+")
        if url and not opened then
          opened = true
          state.url = url
          open_in_browser(url)
          notify("serving " .. target .. " at " .. url)
        end
      end
    end
  end

  state.job_id = vim.fn.jobstart(launch, {
    on_stdout = on_output,
    on_stderr = on_output,
    on_exit = function(_, code)
      state.job_id = nil
      if code ~= 0 and code ~= nil then
        notify("server exited (code " .. tostring(code) .. ")", vim.log.levels.WARN)
      end
    end,
  })

  if state.job_id <= 0 then
    notify("failed to launch readrun", vim.log.levels.ERROR)
    state.job_id = nil
    return
  end

  notify("starting on port " .. port .. " (target: " .. target .. ")")

  vim.defer_fn(function()
    if not opened and state.job_id then
      opened = true
      open_in_browser(state.url)
    end
  end, 1500)
end

local function build_target(arg)
  local cmd = bin_cmd()
  if not cmd then
    notify("readrun not found", vim.log.levels.ERROR)
    return
  end
  local target = resolve_target(arg)
  local launch = vim.list_extend(vim.deepcopy(cmd), { "build", target })
  notify("building " .. target .. "...")
  vim.fn.jobstart(launch, {
    on_exit = function(_, code)
      if code == 0 then notify("build complete")
      else notify("build failed (code " .. tostring(code) .. ")", vim.log.levels.ERROR) end
    end,
  })
end

vim.api.nvim_create_user_command("Readrun", function(opts)
  start_server(resolve_target(opts.args))
end, { nargs = "?", complete = "file", desc = "Serve markdown via readrun" })

vim.api.nvim_create_user_command("ReadrunStop", function()
  stop_server(false)
end, { desc = "Stop readrun server" })

vim.api.nvim_create_user_command("ReadrunOpen", function()
  if state.url then open_in_browser(state.url)
  else notify("no server running", vim.log.levels.WARN) end
end, { desc = "Open readrun URL in browser" })

vim.api.nvim_create_user_command("ReadrunBuild", function(opts)
  build_target(opts.args)
end, { nargs = "?", complete = "file", desc = "Build static site via readrun" })

vim.api.nvim_create_autocmd("VimLeavePre", {
  callback = function() stop_server(true) end,
})

vim.api.nvim_create_autocmd("FileType", {
  pattern = "markdown",
  callback = function(args)
    local buf = args.buf
    local map = function(lhs, rhs, desc)
      vim.keymap.set("n", lhs, rhs, { buffer = buf, desc = desc, silent = true })
    end
    map("<leader>mp", "<cmd>Readrun<cr>",      "Readrun: preview")
    map("<leader>mq", "<cmd>ReadrunStop<cr>",  "Readrun: stop")
    map("<leader>mo", "<cmd>ReadrunOpen<cr>",  "Readrun: open browser")
    map("<leader>mb", "<cmd>ReadrunBuild<cr>", "Readrun: build")
  end,
})
