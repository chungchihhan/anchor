import { useEffect, useState, useRef, useMemo } from 'react';
import { X, Check, Cpu, Brain, Eye, Zap, FileText } from 'lucide-react';
import { groupModelsByProvider, getModelCapabilities } from '@/utils/modelMetadata';

interface ModelSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    models: string[];
    selectedModel: string;
    onSelect: (model: string) => void;
}

export function ModelSelector({ isOpen, onClose, models, selectedModel, onSelect }: ModelSelectorProps) {
    const [currentColumn, setCurrentColumn] = useState(0);
    const [currentRow, setCurrentRow] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const tableRef = useRef<HTMLDivElement>(null);

    // Filter models
    const filteredModels = models.filter(m =>
        m.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group filtered models by provider
    const groupedModels = groupModelsByProvider(filteredModels);
    const providers = Object.keys(groupedModels);
    const maxRows = Math.max(...Object.values(groupedModels).map(m => m.length), 0);

    // Get current highlighted model - memoize to prevent unnecessary re-renders
    const currentProvider = providers[currentColumn];
    const currentProviderModels = useMemo(() => {
        return currentProvider ? groupedModels[currentProvider] : [];
    }, [currentProvider, groupedModels]);
    const highlightedModel = currentProviderModels[currentRow] || null;

    useEffect(() => {
        if (isOpen) {
            setSearchQuery(''); // Reset search on open
            // Find the selected model in the 2D grid
            const currentProviders = Object.keys(groupedModels);
            if (currentProviders.length > 0) {
                let foundColumn = 0;
                let foundRow = 0;
                currentProviders.forEach((provider, colIndex) => {
                    const rowIndex = groupedModels[provider].indexOf(selectedModel);
                    if (rowIndex >= 0) {
                        foundColumn = colIndex;
                        foundRow = rowIndex;
                    }
                });
                setCurrentColumn(foundColumn);
                setCurrentRow(foundRow);
            }
        }
    }, [isOpen, models, selectedModel, searchQuery]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen || providers.length === 0) return;

            // Navigation - Left/Right for columns
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setCurrentColumn(prev => {
                    const nextCol = (prev + 1) % providers.length;
                    // Adjust row if new column has fewer rows
                    const newProviderModels = groupedModels[providers[nextCol]];
                    if (currentRow >= newProviderModels.length) {
                        setCurrentRow(Math.max(0, newProviderModels.length - 1));
                    }
                    return nextCol;
                });
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setCurrentColumn(prev => {
                    const nextCol = (prev - 1 + providers.length) % providers.length;
                    // Adjust row if new column has fewer rows
                    const newProviderModels = groupedModels[providers[nextCol]];
                    if (currentRow >= newProviderModels.length) {
                        setCurrentRow(Math.max(0, newProviderModels.length - 1));
                    }
                    return nextCol;
                });
            }
            // Navigation - Up/Down for rows (circular wrapping for carousel)
            else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const currentProviderModels = groupedModels[providers[currentColumn]];
                if (currentProviderModels && currentProviderModels.length > 0) {
                    setCurrentRow(prev => (prev + 1) % currentProviderModels.length);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const currentProviderModels = groupedModels[providers[currentColumn]];
                if (currentProviderModels && currentProviderModels.length > 0) {
                    setCurrentRow(prev => (prev - 1 + currentProviderModels.length) % currentProviderModels.length);
                }
            }
            // Selection
            else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (highlightedModel) {
                    onSelect(highlightedModel);
                    onClose();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            } else if (e.key === 'Backspace') {
                setSearchQuery(prev => prev.slice(0, -1));
                setCurrentColumn(0);
                setCurrentRow(0);
            } else if (e.key.length === 1 && /^[a-zA-Z0-9\s\-\.]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Type-ahead
                setSearchQuery(prev => prev + e.key);
                setCurrentColumn(0);
                setCurrentRow(0);
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, providers, groupedModels, currentColumn, currentRow, highlightedModel, onSelect, onClose]);

    // Memoize visible providers - show all providers, calculate offset from current selection
    const visibleProviders = useMemo(() => {
        return providers.map((provider, index) => ({
            provider,
            offset: index - currentColumn,
            index
        }));
    }, [currentColumn, providers]);

    // Memoize visible models - show all models, calculate offset from current selection
    const visibleModels = useMemo(() => {
        if (!currentProviderModels || currentProviderModels.length === 0) return [];

        return currentProviderModels.map((model, index) => ({
            model,
            offset: index - currentRow,
            index
        }));
    }, [currentRow, currentProviderModels]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-150 overflow-hidden ring-1 ring-white/5 max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                    <div className="flex items-center gap-2 text-white">
                        <Cpu size={18} className="text-cyan-400 animate-pulse" />
                        <span className="font-medium">Model Carousel</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded font-mono">
                            ← → Rotate • ↑ ↓ Scroll • Type to filter
                        </div>
                        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Search Feedback */}
                {searchQuery && (
                    <div className="px-4 py-2 border-b border-white/10 bg-white/5 text-sm text-cyan-400 font-mono shrink-0">
                        <span className="text-white/40 mr-2">Searching:</span>
                        {searchQuery}<span className="animate-pulse">_</span>
                    </div>
                )}

                {/* Carousel Container */}
                <div ref={tableRef} className="flex-1 p-4 bg-black/40 flex flex-col gap-6 overflow-hidden">
                    {providers.length === 0 ? (
                        <div className="text-center py-12 text-white/30 text-sm">
                            No models match "{searchQuery}"
                        </div>
                    ) : (
                        <>
                            {/* Provider Carousel (Horizontal) */}
                            <div className="relative h-20 flex items-center justify-center">
                                {/* Gradient overlays for left/right edges */}
                                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black/40 to-transparent pointer-events-none z-20"></div>
                                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black/40 to-transparent pointer-events-none z-20"></div>

                                <div className="relative w-full flex items-center justify-center">
                                    {visibleProviders.map(({ provider, offset, index }) => {
                                        const isCenter = offset === 0;
                                        const opacity = Math.max(0, 1 - Math.abs(offset) * 0.3);
                                        const scale = isCenter ? 1 : Math.max(0.6, 1 - Math.abs(offset) * 0.2);
                                        const translateX = offset * 200; // 200px spacing between items

                                        return (
                                            <div
                                                key={provider}
                                                data-column={index}
                                                className="absolute transition-all duration-300 ease-out"
                                                style={{
                                                    transform: `translateX(${translateX}px) scale(${scale})`,
                                                    opacity: opacity,
                                                    zIndex: isCenter ? 10 : 5 - Math.abs(offset)
                                                }}
                                            >
                                                <div className={`px-6 py-3 rounded-xl border transition-all ${
                                                    isCenter
                                                        ? 'bg-cyan-500/20 border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                                                        : 'bg-white/5 border-white/10'
                                                }`}>
                                                    <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                                                        <span className={`w-2 h-2 rounded-full transition-all ${
                                                            isCenter ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' : 'bg-white/40'
                                                        }`}></span>
                                                        <span className={isCenter ? 'text-cyan-300' : 'text-white/60'}>
                                                            {provider}
                                                        </span>
                                                    </h3>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Model Carousel (Vertical) */}
                            <div className="flex-1 relative flex items-center justify-center overflow-hidden min-h-[400px]">
                                {/* Gradient overlays for top/bottom edges */}
                                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-20"></div>
                                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-20"></div>

                                <div className="relative h-full w-full max-w-2xl flex flex-col items-center justify-center">
                                    {currentProviderModels.length === 0 ? (
                                        <div className="text-white/40 text-sm">No models available for this provider</div>
                                    ) : (
                                        visibleModels.map(({ model, offset, index }) => {
                                        const isCenter = offset === 0;
                                        const opacity = Math.max(0, 1 - Math.abs(offset) * 0.35);
                                        const scale = isCenter ? 1 : Math.max(0.7, 1 - Math.abs(offset) * 0.15);
                                        const translateY = offset * 120; // 120px spacing between items
                                        const capabilities = getModelCapabilities(model);
                                        const isSelected = model === selectedModel;

                                        return (
                                            <div
                                                key={model}
                                                data-model={model}
                                                className="absolute w-full max-w-xl transition-all duration-300 ease-out"
                                                style={{
                                                    transform: `translateY(${translateY}px) scale(${scale})`,
                                                    opacity: opacity,
                                                    zIndex: isCenter ? 10 : 5 - Math.abs(offset)
                                                }}
                                            >
                                                <button
                                                    onClick={() => {
                                                        onSelect(model);
                                                        onClose();
                                                    }}
                                                    disabled={!isCenter}
                                                    className={`w-full text-left px-6 py-4 rounded-xl transition-all border ${
                                                        isCenter
                                                            ? 'bg-white/15 border-cyan-400/50 shadow-2xl ring-2 ring-cyan-400/30 cursor-pointer hover:bg-white/20'
                                                            : 'border-white/5 bg-white/5 cursor-default'
                                                    }`}
                                                >
                                                    {/* Model Name */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-sm font-semibold truncate flex-1 ${
                                                            isCenter ? 'text-white' : 'text-white/60'
                                                        }`}>
                                                            {model}
                                                        </span>
                                                        {isSelected && (
                                                            <Check size={14} className="text-cyan-400 shrink-0" />
                                                        )}
                                                    </div>

                                                    {/* Description */}
                                                    {isCenter && capabilities.description && (
                                                        <p className="text-xs text-white/50 mb-3 line-clamp-2">
                                                            {capabilities.description}
                                                        </p>
                                                    )}

                                                    {/* Capability Badges */}
                                                    {isCenter && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {capabilities.thinking && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[10px] font-medium">
                                                                    <Brain size={10} />
                                                                    Think
                                                                </span>
                                                            )}
                                                            {capabilities.vision && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-medium">
                                                                    <Eye size={10} />
                                                                    Vision
                                                                </span>
                                                            )}
                                                            {capabilities.functionCalling && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 border border-green-400/30 text-green-300 text-[10px] font-medium">
                                                                    <Zap size={10} />
                                                                    Fn
                                                                </span>
                                                            )}
                                                            {capabilities.contextWindow && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-medium">
                                                                    <FileText size={10} />
                                                                    {capabilities.contextWindow}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    }))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-white/5 border-t border-white/10 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-white/40">
                            {currentProvider && (
                                <span>
                                    <span className="text-cyan-400 font-medium">{currentProvider}</span>
                                    <span className="mx-2">•</span>
                                    <span className="text-white/60">Model {currentRow + 1} of {currentProviderModels.length}</span>
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1">
                            {providers.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                        idx === currentColumn
                                            ? 'bg-cyan-400 w-3 shadow-lg shadow-cyan-400/50'
                                            : 'bg-white/20'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="text-center text-xs text-white/40">
                        <span className="text-cyan-400 font-medium">← →</span> Rotate companies • <span className="text-cyan-400 font-medium">↑ ↓</span> Scroll models • <span className="text-cyan-400 font-medium">Enter</span> to select
                    </div>
                </div>
            </div>
        </div>
    );
}
