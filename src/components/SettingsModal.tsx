import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { StorageService } from '@/services/StorageService';
import { AppSettings } from '@/types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());

    useEffect(() => {
        if (isOpen) {
            setSettings(StorageService.getSettings());
        }
    }, [isOpen]);

    const handleSave = () => {
        StorageService.saveSettings(settings);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Settings</h2>
                    <button onClick={onClose} className="btn-ghost p-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            API Endpoint URL
                        </label>
                        <input
                            type="text"
                            value={settings.endpointUrl}
                            onChange={(e) => setSettings({ ...settings, endpointUrl: e.target.value })}
                            className="input-field"
                            placeholder="https://api.example.com/v1/chat/completions"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            API Key
                        </label>
                        <input
                            type="password"
                            value={settings.apiKey}
                            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                            className="input-field"
                            placeholder="sk-..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Model Name
                        </label>
                        <input
                            type="text"
                            value={settings.modelName}
                            onChange={(e) => setSettings({ ...settings, modelName: e.target.value })}
                            className="input-field"
                            placeholder="gpt-3.5-turbo"
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
