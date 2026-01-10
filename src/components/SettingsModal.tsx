import { useState, useEffect } from 'react';
import { StorageService } from '@/services/StorageService';
import { AppSettings, DEFAULT_SETTINGS } from '@/types';
import { X, Settings2 } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'shortcuts'>('general');
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [recordingId, setRecordingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSettings(StorageService.getSettings());
        }
    }, [isOpen]);

    const handleSave = () => {
        StorageService.saveSettings(settings);
        onClose();
        // Force reload to apply changes (simplest way to ensure all components update)
        window.location.reload();
    };

    const handleKeyDown = (e: React.KeyboardEvent, actionId: string) => {
        if (!recordingId) return;
        e.preventDefault();
        e.stopPropagation();

        // Ignore modifier key presses alone
        if (e.key === 'Meta' || e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt') return;

        const keys: string[] = [];
        if (e.metaKey || e.ctrlKey) keys.push('Cmd');
        if (e.altKey) keys.push('Option');
        if (e.shiftKey) keys.push('Shift');
        let mainKey = e.key.toUpperCase();

        // Correction for Option key behavior on Mac
        if (e.altKey && e.code.startsWith('Key')) {
            mainKey = e.code.replace('Key', '');
        } else if (e.altKey) {
            // Map common symbols from Code to standard representation if needed
            if (e.code === 'Comma') mainKey = ',';
            if (e.code === 'Period') mainKey = '.';
            if (e.code === 'Slash') mainKey = '/';
        }

        keys.push(mainKey);

        const newShortcut = keys.join('+');

        setSettings(prev => ({
            ...prev,
            shortcuts: {
                ...prev.shortcuts,
                [actionId]: newShortcut
            }
        }));
        setRecordingId(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Settings2 size={20} className="text-cyan-400" />
                        Settings
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 px-6 bg-black/20">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'general' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'appearance' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        Appearance
                    </button>
                    <button
                        onClick={() => setActiveTab('shortcuts')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'shortcuts' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        Shortcuts
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/40">
                    {activeTab === 'general' ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">API Endpoint</label>
                                <input
                                    type="text"
                                    value={settings.endpointUrl}
                                    onChange={(e) => setSettings({ ...settings, endpointUrl: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-500/50 focus:bg-white/10 outline-none transition-all"
                                    placeholder="https://api.openai.com/v1"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">API Key</label>
                                <input
                                    type="password"
                                    value={settings.apiKey}
                                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-500/50 focus:bg-white/10 outline-none transition-all"
                                    placeholder="sk-..."
                                />
                            </div>
                        </div>
                    ) : activeTab === 'appearance' ? (
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider">Display Mode</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setSettings({ ...settings, displayMode: 'compact' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${(settings.displayMode || 'compact') === 'compact'
                                            ? 'bg-cyan-500/20 border-cyan-400/50 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="font-medium mb-1">Compact Mode</div>
                                    <div className="text-xs opacity-60">Left-aligned with avatars</div>
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, displayMode: 'columns' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${settings.displayMode === 'columns'
                                            ? 'bg-cyan-500/20 border-cyan-400/50 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="font-medium mb-1">Two-Column Mode</div>
                                    <div className="text-xs opacity-60">Prompts left, responses right</div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="bg-cyan-900/10 border border-cyan-400/20 p-3 rounded-lg flex items-center gap-3 mb-4">
                                <InfoIcon />
                                <p className="text-sm text-cyan-300">Click on a shortcut to record a new key combination.</p>
                            </div>
                            {Object.entries(settings.shortcuts || DEFAULT_SETTINGS.shortcuts).map(([actionId, shortcut]) => (
                                <div key={actionId} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group">
                                    <span className="text-white/80 capitalize">{actionId.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <button
                                        onClick={() => setRecordingId(actionId)}
                                        onKeyDown={(e) => handleKeyDown(e, actionId)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-mono min-w-[100px] justify-center transition-all ${recordingId === actionId
                                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse ring-2 ring-cyan-400/30'
                                                : 'bg-black/40 border-white/10 text-white/50 group-hover:border-white/30 group-hover:text-white'
                                            }`}
                                    >
                                        {recordingId === actionId ? 'Press keys...' : shortcut}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/80 to-blue-500/80 text-white hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 flex-shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
    )
}
