# Conversation Compacting Design

**Date:** 2026-02-07
**Status:** Design Complete
**Goal:** Implement rolling conversation summarization to prevent hitting token limits while preserving full chat history

## Overview

Instead of simple sliding window truncation, implement progressive conversation compacting where:
- Original messages are always preserved in full
- Older messages get summarized via LLM
- Summaries build on themselves (re-summarization)
- Users can view and edit the compact summary
- API receives: compact summary + recent messages

## Key Requirements

1. **64K token threshold** triggers auto-compacting
2. **Progressive condensation** - summary gets re-summarized with new messages
3. **Full history preserved** - users always see original messages
4. **User-editable summaries** - view/edit via modal
5. **Multi-language support** - accurate token counting for English + Chinese

## Data Model

### Enhanced ChatSession

```typescript
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];           // Full original messages (never truncated)
  compactSummary?: string;        // Single rolling summary (markdown)
  summaryUpToIndex?: number;      // Last message index included in summary
  timestamp: number;
}
```

### Compacting Flow Example

**First compact (messages 0-30 exceed 64K):**
```
Input to LLM: messages[0-25]
Output: summary1 = "User asked about X, I explained Y..."
summaryUpToIndex = 25

Send to API: [summary1 as system message, messages[26-30]]
```

**Second compact (summary1 + messages[26-40] exceed 64K):**
```
Input to LLM: [summary1, messages[26-35]]
Output: summary2 = "Earlier: X and Y. Then discussed Z..." (more condensed)
summaryUpToIndex = 35

Send to API: [summary2 as system message, messages[36-40]]
```

## Token Counting

### Using Anthropic Tokenizer

```bash
npm install @anthropic-ai/tokenizer
```

```typescript
import { countTokens as anthropicCountTokens } from '@anthropic-ai/tokenizer';

function countTokens(text: string): number {
  try {
    return anthropicCountTokens(text);
  } catch (e) {
    console.warn('Token counting failed, using fallback', e);
    // Conservative fallback for mixed English/Chinese
    return Math.ceil(text.length / 2);
  }
}

async function estimateTotalTokensWithTokenizer(
  messages: Message[],
  summary?: string
): Promise<number> {
  let total = 0;

  if (summary) {
    total += countTokens(summary);
    total += 20; // System message overhead
  }

  for (const msg of messages) {
    total += countTokens(msg.content);
    total += 4; // Message formatting overhead
  }

  return total;
}
```

**Why Anthropic's tokenizer:**
- Accurate for Claude (primary model)
- Lightweight
- Reasonably accurate for other models
- Handles Chinese text properly

## Compacting Logic

### Constants

```typescript
const COMPACT_THRESHOLD = 64000;  // 64K tokens
const KEEP_RECENT_COUNT = 5;      // Keep last 5 messages verbatim
const MIN_MESSAGES_TO_COMPACT = 10; // Don't compact tiny conversations
```

### Trigger Logic

```typescript
async function checkIfCompactNeeded(
  messages: Message[],
  summary?: string,
  summaryUpToIndex?: number
): Promise<boolean> {
  // Don't compact tiny conversations
  if (messages.length < MIN_MESSAGES_TO_COMPACT) {
    return false;
  }

  const messagesToCount = summary
    ? messages.slice(summaryUpToIndex + 1)
    : messages;

  const totalTokens = await estimateTotalTokensWithTokenizer(messagesToCount, summary);

  return totalTokens > COMPACT_THRESHOLD;
}
```

### Compacting Process

```typescript
async function performCompact(
  currentMessages: Message[],
  currentSummary?: string,
  currentSummaryUpToIndex?: number
): Promise<{ summary: string; summaryUpToIndex: number }> {
  try {
    // Keep last 5 messages verbatim
    const compactUpTo = currentMessages.length - KEEP_RECENT_COUNT;

    // Messages to compact: from last summary point to compactUpTo
    const startIndex = (currentSummaryUpToIndex ?? -1) + 1;
    const messagesToCompact = currentMessages.slice(startIndex, compactUpTo);

    // Build summarization prompt
    const prompt = buildSummaryPrompt(currentSummary, messagesToCompact);

    // Call LLM to generate summary
    const summary = await LLMService.generateSummary(prompt);

    return {
      summary,
      summaryUpToIndex: compactUpTo - 1
    };
  } catch (error) {
    console.error('Compacting failed:', error);

    // Fallback: use previous summary if exists
    if (currentSummary) {
      return {
        summary: currentSummary,
        summaryUpToIndex: currentSummaryUpToIndex!
      };
    }

    // No previous summary, create basic fallback
    const fallbackSummary = `[Auto-summary failed. Conversation started at ${new Date().toLocaleString()}]`;
    return {
      summary: fallbackSummary,
      summaryUpToIndex: 0
    };
  }
}
```

## Summarization Prompt

### Prompt Strategy

```typescript
function buildSummaryPrompt(
  previousSummary: string | undefined,
  messagesToCompact: Message[]
): Message[] {
  const systemPrompt = `You are a conversation summarizer. Create a concise but comprehensive summary of the conversation below.

IMPORTANT:
- Preserve key technical details, decisions, and context
- Use markdown formatting
- Be concise but don't lose critical information
- If there's a previous summary, integrate it with the new messages into ONE cohesive summary
- Output ONLY the summary, no meta-commentary`;

  if (previousSummary) {
    // Re-compacting: include previous summary
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Previous summary:\n\n${previousSummary}\n\n---\n\nNew messages to add:\n\n${formatMessages(messagesToCompact)}\n\nCreate a new integrated summary.` }
    ];
  } else {
    // First compact: just the messages
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: formatMessages(messagesToCompact) }
    ];
  }
}

function formatMessages(messages: Message[]): string {
  return messages.map((m, i) =>
    `**${m.role}** (msg ${i + 1}): ${m.content}`
  ).join('\n\n');
}
```

## LLMService Integration

### New Summary Generation Method

```typescript
// Add to LLMService.ts
static async generateSummary(messages: Message[]): Promise<string> {
  const settings = StorageService.getSettings();
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  let apiKey = process.env.NEXT_PUBLIC_API_KEY || settings.apiKey;
  let endpointUrl = envUrl || settings.endpointUrl;

  if (!apiKey) throw new Error('API Key missing');

  apiKey = apiKey.trim();
  endpointUrl = endpointUrl.trim();

  let cleanUrl = endpointUrl.replace(/\/$/, '');
  if (!cleanUrl.endsWith('/chat/completions')) {
    cleanUrl += '/chat/completions';
  }

  const modelName = settings.modelName || 'gpt-3.5-turbo';

  const payload = {
    messages,
    model: modelName,
    stream: false,        // Non-streaming for summaries
    max_tokens: 8192,     // 8K for detailed summaries
    temperature: 0.3,     // Lower temp for consistency
  };

  const response = await fetch(cleanUrl, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Summary generation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  throw new Error('Invalid summary response format');
}
```

### Modified sendMessage Flow

```typescript
async function sendMessage(content: string, overrideHistory?: Message[]) {
  if (!content.trim()) return;

  const userMessage: Message = { role: 'user', content, timestamp: Date.now() };
  const historyBase = overrideHistory || messages;
  const newMessages = [...historyBase, userMessage];

  setMessages(newMessages);
  setIsLoading(true);

  try {
    // Check if compacting needed BEFORE sending
    const needsCompact = await checkIfCompactNeeded(
      newMessages,
      compactSummary,
      summaryUpToIndex
    );

    if (needsCompact) {
      setIsCompacting(true);

      const { summary, summaryUpToIndex: newIndex } = await performCompact(
        newMessages,
        compactSummary,
        summaryUpToIndex
      );

      setCompactSummary(summary);
      setSummaryUpToIndex(newIndex);
      setIsCompacting(false);

      showNotification(`🔄 Compacted ${newIndex + 1} messages`);
    }

    // Build context for API
    const contextMessages = buildContextForAPI(
      newMessages,
      compactSummary,
      summaryUpToIndex
    );

    // Stream response as normal
    let fullContent = '';
    for await (const chunk of LLMService.streamMessage(contextMessages, selectedModel, abortSignal)) {
      fullContent += chunk;
      // Update UI...
    }
  } catch (err) {
    // Error handling...
  } finally {
    setIsLoading(false);
  }
}
```

### Build Context Helper

```typescript
function buildContextForAPI(
  messages: Message[],
  summary?: string,
  summaryUpToIndex?: number
): Message[] {
  if (!summary) {
    return messages;  // No compacting yet
  }

  // Return: [summary as system message] + [recent messages]
  const recentMessages = messages.slice(summaryUpToIndex + 1);

  return [
    { role: 'system', content: `Previous conversation summary:\n\n${summary}` },
    ...recentMessages
  ];
}
```

## State Management

### New State in useChat

```typescript
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [compactSummary, setCompactSummary] = useState<string | undefined>(undefined);
  const [summaryUpToIndex, setSummaryUpToIndex] = useState<number | undefined>(undefined);
  const [isCompacting, setIsCompacting] = useState(false);
  // ... existing state
}
```

### Persistence

```typescript
// Save with summary
const saveSession = useCallback(async (currentMessages: Message[], id: string | null) => {
  if (currentMessages.length === 0) return;

  const sessionId = id || crypto.randomUUID();

  await HistoryService.saveToLocal({
    id: sessionId,
    title: /* ... */,
    messages: currentMessages,
    compactSummary,
    summaryUpToIndex,
    timestamp: Date.now()
  });
}, [messages, compactSummary, summaryUpToIndex, currentSessionId]);

// Load with summary
const importChat = async (id: string) => {
  const session = await HistoryService.loadLocal(id);
  if (session) {
    setMessages(session.messages);
    setCompactSummary(session.compactSummary);
    setSummaryUpToIndex(session.summaryUpToIndex);
    setCurrentSessionId(session.id);
  }
};

// Clear all
const clearChat = async () => {
  if (messages.length > 0) {
    await saveSession(messages, currentSessionId);
  }
  setMessages([]);
  setCompactSummary(undefined);
  setSummaryUpToIndex(undefined);
  setError(null);
  setCurrentSessionId(null);
};
```

## UI Components

### 1. Compact Summary Button

Location: Top-right corner of chat area

```tsx
interface CompactButtonProps {
  summary?: string;
  summaryUpToIndex?: number;
  onClick: () => void;
}

function CompactSummaryButton({ summary, summaryUpToIndex, onClick }: CompactButtonProps) {
  if (!summary) return null;

  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 rounded-lg text-sm text-white/90 transition-all flex items-center gap-2"
    >
      📝 View Summary ({(summaryUpToIndex ?? 0) + 1} msgs)
    </button>
  );
}
```

### 2. Compact Summary Modal

Features:
- View mode: Renders markdown
- Edit mode: Textarea for user edits
- Shows which messages are summarized
- Save button updates session

```tsx
interface CompactSummaryModalProps {
  isOpen: boolean;
  summary: string;
  summaryUpToIndex: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (newSummary: string) => void;
  onClose: () => void;
}

function CompactSummaryModal({
  isOpen,
  summary,
  summaryUpToIndex,
  isEditing,
  onEdit,
  onSave,
  onClose
}: CompactSummaryModalProps) {
  const [editedSummary, setEditedSummary] = useState(summary);

  useEffect(() => {
    setEditedSummary(summary);
  }, [summary]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-medium">Compact Summary</h2>
            <p className="text-xs text-white/50 mt-1">
              Summarizes messages 1-{summaryUpToIndex + 1}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 rounded text-sm text-white"
              >
                Edit
              </button>
            )}
            {isEditing && (
              <button
                onClick={() => onSave(editedSummary)}
                className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 rounded text-sm text-white"
              >
                Save
              </button>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="w-full h-full min-h-[400px] bg-white/5 border border-white/10 rounded-lg p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-cyan-500/50"
              placeholder="Enter summary in markdown..."
            />
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3. Compacting Indicator

Shows while summarization is in progress:

```tsx
{isCompacting && (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 rounded-lg text-white text-sm flex items-center gap-2 z-50">
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
    Compacting conversation...
  </div>
)}
```

## Error Handling

### Edge Cases

1. **Summarization fails**: Use previous summary, show error toast, allow conversation to continue
2. **Very short conversations (<10 messages)**: Don't compact
3. **Tokenizer fails**: Graceful fallback to `chars ÷ 2` estimation
4. **User edits summary**: Mark as user-edited (future enhancement: ask before overwriting)
5. **Summary becomes huge**: Cap at 4K tokens, force re-summarization if exceeded

### Fallback Strategy

```typescript
try {
  const summary = await LLMService.generateSummary(prompt);
  return { summary, summaryUpToIndex: compactUpTo - 1 };
} catch (error) {
  console.error('Compacting failed:', error);

  if (currentSummary) {
    // Keep using old summary
    return {
      summary: currentSummary,
      summaryUpToIndex: currentSummaryUpToIndex!
    };
  }

  // Create basic fallback
  const fallbackSummary = `[Auto-summary failed. Conversation started at ${new Date().toLocaleString()}]`;
  return {
    summary: fallbackSummary,
    summaryUpToIndex: 0
  };
}
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Install `@anthropic-ai/tokenizer` dependency
- [ ] Add `compactSummary` and `summaryUpToIndex` to ChatSession type
- [ ] Implement token counting utilities
- [ ] Add state management in useChat hook

### Phase 2: Core Logic
- [ ] Implement `checkIfCompactNeeded()`
- [ ] Implement `performCompact()`
- [ ] Implement `buildSummaryPrompt()`
- [ ] Implement `buildContextForAPI()`
- [ ] Add `LLMService.generateSummary()` method

### Phase 3: Integration
- [ ] Modify `sendMessage()` to check and trigger compacting
- [ ] Update `saveSession()` to persist summary
- [ ] Update `importChat()` to restore summary
- [ ] Update `clearChat()` to clear summary

### Phase 4: UI
- [ ] Create CompactSummaryButton component
- [ ] Create CompactSummaryModal component
- [ ] Add compacting indicator
- [ ] Add notification system for auto-compact events
- [ ] Integrate components into main chat view

### Phase 5: Polish
- [ ] Error handling and fallbacks
- [ ] Edge case handling (small conversations, etc.)
- [ ] User edit tracking (future enhancement)
- [ ] Testing with long conversations

## Benefits

1. **No more token limit errors** - Progressive compacting prevents hitting limits
2. **Full history preserved** - Users always see original messages
3. **Transparent** - Users can view and edit summaries
4. **Efficient** - Only recent context sent to API
5. **Multi-language** - Accurate token counting for English + Chinese
6. **Smart** - Auto-compacts at natural threshold (64K tokens)

## Trade-offs

**Pros:**
- Much better than simple truncation
- Maintains conversation continuity
- User control over summaries
- Accurate token counting

**Cons:**
- Extra API call for summarization (costs ~$0.01-0.02 per compact)
- Slight delay when compacting (1-3 seconds)
- Summary quality depends on LLM
- More complex than sliding window

The benefits far outweigh the costs for long conversations.
