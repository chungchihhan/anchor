import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FolderOpen, Trash2, Copy, Check, User } from 'lucide-react';
import { ChatSession } from '@/types';

interface ChatHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: ChatSession[];
    onSelect: (id: string) => void;
    onDelete?: (id: string) => void;
}

const TableBlock = ({ node, className, children, ...props }: any) => {
    return (
        <div className="relative group/code rounded-lg overflow-hidden border border-white/10 my-4 bg-black/50 text-left backdrop-blur-sm max-w-full">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 text-xs text-gray-400">
                <span>Table</span>
            </div>
            <div className="overflow-x-auto p-2">
                <table
                    className={`w-full text-left border-separate border-spacing-0 text-sm ${className || ''}`}
                    {...props}
                >
                    {children}
                </table>
            </div>
        </div>
    );
};

const ThinkBlock = ({ children }: { children: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="my-3 rounded-md border border-white/10 bg-white/5 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition-colors"
            >
                <svg
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-mono">Thinking...</span>
            </button>
            {isExpanded && (
                <div className="px-3 py-2 text-xs text-white/50 border-t border-white/10 bg-black/20 font-mono leading-relaxed whitespace-pre-wrap">
                    {children}
                </div>
            )}
        </div>
    );
};

// Preprocess content to handle <think> tags
const preprocessContent = (content: any): { processedContent: string; thinkBlocks: string[] } => {
    const thinkBlocks: string[] = [];

    // Guard against undefined/null/non-string content
    let processedContent = '';

    if (typeof content === 'string') {
        processedContent = content;
    } else if (Array.isArray(content)) {
        // Handle array format (e.g., from image functionality)
        processedContent = content
            .map(item => {
                if (typeof item === 'string') return item;
                if (item?.type === 'text') return item.text || '';
                return '';
            })
            .join('\n');
    } else if (content && typeof content === 'object') {
        // Handle object format
        processedContent = content.text || content.content || '';
    }

    // Find all <think>...</think> blocks
    const thinkRegex = /<think>\s*([\s\S]*?)\s*<\/think>/g;
    let match;
    let index = 0;

    while ((match = thinkRegex.exec(processedContent)) !== null) {
        thinkBlocks.push(match[1].trim());
        // Replace with a placeholder that we can identify later
        processedContent = processedContent.replace(match[0], `__THINK_BLOCK_${index}__`);
        index++;
    }

    return { processedContent, thinkBlocks };
};

export function ChatHistoryModal({ isOpen, onClose, sessions, onSelect, onDelete }: ChatHistoryModalProps) {
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [msgsCopied, setMsgsCopied] = useState<number | null>(null);

    const handleCopyMessage = (content: string, index: number) => {
        navigator.clipboard.writeText(content);
        setMsgsCopied(index);
        setTimeout(() => setMsgsCopied(null), 2000);
    };

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

    // Scroll to top when switching between chats
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const prevHighlightedIndexRef = useRef<number | null>(null);

    useEffect(() => {
        if (prevHighlightedIndexRef.current !== null &&
            prevHighlightedIndexRef.current !== highlightedIndex &&
            previewContainerRef.current) {
            previewContainerRef.current.scrollTop = 0;
        }
        prevHighlightedIndexRef.current = highlightedIndex;
    }, [highlightedIndex]);

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
                    <div className="w-1/3 border-r border-white/10 flex flex-col bg-black/20 flex-shrink-0">
                        {/* Search Bar */}
                        <div className="p-3 border-b border-white/5">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setHighlightedIndex(0);
                                }}
                                placeholder="Search titles..."
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
                    <div className="flex-1 flex flex-col bg-black/40 relative min-w-0 overflow-hidden">
                        {selectedSession ? (
                            <>
                                <div className="p-4 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm flex items-center justify-between">
                                    <h4 className="text-white/90 font-medium truncate text-lg">{selectedSession.title || 'Untitled Chat'}</h4>
                                    <p className="text-xs text-white/40 font-mono shrink-0 ml-4">
                                        {selectedSession.messages.length} messages
                                    </p>
                                </div>
                                <div ref={previewContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8 custom-scrollbar relative" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)' }}>
                                    {selectedSession.messages.map((msg, idx) => (
                                        <div key={idx} className="flex flex-col w-full max-w-full min-w-0">
                                            {/* Avatar and name on top */}
                                            <div className="flex items-center gap-2 mb-2">
                                                {msg.role === 'assistant' ? (
                                                    <>
                                                        <img
                                                            src="/anchor-avatar.png"
                                                            alt="Anchor"
                                                            className="w-6 h-6 rounded-full flex-shrink-0"
                                                        />
                                                        <span className="text-sm text-white/60 font-medium">Anchor</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                                            <User size={16} className="text-white" />
                                                        </div>
                                                        <span className="text-sm text-white/60 font-medium">You</span>
                                                    </>
                                                )}
                                            </div>

                                            <div className={`w-full px-0 py-2 transition-all overflow-hidden ${msg.role === 'user' ? 'bg-white/5 rounded-lg px-4 py-3 backdrop-blur-sm' : ''}`}>
                                                <div className={`leading-normal text-left break-words overflow-wrap-anywhere ${msg.role === 'user' ? 'text-cyan-100' : 'text-gray-300'}`} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                    {(() => {
                                                        const { processedContent, thinkBlocks } = preprocessContent(msg.content);
                                                        const parts = processedContent.split(/(__THINK_BLOCK_\d+__)/);

                                                        return (
                                                            <>
                                                                {parts.map((part, i) => {
                                                                    const thinkMatch = part.match(/__THINK_BLOCK_(\d+)__/);
                                                                    if (thinkMatch) {
                                                                        const blockIndex = parseInt(thinkMatch[1]);
                                                                        return <ThinkBlock key={`think-${i}`}>{thinkBlocks[blockIndex]}</ThinkBlock>;
                                                                    }
                                                                    if (!part.trim()) return null;
                                                                    return (
                                                                        <ReactMarkdown
                                                                            key={`md-${i}`}
                                                                            remarkPlugins={[remarkGfm]}
                                                                            components={{
                                                                                p: ({ node, ...props }) => <p className="my-2 break-words" style={{ overflowWrap: 'anywhere' }} {...props} />,
                                                                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-3 break-words" style={{ overflowWrap: 'anywhere' }} {...props} />,
                                                                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-3 break-words" style={{ overflowWrap: 'anywhere' }} {...props} />,
                                                                                h3: ({ node, ...props }) => <h3 className="text-lg font-semibold my-3 break-words" style={{ overflowWrap: 'anywhere' }} {...props} />,
                                                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 ml-2 my-3 break-words" {...props} />,
                                                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 ml-2 my-3 break-words" {...props} />,
                                                                                li: ({ node, ...props }) => <li className="my-1 break-words" style={{ overflowWrap: 'anywhere' }} {...props} />,
                                                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-white/20 pl-4 py-1 my-4 italic bg-white/5 rounded-r" {...props} />,
                                                                                hr: ({ node, ...props }) => <hr className="my-6 border-t-2 border-white/60" {...props} />,
                                                                                pre: ({ children }) => <>{children}</>,
                                                                                table: TableBlock,
                                                                                thead: ({ node, ...props }) => <thead className="bg-white/5 text-xs uppercase font-medium text-white/60" {...props} />,
                                                                                tbody: ({ node, ...props }) => <tbody className="text-gray-300" {...props} />,
                                                                                tr: ({ node, ...props }) => <tr className="" {...props} />,
                                                                                th: ({ node, ...props }) => <th className="px-4 py-2 font-medium first:rounded-tl-md last:rounded-tr-md border-b border-white/5" {...props} />,
                                                                                td: ({ node, ...props }) => <td className="px-4 py-2 border border-white/5 first:rounded-bl-md last:rounded-br-md" {...props} />,
                                                                                code({ node, inline, className, children, ...props }: any) {
                                                                                    const isMatch = /language-(\w+)/.exec(className || '');
                                                                                    const hasNewLine = String(children).replace(/\n$/, '').includes('\n');
                                                                                    const isBlock = isMatch || hasNewLine;
                                                                                    const [copied, setCopied] = useState(false);
                                                                                    const codeContent = String(children).replace(/\n$/, '');

                                                                                    const handleCopy = () => {
                                                                                        navigator.clipboard.writeText(codeContent);
                                                                                        setCopied(true);
                                                                                        setTimeout(() => setCopied(false), 2000);
                                                                                    };

                                                                                    return isBlock ? (
                                                                                        <div className="relative group/code rounded-lg overflow-hidden border border-white/10 my-4 bg-black/50 text-left backdrop-blur-sm max-w-full">
                                                                                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 text-xs text-gray-400">
                                                                                                <span>{isMatch ? isMatch[1] : 'code'}</span>
                                                                                                <button onClick={handleCopy} className="hover:text-white transition-colors">
                                                                                                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                                                                                </button>
                                                                                            </div>
                                                                                            <div className="overflow-x-auto">
                                                                                                <SyntaxHighlighter
                                                                                                    {...props}
                                                                                                    style={oneDark}
                                                                                                    language={isMatch ? isMatch[1] : 'text'}
                                                                                                    PreTag="div"
                                                                                                    wrapLongLines={false}
                                                                                                    codeTagProps={{ style: { backgroundColor: 'transparent', whiteSpace: 'pre' } }}
                                                                                                    customStyle={{
                                                                                                        margin: 0,
                                                                                                        padding: '1rem',
                                                                                                        background: 'transparent',
                                                                                                        lineHeight: '1.5',
                                                                                                        fontSize: '0.875rem',
                                                                                                        whiteSpace: 'pre',
                                                                                                        overflowX: 'auto'
                                                                                                    }}
                                                                                                >
                                                                                                    {codeContent}
                                                                                                </SyntaxHighlighter>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <code {...props} className={`${className} bg-white/10 rounded px-1.5 py-0.5 text-red-200`}>
                                                                                            {children}
                                                                                        </code>
                                                                                    );
                                                                                },
                                                                            }}
                                                                        >
                                                                            {part}
                                                                        </ReactMarkdown>
                                                                    );
                                                                })}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Meta and Actions */}
                                            <div className="flex items-center gap-2 mt-1.5">
                                                {msg.timestamp && (
                                                    <span className="text-[10px] text-white/30 font-mono">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}

                                                {msg.role === 'assistant' && msg.content !== '' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleCopyMessage(msg.content, idx)}
                                                            className="text-white/30 hover:text-white transition-colors p-1"
                                                            title="Copy Message"
                                                        >
                                                            {msgsCopied === idx ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                                        </button>
                                                        {msg.model && (
                                                            <span className="text-xs text-white/40 font-mono py-0.5 rounded-md">
                                                                {msg.model}
                                                            </span>
                                                        )}
                                                    </>
                                                )}

                                                {msg.role === 'user' && (
                                                    <button
                                                        onClick={() => handleCopyMessage(msg.content, idx)}
                                                        className="text-white/30 hover:text-white transition-colors p-1"
                                                        title="Copy Message"
                                                    >
                                                        {msgsCopied === idx ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
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
