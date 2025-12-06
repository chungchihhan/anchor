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
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
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
