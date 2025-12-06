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
        <div className="p-4 glass-panel border-t border-white/10">
            <div className="relative max-w-4xl mx-auto flex items-end gap-2">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={disabled}
                    rows={1}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 focus:bg-white/10 resize-none max-h-[200px] overflow-y-auto transition-all"
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || disabled}
                    className="p-3 rounded-xl bg-accent-gradient text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mb-[1px]"
                >
                    <Send size={20} />
                </button>
            </div>
            <div className="text-center mt-2">
                <span className="text-xs text-gray-500">
                    Press Enter to send, Shift + Enter for new line
                </span>
            </div>
        </div>
    );
}
