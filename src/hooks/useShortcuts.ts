import { useEffect, useState } from 'react';

export interface Shortcut {
    key: string;
    description: string;
    action: () => void;
    group: 'General' | 'Chat' | 'System' | 'Data';
}

export function useShortcuts(shortcuts: Shortcut[]) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Process shortcuts
            let matchFound = false;

            shortcuts.forEach(shortcut => {
                const keys = shortcut.key.toLowerCase().split('+').map(k => k.trim());
                const mainKey = keys[keys.length - 1];
                const needsMeta = keys.includes('cmd') || keys.includes('ctrl');
                const needsShift = keys.includes('shift');
                const needsAlt = keys.includes('alt') || keys.includes('option');

                let keyMatches = false;

                // Use e.code for Option key shortcuts because e.key changes (e.g. Option+N -> ˜)
                if (needsAlt) {
                     if (/^[a-z]$/.test(mainKey)) {
                         keyMatches = e.code === `Key${mainKey.toUpperCase()}`;
                     } else if (mainKey === ',') {
                         keyMatches = e.code === 'Comma';
                     } else if (mainKey === '/') {
                         keyMatches = e.code === 'Slash';
                     } else if (mainKey === '.') {
                         keyMatches = e.code === 'Period';
                     } else {
                         // Fallback for others or if mainKey is somehow different
                         keyMatches = e.key.toLowerCase() === mainKey;
                     }
                } else {
                    // Standard matching for non-Option shortcuts (e.g. generic commands)
                    keyMatches = e.key.toLowerCase() === mainKey.toLowerCase();
                }

                if (
                    keyMatches &&
                    (needsMeta === (e.metaKey || e.ctrlKey)) &&
                    (needsShift === e.shiftKey) &&
                    (needsAlt === e.altKey)
                ) {
                    e.preventDefault();
                    shortcut.action();
                    matchFound = true;
                }
            });

            // Toggle help overlay (Fixed or Customizable? keeping fixed as fail-safe for now, or use the 'help' action from shortcuts if passed)
             if (!matchFound && (e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts, isOpen]);

    return { isHelpOpen: isOpen, closeHelp: () => setIsOpen(false) };
}
