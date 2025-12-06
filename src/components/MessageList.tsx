import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types';
import { Bot, User } from 'lucide-react';

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                    <Bot size={48} className="mb-4" />
                    <p className="text-lg font-medium">Start a conversation</p>
                </div>
            )}

            {messages.map((msg, index) => (
                <div
                    key={index}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-accent-gradient flex items-center justify-center flex-shrink-0">
                            <Bot size={16} className="text-white" />
                        </div>
                    )}

                    <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-accent-gradient text-white rounded-br-none'
                                : 'glass text-gray-100 rounded-bl-none'
                            }`}
                    >
                        <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <User size={16} className="text-white" />
                        </div>
                    )}
                </div>
            ))}

            {isLoading && (
                <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-accent-gradient flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-white" />
                    </div>
                    <div className="glass px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}
        </div>
    );
}
