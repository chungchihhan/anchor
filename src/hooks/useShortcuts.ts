import { useEffect, useState } from 'react';

export interface Shortcut {
    key: string;
    description: string;
    action: () => void;
    group: 'General' | 'Chat' | 'System' | 'Data';
}

export function useShortcuts(shortcuts: Shortcut[]) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            console.log('Key pressed:', e.key, 'Code:', e.code, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey, 'Alt:', e.altKey);
            // Process shortcuts
            shortcuts.forEach(shortcut => {
                const keys = shortcut.key.toLowerCase().split('+').map(k => k.trim());
                const mainKey = keys[keys.length - 1];
                const needsMeta = keys.includes('cmd') || keys.includes('meta');
                const needsCtrl = keys.includes('ctrl') || keys.includes('control');
                const needsShift = keys.includes('shift');
                const needsAlt = keys.includes('alt') || keys.includes('option');

                let keyMatches = false;

                // Match using e.code for letters to avoid modifier checking issues
                // key might be 'Control' or 'Meta' if only modifier is pressed, so we check mainKey
                if (/^[a-z]$/.test(mainKey)) {
                     // Check both e.key (for safeguard) and e.code (for robustness)
                     // e.code is usually 'KeyN' for 'n'
                     keyMatches = e.code === `Key${mainKey.toUpperCase()}` || e.key.toLowerCase() === mainKey;
                } else if (mainKey === ',') {
                     keyMatches = e.code === 'Comma' || e.key === ',';
                } else if (mainKey === '/') {
                     keyMatches = e.code === 'Slash' || e.key === '/';
                } else if (mainKey === '.') {
                     keyMatches = e.code === 'Period' || e.key === '.';
                } else {
                     // Fallback
                     keyMatches = e.key.toLowerCase() === mainKey.toLowerCase();
                     
                     // Special case for 'Escape'
                     if (mainKey === 'escape' && e.key === 'Escape') {
                         keyMatches = true;
                     }
                }

                if (
                    keyMatches &&
                    (needsMeta === e.metaKey) &&
                    (needsCtrl === e.ctrlKey) &&
                    (needsShift === e.shiftKey) &&
                    (needsAlt === e.altKey)
                ) {
                    e.preventDefault();
                    shortcut.action();
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
