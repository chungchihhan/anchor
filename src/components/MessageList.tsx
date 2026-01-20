import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '@/types';
import { User, Copy, Check, RotateCcw, Pencil, X } from 'lucide-react';

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    onRetry?: (index: number) => void;
    onEdit?: (index: number, newContent: string) => void;
    displayMode?: 'compact' | 'columns';
    selectedMessageIndex?: number | null;
    shouldShake?: boolean;
}

const TableBlock = ({ node, className, children, ...props }: any) => {
    return (
        <div className="relative group/code rounded-lg overflow-hidden border border-white/10 my-4 bg-black/50 text-left backdrop-blur-sm">
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

export function MessageList({ messages, isLoading, onRetry, onEdit, displayMode = 'compact', selectedMessageIndex = null, shouldShake = false }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [msgsCopied, setMsgsCopied] = useState<number | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isComposingRef = useRef(false);
    const justFinishedComposingRef = useRef(false);
    const shouldAutoScrollRef = useRef(true);
    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const isAutoScrollingRef = useRef(false);
    const lastScrollTopRef = useRef(0);
    const prevMessagesLengthRef = useRef(0);
    const prevIsLoadingRef = useRef(false);
    const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Scroll to selected message
    useEffect(() => {
        if (selectedMessageIndex !== null && messageRefs.current[selectedMessageIndex]) {
            const element = messageRefs.current[selectedMessageIndex];
            if (element) {
                // Find the scroll container (div with overflow-y-auto)
                const scrollContainer = element.closest('.overflow-y-auto');
                if (scrollContainer) {
                    const topOffset = 30; // Offset for top spacing
                    const elementPosition = element.offsetTop;
                    const offsetPosition = elementPosition - topOffset;
                    
                    scrollContainer.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [selectedMessageIndex]);

    // Find and set up the scroll container
    useEffect(() => {
        if (!containerRef.current) return;

        // The scroll container is the parent with overflow-y-auto
        // In page.tsx it's the "absolute inset-0 overflow-y-auto" div
        let parent = containerRef.current.parentElement;
        while (parent) {
            const style = window.getComputedStyle(parent);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                scrollContainerRef.current = parent;
                break;
            }
            parent = parent.parentElement;
        }

        const container = scrollContainerRef.current;
        if (!container) return;

        // Check initial position
        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        shouldAutoScrollRef.current = distanceFromBottom < 5;
        lastScrollTopRef.current = scrollTop;

        // Handle scroll events
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            
            // If this is a user-initiated scroll (not auto-scroll)
            if (!isAutoScrollingRef.current) {
                // If user scrolled up, disable auto-scroll immediately
                if (scrollTop < lastScrollTopRef.current) {
                    shouldAutoScrollRef.current = false;
                } else {
                    // If user scrolled down, check if near bottom (more generous threshold)
                    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
                    if (distanceFromBottom < 150) {
                        shouldAutoScrollRef.current = true;
                    }
                }
            }
            
            lastScrollTopRef.current = scrollTop;
            isAutoScrollingRef.current = false;
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Auto-scroll on message updates
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || editingIndex !== null) return;

        // Check if there's a new user message (comparing with previous length)
        const hasNewMessage = messages.length > prevMessagesLengthRef.current;
        const lastMessage = messages[messages.length - 1];
        const secondLastMessage = messages.length > 1 ? messages[messages.length - 2] : null;
        
        // Detect new user prompt: either last message is user, or second-to-last is user (assistant already started)
        const newUserPrompt = hasNewMessage && (
            lastMessage?.role === 'user' || 
            (secondLastMessage?.role === 'user' && prevMessagesLengthRef.current < messages.length - 1)
        );
        
        // Detect loading start (includes retry, regenerate, and new prompts)
        const loadingStarted = !prevIsLoadingRef.current && isLoading;
        
        // Scroll to bottom function
        const scrollToBottom = () => {
            isAutoScrollingRef.current = true;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                        lastScrollTopRef.current = container.scrollTop;
                    }
                });
            });
        };
        
        // If user sent a new prompt or triggered retry/regenerate, force scroll to bottom
        if (newUserPrompt || loadingStarted) {
            shouldAutoScrollRef.current = true;
            scrollToBottom();
        } else if (shouldAutoScrollRef.current) {
            // Normal auto-scroll for streaming responses
            scrollToBottom();
        }

        prevMessagesLengthRef.current = messages.length;
        prevIsLoadingRef.current = isLoading;
    }, [messages, isLoading, editingIndex]);

    // Auto-resize textarea
    useEffect(() => {
        if (editingIndex !== null && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [editContent, editingIndex]);

    const handleCopyMessage = (content: string, index: number) => {
        navigator.clipboard.writeText(content);
        setMsgsCopied(index);
        setTimeout(() => setMsgsCopied(null), 2000);
    };

    const startEditing = (index: number, content: string) => {
        setEditingIndex(index);
        setEditContent(content);
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setEditContent('');
    };

    const saveEdit = (index: number) => {
        if (editContent.trim() !== '' && onEdit) {
            onEdit(index, editContent);
            setEditingIndex(null);
            setEditContent('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        // Check for IME composition using keyCode 229
        if (e.nativeEvent.keyCode === 229) {
            return;
        }

        // Block Enter if currently composing
        if (e.nativeEvent.isComposing || isComposingRef.current) {
            return;
        }

        // Block Enter if we just finished composing (to avoid saving when confirming IME)
        if (justFinishedComposingRef.current && e.key === 'Enter') {
            justFinishedComposingRef.current = false;
            return;
        }
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEdit(index);
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    return (
        <div ref={containerRef} className={displayMode === 'columns' ? 'p-4' : 'p-4 space-y-8'}>
            {displayMode === 'columns' ? (
                /* Columns Mode: Two-column layout with prompts on left, responses on right */
                <div className="space-y-0">
                    {messages.reduce((rows: any[], msg, index) => {
                        if (msg.role === 'user') {
                            // Start a new row with the user message
                            rows.push({ userMsg: msg, userIndex: index, assistantMsg: null, assistantIndex: -1 });
                        } else if (msg.role === 'assistant' && rows.length > 0) {
                            // Add assistant message to the last row
                            rows[rows.length - 1].assistantMsg = msg;
                            rows[rows.length - 1].assistantIndex = index;
                        }
                        return rows;
                    }, []).map((row, rowIndex) => (
                        <div 
                            key={rowIndex} 
                            ref={(el) => { 
                                messageRefs.current[row.userIndex] = el;
                                if (row.assistantIndex >= 0) {
                                    messageRefs.current[row.assistantIndex] = el;
                                }
                            }}
                            className="grid grid-cols-2 gap-0 py-6 first:pt-0 transition-all"
                            style={{
                                animation: ((selectedMessageIndex === row.userIndex || selectedMessageIndex === row.assistantIndex) && shouldShake)
                                    ? 'shake 0.5s ease-in-out'
                                    : 'none'
                            }}
                        >
                            {/* Left Column - User Prompt */}
                            <div id={`message-${row.userIndex}`} className="pr-6 border-r border-white/5">
                                {/* User Avatar */}
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <User size={14} className="text-white" />
                                    </div>
                                    <span className="text-sm text-white/60 font-medium">You</span>
                                </div>
                                
                                {editingIndex === row.userIndex ? (
                                    <div className="flex flex-col gap-3 w-full backdrop-blur-xl bg-black/30 border border-white/10 shadow-2xl rounded-2xl p-4 transition-all">
                                        <textarea
                                            ref={textareaRef}
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, row.userIndex)}
                                            onCompositionStart={() => {
                                                isComposingRef.current = true;
                                                justFinishedComposingRef.current = false;
                                            }}
                                            onCompositionEnd={() => {
                                                isComposingRef.current = false;
                                                justFinishedComposingRef.current = true;
                                                setTimeout(() => {
                                                    justFinishedComposingRef.current = false;
                                                }, 200);
                                            }}
                                            className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-white/40 p-0 text-base leading-relaxed font-light tracking-wide"
                                            rows={1}
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                                            <button
                                                onClick={cancelEditing}
                                                className="px-4 py-2 rounded-full text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/5"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => saveEdit(row.userIndex)}
                                                className="px-4 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-all shadow-lg hover:shadow-blue-400/20 border border-white/10 backdrop-blur-md"
                                            >
                                                Save & Generate
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-cyan-100 leading-normal text-left whitespace-pre-wrap">
                                            {typeof row.userMsg.content === 'string' ? row.userMsg.content : 
                                                Array.isArray(row.userMsg.content) ? row.userMsg.content.map((item: any) => 
                                                    typeof item === 'string' ? item : item?.text || ''
                                                ).join('\n') : ''}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 transition-opacity">
                                            {row.userMsg.timestamp && (
                                                <span className="text-[10px] text-white/30 font-mono">
                                                    {new Date(row.userMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            {!isLoading && (
                                                <>
                                                    <button
                                                        onClick={() => handleCopyMessage(row.userMsg.content, row.userIndex)}
                                                        className="text-white/30 hover:text-white transition-colors p-1"
                                                        title="Copy Message"
                                                    >
                                                        {msgsCopied === row.userIndex ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                                    </button>
                                                    <button
                                                        onClick={() => startEditing(row.userIndex, row.userMsg.content)}
                                                        className="text-white/30 hover:text-white transition-colors p-1"
                                                        title="Edit Message"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* Right Column - Assistant Response */}
                            <div id={`message-${row.assistantIndex}`} className="pl-6">
                                {/* Anchor Avatar */}
                                <div className="flex items-center gap-2 mb-3">
                                    <img 
                                        src="/anchor-avatar.png" 
                                        alt="Anchor" 
                                        className="w-6 h-6 rounded-full flex-shrink-0"
                                    />
                                    <span className="text-sm text-white/60 font-medium">Anchor</span>
                                </div>
                                
                                {row.assistantMsg ? (
                                    <>
                                        {row.assistantMsg.content === '' && isLoading && row.assistantIndex === messages.length - 1 ? (
                                            <div className="flex items-center gap-2 h-6">
                                                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-gray-300 leading-normal text-left">
                                                    {(() => {
                                                        const { processedContent, thinkBlocks } = preprocessContent(row.assistantMsg.content);
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
                                                                                p: ({ node, ...props }) => <p className="my-2" {...props} />,
                                                                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-3" {...props} />,
                                                                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-3" {...props} />,
                                                                                h3: ({ node, ...props }) => <h3 className="text-lg font-semibold my-3" {...props} />,
                                                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 ml-2 mb-4" {...props} />,
                                                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 ml-2 mb-4" {...props} />,
                                                                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
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
                                                                                        <div className="relative group/code rounded-lg overflow-hidden border border-white/10 my-4 bg-black/50 text-left backdrop-blur-sm">
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
                                                                                                    wrapLongLines={true}
                                                                                                    codeTagProps={{ style: { backgroundColor: 'transparent' } }}
                                                                                                    customStyle={{ margin: 0, padding: '1rem', background: 'transparent', lineHeight: '1.5' }}
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
                                                                                }
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
                                                <div className="flex items-center gap-2 mt-1.5 transition-opacity">
                                                    {row.assistantMsg.timestamp && (
                                                        <span className="text-[10px] text-white/30 font-mono">
                                                            {new Date(row.assistantMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                    {row.assistantMsg.content !== '' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleCopyMessage(row.assistantMsg.content, row.assistantIndex)}
                                                                className="text-white/30 hover:text-white transition-colors p-1"
                                                                title="Copy Message"
                                                            >
                                                                {msgsCopied === row.assistantIndex ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                                            </button>
                                                            <button
                                                                onClick={() => onRetry?.(row.assistantIndex)}
                                                                className="text-white/30 hover:text-white transition-colors p-1"
                                                                title="Regenerate Response"
                                                            >
                                                                <RotateCcw size={12} />
                                                            </button>
                                                            {row.assistantMsg.model && (
                                                                <span className="text-xs text-white/40 font-mono py-0.5 rounded-md">
                                                                    {row.assistantMsg.model}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : isLoading && rowIndex === messages.filter(m => m.role === 'user').length - 1 ? (
                                    <div className="flex items-center gap-2 h-6">
                                        <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Compact Mode: Avatars on top of messages */
                messages.map((msg, index) => (
                    <div
                        id={`message-${index}`}
                        key={index}
                        ref={(el) => { messageRefs.current[index] = el; }}
                        className="flex flex-col group transition-all"
                        style={{
                            animation: (selectedMessageIndex === index && shouldShake) ? 'shake 0.5s ease-in-out' : 'none'
                        }}
                    >
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

                        <div className="flex flex-col items-start w-full">
                            <div className={`w-full px-0 py-2 transition-all ${msg.role === 'user' ? 'bg-white/5 rounded-lg px-4 py-3 backdrop-blur-sm' : ''}`}>
                                {editingIndex === index ? (
                                    <div className="flex flex-col gap-3 w-full backdrop-blur-xl bg-black/30 border border-white/10 shadow-2xl rounded-2xl p-4 transition-all">
                                        <textarea
                                            ref={textareaRef}
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, index)}
                                            onCompositionStart={() => {
                                                isComposingRef.current = true;
                                                justFinishedComposingRef.current = false;
                                            }}
                                            onCompositionEnd={() => {
                                                isComposingRef.current = false;
                                                justFinishedComposingRef.current = true;
                                                setTimeout(() => {
                                                    justFinishedComposingRef.current = false;
                                                }, 200);
                                            }}
                                            className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-white/40 p-0 text-base leading-relaxed font-light tracking-wide"
                                            rows={1}
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                                            <button
                                                onClick={cancelEditing}
                                                className="px-4 py-2 rounded-full text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/5"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => saveEdit(index)}
                                                className="px-4 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-all shadow-lg hover:shadow-blue-400/20 border border-white/10 backdrop-blur-md"
                                            >
                                                Save & Generate
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {msg.role === 'assistant' && msg.content === '' && isLoading && index === messages.length - 1 ? (
                                            <div className="flex items-center gap-2 h-6">
                                                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        ) : (
                                            <div className={`leading-normal text-left ${msg.role === 'user' ? 'text-cyan-100' : 'text-gray-300'}`}>
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
                                                    p: ({ node, ...props }) => <p className="my-2" {...props} />,
                                                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-3" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-3" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-lg font-semibold my-3" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 ml-2 my-3" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 ml-2 my-3" {...props} />,
                                                    li: ({ node, ...props }) => <li className="my-1" {...props} />,
                                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-white/20 pl-4 py-1 my-4 italic bg-white/5 rounded-r" {...props} />,
                                                    hr: ({ node, ...props }) => <hr className="my-6 border-t-2 border-white/60" {...props} />,
                                                    pre: ({ children }) => <>{children}</>,

                                                    // Table Elements
                                                    table: TableBlock,
                                                    thead: ({ node, ...props }) => <thead className="bg-white/5 text-xs uppercase font-medium text-white/60" {...props} />,
                                                    tbody: ({ node, ...props }) => <tbody className="text-gray-300" {...props} />,
                                                    tr: ({ node, ...props }) => <tr className="" {...props} />,
                                                    th: ({ node, ...props }) => <th className="px-4 py-2 font-medium first:rounded-tl-md last:rounded-tr-md border-b border-white/5" {...props} />,
                                                    td: ({ node, ...props }) => <td className="px-4 py-2 border border-white/5 first:rounded-bl-md last:rounded-br-md" {...props} />,

                                                    // Code Blocks
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
                                                            <div className="relative group/code rounded-lg overflow-hidden border border-white/10 my-4 bg-black/50 text-left backdrop-blur-sm">
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
                                                                        wrapLongLines={true}
                                                                        codeTagProps={{ style: { backgroundColor: 'transparent' } }}
                                                                        customStyle={{ margin: 0, padding: '1rem', background: 'transparent', lineHeight: '1.5' }}
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
                                                    }
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
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Meta and Actions */}
                            <div className={`flex items-center gap-2 mt-1.5 ${editingIndex === index ? 'opacity-0 pointer-events-none' : ''} transition-opacity`}>
                                {msg.timestamp && (
                                    <span className="text-[10px] text-white/30 font-mono">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}

                                {msg.role === 'assistant' && msg.content !== '' && (
                                    <>
                                        <button
                                            onClick={() => handleCopyMessage(msg.content, index)}
                                            className="text-white/30 hover:text-white transition-colors p-1"
                                            title="Copy Message"
                                        >
                                            {msgsCopied === index ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                        </button>
                                        <button
                                            onClick={() => onRetry?.(index)}
                                            className="text-white/30 hover:text-white transition-colors p-1"
                                            title="Regenerate Response"
                                        >
                                            <RotateCcw size={12} />
                                        </button>
                                        {msg.model && (
                                            <span className="text-xs text-white/40 font-mono py-0.5 rounded-md">
                                                {msg.model}
                                            </span>
                                        )}
                                    </>
                                )}

                                {msg.role === 'user' && !isLoading && (
                                    <>
                                        <button
                                            onClick={() => handleCopyMessage(msg.content, index)}
                                            className="text-white/30 hover:text-white transition-colors p-1"
                                            title="Copy Message"
                                        >
                                            {msgsCopied === index ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                        </button>
                                        <button
                                            onClick={() => startEditing(index, msg.content)}
                                            className="text-white/30 hover:text-white transition-colors p-1"
                                            title="Edit Message"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}

            <div ref={bottomRef} />
        </div>
    );
}
