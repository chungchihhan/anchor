import { AppSettings, DEFAULT_SETTINGS } from '@/types';

const SETTINGS_KEY = 'anchor_settings';

export class StorageService {
    static getSettings(): AppSettings {
        if (typeof window === 'undefined') {
            return DEFAULT_SETTINGS;
        }

        const stored = localStorage.getItem(SETTINGS_KEY);
        if (!stored) {
            return DEFAULT_SETTINGS;
        }

        try {
            const parsed = JSON.parse(stored);
            
            // Migration: Fix legacy Help shortcut (Meta+/ -> Control+/) and Option -> Control
            if (parsed.shortcuts) {
                // Specific fix for old meta setting if it exists
                if (parsed.shortcuts.help === 'Meta+/') {
                    parsed.shortcuts.help = 'Control+/';
                }

                // General migration: Option -> Control
                Object.keys(parsed.shortcuts).forEach(key => {
                    if (parsed.shortcuts[key].includes('Option+')) {
                        parsed.shortcuts[key] = parsed.shortcuts[key].replace('Option+', 'Control+');
                    }
                });
            }
            
            return { ...DEFAULT_SETTINGS, ...parsed };
        } catch (e) {
            console.error('Failed to parse settings', e);
            return DEFAULT_SETTINGS;
        }
    }

    static saveSettings(settings: AppSettings): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    static clearSettings(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(SETTINGS_KEY);
    }
}
