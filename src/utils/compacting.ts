"use client";

import { Message } from "@/types";
import { LLMService } from "@/services/LLMService";
import {
  estimateTotalTokens,
  COMPACT_THRESHOLD,
  KEEP_RECENT_COUNT,
  MIN_MESSAGES_TO_COMPACT,
} from "./tokenCounter";

/**
 * Check if conversation needs compacting based on token count
 */
export async function checkIfCompactNeeded(
  messages: Message[],
  summary?: string,
  summaryUpToIndex?: number,
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
  return messages
    .map((m, i) => `**${m.role}** (msg ${i + 1}): ${m.content}`)
    .join("\n\n");
}

/**
 * Build prompt for LLM summarization
 */
function buildSummaryPrompt(
  previousSummary: string | undefined,
  messagesToCompact: Message[],
): Message[] {
  const systemPrompt = `You are a conversation summarizer. Create a concise but comprehensive summary of the conversation below.

IMPORTANT:
- Remeber what the user has said and the related assistant responses, and summarize them in a way that preserves the key technical details, decisions, and context
- Use markdown formatting
- Be concise but don't lose critical information
- If there's a previous summary, integrate it with the new messages into ONE cohesive summary
- Output ONLY the summary, no meta-commentary`;

  if (previousSummary) {
    // Re-compacting: include previous summary
    return [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Previous summary:\n\n${previousSummary}\n\n---\n\nNew messages to add:\n\n${formatMessages(messagesToCompact)}\n\nCreate a new integrated summary.`,
      },
    ];
  } else {
    // First compact: just the messages
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: formatMessages(messagesToCompact) },
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
  currentSummaryUpToIndex?: number,
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
      summaryUpToIndex: compactUpTo - 1,
    };
  } catch (error) {
    console.error("Compacting failed:", error);

    // Fallback: use previous summary if exists
    if (currentSummary) {
      return {
        summary: currentSummary,
        summaryUpToIndex: currentSummaryUpToIndex!,
      };
    }

    // No previous summary, create basic fallback
    const fallbackSummary = `[Auto-summary failed. Conversation started at ${new Date().toLocaleString()}]`;
    return {
      summary: fallbackSummary,
      summaryUpToIndex: 0,
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
  summaryUpToIndex?: number,
): Message[] {
  if (!summary) {
    return messages; // No compacting yet
  }

  // Return: [summary as system message] + [recent messages]
  const recentMessages = messages.slice(summaryUpToIndex! + 1);

  return [
    { role: "system", content: `Previous conversation summary:\n\n${summary}` },
    ...recentMessages,
  ];
}
