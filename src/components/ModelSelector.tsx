import { useEffect, useState, useRef } from 'react';
import { X, Check, Cpu } from 'lucide-react';

interface ModelSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    models: string[];
    selectedModel: string;
    onSelect: (model: string) => void;
}

export function ModelSelector({ isOpen, onClose, models, selectedModel, onSelect }: ModelSelectorProps) {
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    // Filter models
    const filteredModels = models.filter(m => 
        m.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setSearchQuery(''); // Reset search on open
            // Initial highlight: if current model is in list, highlight it, else 0
            const index = models.indexOf(selectedModel);
            setHighlightedIndex(index >= 0 ? index : 0);
        }
    }, [isOpen, models, selectedModel]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            // Navigation
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev + 1) % (filteredModels.length || 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev - 1 + (filteredModels.length || 1)) % (filteredModels.length || 1));
            } 
            // Selection
            else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation(); // Stop event from reaching other elements (like the chat input)
                if (filteredModels.length > 0) {
                    onSelect(filteredModels[highlightedIndex]);
                    onClose();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            } else if (e.key === 'Backspace') {
                setSearchQuery(prev => prev.slice(0, -1));
                setHighlightedIndex(0); // Reset selection on change
            } else if (e.key.length === 1 && /^[a-zA-Z0-9\s\-\.]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Type-ahead
                setSearchQuery(prev => prev + e.key);
                setHighlightedIndex(0); // Reset selection on change
            }
        };

        window.addEventListener('keydown', handleKeyDown, true); // Use capture to intercept before input
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, filteredModels, highlightedIndex, onSelect, onClose]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (listRef.current && isOpen) {
            const element = listRef.current.children[highlightedIndex] as HTMLElement;
            if (element) {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen, filteredModels]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl flex flex-col animate-in fade-in zoom-in duration-150 overflow-hidden">
                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2 text-white/80">
                        <Cpu size={16} />
                        <span className="font-medium text-sm">Select Model</span>
                    </div>
                    <div className="text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded">
                        Prop: ↑ ↓ / Type to filter
                    </div>
                </div>
                
                {/* Search Feedback (Only show if user has typed) */}
                {searchQuery && (
                    <div className="px-3 py-2 border-b border-white/5 bg-white/5 text-sm text-cyan-400 font-mono">
                        <span className="text-white/40 mr-2">Searching:</span>
                        {searchQuery}<span className="animate-pulse">_</span>
                    </div>
                )}

                <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2">
                    {filteredModels.map((model, index) => (
                        <button
                            key={model}
                            onClick={() => {
                                onSelect(model);
                                onClose();
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                                index === highlightedIndex 
                                    ? 'bg-cyan-500/20 text-cyan-400' 
                                    : 'text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <span className="text-sm font-medium truncate flex-1">
                                {model}
                            </span>
                            {model === selectedModel && (
                                <Check size={14} className="text-cyan-400 ml-2" />
                            )}
                        </button>
                    ))}
                    {filteredModels.length === 0 && (
                        <div className="text-center py-8 text-white/30 text-sm">
                            No models match "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
