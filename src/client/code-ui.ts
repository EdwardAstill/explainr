export const codeUiCode = `
    // --- File upload handler ---
    document.addEventListener("change", async (e) => {
      const input = e.target.closest(".upload-input");
      if (!input) return;

      const uploadId = input.dataset.uploadId;
      const statusEl = document.querySelector(\`[data-upload-status="\${uploadId}"]\`);
      const fileListEl = document.querySelector(\`[data-upload-files="\${uploadId}"]\`);
      const renameTo = input.dataset.rename || "";
      const files = Array.from(input.files);

      if (files.length === 0) return;

      statusEl.textContent = "Loading Python...";
      statusEl.classList.remove("upload-error");

      try {
        const py = await loadPyodideRuntime();
        statusEl.textContent = "Writing files...";

        const loaded = [];
        for (const file of files) {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const targetName = (renameTo && files.length === 1) ? renameTo : file.name;
          py.FS.writeFile(targetName, bytes);
          loaded.push(targetName);
        }

        statusEl.textContent = loaded.length === 1
          ? "Loaded: " + loaded[0]
          : loaded.length + " files loaded";

        fileListEl.innerHTML = loaded.map(name =>
          \`<span class="upload-file-tag">\${escapeHtml(name)}</span>\`
        ).join("");
      } catch (err) {
        statusEl.textContent = "Error: " + err.message;
        statusEl.classList.add("upload-error");
      }
    });

    // --- Code enlarge modal ---
    const codeModal = document.getElementById("code-modal");
    const codeModalLang = document.getElementById("code-modal-lang");
    const codeModalCode = document.getElementById("code-modal-code");
    const codeModalOutput = document.getElementById("code-modal-output");
    const codeModalRun = document.getElementById("code-modal-run");
    const codeModalClose = document.getElementById("code-modal-close");
    let codeModalBlockId = null;

    function openCodeModal(blockId) {
      const block = document.querySelector(\`.exec-block[data-block-id="\${blockId}"]\`);
      if (!block) return;
      codeModalBlockId = blockId;
      codeModalLang.textContent = block.dataset.lang || "";
      codeModalCode.querySelector("code").innerHTML = block.querySelector("pre code").innerHTML;
      // Mirror existing output
      const outputEl = document.querySelector(\`[data-output="\${blockId}"]\`);
      codeModalOutput.innerHTML = outputEl ? outputEl.innerHTML : "";
      codeModal.classList.add("open");
    }

    function closeCodeModal() {
      codeModal.classList.remove("open");
      codeModalBlockId = null;
    }

    // Sync output from inline block to modal while open
    const outputObserver = new MutationObserver(() => {
      if (codeModalBlockId === null) return;
      const outputEl = document.querySelector(\`[data-output="\${codeModalBlockId}"]\`);
      if (outputEl) codeModalOutput.innerHTML = outputEl.innerHTML;
    });
    document.querySelectorAll(".exec-output[data-output]").forEach(el => {
      outputObserver.observe(el, { childList: true, subtree: true, characterData: true });
    });

    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".exec-enlarge-btn");
      if (!btn) return;
      openCodeModal(btn.dataset.blockId);
    });

    codeModalClose.addEventListener("click", closeCodeModal);
    codeModal.addEventListener("click", (e) => {
      if (e.target === codeModal) closeCodeModal();
    });

    codeModalRun.addEventListener("click", () => {
      if (codeModalBlockId === null) return;
      const origBtn = document.querySelector(\`.exec-block[data-block-id="\${codeModalBlockId}"] .exec-run-btn\`);
      if (origBtn) origBtn.click();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && codeModal.classList.contains("open")) {
        closeCodeModal();
      }
    });

    // --- Image lightbox ---
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");

    document.addEventListener("click", (e) => {
      const img = e.target.closest(".markdown-body img, .readrun-img, .exec-output img");
      if (img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || "";
        lightbox.classList.add("open");
      }
    });

    lightbox.addEventListener("click", () => {
      lightbox.classList.remove("open");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.classList.contains("open")) {
        lightbox.classList.remove("open");
      }
    });
`;
