import { useState, useEffect, useRef } from 'react';
import { Shortcut } from '@/hooks/useShortcuts';
import { X, Keyboard } from 'lucide-react';
import { StorageService } from '@/services/StorageService';
import { ShortcutMap } from '@/types';

interface ShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
    shortcuts: Shortcut[];
}

export function ShortcutsHelp({ isOpen, onClose, shortcuts }: ShortcutsHelpProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [recordedKeys, setRecordedKeys] = useState<string>('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [localShortcuts, setLocalShortcuts] = useState<Shortcut[]>(shortcuts);
    const [pendingChanges, setPendingChanges] = useState<ShortcutMap>({});
    
    // Use refs to avoid dependency issues
    const localShortcutsRef = useRef(localShortcuts);
    const pendingChangesRef = useRef(pendingChanges);
    
    useEffect(() => {
        localShortcutsRef.current = localShortcuts;
    }, [localShortcuts]);
    
    useEffect(() => {
        pendingChangesRef.current = pendingChanges;
    }, [pendingChanges]);

    // Update local shortcuts only when modal opens (store shortcuts in ref to avoid dependency)
    const shortcutsRef = useRef(shortcuts);
    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);
    
    useEffect(() => {
        if (isOpen) {
            setLocalShortcuts(shortcutsRef.current);
            setPendingChanges({});
        }
    }, [isOpen]);

    const getShortcutId = (description: string): string | null => {
        const map: Record<string, string> = {
            'Toggle Help': 'help',
            'Select Model': 'toggleModel',
            'New Chat': 'newChat',
            'Export Chat': 'saveChat',
            'Open Chat': 'openChat',
            'Settings': 'settings',
        };
        return map[description] || null;
    };

    // Get flat list of editable shortcuts for navigation
    const editableShortcuts = localShortcuts.filter(s => {
        const id = getShortcutId(s.description);
        return id !== null;
    });

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedIndex(0);
            setEditingId(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        // Navigation mode (when not editing)
        if (!editingId) {
            const handleNavigation = (e: KeyboardEvent) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % editableShortcuts.length);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + editableShortcuts.length) % editableShortcuts.length);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const selectedShortcut = editableShortcuts[selectedIndex];
                    const id = getShortcutId(selectedShortcut.description);
                    if (id) {
                        setEditingId(id);
                        setRecordedKeys('');
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    // Save all pending changes when closing
                    if (Object.keys(pendingChanges).length > 0) {
                        const settings = StorageService.getSettings();
                        StorageService.saveSettings({
                            ...settings,
                            shortcuts: {
                                ...settings.shortcuts,
                                ...pendingChanges
                            }
                        });
                        window.location.reload();
                    } else {
                        onClose();
                    }
                }
            };

            window.addEventListener('keydown', handleNavigation, true);
            return () => window.removeEventListener('keydown', handleNavigation, true);
        }
    }, [isOpen, editingId, selectedIndex, onClose]);

    useEffect(() => {
        if (!editingId) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Escape to cancel
            if (e.key === 'Escape') {
                setEditingId(null);
                setRecordedKeys('');
                return;
            }

            // Build shortcut string in real-time
            const parts: string[] = [];
            if (e.metaKey) parts.push('Cmd');
            if (e.ctrlKey) parts.push('Control');
            if (e.shiftKey) parts.push('Shift');
            if (e.altKey) parts.push('Option');

            // Add the main key
            const mainKey = e.key;
            if (!['Meta', 'Control', 'Shift', 'Alt'].includes(mainKey)) {
                // This is a complete shortcut (has a main key)
                if (mainKey === ' ') {
                    parts.push('Space');
                } else {
                    parts.push(mainKey.length === 1 ? mainKey.toUpperCase() : mainKey);
                }
                
                const newShortcut = parts.join('+');
                
                // Check for duplicates in both pending and saved shortcuts
                const settings = StorageService.getSettings();
                const allShortcuts = { ...settings.shortcuts, ...pendingChangesRef.current };
                const isDuplicate = Object.entries(allShortcuts).some(
                    ([key, value]) => key !== editingId && value === newShortcut
                );
                
                if (isDuplicate) {
                    alert('This shortcut is already in use!');
                    setEditingId(null);
                    setRecordedKeys('');
                    return;
                }
                
                // Update local display immediately
                setLocalShortcuts(prevShortcuts => prevShortcuts.map(s => {
                    const id = getShortcutId(s.description);
                    if (id === editingId) {
                        return { ...s, key: newShortcut };
                    }
                    return s;
                }));
                
                // Store pending change
                setPendingChanges(prev => ({
                    ...prev,
                    [editingId]: newShortcut
                }));
                
                // Exit edit mode
                setEditingId(null);
                setRecordedKeys('');
            } else {
                // Only modifiers pressed, show them
                setRecordedKeys(parts.join('+'));
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [editingId]);

    if (!isOpen) return null;

    const groupedShortcuts = localShortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.group]) acc[shortcut.group] = [];
        acc[shortcut.group].push(shortcut);
        return acc;
    }, {} as Record<string, Shortcut[]>);

    const startEditing = (shortcutId: string | null) => {
        if (!shortcutId) return;
        setEditingId(shortcutId);
        setRecordedKeys('');
    };

    const formatKey = (k: string): string => {
        const lower = k.toLowerCase();
        if (lower === 'control' || lower === 'ctrl') return '⌃';
        if (lower === 'cmd' || lower === 'meta') return '⌘';
        if (lower === 'option' || lower === 'alt') return '⌥';
        if (lower === 'shift') return '⇧';
        return k.toUpperCase();
    };

    const handleClose = () => {
        // Save pending changes before closing
        if (Object.keys(pendingChanges).length > 0) {
            const updatedShortcuts = localShortcuts.map(s => {
                const id = getShortcutId(s.description);
                if (id && pendingChanges[id]) {
                    return { ...s, key: pendingChanges[id] };
                }
                return s;
            });

            const settings = StorageService.getSettings();
            settings.shortcuts = updatedShortcuts.reduce((acc, s) => {
                const id = getShortcutId(s.description);
                if (id) acc[id] = s.key;
                return acc;
            }, {} as Record<string, string>);
            StorageService.saveSettings(settings);
            window.location.reload();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all" onClick={handleClose}>
            <div
                className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-150 overflow-hidden ring-1 ring-white/5 max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                    <div className="flex items-center gap-2 text-white">
                        <Keyboard size={18} className="text-cyan-400" />
                        <span className="font-medium">Keyboard Shortcuts</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded font-mono">
                            ↑↓ Navigate • Enter to edit • Esc to {Object.keys(pendingChanges).length > 0 ? 'save & close' : 'close'}
                        </div>
                        <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 p-6 bg-black/40 overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        {Object.entries(groupedShortcuts).map(([group, groupShortcuts]) => (
                            <div key={group}>
                                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">{group}</h3>
                                <div className="space-y-2">
                                    {groupShortcuts.map((shortcut, idx) => {
                                        const shortcutId = getShortcutId(shortcut.description);
                                        const isEditing = editingId === shortcutId;
                                        const isEditable = shortcutId !== null;
                                        const globalIndex = editableShortcuts.findIndex(s => s.description === shortcut.description);
                                        const isSelected = !editingId && isEditable && globalIndex === selectedIndex;
                                        
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => startEditing(shortcutId)}
                                                disabled={!isEditable}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all border ${
                                                    isEditing
                                                        ? 'bg-cyan-500/20 border-cyan-400/50 cursor-default'
                                                        : isSelected
                                                        ? 'bg-white/15 border-cyan-400/50 shadow-lg ring-2 ring-cyan-400/30 cursor-pointer'
                                                        : isEditable
                                                        ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/30 cursor-pointer'
                                                        : 'bg-white/5 border-white/10 cursor-not-allowed opacity-60'
                                                }`}
                                            >
                                                <span className="text-white/80 text-sm">{shortcut.description}</span>
                                                <div className="flex gap-1 items-center h-[26px]">
                                                    {isEditing ? (
                                                        recordedKeys ? (
                                                            <div className="flex gap-1">
                                                                {recordedKeys.split('+').map((k, i) => (
                                                                    <kbd 
                                                                        key={i} 
                                                                        className="px-2 py-1 min-w-[1.5rem] text-center bg-cyan-500/30 rounded text-xs font-mono text-cyan-200 border border-cyan-400/50 shadow-sm animate-pulse"
                                                                    >
                                                                        {formatKey(k)}
                                                                    </kbd>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-cyan-300 font-medium animate-pulse px-3">
                                                                Press keys...
                                                            </span>
                                                        )
                                                    ) : (
                                                        shortcut.key.split('+').map((k, i) => (
                                                            <kbd 
                                                                key={i} 
                                                                className="px-2 py-1 min-w-[1.5rem] text-center bg-black/40 rounded text-xs font-mono text-cyan-300 border border-white/20 shadow-sm"
                                                            >
                                                                {formatKey(k)}
                                                            </kbd>
                                                        ))
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
