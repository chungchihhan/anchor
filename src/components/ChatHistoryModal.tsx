import { useEffect, useState, useRef } from 'react';
import { FolderOpen } from 'lucide-react';
import { ChatSession } from '@/types';

import { Trash2 } from 'lucide-react';

interface ChatHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: ChatSession[];
    onSelect: (id: string) => void;
    onDelete?: (id: string) => void; // Optional for backward combat
}

export function ChatHistoryModal({ isOpen, onClose, sessions, onSelect, onDelete }: ChatHistoryModalProps) {
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Reset deleting state when modal closes or search changes
    useEffect(() => {
        if (!isOpen || searchQuery) {
            setDeletingId(null);
        }
    }, [isOpen, searchQuery]);

    // Filter sessions
    const filteredSessions = sessions.filter(session =>
        (session.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Reset highlight when modal opens
    useEffect(() => {
        if (isOpen) {
            setHighlightedIndex(0);
            setSearchQuery('');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            // Navigation
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev + 1) % (filteredSessions.length || 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev - 1 + (filteredSessions.length || 1)) % (filteredSessions.length || 1));
            }
            // Action
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredSessions.length > 0) {
                    onSelect(filteredSessions[highlightedIndex].id);
                    onClose();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
            // Delete with Cmd+Backspace
            else if (e.key === 'Backspace' && e.metaKey && onDelete && filteredSessions.length > 0) {
                e.preventDefault();
                onDelete(filteredSessions[highlightedIndex].id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredSessions, highlightedIndex, onSelect, onClose, onDelete]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (listRef.current && isOpen) {
            const element = listRef.current.children[highlightedIndex] as HTMLElement;
            if (element) {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen, filteredSessions]);

    // Scroll preview to bottom when highlighted index changes
    const previewEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (previewEndRef.current) {
            previewEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [highlightedIndex, filteredSessions]);

    if (!isOpen) return null;

    const selectedSession = filteredSessions[highlightedIndex];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 transition-all">
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-6xl h-[85vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                    <h3 className="text-white font-medium tracking-wide flex items-center gap-2">
                        <FolderOpen size={18} className="text-cyan-400" />
                        Open Chat
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded font-mono hidden sm:inline-block">
                            Type to search • Arrows to navigate • Enter to open
                        </span>
                        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md">✕</button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar: Chat List */}
                    <div className="w-1/3 border-r border-white/10 flex flex-col bg-black/20">
                        {/* Search Bar */}
                        <div className="p-3 border-b border-white/5">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setHighlightedIndex(0);
                                }}
                                placeholder="Search chats..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                                autoFocus
                            />
                        </div>

                        <div ref={listRef} className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {filteredSessions.length === 0 ? (
                                <div className="text-center py-12 text-white/30 text-sm">
                                    {searchQuery ? `No chats match "${searchQuery}"` : 'No saved chats found'}
                                </div>
                            ) : (
                                filteredSessions.map((session, index) => (
                                    <div
                                        key={session.id}
                                        className={`w-full px-3 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 group border border-transparent relative mb-1 ${index === highlightedIndex
                                            ? 'bg-white/10 border-white/5 shadow-lg'
                                            : 'hover:bg-white/5 hover:border-white/5'
                                            }`}
                                        onClick={() => {
                                            onSelect(session.id);
                                            onClose();
                                        }}
                                    >
                                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center transition-all shadow-inner shrink-0 ${index === highlightedIndex
                                            ? 'from-cyan-500/30 to-blue-600/30 text-cyan-400 shadow-cyan-500/20'
                                            : 'from-white/5 to-white/10 text-white/30 group-hover:text-white/70'
                                            }`}>
                                            <FolderOpen size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0 cursor-pointer">
                                            <p className={`text-sm font-medium truncate ${index === highlightedIndex ? 'text-white' : 'text-gray-300'
                                                }`}>{session.title || 'Untitled Chat'}</p>
                                            <p className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                                                <span>{new Date(session.timestamp).toLocaleDateString()}</span>
                                                <span className="w-0.5 h-0.5 rounded-full bg-gray-600"></span>
                                                <span>{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                        </div>
                                        {onDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (deletingId === session.id) {
                                                        onDelete(session.id);
                                                        setDeletingId(null);
                                                    } else {
                                                        setDeletingId(session.id);
                                                        setTimeout(() => setDeletingId(prev => prev === session.id ? null : prev), 3000);
                                                    }
                                                }}
                                                className={`p-1.5 rounded-md transition-all z-10 relative flex items-center justify-center ${deletingId === session.id
                                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                                    : 'text-white/20 hover:text-red-400 hover:bg-red-500/10'
                                                    } ${index === highlightedIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                    }`}
                                                title="Delete Chat"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Chat Preview */}
                    <div className="flex-1 flex flex-col bg-black/40 relative">
                        {selectedSession ? (
                            <>
                                <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                    <h4 className="text-white/90 font-medium truncate text-lg">{selectedSession.title || 'Untitled Chat'}</h4>
                                    <p className="text-xs text-white/40 mt-1 font-mono">
                                        {selectedSession.messages.length} messages
                                    </p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                    {selectedSession.messages.map((msg, idx) => (
                                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-white/10 text-white rounded-br-sm'
                                                : 'bg-white/5 text-gray-300 rounded-bl-sm'
                                                }`}>
                                                <p className="whitespace-pre-wrap line-clamp-[20]">{msg.content}</p>
                                            </div>
                                            <span className="text-[10px] text-white/20 mt-1 px-1">
                                                {msg.role === 'user' ? 'You' : 'Anchor'}
                                            </span>
                                        </div>
                                    ))}
                                    <div ref={previewEndRef} />
                                </div>
                                {/* Gradient Overlay at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                                <FolderOpen size={48} className="mb-4 opacity-20" />
                                <p>Select a chat to preview</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
