import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
    onSend: (content: string) => void;
    disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [input, setInput] = useState('');
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

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    return (
        <div className="p-0 bg-transparent">
            <div className="relative max-w-4xl mx-auto flex items-end gap-2">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={disabled}
                    rows={1}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 resize-none max-h-[200px] overflow-y-auto transition-all backdrop-blur-md shadow-lg"
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || disabled}
                    className="p-4 rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all mb-[1px] backdrop-blur-sm"
                >
                    <Send size={20} />
                </button>
            </div>
            <div className="text-center mt-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] text-white/20 uppercase tracking-widest font-mono">
                    Press Enter to send
                </span>
            </div>
        </div>
    );
}
