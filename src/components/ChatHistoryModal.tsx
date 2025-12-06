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
            // Search / Type-ahead
            else if (e.key === 'Backspace') {
                if (e.metaKey && onDelete && filteredSessions.length > 0) {
                    // Cmd+Backspace to delete currently highlighted
                    // e.preventDefault(); // Don't prevent default if it's text edit? actually here we want to capture it
                    // But wait, if we are typing, backspace removes text.
                    // If we hold CMD, we probably want to delete the ITEM.
                    e.preventDefault();
                    onDelete(filteredSessions[highlightedIndex].id);
                    return;
                }
                setSearchQuery(prev => prev.slice(0, -1));
                setHighlightedIndex(0);
            } else if (e.key.length === 1 && /^[a-zA-Z0-9\s\-\.]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                setSearchQuery(prev => prev + e.key);
                setHighlightedIndex(0);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-white font-medium">Open Chat</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded">
                            Type to search • Cmd+Backspace to delete
                        </span>
                        <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
                    </div>
                </div>

                {/* Search Feedback */}
                {searchQuery && (
                    <div className="px-4 py-2 border-b border-white/5 bg-white/5 text-sm text-cyan-400 font-mono">
                         <span className="text-white/40 mr-2">Searching:</span>
                         {searchQuery}<span className="animate-pulse">_</span>
                    </div>
                )}

                <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
                    {filteredSessions.length === 0 ? (
                        <div className="text-center py-8 text-white/30 text-sm">
                            {searchQuery ? `No chats match "${searchQuery}"` : 'No saved chats found'}
                        </div>
                    ) : (
                        filteredSessions.map((session, index) => (
                            <div
                                key={session.id}
                                className={`w-full px-4 py-3 rounded-xl transition-colors flex items-center gap-3 group border-b border-white/5 last:border-0 relative ${
                                    index === highlightedIndex
                                        ? 'bg-white/10'
                                        : 'hover:bg-white/5'
                                }`}
                                onClick={() => {
                                    onSelect(session.id);
                                    onClose();
                                }}
                            >
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center transition-all ${
                                    index === highlightedIndex
                                        ? 'from-cyan-500/30 to-blue-600/30 text-cyan-400'
                                        : 'from-cyan-500/20 to-blue-600/20 text-cyan-400/70'
                                }`}>
                                    <FolderOpen size={18} />
                                </div>
                                <div className="flex-1 min-w-0 cursor-pointer">
                                    <p className={`text-sm font-medium truncate ${
                                        index === highlightedIndex ? 'text-white' : 'text-gray-200'
                                    }`}>{session.title || 'Untitled Chat'}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{new Date(session.timestamp).toLocaleDateString()}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                        <span>{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </p>
                                </div>
                                
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent selection
                                            onDelete(session.id);
                                        }}
                                        className={`p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all ${
                                            index === highlightedIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                        }`}
                                        title="Delete Chat (Cmd+Backspace)"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
