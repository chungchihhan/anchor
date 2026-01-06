import { useState, useCallback, useEffect, useRef } from 'react';
import { Message } from '@/types';
import { LLMService } from '@/services/LLMService';
import { HistoryService } from '@/services/HistoryService';

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('gpt-3.5-turbo');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Load selected model from localStorage on mount
    useEffect(() => {
        const savedModel = localStorage.getItem('selectedModel');
        if (savedModel) {
            setSelectedModel(savedModel);
        }
    }, []);

    // Fetch models on mount
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const models = await LLMService.getModels();
                if (models.length > 0) {
                    setAvailableModels(models);
                    // If current model is not in list, switch to first available
                    if (!models.includes(selectedModel)) {
                        setSelectedModel(models[0]);
                    }
                }
            } catch (e) {
                console.error('Failed to load models', e);
            }
        };
        fetchModels();
    }, [selectedModel]);

    // Save selected model to localStorage
    useEffect(() => {
        localStorage.setItem('selectedModel', selectedModel);
    }, [selectedModel]);

    const toggleModel = useCallback(() => {
        if (availableModels.length === 0) return;
        const currentIndex = availableModels.indexOf(selectedModel);
        const nextIndex = (currentIndex + 1) % availableModels.length;
        setSelectedModel(availableModels[nextIndex]);
    }, [availableModels, selectedModel]);

    const generateFilename = (firstMessage: string) => {
        // Take first 30 chars, allow alphanumeric and spaces/dashes, then trim
        let name = firstMessage.slice(0, 30).replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
        if (!name) name = `chat_${Date.now()}`;
        return `${name}.json`;
    };

    const saveSession = useCallback(async (currentMessages: Message[], id: string | null) => {
        if (currentMessages.length === 0) return;

        try {
            const sessionId = id || crypto.randomUUID();
            if (!id && currentSessionId !== sessionId) {
                setCurrentSessionId(sessionId);
            }

            let title = 'New Chat';
            const firstUserMsg = currentMessages.find(m => m.role === 'user');
            if (firstUserMsg) {
                title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
            }

            await HistoryService.saveToLocal({
                id: sessionId,
                title,
                messages: currentMessages,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Save failed', error);
        }
    }, [currentSessionId]);

    // Auto-save effect
    useEffect(() => {
        if (messages.length === 0) return;
        const timeoutId = setTimeout(() => saveSession(messages, currentSessionId), 2000);
        return () => clearTimeout(timeoutId);
    }, [messages, currentSessionId, saveSession]);

    const sendMessage = async (content: string, overrideHistory?: Message[]) => {
        if (!content.trim()) return;

        const timestamp = Date.now();
        const userMessage: Message = { role: 'user', content, timestamp };

        // Use overrideHistory if provided to avoid stale state issues during edit/retry
        const historyBase = overrideHistory || messages;
        const newMessages = [...historyBase, userMessage];

        setMessages(newMessages);
        setIsLoading(true);
        setError(null);

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
            const contextMessages = newMessages.map(({ role, content }) => ({ role, content }));

            // Add placeholder for assistant with MODEL metadata
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                model: selectedModel // Track model
            }]);

            let fullContent = '';
            for await (const chunk of LLMService.streamMessage(contextMessages, selectedModel, abortControllerRef.current.signal)) {
                fullContent += chunk;
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        content: fullContent
                    };
                    return updated;
                });
            }
        } catch (err) {
            console.error('Error in sendMessage:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            // setMessages(prev => prev.slice(0, -1)); // Don't remove message on error so we can see what happened

            // Append error to the message content so user sees it
            setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...lastMsg,
                        content: lastMsg.content + `\n\n**Error**: ${err instanceof Error ? err.message : 'An error occurred'}`
                    };
                }
                return updated;
            });
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const retryMessage = async (index?: number) => {
        let lastUserIndex = -1;

        if (typeof index === 'number') {
            // If index is provided (clicked on assistant message), look for the user message before it
            // Verify index is within bounds and is assistant role (usually)
            // But robustly, we just want the user message associated with this point.
            // If explicit index (Assistant), target is index - 1.
            lastUserIndex = index - 1;
        } else {
            // Default behavior: Retry last user message
            lastUserIndex = messages.findLastIndex(m => m.role === 'user');
        }

        if (lastUserIndex < 0 || lastUserIndex >= messages.length || messages[lastUserIndex].role !== 'user') return;

        // Get content and remove subsequent messages
        const lastUserMsg = messages[lastUserIndex];
        const newHistory = messages.slice(0, lastUserIndex);
        // Don't setMessages here, let sendMessage handle it with override

        await sendMessage(lastUserMsg.content, newHistory);
    };

    const editMessage = async (index: number, newContent: string) => {
        if (index < 0 || index >= messages.length) return;

        // Truncate history up to the edited message (exclusive)
        const newHistory = messages.slice(0, index);
        // Don't setMessages here, let sendMessage handle it with override

        // Send new content using the truncated history as base
        await sendMessage(newContent, newHistory);
    };

    const clearChat = async () => {
        // Force save before clearing
        if (messages.length > 0) {
            await saveSession(messages, currentSessionId);
        }
        setMessages([]);
        setError(null);
        setCurrentSessionId(null);
    };

    const exportChat = async () => {
        // Manual save is now just re-triggering the auto-save effectively, or could be distinct.
        // User asked for "Export" to be distinct. 
        // This function is kept for compatibility but the UI uses downloadChat mostly.
    };

    const importChat = async (id: string) => {
        try {
            const session = await HistoryService.loadLocal(id);
            if (session) {
                // Handle both legacy (messages array) and new (session object) if logic was loose, but Types enforce session now
                setMessages(session.messages || session as any);
                setCurrentSessionId(session.id || id);
            }
        } catch (error) {
            console.error('Failed to load chat', error);
            setError('Failed to load chat history');
        }
    };

    const downloadChat = () => {
        if (messages.length === 0) return;

        // Save as pretty JSON with metadata
        const sessionData = {
            id: currentSessionId || crypto.randomUUID(),
            title: messages.find(m => m.role === 'user')?.content.slice(0, 30) || 'Chat Export',
            messages,
            timestamp: Date.now()
        };

        const content = JSON.stringify(sessionData, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = sessionData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeTitle}-${sessionData.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        stopGeneration,
        clearChat,
        availableModels,
        selectedModel,
        setSelectedModel,
        toggleModel,
        exportChat, // Server-side save (kept for auto-save logic/manual trigger if needed)
        downloadChat, // Client-side download
        importChat,
        retryMessage,
        editMessage
    };
}
