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
