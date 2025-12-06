export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  messages: Message[];
  model?: string;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  choices: {
    index: number;
    message: Message;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AppSettings {
  apiKey: string;
  endpointUrl: string;
  modelName: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  endpointUrl: 'https://portal.rdsec.trendmicro.com/aiendpoint/v1/chat/completions',
  modelName: 'gpt-3.5-turbo', // Default or placeholder
};
