import { Shortcut } from '@/hooks/useShortcuts';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
    shortcuts: Shortcut[];
}

export function ShortcutsHelp({ isOpen, onClose, shortcuts }: ShortcutsHelpProps) {
    if (!isOpen) return null;

    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.group]) acc[shortcut.group] = [];
        acc[shortcut.group].push(shortcut);
        return acc;
    }, {} as Record<string, Shortcut[]>);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="w-full max-w-2xl bg-[#0f0c29] border border-white/10 rounded-2xl shadow-2xl p-0 overflow-hidden m-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <Keyboard className="text-cyan-400" size={24} />
                        <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 grid gap-8 max-h-[70vh] overflow-y-auto">
                    {Object.entries(groupedShortcuts).map(([group, groupShortcuts]) => (
                        <div key={group}>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{group}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {groupShortcuts.map((shortcut, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                        <span className="text-gray-200">{shortcut.description}</span>
                                        <div className="flex gap-1">
                                            {shortcut.key.split('+').map((k, i) => (
                                                <kbd key={i} className="px-2 py-1 min-w-[1.5rem] text-center bg-white/10 rounded text-xs font-mono text-cyan-300 border border-white/10">
                                                    {k === 'cmd' ? '⌘' : k.toUpperCase()}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 bg-white/5 border-t border-white/10 text-center text-sm text-gray-500">
                    Press <span className="text-cyan-400">Esc</span> to close
                </div>
            </div>
        </div>
    );
}
