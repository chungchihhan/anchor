'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatInput } from '@/components/ChatInput';
import { MessageList } from '@/components/MessageList';
import { SettingsModal } from '@/components/SettingsModal';
import { useChat } from '@/hooks/useChat';

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();

  return (
    <main className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNewChat={clearChat}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header / Top Bar (Optional, maybe just for mobile menu) */}
        <div className="md:hidden p-4 border-b border-white/10 flex justify-between items-center glass-panel">
          <h1 className="font-bold text-lg">Anchor</h1>
          <button onClick={() => setIsSettingsOpen(true)} className="text-sm text-accent">Settings</button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden relative">
          <MessageList messages={messages} isLoading={isLoading} />

          {/* Error Toast */}
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm text-sm animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
