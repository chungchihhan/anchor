import { ChatCompletionRequest, ChatCompletionResponse, Message } from '@/types';
import { StorageService } from './StorageService';

export class LLMService {
    static async getModels(): Promise<string[]> {
        const settings = StorageService.getSettings();
        const apiKey = process.env.NEXT_PUBLIC_API_KEY || settings.apiKey;
        let endpointUrl = process.env.NEXT_PUBLIC_API_BASE_URL || settings.endpointUrl;

        if (!apiKey) throw new Error('API Key missing');

        // Construct models endpoint (remove /chat/completions if present, append /models)
        const baseUrl = endpointUrl.replace(/\/chat\/completions\/?$/, '').replace(/\/$/, '');
        const modelsUrl = `${baseUrl}/models`;

        try {
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
            
            const data = await response.json();
            // Expecting OpenAI format: { data: [{ id: 'model-id', ... }] }
            if (data.data && Array.isArray(data.data)) {
                return data.data.map((m: any) => m.id);
            }
            return [];
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
    }

    static async *streamMessage(messages: Message[], model?: string): AsyncGenerator<string, void, unknown> {
        const settings = StorageService.getSettings();
        const apiKey = process.env.NEXT_PUBLIC_API_KEY || settings.apiKey;
        let endpointUrl = process.env.NEXT_PUBLIC_API_BASE_URL || settings.endpointUrl;

        if (!apiKey) throw new Error('API Key missing');

        // Fix URL for chat completions
        if (endpointUrl && !endpointUrl.endsWith('/chat/completions')) {
            endpointUrl = endpointUrl.replace(/\/$/, '') + '/chat/completions';
        }

        const payload = {
            messages,
            model: model || settings.modelName || 'gpt-3.5-turbo',
            stream: true,
        };

        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.includes('[DONE]')) return;
                
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices[0]?.delta?.content || '';
                        if (content) yield content;
                    } catch (e) {
                        console.warn('Failed to parse SSE message', line);
                    }
                }
            }
        }
    }
}
