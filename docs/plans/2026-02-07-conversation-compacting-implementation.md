# Conversation Compacting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement rolling conversation summarization to prevent token limit errors while preserving full chat history

**Architecture:** Add progressive summarization where older messages get condensed via LLM API calls, summaries build on themselves, and users can view/edit summaries. Original messages always preserved locally, API receives compact summary + recent messages.

**Tech Stack:** TypeScript, React, @anthropic-ai/tokenizer, existing LLMService

---

## Task 1: Install Dependencies and Update Types

**Files:**
- Modify: `package.json`
- Modify: `src/types/index.ts:8-13`

**Step 1: Install @anthropic-ai/tokenizer**

```bash
npm install @anthropic-ai/tokenizer
```

Expected: Package installed successfully

**Step 2: Update ChatSession interface**

In `src/types/index.ts`, replace the ChatSession interface:

```typescript
export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    compactSummary?: string;        // Single rolling summary (markdown)
    summaryUpToIndex?: number;      // Last message index included in summary
    timestamp: number;
}
```

**Step 3: Verify TypeScript compilation**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add package.json package-lock.json src/types/index.ts
git commit -m "feat: add @anthropic-ai/tokenizer and update ChatSession type

- Install @anthropic-ai/tokenizer for accurate token counting
- Add compactSummary and summaryUpToIndex to ChatSession
- Support for rolling conversation summarization

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create Token Counting Utilities

**Files:**
- Create: `src/utils/tokenCounter.ts`

**Step 1: Create tokenCounter.ts with countTokens function**

```typescript
import { countTokens as anthropicCountTokens } from '@anthropic-ai/tokenizer';
import { Message } from '@/types';

/**
 * Count tokens in text using Anthropic's tokenizer
 * Falls back to conservative estimate if tokenizer fails
 */
export function countTokens(text: string): number {
  try {
    return anthropicCountTokens(text);
  } catch (e) {
    console.warn('Token counting failed, using fallback', e);
    // Conservative fallback for mixed English/Chinese
    return Math.ceil(text.length / 2);
  }
}

/**
 * Estimate total tokens for messages and optional summary
 * Includes overhead for message formatting
 */
export function estimateTotalTokens(
  messages: Message[],
  summary?: string
): number {
  let total = 0;

  // Count summary tokens
  if (summary) {
    total += countTokens(summary);
    total += 20; // Overhead for system message formatting
  }

  // Count message tokens
  for (const msg of messages) {
    total += countTokens(msg.content);
    total += 4; // Overhead per message (role, formatting, etc.)
  }

  return total;
}

// Constants
export const COMPACT_THRESHOLD = 64000;  // 64K tokens
export const KEEP_RECENT_COUNT = 5;      // Keep last 5 messages verbatim
export const MIN_MESSAGES_TO_COMPACT = 10; // Don't compact tiny conversations
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: No errors, tokenCounter utility compiles

**Step 3: Commit**

```bash
git add src/utils/tokenCounter.ts
git commit -m "feat: add token counting utilities

- Implement countTokens using @anthropic-ai/tokenizer
- Add estimateTotalTokens for conversation token estimation
- Include constants for compacting thresholds
- Fallback to chars/2 if tokenizer fails

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Add Summary Generation to LLMService

**Files:**
- Modify: `src/services/LLMService.ts:398` (add new method at end of class)

**Step 1: Add generateSummary static method**

Add this method at the end of the `LLMService` class (before the closing brace):

```typescript
  /**
   * Generate a conversation summary using the LLM
   * Non-streaming call for summarization
   */
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

**Step 2: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/services/LLMService.ts
git commit -m "feat: add summary generation to LLMService

- Add generateSummary() static method
- Non-streaming API call for conversation summaries
- Uses 8K max_tokens and temp 0.3 for consistency
- Returns markdown-formatted summary

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Create Compacting Utility Functions

**Files:**
- Create: `src/utils/compacting.ts`

**Step 1: Create compacting.ts with core functions**

```typescript
import { Message } from '@/types';
import { LLMService } from '@/services/LLMService';
import {
  estimateTotalTokens,
  COMPACT_THRESHOLD,
  KEEP_RECENT_COUNT,
  MIN_MESSAGES_TO_COMPACT
} from './tokenCounter';

/**
 * Check if conversation needs compacting based on token count
 */
export async function checkIfCompactNeeded(
  messages: Message[],
  summary?: string,
  summaryUpToIndex?: number
): Promise<boolean> {
  // Don't compact tiny conversations
  if (messages.length < MIN_MESSAGES_TO_COMPACT) {
    return false;
  }

  const messagesToCount = summary
    ? messages.slice(summaryUpToIndex! + 1)
    : messages;

  const totalTokens = estimateTotalTokens(messagesToCount, summary);

  return totalTokens > COMPACT_THRESHOLD;
}

/**
 * Format messages for summarization prompt
 */
function formatMessages(messages: Message[]): string {
  return messages.map((m, i) =>
    `**${m.role}** (msg ${i + 1}): ${m.content}`
  ).join('\n\n');
}

/**
 * Build prompt for LLM summarization
 */
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
      {
        role: 'user',
        content: `Previous summary:\n\n${previousSummary}\n\n---\n\nNew messages to add:\n\n${formatMessages(messagesToCompact)}\n\nCreate a new integrated summary.`
      }
    ];
  } else {
    // First compact: just the messages
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: formatMessages(messagesToCompact) }
    ];
  }
}

/**
 * Perform conversation compacting
 * Returns new summary and index of last summarized message
 */
export async function performCompact(
  currentMessages: Message[],
  currentSummary?: string,
  currentSummaryUpToIndex?: number
): Promise<{ summary: string; summaryUpToIndex: number }> {
  try {
    // Keep last N messages verbatim
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

/**
 * Build context messages to send to API
 * Includes summary (if exists) + recent messages
 */
export function buildContextForAPI(
  messages: Message[],
  summary?: string,
  summaryUpToIndex?: number
): Message[] {
  if (!summary) {
    return messages;  // No compacting yet
  }

  // Return: [summary as system message] + [recent messages]
  const recentMessages = messages.slice(summaryUpToIndex! + 1);

  return [
    { role: 'system', content: `Previous conversation summary:\n\n${summary}` },
    ...recentMessages
  ];
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/utils/compacting.ts
git commit -m "feat: add conversation compacting utilities

- Implement checkIfCompactNeeded() for token threshold checks
- Add performCompact() for LLM-based summarization
- Build summary prompts with progressive condensation
- Add buildContextForAPI() to construct API context
- Include error handling with fallback strategies

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Update useChat Hook - Add State

**Files:**
- Modify: `src/hooks/useChat.ts:7-14`

**Step 1: Add compact summary state variables**

After the existing state declarations (around line 7), add:

```typescript
export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('gpt-3.5-turbo');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [compactSummary, setCompactSummary] = useState<string | undefined>(undefined);
    const [summaryUpToIndex, setSummaryUpToIndex] = useState<number | undefined>(undefined);
    const [isCompacting, setIsCompacting] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat: add compact summary state to useChat

- Add compactSummary state for rolling summary
- Add summaryUpToIndex to track summarized messages
- Add isCompacting loading state

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Update useChat Hook - Modify sendMessage

**Files:**
- Modify: `src/hooks/useChat.ts:96-156`

**Step 1: Import compacting utilities**

Add to imports at top of file:

```typescript
import { checkIfCompactNeeded, performCompact, buildContextForAPI } from '@/utils/compacting';
```

**Step 2: Replace sendMessage function**

Replace the entire `sendMessage` function with:

```typescript
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

                // TODO: Show notification (will implement in UI task)
                console.log(`🔄 Compacted ${newIndex + 1} messages`);
            }

            // Build context for API
            const contextMessages = buildContextForAPI(
                newMessages,
                compactSummary,
                summaryUpToIndex
            );

            // Add placeholder for assistant with MODEL metadata
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                model: selectedModel
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

            // Append error to the message content
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
            setIsCompacting(false);
            abortControllerRef.current = null;
        }
    };
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat: integrate compacting into sendMessage

- Check token threshold before sending each message
- Auto-compact when exceeding 64K tokens
- Build API context with summary + recent messages
- Show compacting indicator while processing
- Preserve original messages in UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Update useChat Hook - Persistence

**Files:**
- Modify: `src/hooks/useChat.ts:62-86` (saveSession)
- Modify: `src/hooks/useChat.ts:209-221` (importChat)
- Modify: `src/hooks/useChat.ts:193-201` (clearChat)

**Step 1: Update saveSession to include summary**

Replace the `saveSession` function:

```typescript
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
                compactSummary,
                summaryUpToIndex,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Save failed', error);
        }
    }, [currentSessionId, compactSummary, summaryUpToIndex]);
```

**Step 2: Update importChat to restore summary**

Replace the `importChat` function:

```typescript
    const importChat = async (id: string) => {
        try {
            const session = await HistoryService.loadLocal(id);
            if (session) {
                setMessages(session.messages || session as any);
                setCompactSummary(session.compactSummary);
                setSummaryUpToIndex(session.summaryUpToIndex);
                setCurrentSessionId(session.id || id);
            }
        } catch (error) {
            console.error('Failed to load chat', error);
            setError('Failed to load chat history');
        }
    };
```

**Step 3: Update clearChat to clear summary**

Replace the `clearChat` function:

```typescript
    const clearChat = async () => {
        // Force save before clearing
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

**Step 4: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat: persist compact summary in chat sessions

- Save compactSummary and summaryUpToIndex with sessions
- Restore summary when loading chat history
- Clear summary when clearing chat
- Update saveSession dependency array

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Update useChat Hook - Return Values

**Files:**
- Modify: `src/hooks/useChat.ts:253-269` (return statement)

**Step 1: Add new state to return object**

Update the return statement at the end of `useChat`:

```typescript
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
        exportChat,
        downloadChat,
        importChat,
        retryMessage,
        editMessage,
        compactSummary,
        summaryUpToIndex,
        isCompacting
    };
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat: expose compact summary state from useChat

- Return compactSummary for UI access
- Return summaryUpToIndex for display
- Return isCompacting for loading indicator

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Create CompactSummaryModal Component

**Files:**
- Create: `src/components/CompactSummaryModal.tsx`

**Step 1: Create CompactSummaryModal.tsx**

```typescript
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CompactSummaryModalProps {
  isOpen: boolean;
  summary: string;
  summaryUpToIndex: number;
  onSave: (newSummary: string) => void;
  onClose: () => void;
}

export function CompactSummaryModal({
  isOpen,
  summary,
  summaryUpToIndex,
  onSave,
  onClose
}: CompactSummaryModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(summary);

  useEffect(() => {
    setEditedSummary(summary);
  }, [summary]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedSummary);
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div>
            <h2 className="text-white font-medium">Compact Summary</h2>
            <p className="text-xs text-white/50 mt-1">
              Summarizes messages 1-{summaryUpToIndex + 1}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 rounded text-sm text-white transition-all"
              >
                Edit
              </button>
            )}
            {isEditing && (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 rounded text-sm text-white transition-all"
              >
                Save
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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

**Step 2: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/components/CompactSummaryModal.tsx
git commit -m "feat: add CompactSummaryModal component

- View mode with markdown rendering
- Edit mode with textarea
- Shows which messages are summarized
- Save functionality for user edits

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Integrate UI into Main Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Read current page.tsx to understand structure**

```bash
cat src/app/page.tsx | head -50
```

Expected: See current structure of main page

**Step 2: Add imports at top of file**

Add these imports after existing imports:

```typescript
import { CompactSummaryModal } from "@/components/CompactSummaryModal";
import { useState } from "react";
```

**Step 3: Add state for modal**

Inside the Page component (after existing state/hooks), add:

```typescript
  const [showCompactModal, setShowCompactModal] = useState(false);
```

**Step 4: Add compact summary button**

Find where the chat interface is rendered (likely near MessageList or ChatInput), and add this button in the top-right area:

```typescript
{/* Compact Summary Button */}
{compactSummary && (
  <button
    onClick={() => setShowCompactModal(true)}
    className="absolute top-4 right-4 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 rounded-lg text-sm text-white/90 transition-all flex items-center gap-2 z-10"
  >
    📝 View Summary ({(summaryUpToIndex ?? 0) + 1} msgs)
  </button>
)}
```

**Step 5: Add compacting indicator**

Add this near the top of the rendered content:

```typescript
{/* Compacting Indicator */}
{isCompacting && (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 rounded-lg text-white text-sm flex items-center gap-2 z-50">
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
    Compacting conversation...
  </div>
)}
```

**Step 6: Add modal at end of component**

Add before the closing tag of the main component:

```typescript
{/* Compact Summary Modal */}
<CompactSummaryModal
  isOpen={showCompactModal}
  summary={compactSummary || ''}
  summaryUpToIndex={summaryUpToIndex ?? 0}
  onSave={(newSummary) => {
    // TODO: Implement summary update in useChat
    console.log('Summary updated:', newSummary);
    setShowCompactModal(false);
  }}
  onClose={() => setShowCompactModal(false)}
/>
```

**Step 7: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 8: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate compact summary UI into main page

- Add compact summary button (top-right, shows msg count)
- Add compacting indicator during summarization
- Add CompactSummaryModal for viewing/editing
- Wire up modal open/close handlers

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Add Summary Update Functionality

**Files:**
- Modify: `src/hooks/useChat.ts:253-270` (add updateSummary function)

**Step 1: Add updateSummary function**

Add this new function before the return statement in `useChat`:

```typescript
    const updateSummary = useCallback((newSummary: string) => {
        setCompactSummary(newSummary);
        // Trigger save with updated summary
        if (messages.length > 0 && currentSessionId) {
            saveSession(messages, currentSessionId);
        }
    }, [messages, currentSessionId, saveSession]);
```

**Step 2: Add to return object**

Update the return statement to include:

```typescript
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
        exportChat,
        downloadChat,
        importChat,
        retryMessage,
        editMessage,
        compactSummary,
        summaryUpToIndex,
        isCompacting,
        updateSummary
    };
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat: add updateSummary function to useChat

- Allow manual summary updates from UI
- Auto-save session when summary changes
- Export updateSummary for modal integration

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: Wire Up Summary Updates in UI

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update modal onSave handler**

Replace the TODO in the CompactSummaryModal with:

```typescript
<CompactSummaryModal
  isOpen={showCompactModal}
  summary={compactSummary || ''}
  summaryUpToIndex={summaryUpToIndex ?? 0}
  onSave={(newSummary) => {
    updateSummary(newSummary);
    setShowCompactModal(false);
  }}
  onClose={() => setShowCompactModal(false)}
/>
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 3: Test in development**

```bash
npm run dev
```

Expected: App runs, can view/edit summary (if it exists)

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up summary updates in UI

- Connect updateSummary to modal save handler
- Enable user edits to persist to session
- Complete summary edit flow

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 13: Remove Old Sliding Window Code

**Files:**
- Modify: `src/hooks/useChat.ts:113-124`
- Modify: `src/types/index.ts:49`

**Step 1: Remove maxContextMessages from types**

In `src/types/index.ts`, remove the `maxContextMessages` field from `AppSettings`:

```typescript
export interface AppSettings {
  apiKey: string;
  endpointUrl: string;
  modelName: string;
  shortcuts: ShortcutMap;
  displayMode: 'compact' | 'columns';
  chatWidth: number;
  fontSize: number;
  maxOutputTokens: number;
  // Removed: maxContextMessages - replaced by compacting system
}
```

**Step 2: Remove from DEFAULT_SETTINGS**

In `src/types/index.ts`, remove from default settings:

```typescript
export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  endpointUrl: 'https://portal.rdsec.trendmicro.com/aiendpoint/v1/chat/completions',
  modelName: 'gpt-3.5-turbo',
  displayMode: 'compact',
  chatWidth: 70,
  fontSize: 16,
  maxOutputTokens: 16384,
  // Removed: maxContextMessages
  shortcuts: {
    'newChat': 'Cmd+N',
    'toggleModel': 'Cmd+M',
    'saveChat': 'Cmd+S',
    'openChat': 'Cmd+O',
    'settings': 'Cmd+,',
    'help': 'Cmd+/'
  }
};
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors (old sliding window code is now replaced by compacting)

**Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor: remove old sliding window implementation

- Remove maxContextMessages setting (obsolete)
- Compacting system replaces simple truncation
- Cleaner settings interface

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 14: Final Testing and Documentation

**Files:**
- Modify: `README.md` (if exists, add feature description)

**Step 1: Test complete flow**

Manual testing checklist:
1. Start new conversation
2. Send 10+ messages to build up context
3. Continue until ~64K tokens (simulate with long messages)
4. Verify auto-compact happens (see indicator)
5. Click "View Summary" button
6. Verify summary shows in modal
7. Click "Edit", modify summary
8. Click "Save", verify persists
9. Clear chat, reload - verify summary gone
10. Load old chat - verify summary restored

**Step 2: Update README if it exists**

If `README.md` exists, add section:

```markdown
## Features

### Conversation Compacting

Anchor automatically manages long conversations to prevent token limit errors:

- **Auto-compacting**: When conversations exceed 64K tokens, older messages are automatically summarized
- **Progressive condensation**: Summaries build on themselves for ultra-long conversations
- **Full history preserved**: Original messages are never deleted, always visible in chat
- **User-editable**: View and edit the compact summary via the 📝 button
- **Multi-language**: Accurate token counting for English and Chinese text

**How it works:**
- Original messages stay in your local history
- API receives: compact summary + recent 5 messages
- You can view/edit the summary anytime
- Summaries are saved with your chat sessions
```

**Step 3: Verify final build**

```bash
npm run build
```

Expected: Clean build, no errors

**Step 4: Final commit**

```bash
git add README.md
git commit -m "docs: document conversation compacting feature

- Add feature description to README
- Explain auto-compacting behavior
- Document user controls
- Note multi-language support

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Testing Checklist

After implementation, verify:

- [ ] Token counting works (test with English and Chinese)
- [ ] Auto-compact triggers at 64K tokens
- [ ] Compacting indicator shows during summarization
- [ ] Summary button appears after first compact
- [ ] Modal opens and shows summary with markdown
- [ ] Edit mode works (textarea appears)
- [ ] Save persists changes
- [ ] Summary persists across page reloads
- [ ] Summary restores when loading old chat
- [ ] Clear chat removes summary
- [ ] API receives compact summary + recent messages
- [ ] Original messages always visible in UI
- [ ] Error handling works (LLM fails gracefully)
- [ ] No TypeScript errors
- [ ] Clean build

---

## Completion Criteria

✅ All tasks completed
✅ All tests passing
✅ Documentation updated
✅ Clean git history with atomic commits
✅ Feature working end-to-end

---
