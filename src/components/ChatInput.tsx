import { useState, KeyboardEvent, useRef, useEffect, useLayoutEffect } from 'react';
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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${newHeight}px`;
            
            // Check if textarea is multi-line
            const lineHeight = 24;
            setIsMultiLine(newHeight > lineHeight * 1.5);
        }
    }, [input]);

    return (
        <div className="p-0 bg-transparent">
            <div className={`relative max-w-4xl mx-auto flex items-end gap-2 ${hideSendButton ? 'justify-center' : ''}`}>
                <div className={`w-full backdrop-blur-sm bg-white/20 border border-white/50 p-3 transition-[border-radius] duration-300 ease-in-out ${isMultiLine ? 'rounded-xl' : 'rounded-3xl'}`}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        disabled={disabled}
                        rows={1}
                        className="w-full bg-transparent text-white border-none placeholder-white/50 focus:outline-none resize-none max-h-24 overflow-y-auto px-3"
                    />
                </div>
                {!hideSendButton && (
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || disabled}
                        className="p-4 rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all mb-[1px] backdrop-blur-sm"
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
