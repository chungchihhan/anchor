import { useState, useEffect, useRef, useCallback } from "react";
import { StorageService } from "@/services/StorageService";
import { AppSettings, DEFAULT_SETTINGS } from "@/types";
import { X, Settings2 } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [focusedField, setFocusedField] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);
  const endpointRef = useRef<HTMLInputElement>(null);
  const apiKeyRef = useRef<HTMLInputElement>(null);
  const compactModeRef = useRef<HTMLButtonElement>(null);
  const columnsModeRef = useRef<HTMLButtonElement>(null);
  const chatWidthRef = useRef<HTMLInputElement>(null);
  const fontSizeRef = useRef<HTMLInputElement>(null);
  const inputRefs = [endpointRef, apiKeyRef, compactModeRef, columnsModeRef, chatWidthRef, fontSizeRef];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && isMounted) {
      try {
        const loadedSettings = StorageService.getSettings();
        setSettings(loadedSettings);

        // Set focus to the currently selected display mode
        const initialFocusIndex =
          (loadedSettings.displayMode || "compact") === "compact" ? 2 : 3;
        setFocusedField(initialFocusIndex);

        // Focus the selected mode button after a short delay
        setTimeout(() => {
          inputRefs[initialFocusIndex].current?.focus();
        }, 100);
      } catch (error) {
        console.error("Failed to load settings:", error);
        setSettings(DEFAULT_SETTINGS);
        setFocusedField(0);
      }
    }
  }, [isOpen, isMounted]);

  const handleSave = useCallback(() => {
    if (!isMounted) return;
    try {
      StorageService.saveSettings(settings);
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings, onClose, isMounted]);

  const handleSliderChange = useCallback(
    (field: "chatWidth" | "fontSize", value: number) => {
      const newSettings = { ...settings, [field]: value };
      setSettings(newSettings);
      // Save immediately for instant preview
      if (isMounted) {
        try {
          StorageService.saveSettings(newSettings);
          // Dispatch event to notify other components
          window.dispatchEvent(new Event("settingsChanged"));
        } catch (error) {
          console.error("Failed to save settings:", error);
        }
      }
    },
    [settings, isMounted]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle left/right arrows for sliders
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // Check if focused on slider (indices 4 and 5)
        if (focusedField === 4) {
          // Chat width slider
          e.preventDefault();
          e.stopPropagation();
          const delta = e.key === "ArrowRight" ? 1 : -1;
          const newValue = Math.max(30, Math.min(100, settings.chatWidth + delta));
          handleSliderChange("chatWidth", newValue);
        } else if (focusedField === 5) {
          // Font size slider
          e.preventDefault();
          e.stopPropagation();
          const delta = e.key === "ArrowRight" ? 1 : -1;
          const newValue = Math.max(12, Math.min(24, settings.fontSize + delta));
          handleSliderChange("fontSize", newValue);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setFocusedField((prev) => {
          const next = (prev + 1) % inputRefs.length;
          setTimeout(() => {
            inputRefs[next].current?.focus();
          }, 0);
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setFocusedField((prev) => {
          const next = (prev - 1 + inputRefs.length) % inputRefs.length;
          setTimeout(() => {
            inputRefs[next].current?.focus();
          }, 0);
          return next;
        });
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, handleSave, focusedField, settings.chatWidth, settings.fontSize, handleSliderChange]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
      onClick={onClose}
    >
      <div
        className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-150 overflow-hidden ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Settings2 size={18} className="text-cyan-400" />
            <span className="font-medium">Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded font-mono">
              ↑↓ Navigate • ←→ Adjust sliders • Esc to save & close
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/40">
          <div className="space-y-8">
            {/* Appearance Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Display Mode
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  ref={compactModeRef}
                  onClick={() =>
                    setSettings({ ...settings, displayMode: "compact" })
                  }
                  onFocus={() => setFocusedField(2)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    (settings.displayMode || "compact") === "compact"
                      ? "bg-cyan-500/20 border-cyan-400/50 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                  } ${focusedField === 2 ? "ring-2 ring-cyan-400/30" : ""}`}
                >
                  <div className="font-medium mb-1">Compact Mode</div>
                  <div className="text-xs opacity-60">
                    Left-aligned with avatars
                  </div>
                </button>
                <button
                  ref={columnsModeRef}
                  onClick={() =>
                    setSettings({ ...settings, displayMode: "columns" })
                  }
                  onFocus={() => setFocusedField(3)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    settings.displayMode === "columns"
                      ? "bg-cyan-500/20 border-cyan-400/50 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                  } ${focusedField === 3 ? "ring-2 ring-cyan-400/30" : ""}`}
                >
                  <div className="font-medium mb-1">Two-Column Mode</div>
                  <div className="text-xs opacity-60">
                    Prompts left, responses right
                  </div>
                </button>
              </div>
            </div>
            {/* Chat Appearance */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Chat Appearance
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-white/70">
                      Chat Width
                    </label>
                    <span className="text-xs text-white/50 font-mono">
                      {settings.chatWidth}%
                    </span>
                  </div>
                  <input
                    ref={chatWidthRef}
                    type="range"
                    min="30"
                    max="100"
                    value={settings.chatWidth}
                    onChange={(e) =>
                      handleSliderChange("chatWidth", parseInt(e.target.value))
                    }
                    onFocus={() => setFocusedField(4)}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                    style={{
                      background: `linear-gradient(to right, rgb(34 211 238 / 0.5) 0%, rgb(34 211 238 / 0.5) ${
                        ((settings.chatWidth - 30) / 70) * 100
                      }%, rgb(255 255 255 / 0.1) ${
                        ((settings.chatWidth - 30) / 70) * 100
                      }%, rgb(255 255 255 / 0.1) 100%)`,
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-white/70">
                      Font Size
                    </label>
                    <span className="text-xs text-white/50 font-mono">
                      {settings.fontSize}px
                    </span>
                  </div>
                  <input
                    ref={fontSizeRef}
                    type="range"
                    min="12"
                    max="24"
                    value={settings.fontSize}
                    onChange={(e) =>
                      handleSliderChange("fontSize", parseInt(e.target.value))
                    }
                    onFocus={() => setFocusedField(5)}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                    style={{
                      background: `linear-gradient(to right, rgb(34 211 238 / 0.5) 0%, rgb(34 211 238 / 0.5) ${
                        ((settings.fontSize - 12) / 12) * 100
                      }%, rgb(255 255 255 / 0.1) ${
                        ((settings.fontSize - 12) / 12) * 100
                      }%, rgb(255 255 255 / 0.1) 100%)`,
                    }}
                  />
                </div>
              </div>
            </div>
            {/* General Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                General
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    API Endpoint
                  </label>
                  <input
                    ref={endpointRef}
                    type="text"
                    value={settings.endpointUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, endpointUrl: e.target.value })
                    }
                    onFocus={() => setFocusedField(0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-500/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all"
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    API Key
                  </label>
                  <input
                    ref={apiKeyRef}
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) =>
                      setSettings({ ...settings, apiKey: e.target.value })
                    }
                    onFocus={() => setFocusedField(1)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-500/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all"
                    placeholder="sk-..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
