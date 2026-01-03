'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
    onSend: (content: string) => void;
    disabled: boolean;
    hideSendButton?: boolean;
}

export function ChatInput({ onSend, disabled, hideSendButton = false }: ChatInputProps) {
    const [input, setInput] = useState('');
    const [isMultiLine, setIsMultiLine] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (input.trim() && !disabled) {
            onSend(input);
            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);

        // Update height and multi-line state immediately
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${newHeight}px`;

            // Check if textarea is multi-line
            const lineHeight = 24;
            setIsMultiLine(newHeight > lineHeight * 1.5);
        }
    };

    useEffect(() => {
        // Reset on send
        if (!input && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            setIsMultiLine(false);
        }
    }, [input]);

    // Handle window resize to adjust textarea height
    useEffect(() => {
        const handleResize = () => {
            if (textareaRef.current && input) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [input]);

    return (
        <div className="p-0 bg-transparent">
            <div className={`relative max-w-4xl mx-auto flex items-end gap-2 ${hideSendButton ? 'justify-center' : ''}`}>
                <div className={`w-full backdrop-blur-md bg-black/30 border border-white/30 shadow-2xl p-3 transition-all duration-300 ease-out hover:bg-black/40 focus-within:bg-black/50 focus-within:border-white/70 ${isMultiLine ? 'rounded-2xl' : 'rounded-[32px]'}`}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        disabled={disabled}
                        rows={1}
                        className="w-full bg-transparent text-white border-none placeholder-white/40 focus:outline-none resize-none max-h-24 overflow-y-auto px-2 font-light tracking-wide"
                    />
                </div>
                {!hideSendButton && (
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || disabled}
                        className="p-4 rounded-full bg-white/10 text-white/90 hover:text-white hover:bg-white/20 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-md shadow-lg hover:shadow-blue-400/20"
                    >
                        <Send size={20} />
                    </button>
                )}
            </div>
            <div className="text-center mt-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] text-white/20 uppercase tracking-widest font-mono">
                    Press Enter to send
                </span>
            </div>
        </div>
    );
}
