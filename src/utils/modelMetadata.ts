export interface ModelCapabilities {
    thinking?: boolean;
    vision?: boolean;
    functionCalling?: boolean;
    contextWindow?: string;
    description?: string;
    releaseDate?: string; // YYYY-MM format for sorting
}

export interface ModelMetadata {
    name: string;
    provider: string;
    capabilities: ModelCapabilities;
}

// Parse provider from model name
export function getProviderFromModel(modelName: string): string {
    const lower = modelName.toLowerCase();

    if (lower.includes('gpt') || lower.includes('openai') || lower.includes('o1') || lower.includes('o3')) return 'OpenAI';
    if (lower.includes('claude')) return 'Anthropic';
    if (lower.includes('gemini') || lower.includes('palm')) return 'Google';
    if (lower.includes('llama')) return 'Meta';
    if (lower.includes('mistral') || lower.includes('mixtral')) return 'Mistral';
    if (lower.includes('deepseek')) return 'DeepSeek';
    if (lower.includes('qwen')) return 'Alibaba';
    if (lower.includes('command')) return 'Cohere';

    return 'Other';
}

// Get model capabilities based on model name
export function getModelCapabilities(modelName: string): ModelCapabilities {
    const lower = modelName.toLowerCase();

    // OpenAI models
    if (lower.includes('o3')) {
        return {
            thinking: true,
            vision: false,
            functionCalling: false,
            contextWindow: '200K',
            description: 'Latest reasoning model with extended thinking',
            releaseDate: '2025-01'
        };
    }
    if (lower.includes('o1')) {
        return {
            thinking: true,
            vision: false,
            functionCalling: false,
            contextWindow: '200K',
            description: 'Reasoning model with extended thinking',
            releaseDate: '2024-09'
        };
    }
    if (lower.includes('gpt-4-turbo') || lower.includes('gpt-4-1106')) {
        return {
            thinking: false,
            vision: lower.includes('vision'),
            functionCalling: true,
            contextWindow: '128K',
            description: 'Latest GPT-4 Turbo model',
            releaseDate: '2024-04'
        };
    }
    if (lower.includes('gpt-4')) {
        return {
            thinking: false,
            vision: lower.includes('vision'),
            functionCalling: true,
            contextWindow: '128K',
            description: 'Most capable GPT-4 model',
            releaseDate: '2023-03'
        };
    }
    if (lower.includes('gpt-3.5')) {
        return {
            thinking: false,
            vision: false,
            functionCalling: true,
            contextWindow: '16K',
            description: 'Fast and cost-effective',
            releaseDate: '2022-11'
        };
    }

    // Anthropic Claude models
    // Claude 4.5 series (with extended thinking)
    if (lower.includes('claude-4.5') || lower.includes('claude-4-5')) {
        return {
            thinking: true,
            vision: true,
            functionCalling: true,
            contextWindow: '200K',
            description: 'Latest Claude with extended thinking',
            releaseDate: '2025-12'
        };
    }
    // Claude 4 series (with extended thinking)
    if (lower.includes('claude-4') && !lower.includes('claude-4.5') && !lower.includes('claude-4-5')) {
        return {
            thinking: true,
            vision: true,
            functionCalling: true,
            contextWindow: '200K',
            description: 'Claude 4 with extended thinking',
            releaseDate: '2025-06'
        };
    }
    // Claude 3.7 Sonnet (with extended thinking)
    if (lower.includes('claude-3.7') || lower.includes('claude-3-7')) {
        return {
            thinking: true,
            vision: true,
            functionCalling: true,
            contextWindow: '200K',
            description: 'Hybrid reasoning model with extended thinking',
            releaseDate: '2024-12'
        };
    }
    // Claude 3.5 Sonnet (no extended thinking)
    if (lower.includes('claude-3.5-sonnet') || lower.includes('claude-3-5-sonnet')) {
        return {
            thinking: false,
            vision: true,
            functionCalling: true,
            contextWindow: '200K',
            description: 'Most intelligent Claude 3 model',
            releaseDate: '2024-06'
        };
    }
    // Claude 3 Opus (no extended thinking)
    if (lower.includes('claude-3-opus')) {
        return {
            thinking: false,
            vision: true,
            functionCalling: true,
            contextWindow: '200K',
            description: 'Powerful for complex tasks',
            releaseDate: '2024-03'
        };
    }
    // Claude 3 Sonnet (no extended thinking)
    if (lower.includes('claude-3-sonnet')) {
        return {
            thinking: false,
            vision: true,
            functionCalling: true,
            contextWindow: '200K',
            description: 'Balanced performance and speed',
            releaseDate: '2024-03'
        };
    }
    // Claude Haiku 4.5 (with extended thinking)
    if (lower.includes('claude') && lower.includes('haiku') && (lower.includes('4.5') || lower.includes('4-5'))) {
        return {
            thinking: true,
            vision: true,
            functionCalling: true,
            contextWindow: '200K',
            description: 'Fast and efficient with extended thinking',
            releaseDate: '2025-06'
        };
    }
    // Claude 3 Haiku (no extended thinking)
    if (lower.includes('claude-3-haiku')) {
        return {
            thinking: false,
            vision: true,
            functionCalling: true,
            contextWindow: '200K',
            description: 'Fast and compact',
            releaseDate: '2024-03'
        };
    }

    // Google Gemini models
    // Gemini 3 Flash (with thinking mode)
    if (lower.includes('gemini') && lower.includes('3') && lower.includes('flash')) {
        return {
            thinking: true,
            vision: true,
            functionCalling: true,
            contextWindow: '1M',
            description: 'Latest Gemini with thinking mode',
            releaseDate: '2025-03'
        };
    }
    // Gemini 2.0 Flash Thinking (with thinking mode)
    if (lower.includes('gemini') && lower.includes('2.0') && lower.includes('thinking')) {
        return {
            thinking: true,
            vision: true,
            functionCalling: true,
            contextWindow: '1M',
            description: 'Advanced reasoning with thinking mode',
            releaseDate: '2025-02'
        };
    }
    // Gemini 2.0 (without thinking)
    if (lower.includes('gemini-2.0') || lower.includes('gemini-2-0')) {
        return {
            thinking: false,
            vision: true,
            functionCalling: true,
            contextWindow: '1M',
            description: 'Latest multimodal model',
            releaseDate: '2024-12'
        };
    }
    // Gemini 1.5 Pro
    if (lower.includes('gemini-1.5-pro') || lower.includes('gemini-1-5-pro')) {
        return {
            thinking: false,
            vision: true,
            functionCalling: true,
            contextWindow: '2M',
            description: 'Extended context window',
            releaseDate: '2024-05'
        };
    }
    // Other Gemini models
    if (lower.includes('gemini')) {
        return {
            thinking: false,
            vision: true,
            functionCalling: true,
            contextWindow: '32K',
            description: 'Multimodal AI model',
            releaseDate: '2023-12'
        };
    }

    // DeepSeek models
    if (lower.includes('deepseek')) {
        return {
            thinking: lower.includes('r1') || lower.includes('reasoner'),
            vision: false,
            functionCalling: true,
            contextWindow: '64K',
            description: lower.includes('r1') ? 'Advanced reasoning model' : 'Open source model',
            releaseDate: lower.includes('r1') ? '2025-01' : '2024-01'
        };
    }

    // Meta Llama models
    if (lower.includes('llama-3')) {
        return {
            thinking: false,
            vision: lower.includes('vision'),
            functionCalling: true,
            contextWindow: '128K',
            description: 'Open source foundation model',
            releaseDate: '2024-04'
        };
    }
    if (lower.includes('llama')) {
        return {
            thinking: false,
            vision: lower.includes('vision'),
            functionCalling: true,
            contextWindow: '128K',
            description: 'Open source foundation model',
            releaseDate: '2023-07'
        };
    }

    // Mistral models
    if (lower.includes('mistral') || lower.includes('mixtral')) {
        return {
            thinking: false,
            vision: false,
            functionCalling: true,
            contextWindow: '32K',
            description: 'Efficient European model',
            releaseDate: '2024-02'
        };
    }

    // Default fallback
    return {
        thinking: false,
        vision: false,
        functionCalling: false,
        contextWindow: 'Unknown',
        description: 'Language model',
        releaseDate: '2020-01'
    };
}

// Group models by provider
export function groupModelsByProvider(models: string[]): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    models.forEach(model => {
        const provider = getProviderFromModel(model);
        if (!grouped[provider]) {
            grouped[provider] = [];
        }
        grouped[provider].push(model);
    });

    // Sort providers: OpenAI, Anthropic, Google, then alphabetically
    const providerOrder = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'DeepSeek', 'Mistral'];
    const sorted: Record<string, string[]> = {};

    // Extract version number from model name
    const extractVersion = (modelName: string): number => {
        // Match patterns like "4", "3.5", "2.0", "1.5-pro", etc.
        const versionMatch = modelName.match(/(\d+\.?\d*)/);
        if (versionMatch) {
            return parseFloat(versionMatch[1]);
        }
        return 0;
    };

    // Sort models within each provider by release date (newer first), then by version number (higher first)
    const sortByReleaseDate = (a: string, b: string) => {
        const capsA = getModelCapabilities(a);
        const capsB = getModelCapabilities(b);
        const dateA = capsA.releaseDate || '2000-01';
        const dateB = capsB.releaseDate || '2000-01';

        // Newer models first (reverse chronological)
        if (dateB !== dateA) {
            return dateB.localeCompare(dateA);
        }

        // If same release date, sort by version number (higher first)
        const versionA = extractVersion(a);
        const versionB = extractVersion(b);
        if (versionB !== versionA) {
            return versionB - versionA;
        }

        // If same version, sort alphabetically
        return a.localeCompare(b);
    };

    providerOrder.forEach(provider => {
        if (grouped[provider]) {
            sorted[provider] = grouped[provider].sort(sortByReleaseDate);
        }
    });

    // Add remaining providers alphabetically
    Object.keys(grouped)
        .filter(p => !providerOrder.includes(p))
        .sort()
        .forEach(provider => {
            sorted[provider] = grouped[provider].sort(sortByReleaseDate);
        });

    return sorted;
}
