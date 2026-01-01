import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '@/types';
import { Bot, User, Copy, Check, RotateCcw, Pencil, X } from 'lucide-react';

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    onRetry?: (index: number) => void;
    onEdit?: (index: number, newContent: string) => void;
    displayMode?: 'chat' | 'compact';
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

export function MessageList({ messages, isLoading, onRetry, onEdit, displayMode = 'chat' }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [msgsCopied, setMsgsCopied] = useState<number | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (bottomRef.current && editingIndex === null) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEdit(index);
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
            {messages.map((msg, index) => (
                <div
                    key={index}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                >
                    {/* Assistant Avatar - Hide in Compact Mode */}
                    {displayMode === 'chat' && msg.role === 'assistant' && (
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-slate-300 to-blue-400 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-blue-400/20">
                                <Bot size={16} className="text-white" />
                            </div>
                        </div>
                    )}

                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                        <div
                            className={`rounded-2xl transition-all 
                                ${editingIndex === index
                                    ? 'p-0 border-none bg-transparent'
                                    : `p-4 ${displayMode === 'chat' ? 'shadow-sm backdrop-blur-md border' : 'px-0 py-4'}`
                                }
                                ${editingIndex !== index && msg.role === 'user'
                                    ? (displayMode === 'chat' ? 'bg-white/10 border-white/10 text-white rounded-br-sm' : 'text-cyan-100')
                                    : ''
                                }
                                ${editingIndex !== index && msg.role === 'assistant'
                                    ? (displayMode === 'chat' ? 'bg-white/5 border-white/5 text-gray-100 rounded-bl-sm' : 'text-gray-300')
                                    : ''
                                }`}
                        >
                            {editingIndex === index ? (
                                <div className="flex flex-col gap-3 w-full min-w-[300px] backdrop-blur-xl bg-black/30 border border-white/10 shadow-2xl rounded-2xl p-4 transition-all">
                                    <textarea
                                        ref={textareaRef}
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
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
                                        <div className={`leading-normal ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    // Text Elements
                                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className={`list-disc mb-4 ${msg.role === 'user' ? 'list-inside' : 'pl-4'}`} {...props} />,
                                                    ol: ({ node, ...props }) => <ol className={`list-decimal mb-4 ${msg.role === 'user' ? 'list-inside' : 'pl-4'}`} {...props} />,
                                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-white/20 pl-4 py-1 my-4 italic bg-white/5 rounded-r" {...props} />,
                                                    hr: ({ node, ...props }) => <hr className="my-6 border-t-2 border-white/20" {...props} />,
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
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Meta and Actions */}
                        <div className={`flex items-center gap-2 mt-1.5 ${msg.role === 'user' ? 'justify-end' : ''} ${editingIndex === index ? 'opacity-0 pointer-events-none' : ''} transition-opacity`}>
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

                    {displayMode === 'chat' && msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <User size={16} className="text-white" />
                        </div>
                    )}
                </div>
            ))}

            <div ref={bottomRef} />
        </div>
    );
}
