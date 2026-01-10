'use client';

import { useState, useMemo } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { MessageList } from '@/components/MessageList';
import { SettingsModal } from '@/components/SettingsModal';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { ModelSelector } from '@/components/ModelSelector';
import { ChatHistoryModal } from '@/components/ChatHistoryModal';
import { TableOfContents } from '@/components/TableOfContents';
import LightRays from '@/components/LightRays';
import { useChat } from '@/hooks/useChat';
import { useShortcuts, Shortcut } from '@/hooks/useShortcuts';
import { Info, Download, MessageCircle, Command } from 'lucide-react';
import { HistoryService } from '@/services/HistoryService';
import { StorageService } from '@/services/StorageService';
import { DEFAULT_SETTINGS } from '@/types';

export default function Home() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

    const {
        messages,
        isLoading,
        error,
        sendMessage,
        stopGeneration,
        clearChat,
        selectedModel,
        setSelectedModel,
        availableModels,
        exportChat,
        downloadChat,
        importChat,
        retryMessage,
        editMessage
    } = useChat();
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [savedFiles, setSavedFiles] = useState<any[]>([]);

    const loadFiles = async () => {
        try {
            const files = await HistoryService.listLocal();
            setSavedFiles(files);
            setIsLoadModalOpen(true);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteChat = async (id: string) => {
        console.log('handleDeleteChat called for id:', id);
        // Confirmation is now handled in the UI (ChatHistoryModal)
        try {
            await HistoryService.deleteLocal(id);
            console.log('deleteLocal success');
            // Refresh list
            const files = await HistoryService.listLocal();
            setSavedFiles(files);
        } catch (e) {
            console.error('Failed to delete', e);
        }
    };

    /* Load saved shortcuts */
    const savedSettings = useMemo(() => StorageService.getSettings(), [isSettingsOpen]); // Re-read when settings close
    const currentShortcuts = savedSettings.shortcuts || DEFAULT_SETTINGS.shortcuts;
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const shortcuts: Shortcut[] = useMemo(() => [
        {
            key: currentShortcuts.help || 'Control+/',
            description: 'Toggle Help',
            action: () => setIsHelpOpen(prev => !prev),
            group: 'General'
        },
        {
            key: 'Escape',
            description: 'Close Modal',
            action: () => {
                if (isHelpOpen) setIsHelpOpen(false);
                if (isSettingsOpen) setIsSettingsOpen(false);
                if (isModelSelectorOpen) setIsModelSelectorOpen(false);
            },
            group: 'General'
        },
        {
            key: currentShortcuts.toggleModel,
            description: 'Select Model',
            action: () => setIsModelSelectorOpen(true), // Open selector instead of toggle
            group: 'Chat'
        },
        {
            key: currentShortcuts.newChat,
            description: 'New Chat',
            action: clearChat,
            group: 'Chat'
        },
        {
            key: currentShortcuts.saveChat,
            description: 'Export Chat',
            action: downloadChat,
            group: 'Data'
        },
        {
            key: currentShortcuts.openChat,
            description: 'Open Chat',
            action: loadFiles,
            group: 'Data'
        },
        {
            key: currentShortcuts.settings || 'Control+,',
            description: 'Settings',
            action: () => setIsSettingsOpen(true),
            group: 'General'
        }
    ], [clearChat, downloadChat, loadFiles, currentShortcuts, isHelpOpen, isSettingsOpen, isModelSelectorOpen]);

    useShortcuts(shortcuts);

    return (
        <main className="flex h-screen w-full overflow-hidden flex-col relative bg-black">
            <div className="absolute inset-0 z-0">
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#7dd3fc"
                    raysSpeed={1.5}
                    lightSpread={0.8}
                    rayLength={1.2}
                    followMouse={true}
                    mouseInfluence={0.1}
                    noiseAmount={0.1}
                    distortion={0.05}
                    className="opacity-40"
                />
            </div>
            {/* Header */}
            <header className="flex items-center justify-between px-6 pb-4 pt-10 z-10 transition-all duration-300">
                <div className="flex items-center gap-3">
                    <div className="relative group cursor-default">
                        <div className="absolute -inset-2 bg-cyan-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <img 
                            src="/anchor-avatar.png" 
                            alt="Anchor" 
                            className="w-5 h-5 relative transform group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                    <span className="text-white font-medium text-sm tracking-wide drop-shadow-md">ANCHOR</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsModelSelectorOpen(true)}
                        className="text-blue-300 text-xs font-mono uppercase tracking-wider bg-blue-900/10 px-2 py-0.5 rounded border border-blue-400/10 backdrop-blur-sm hover:bg-blue-400/20 transition-colors"
                    >
                        {selectedModel}
                    </button>
                    {messages.length > 0 && (
                        <button
                            onClick={downloadChat}
                            className="p-2 rounded-lg text-white/50 hover:text-white transition-colors hover:bg-white/5"
                            title="Export Chat (Download)"
                        >
                            <Download size={18} />
                        </button>
                    )}
                    <button
                        onClick={loadFiles}
                        className="p-2 rounded-lg text-white/50 hover:text-white transition-colors hover:bg-white/5"
                        title="Open Chat"
                    >
                        <MessageCircle size={18} />
                    </button>
                    <button 
                        onClick={() => setIsHelpOpen(true)}
                        className="p-2 rounded-lg text-white/50 hover:text-white transition-colors hover:bg-white/5" 
                        title="View Shortcuts"
                    >
                        <Command size={18} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex flex-col relative z-0 overflow-hidden">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="w-full max-w-2xl">
                            <div className="text-center mb-10 relative">
                                {/* Ambient Background Glow */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />

                                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 mb-3 drop-shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
                                    How can I help you?
                                </h1>
                                <p className="text-white/40 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 relative">
                                    Start a conversation with Anchor AI
                                </p>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                                <ChatInput onSend={sendMessage} onStop={stopGeneration} disabled={isLoading} isLoading={isLoading} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Constrained Width Container */}
                        {/* Constrained Width Container */}
                        <div className={`flex-1 overflow-hidden flex flex-col w-full mx-auto relative ${savedSettings.displayMode === 'columns' ? 'max-w-7xl px-8' : 'max-w-4xl'}`}>
                            {/* Scrollable Message Area */}
                            <div className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20px, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20px, black 100%)' }}>
                                <div className="min-h-full pb-32">
                                    <MessageList
                                        messages={messages}
                                        isLoading={isLoading}
                                        onRetry={retryMessage}
                                        onEdit={editMessage}
                                        displayMode={savedSettings.displayMode || 'compact'}
                                    />
                                </div>
                            </div>

                            {/* Input Area with Enhanced Glass/Transparency */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 pt-2 z-20">
                                <ChatInput onSend={sendMessage} onStop={stopGeneration} disabled={isLoading} isLoading={isLoading} />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Error Toast */}
            {
                error && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm text-sm animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )
            }

            {/* Shortcuts Help Overlay */}
            <ShortcutsHelp isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} shortcuts={shortcuts} />

            {/* Load Modal */}
            <ChatHistoryModal
                isOpen={isLoadModalOpen}
                onClose={() => setIsLoadModalOpen(false)}
                sessions={savedFiles}
                onSelect={(id) => importChat(id)}
                onDelete={handleDeleteChat}
            />

            <ModelSelector
                isOpen={isModelSelectorOpen}
                onClose={() => setIsModelSelectorOpen(false)}
                models={availableModels}
                selectedModel={selectedModel}
                onSelect={setSelectedModel}
            />

            {/* Modals */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {/* Table of Contents */}
            <TableOfContents messages={messages} />
        </main >
    );
}
