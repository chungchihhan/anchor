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

    /**
     * A rolling markdown summary of older conversation messages.
     * This summary is regenerated when the conversation exceeds token limits.
     * Should be set together with summaryUpToIndex.
     */
    compactSummary?: string;

    /**
     * The 0-based index of the last message included in compactSummary.
     * Messages from index 0 to summaryUpToIndex (inclusive) are represented
     * by the compactSummary. Should be set together with compactSummary.
     */
    summaryUpToIndex?: number;

    timestamp: number;
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
  displayMode: 'compact' | 'columns';
  chatWidth: number; // percentage (30-100)
  fontSize: number; // pixels (12-24)
  maxContextMessages: number; // maximum messages to send in context (0 = unlimited)
  maxOutputTokens: number; // maximum tokens the model can generate (1024-128000)
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  endpointUrl: 'https://portal.rdsec.trendmicro.com/aiendpoint/v1/chat/completions',
  modelName: 'gpt-3.5-turbo',
  displayMode: 'compact',
  chatWidth: 70, // percentage
  fontSize: 16, // pixels
  maxContextMessages: 20, // limit context to last 20 messages
  maxOutputTokens: 16384, // 16K tokens - generous default for most modern models
  shortcuts: {
    'newChat': 'Cmd+N',
    'toggleModel': 'Cmd+M',
    'saveChat': 'Cmd+S', // This will map to Export/Download in UI now
    'openChat': 'Cmd+O',
    'settings': 'Cmd+,',
    'help': 'Cmd+/'
  }
};
