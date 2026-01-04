import { useState, useEffect, useRef } from 'react';
import { Message } from '@/types';

interface TableOfContentsProps {
    messages: Message[];
}

export function TableOfContents({ messages }: TableOfContentsProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isHoveringPanel, setIsHoveringPanel] = useState(false);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const windowWidth = window.innerWidth;
            const threshold = windowWidth - 50; // Show when within 50px of right edge

            // Show if near edge OR hovering over panel
            const nearEdge = e.clientX > threshold;
            setIsVisible(nearEdge || isHoveringPanel);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isHoveringPanel]);

    const handleMouseEnter = (index: number) => {
        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        // Set timeout for 0.5 seconds
        hoverTimeoutRef.current = setTimeout(() => {
            setExpandedIndex(index);
        }, 500);
    };

    const handleMouseLeave = () => {
        // Clear timeout and collapse immediately
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        setExpandedIndex(null);
    };

    const scrollToMessage = (index: number) => {
        const element = document.getElementById(`message-${index}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const getCleanContent = (content: any): string => {
        let text = '';

        if (typeof content === 'string') {
            text = content;
        } else if (Array.isArray(content)) {
            text = content
                .map(item => {
                    if (typeof item === 'string') return item;
                    if (item?.type === 'text') return item.text || '';
                    return '';
                })
                .join(' ');
        } else if (content && typeof content === 'object') {
            text = content.text || content.content || '';
        }

        // Remove markdown, code blocks, and think tags
        text = text
            .replace(/<think>[\s\S]*?<\/think>/g, '')
            .replace(/```[\s\S]*?```/g, '[code]')
            .replace(/`[^`]+`/g, '')
            .replace(/[#*_~]/g, '')
            .trim();

        return text;
    };

    if (messages.length === 0) return null;

    return (
        <>
            {/* Invisible trigger area */}
            <div
                className="fixed right-0 top-0 bottom-0 w-12 z-40 pointer-events-auto"
                style={{ cursor: isVisible ? 'pointer' : 'default' }}
            />

            {/* Table of Contents Panel */}
            <div
                onMouseEnter={() => setIsHoveringPanel(true)}
                onMouseLeave={() => setIsHoveringPanel(false)}
                className={`fixed right-4 top-1/2 -translate-y-1/2 w-80 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 transition-all duration-300 ease-out overflow-hidden flex flex-col ${
                    isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
                }`}
                style={{ maxHeight: '70vh' }}
            >
                {/* Contents */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
                        {messages.map((msg, index) => {
                            const cleanContent = getCleanContent(msg.content);
                            if (!cleanContent) return null;

                            return (
                                <button
                                    key={index}
                                    onClick={() => scrollToMessage(index)}
                                    onMouseEnter={() => handleMouseEnter(index)}
                                    onMouseLeave={handleMouseLeave}
                                    className={`block text-left py-2 mb-1 rounded-lg transition-all duration-500 ease-in-out hover:bg-white/10 border border-transparent hover:border-white/5 group ${
                                        msg.role === 'user' ? 'w-full bg-white/5 px-3' : 'w-[calc(100%-0.5rem)] ml-2 bg-transparent px-3'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[11px] text-white/80 overflow-hidden transition-all duration-700 ease-in-out ${
                                            expandedIndex === index ? 'max-h-[100px] text-white' : 'max-h-[2.6em]'
                                        }`}
                                        style={{ lineHeight: '1.3em' }}>
                                            {cleanContent}
                                        </div>
                                        {msg.timestamp && (
                                            <div className="text-[9px] text-white/30 mt-1 font-mono">
                                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                </div>
            </div>
        </>
    );
}
