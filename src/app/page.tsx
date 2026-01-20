'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChatInput, ChatInputRef } from '@/components/ChatInput';
import { MessageList } from '@/components/MessageList';
import { SettingsModal } from '@/components/SettingsModal';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { ModelSelector } from '@/components/ModelSelector';
import { ChatHistoryModal } from '@/components/ChatHistoryModal';
import { TableOfContents } from '@/components/TableOfContents';
import LightRays from '@/components/LightRays';
import { useChat } from '@/hooks/useChat';
import { useShortcuts, Shortcut } from '@/hooks/useShortcuts';
import { Info, Download, MessageCircle, Command, Anchor } from 'lucide-react';
import { HistoryService } from '@/services/HistoryService';
import { StorageService } from '@/services/StorageService';
import { DEFAULT_SETTINGS } from '@/types';

export default function Home() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const chatInputRef = useRef<ChatInputRef>(null);
    const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
    const [shouldShake, setShouldShake] = useState(false);

    const phrases = [
        "What's on your mind?",
        "What shall we explore?",
        "Where should we start?"
    ];

    useEffect(() => {
        const currentPhrase = phrases[phraseIndex];
        const typingSpeed = isDeleting ? 50 : 100;
        const pauseTime = 4000;

        if (!isDeleting && displayedText === currentPhrase) {
            const timeout = setTimeout(() => setIsDeleting(true), pauseTime);
            return () => clearTimeout(timeout);
        }

        if (isDeleting && displayedText === '') {
            setIsDeleting(false);
            setPhraseIndex((prev) => (prev + 1) % phrases.length);
            return;
        }

        const timeout = setTimeout(() => {
            setDisplayedText((prev) => {
                if (isDeleting) {
                    return currentPhrase.substring(0, prev.length - 1);
                }
                return currentPhrase.substring(0, prev.length + 1);
            });
        }, typingSpeed);

        return () => clearTimeout(timeout);
    }, [displayedText, isDeleting, phraseIndex]);

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
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const savedSettings = useMemo(() => StorageService.getSettings(), [isSettingsOpen, isHelpOpen]); // Re-read when settings or help close
    const currentShortcuts = savedSettings.shortcuts || DEFAULT_SETTINGS.shortcuts;
    const displayModeRef = useRef(savedSettings.displayMode || 'compact');
    
    // Update ref when display mode changes
    useEffect(() => {
        displayModeRef.current = savedSettings.displayMode || 'compact';
    }, [savedSettings.displayMode]);

    const shortcuts: Shortcut[] = useMemo(() => [
        {
            key: currentShortcuts.help || DEFAULT_SETTINGS.shortcuts.help,
            description: 'Toggle Help',
            action: () => setIsHelpOpen(prev => !prev),
            group: 'General'
        },
        {
            key: currentShortcuts.settings || DEFAULT_SETTINGS.shortcuts.settings,
            description: 'Settings',
            action: () => setIsSettingsOpen(true),
            group: 'General'
        },
        {
            key: currentShortcuts.toggleModel || DEFAULT_SETTINGS.shortcuts.toggleModel,
            description: 'Select Model',
            action: () => setIsModelSelectorOpen(true),
            group: 'Chat'
        },
        {
            key: currentShortcuts.newChat || DEFAULT_SETTINGS.shortcuts.newChat,
            description: 'New Chat',
            action: () => {
                clearChat();
                setTimeout(() => chatInputRef.current?.focus(), 100);
            },
            group: 'Chat'
        },
        {
            key: currentShortcuts.saveChat || DEFAULT_SETTINGS.shortcuts.saveChat,
            description: 'Export Chat',
            action: downloadChat,
            group: 'Data'
        },
        {
            key: currentShortcuts.openChat || DEFAULT_SETTINGS.shortcuts.openChat,
            description: 'Open Chat',
            action: loadFiles,
            group: 'Data'
        }
    ], [clearChat, downloadChat, loadFiles, currentShortcuts]);

    // Handle Escape key for closing modals
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isHelpOpen) setIsHelpOpen(false);
                else if (isSettingsOpen) setIsSettingsOpen(false);
                else if (isModelSelectorOpen) setIsModelSelectorOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isHelpOpen, isSettingsOpen, isModelSelectorOpen]);

    // Handle / key to focus input
    useEffect(() => {
        const handleSlashKey = (e: KeyboardEvent) => {
            // Only trigger if not in an input/textarea and no modals are open
            if (e.key === '/' && 
                document.activeElement?.tagName !== 'INPUT' && 
                document.activeElement?.tagName !== 'TEXTAREA' &&
                !isHelpOpen && !isSettingsOpen && !isModelSelectorOpen && !isLoadModalOpen
            ) {
                e.preventDefault();
                chatInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleSlashKey);
        return () => window.removeEventListener('keydown', handleSlashKey);
    }, [isHelpOpen, isSettingsOpen, isModelSelectorOpen, isLoadModalOpen]);

    // Handle Shift+Up/Down to navigate through messages
    useEffect(() => {
        const handleMessageNavigation = (e: KeyboardEvent) => {
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();
                
                if (messages.length === 0) return;
                
                const isColumnsMode = displayModeRef.current === 'columns';
                
                if (e.key === 'ArrowUp') {
                    // Navigate to previous message
                    if (selectedMessageIndex === null) {
                        // Start from the last message when no selection
                        if (isColumnsMode) {
                            // Find the last user message
                            let lastUserIndex = messages.length - 1;
                            while (lastUserIndex >= 0 && messages[lastUserIndex].role !== 'user') {
                                lastUserIndex--;
                            }
                            if (lastUserIndex >= 0) {
                                setSelectedMessageIndex(lastUserIndex);
                            }
                        } else {
                            setSelectedMessageIndex(messages.length - 1);
                        }
                        return;
                    }
                    
                    if (selectedMessageIndex === 0) {
                        // At the top, shake current message
                        setShouldShake(true);
                        setTimeout(() => setShouldShake(false), 500);
                        return;
                    }
                    
                    if (isColumnsMode) {
                        // In columns mode, navigate by rows (user messages)
                        // Find the previous user message
                        let prevUserIndex = selectedMessageIndex - 1;
                        while (prevUserIndex >= 0 && messages[prevUserIndex].role !== 'user') {
                            prevUserIndex--;
                        }
                        if (prevUserIndex >= 0) {
                            setSelectedMessageIndex(prevUserIndex);
                        } else {
                            // No more user messages above, shake
                            setShouldShake(true);
                            setTimeout(() => setShouldShake(false), 500);
                        }
                    } else {
                        // In compact mode, navigate to previous message
                        setSelectedMessageIndex(selectedMessageIndex - 1);
                    }
                } else if (e.key === 'ArrowDown') {
                    // Navigate to next message
                    if (selectedMessageIndex === null) {
                        setSelectedMessageIndex(0);
                        return;
                    }
                    
                    if (isColumnsMode) {
                        // In columns mode, navigate by rows (user messages)
                        // Find the next user message
                        let nextUserIndex = selectedMessageIndex + 1;
                        while (nextUserIndex < messages.length && messages[nextUserIndex].role !== 'user') {
                            nextUserIndex++;
                        }
                        if (nextUserIndex < messages.length) {
                            setSelectedMessageIndex(nextUserIndex);
                        } else {
                            // No more user messages below, shake
                            setShouldShake(true);
                            setTimeout(() => setShouldShake(false), 500);
                        }
                    } else {
                        // In compact mode, navigate to next message
                        if (selectedMessageIndex < messages.length - 1) {
                            setSelectedMessageIndex(selectedMessageIndex + 1);
                        } else {
                            // At the bottom, shake current message
                            setShouldShake(true);
                            setTimeout(() => setShouldShake(false), 500);
                        }
                    }
                }
            }
        };
        window.addEventListener('keydown', handleMessageNavigation);
        return () => window.removeEventListener('keydown', handleMessageNavigation);
    }, [messages, selectedMessageIndex]);

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
                        <div className="absolute -inset-2 bg-cyan-500/30 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Anchor className="w-5 h-5 relative transform group-hover:scale-110 transition-transform duration-500 text-white/70" />
                    </div>
                    <span className="text-white font-medium text-sm tracking-wide drop-shadow-md font-mono">Anchor</span>
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

                                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 mb-3 drop-shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 relative min-h-[3.5rem]">
                                    {displayedText}<span className="animate-pulse">|</span>
                                </h1>
                                <p className="text-white/40 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 relative">
                                    Your anchor in the noise.
                                </p>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                                <ChatInput ref={chatInputRef} onSend={sendMessage} onStop={stopGeneration} disabled={isLoading} isLoading={isLoading} />
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
                                        selectedMessageIndex={selectedMessageIndex}
                                        shouldShake={shouldShake}
                                    />
                                </div>
                            </div>

                            {/* Input Area with Enhanced Glass/Transparency */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 pt-2 z-20">
                                <ChatInput ref={chatInputRef} onSend={sendMessage} onStop={stopGeneration} disabled={isLoading} isLoading={isLoading} />
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
