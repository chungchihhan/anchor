'use client';

import { useState, useMemo } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { MessageList } from '@/components/MessageList';
import { SettingsModal } from '@/components/SettingsModal';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { ModelSelector } from '@/components/ModelSelector';
import { ChatHistoryModal } from '@/components/ChatHistoryModal';
import { useChat } from '@/hooks/useChat';
import { useShortcuts, Shortcut } from '@/hooks/useShortcuts';
import { Info, Download, FolderOpen, Command } from 'lucide-react';
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
      if (confirm('Are you sure you want to delete this chat?')) {
          try {
              await HistoryService.deleteLocal(id);
              // Refresh list
              const files = await HistoryService.listLocal();
              setSavedFiles(files);
              
              // If deleted chat is current, clear it
              // We need to check useChat's current session, but useChat doesn't expose it directly yet.
              // Assuming if messages are loaded and we delete, maybe we should just clear?
              // The user might be viewing the chat they just deleted. 
              // Ideally useChat exposes currentSessionId.
          } catch (e) {
              console.error('Failed to delete', e);
          }
      }
  };

  /* Load saved shortcuts */
  const savedSettings = useMemo(() => StorageService.getSettings(), [isSettingsOpen]); // Re-read when settings close
  const currentShortcuts = savedSettings.shortcuts || DEFAULT_SETTINGS.shortcuts;

  const shortcuts: Shortcut[] = useMemo(() => [
    {
      key: currentShortcuts.help || 'Option+/',
      description: 'Toggle Help',
      action: () => {}, // Handled internally
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
        key: currentShortcuts.settings || 'Option+,',
        description: 'Settings',
        action: () => setIsSettingsOpen(true),
        group: 'General'
    }
  ], [clearChat, downloadChat, loadFiles, currentShortcuts, setIsModelSelectorOpen]);

  const { isHelpOpen, closeHelp } = useShortcuts(shortcuts);

  return (
    <main className="flex h-screen w-full overflow-hidden flex-col relative">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 z-10 transition-all duration-300">
            <div className="flex items-center gap-4">
                 <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                 <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm tracking-wide drop-shadow-md">ANCHOR</span>
                    <span className="text-white/20 text-xs">/</span>
                    <button 
                        onClick={() => setIsModelSelectorOpen(true)}
                        className="text-cyan-400 text-xs font-mono uppercase tracking-wider bg-cyan-900/10 px-2 py-0.5 rounded border border-cyan-500/10 backdrop-blur-sm hover:bg-cyan-500/20 transition-colors"
                    >
                        {selectedModel}
                    </button>
                 </div>
            </div>
            <div className="flex items-center gap-3">
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
                    <FolderOpen size={18} />
                 </button>
                 <div className="w-px h-4 bg-white/10 mx-1" />
                 <div className="flex items-center gap-2 text-xs text-white/30 px-2 py-1 rounded-md border border-white/5 cursor-help hover:bg-white/5 transition-colors" title="View Shortcuts">
                    <Command size={10} />
                    <span>/</span>
                 </div>
            </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col relative z-0 overflow-hidden">
             {messages.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-4">
                     <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <div className="text-center mb-8">
                             <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-2 drop-shadow-sm">
                                 How can I help you?
                             </h1>
                             <p className="text-white/40">Start a conversation with Anchor AI</p>
                         </div>
                         <ChatInput onSend={sendMessage} disabled={isLoading} />
                     </div>
                 </div>
             ) : (
                 <>
                    {/* Constrained Width Container */}
                    {/* Constrained Width Container */}
                    <div className="flex-1 overflow-hidden flex flex-col w-full max-w-4xl mx-auto relative">
                        {/* Gradient Mask for Smooth Scroll Fade */}
                        <div className="flex-1 overflow-y-auto no-scrollbar" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20px, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20px, black 85%, transparent 100%)' }}>
                            <div className="min-h-full pb-4">
                                <MessageList 
                                    messages={messages} 
                                    isLoading={isLoading} 
                                    onRetry={retryMessage} 
                                    onEdit={editMessage}
                                    displayMode={savedSettings.displayMode || 'chat'}
                                />
                            </div>
                        </div>
                        
                        {/* Input Area with Enhanced Glass/Transparency */}
                        <div className="p-4 pt-2 relative z-10">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent -z-10 pointer-events-none" />
                           <ChatInput onSend={sendMessage} disabled={isLoading} />
                        </div>
                    </div>
                 </>
             )}
        </div>

        {/* Error Toast */}
        {error && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm text-sm animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

        {/* Shortcuts Help Overlay */}
        <ShortcutsHelp isOpen={isHelpOpen} onClose={closeHelp} shortcuts={shortcuts} />
        
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
    </main>
  );
}
