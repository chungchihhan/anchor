import { AppSettings, DEFAULT_SETTINGS } from "@/types";

const SETTINGS_KEY = "anchor_settings";

export class StorageService {
  static getSettings(): AppSettings {
    if (typeof window === "undefined") {
      return DEFAULT_SETTINGS;
    }

    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) {
        return DEFAULT_SETTINGS;
      }

      const parsed = JSON.parse(stored);

      // Validate and clean shortcuts object
      if (
        !parsed.shortcuts ||
        typeof parsed.shortcuts !== "object" ||
        Array.isArray(parsed.shortcuts)
      ) {
        parsed.shortcuts = DEFAULT_SETTINGS.shortcuts;
      } else {
        // Clean up invalid shortcuts
        const validShortcuts: any = {};
        for (const [key, value] of Object.entries(parsed.shortcuts)) {
          if (typeof value === "string") {
            validShortcuts[key] = value;
          }
        }
        parsed.shortcuts = validShortcuts;
      }

      // Migration: Fix legacy shortcuts (Control/Meta -> Cmd)
      const migratedShortcuts: any = {};
      for (const [key, shortcut] of Object.entries(parsed.shortcuts)) {
        if (typeof shortcut !== "string") continue;

        let updatedShortcut = shortcut;
        // Convert Control to Cmd
        updatedShortcut = updatedShortcut.replace(/Control\+/g, "Cmd+");
        // Convert Meta to Cmd
        updatedShortcut = updatedShortcut.replace(/Meta\+/g, "Cmd+");
        // Convert Option to Cmd if it was used as a modifier
        if (
          updatedShortcut.includes("Option+") &&
          !updatedShortcut.includes("Cmd+")
        ) {
          updatedShortcut = updatedShortcut.replace(/Option\+/g, "Cmd+");
        }
        migratedShortcuts[key] = updatedShortcut;
      }
      parsed.shortcuts = migratedShortcuts;

      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      console.error("Failed to parse settings", e);
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings to localStorage:", error);
    }
  }

  static clearSettings(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch (error) {
      console.error("Failed to clear settings from localStorage:", error);
    }
  }
}
