import { ChatCompletionRequest, ChatCompletionResponse, Message } from '@/types';
import { StorageService } from './StorageService';

export class LLMService {
    static async getModels(): Promise<string[]> {
        const settings = StorageService.getSettings();
        const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        let apiKey = process.env.NEXT_PUBLIC_API_KEY || settings.apiKey;
        let endpointUrl = envUrl || settings.endpointUrl;

        console.log('URL Source:', envUrl ? 'Environment Variable' : 'Settings');
        console.log('Target Endpoint:', endpointUrl);

        if (!apiKey) return [];

        // Sanitize inputs
        apiKey = apiKey.trim();
        endpointUrl = endpointUrl.trim();

        // Construct models endpoint (remove /chat/completions if present, append /models)
        const baseUrl = endpointUrl.replace(/\/chat\/completions\/?$/, '').replace(/\/$/, '');
        const modelsUrl = `${baseUrl}/models`;

        console.log('Fetching models from:', modelsUrl);
        console.log('API Key length:', apiKey.length);
        // Check for non-ASCII characters
        if (/[^\x00-\x7F]/.test(apiKey)) {
            console.error('API Key contains non-ASCII characters!');
        }

        try {
            const response = await fetch(modelsUrl, {
                method: 'GET',
                credentials: 'omit',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'curl/8.7.1',
                    'Accept': '*/*'
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
        const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        let apiKey = process.env.NEXT_PUBLIC_API_KEY || settings.apiKey;
        let endpointUrl = envUrl || settings.endpointUrl;

        console.log('URL Source:', envUrl ? 'Environment Variable' : 'Settings');
        console.log('Target Endpoint:', endpointUrl);

        if (!apiKey) throw new Error('API Key missing');

        // Sanitize inputs
        apiKey = apiKey.trim();
        // Remove any newlines or carriage returns that might have been pasted in
        if (/[\r\n]/.test(apiKey)) {
            console.warn('API Key contains newlines, stripping them');
            apiKey = apiKey.replace(/[\r\n]+/g, '');
        }

        // Debug: Check for unusual characters
        console.log('API Key length after trim:', apiKey.length);
        console.log('API Key starts with:', apiKey.substring(0, 20));
        console.log('API Key ends with:', apiKey.substring(apiKey.length - 20));

        endpointUrl = endpointUrl.trim();

        // Fix URL for chat completions
        let cleanUrl = endpointUrl.replace(/\/$/, '');
        if (!cleanUrl.endsWith('/chat/completions')) {
            cleanUrl += '/chat/completions';
        }
        endpointUrl = cleanUrl;

        const payload = {
            messages,
            model: model || settings.modelName || 'gpt-3.5-turbo',
            stream: true,
            max_tokens: 4096,  // Increased from 1000 to allow longer responses
            temperature: 0.8,
            top_p: 1,
            presence_penalty: 1,
        };

        console.log('Stream request sent to:', endpointUrl);

        // Log key details for debugging (safe version)
        console.log('API Key length:', apiKey.length);

        let response;
        try {
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

            response = await fetch(endpointUrl, {
                method: 'POST',
                credentials: 'omit',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'User-Agent': 'curl/8.7.1',
                    'Accept': '*/*'
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
                // Add keepalive for better connection stability
                keepalive: true
            });

            clearTimeout(timeoutId);
        } catch (e) {
            console.error('Fetch failed:', e);
            if (e instanceof Error && e.name === 'AbortError') {
                throw new Error('Request timeout - please check your connection and try again');
            }
            throw e;
        }

        console.log('Response status:', response.status);
        console.log('Response url:', response.url);

        try {
            // Safely log headers
            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            console.log('Response headers:', headers);
        } catch (e) {
            console.warn('Failed to log headers:', e);
        }

        if (!response.ok) {
            let errorText = '';
            let errorData = null;
            try {
                errorText = await response.text();
                console.error('API Error Body:', errorText);

                // Try to parse as JSON for more details
                try {
                    errorData = JSON.parse(errorText);
                    console.error('Parsed error:', errorData);
                } catch (e) {
                    // Not JSON, that's fine
                }
            } catch (e) {
                console.error('Failed to read error body:', e);
            }

            throw new Error(`API Error ${response.status}: ${errorData?.message || errorText || response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';

        // If not an event stream, check if it's JSON and extract content
        if (!contentType.includes('text/event-stream')) {
            console.log('Response is not event-stream, checking for JSON');
            const text = await response.text();
            console.log('Raw text length:', text.length);

            if (!text.trim()) {
                yield "```\n[Received empty response from server]\n```";
                return;
            }

            try {
                const data = JSON.parse(text);
                // Check if it's a standard chat completion response
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    const content = data.choices[0].message.content;
                    if (content) {
                        yield content;
                        return;
                    }
                }
                // Check for error format
                if (data.error && data.error.message) {
                    yield `**API Error**: ${data.error.message}`;
                    return;
                }
            } catch (e) {
                // Not JSON, fall through to raw text
                console.log('Failed to parse response as JSON:', e);
            }

            // Fallback: Wrap in code block to ensure it's visible
            yield "```\n" + text + "\n```";
            return;
        }

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream done');
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                console.log('Received chunk:', chunk); // DEBUG LOG
                buffer += chunk;
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
        } catch (e) {
            console.error('Stream reading error:', e);
            // Release the reader before throwing
            reader.releaseLock();
            throw new Error('Stream interrupted - connection may have been lost');
        } finally {
            // Ensure reader is always released
            try {
                reader.releaseLock();
            } catch (e) {
                // Reader may already be released
            }
        }
    }
}
