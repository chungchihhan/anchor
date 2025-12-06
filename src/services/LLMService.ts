import { ChatCompletionRequest, ChatCompletionResponse, Message } from '@/types';
import { StorageService } from './StorageService';

export class LLMService {
    static async sendMessage(messages: Message[]): Promise<Message> {
        const settings = StorageService.getSettings();

        if (!settings.apiKey) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

        const payload: ChatCompletionRequest = {
            messages,
            model: settings.modelName,
            stream: false, // For now, no streaming to keep it simple as per MVP
        };

        try {
            const response = await fetch(settings.endpointUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data: ChatCompletionResponse = await response.json();

            if (!data.choices || data.choices.length === 0) {
                throw new Error('No response from AI.');
            }

            return data.choices[0].message;
        } catch (error) {
            console.error('LLM Service Error:', error);
            throw error;
        }
    }
}
