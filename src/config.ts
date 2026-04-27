import { join, resolve } from "path";
import { mkdir } from "fs/promises";
import { homedir } from "os";

export interface ShortcutConfig {
  nextPage: string;
  prevPage: string;
  goHome: string;
  scrollDown: string;
  scrollUp: string;
  scrollToTop: string;
  scrollToBottom: string;
  toggleSidebar: string;
  focusMode: string;
  nextTheme: string;
  prevTheme: string;
  fontIncrease: string;
  fontDecrease: string;
  search: string;
  showShortcuts: string;
  closeOverlay: string;
}

export interface SavedEntry {
  name: string;
  path: string;
}

export interface ReadrunConfig {
  shortcuts: ShortcutConfig;
  saved: SavedEntry[];
  recent: string[];
}

export const defaultShortcuts: ShortcutConfig = {
  nextPage: "j",
  prevPage: "k",
  goHome: "g h",
  scrollDown: "Space",
  scrollUp: "Shift+Space",
  scrollToTop: "g g",
  scrollToBottom: "G",
  toggleSidebar: "s",
  focusMode: "f",
  nextTheme: "t",
  prevTheme: "T",
  fontIncrease: "+",
  fontDecrease: "-",
  search: "/",
  showShortcuts: "?",
  closeOverlay: "Escape",
};

export const defaultConfig: ReadrunConfig = {
  shortcuts: { ...defaultShortcuts },
  saved: [],
  recent: [],
};

function escapeTomlString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function shortcutsToToml(shortcuts: ShortcutConfig): string {
  const lines = ["[shortcuts]"];
  const maxKey = Math.max(...Object.keys(shortcuts).map(k => k.length));
  for (const [key, value] of Object.entries(shortcuts)) {
    lines.push(`${key.padEnd(maxKey)} = "${value}"`);
  }
  return lines.join("\n") + "\n";
}

function savedToToml(entries: SavedEntry[]): string {
  if (entries.length === 0) return "";
  return entries
    .map(e => `[[saved]]\nname = "${escapeTomlString(e.name)}"\npath = "${escapeTomlString(e.path)}"`)
    .join("\n\n") + "\n";
}

function recentToToml(recent: string[]): string {
  if (recent.length === 0) return "";
  return recent.map(p => `[[recent]]\npath = "${escapeTomlString(p)}"`).join("\n\n") + "\n";
}

function configToToml(config: ReadrunConfig): string {
  let toml = shortcutsToToml(config.shortcuts);
  if (config.saved.length > 0) {
    toml += "\n" + savedToToml(config.saved);
  }
  if (config.recent.length > 0) {
    toml += "\n" + recentToToml(config.recent);
  }
  return toml;
}

function getConfigPath(): string {
  return join(homedir(), ".config", "readrun", "settings.toml");
}

export async function saveConfig(config: ReadrunConfig): Promise<void> {
  const configPath = getConfigPath();
  const configDir = join(homedir(), ".config", "readrun");
  await mkdir(configDir, { recursive: true });
  await Bun.write(configPath, configToToml(config));
}

export async function addRecent(path: string): Promise<void> {
  const config = await loadConfig();
  const abs = resolve(path);
  config.recent = [abs, ...config.recent.filter(p => p !== abs)].slice(0, 5);
  await saveConfig(config);
}

export async function loadConfig(): Promise<ReadrunConfig> {
  const configPath = getConfigPath();
  const configDir = join(homedir(), ".config", "readrun");

  if (!(await Bun.file(configPath).exists())) {
    await mkdir(configDir, { recursive: true });
    await Bun.write(configPath, shortcutsToToml(defaultShortcuts));
    return structuredClone(defaultConfig);
  }

  try {
    const file = Bun.file(configPath);
    const text = await file.text();
    const parsed = Bun.TOML.parse(text) as Record<string, any>;

    const config = structuredClone(defaultConfig);

    if (parsed.shortcuts && typeof parsed.shortcuts === "object") {
      const shortcuts = config.shortcuts as unknown as Record<string, string>;
      for (const [key, value] of Object.entries(parsed.shortcuts)) {
        if (key in shortcuts && typeof value === "string") {
          shortcuts[key] = value;
        }
      }
    }

    if (Array.isArray(parsed.saved)) {
      config.saved = parsed.saved
        .filter((e: any) => typeof e.name === "string" && typeof e.path === "string")
        .map((e: any) => ({ name: e.name, path: e.path }));
    }

    if (Array.isArray(parsed.recent)) {
      config.recent = parsed.recent
        .filter((e: any) => typeof e.path === "string")
        .map((e: any) => e.path as string)
        .slice(0, 5);
    }

    return config;
  } catch {
    return structuredClone(defaultConfig);
  }
}
