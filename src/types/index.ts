export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  model?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number; // For sorting
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

export interface ShortcutMap {
  [actionId: string]: string; 
}

export interface AppSettings {
  apiKey: string;
  endpointUrl: string;
  modelName: string;
  shortcuts: ShortcutMap;
  displayMode: 'chat' | 'compact';
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  endpointUrl: 'https://portal.rdsec.trendmicro.com/aiendpoint/v1/chat/completions',
  modelName: 'gpt-3.5-turbo',
  displayMode: 'chat',
  shortcuts: {
    'newChat': 'Control+N',
    'toggleModel': 'Control+M',
    'saveChat': 'Control+S', // This will map to Export/Download in UI now
    'openChat': 'Control+O',
    'settings': 'Control+,',
    'help': 'Control+/'
  }
};
