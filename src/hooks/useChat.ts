import { useState, useCallback } from 'react';
import { Message } from '@/types';
import { LLMService } from '@/services/LLMService';

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim()) return;

        const userMessage: Message = { role: 'user', content };

        // Optimistic update
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        setError(null);

        try {
            // Prepare context (all messages + new one)
            const contextMessages = [...messages, userMessage];

            const assistantMessage = await LLMService.sendMessage(contextMessages);

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err: any) {
            setError(err.message || 'Failed to send message');
            // Optional: remove user message if failed? Or just show error.
        } finally {
            setIsLoading(false);
        }
    }, [messages]);

    const clearChat = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        clearChat
    };
}
