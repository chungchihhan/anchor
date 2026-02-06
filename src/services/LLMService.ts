import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  Message,
} from "@/types";
import { StorageService } from "./StorageService";

export class LLMService {
  static async getModels(): Promise<string[]> {
    const settings = StorageService.getSettings();
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    let apiKey = process.env.NEXT_PUBLIC_API_KEY || settings.apiKey;
    let endpointUrl = envUrl || settings.endpointUrl;

    console.log("URL Source:", envUrl ? "Environment Variable" : "Settings");
    console.log("Target Endpoint:", endpointUrl);

    if (!apiKey) return [];

    // Sanitize inputs
    apiKey = apiKey.trim();
    endpointUrl = endpointUrl.trim();

    // Construct models endpoint (remove /chat/completions if present, append /models)
    const baseUrl = endpointUrl
      .replace(/\/chat\/completions\/?$/, "")
      .replace(/\/$/, "");
    const modelsUrl = `${baseUrl}/models`;

    console.log("Fetching models from:", modelsUrl);
    console.log("API Key length:", apiKey.length);
    // Check for non-ASCII characters
    if (/[^\x00-\x7F]/.test(apiKey)) {
      console.error("API Key contains non-ASCII characters!");
    }

    try {
      const response = await fetch(modelsUrl, {
        method: "GET",
        credentials: "omit",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "curl/8.7.1",
          Accept: "*/*",
        },
      });

      if (!response.ok)
        throw new Error(`Failed to fetch models: ${response.status}`);

      const data = await response.json();
      // Expecting OpenAI format: { data: [{ id: 'model-id', ... }] }
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }
      return [];
    } catch (error) {
      console.error("Error fetching models:", error);
      return [];
    }
  }

  static async *streamMessage(
    messages: Message[],
    model?: string,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    const settings = StorageService.getSettings();
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    let apiKey = process.env.NEXT_PUBLIC_API_KEY || settings.apiKey;
    let endpointUrl = envUrl || settings.endpointUrl;

    console.log("URL Source:", envUrl ? "Environment Variable" : "Settings");
    console.log("Target Endpoint:", endpointUrl);

    if (!apiKey) throw new Error("API Key missing");

    // Sanitize inputs
    apiKey = apiKey.trim();
    // Remove any newlines or carriage returns that might have been pasted in
    if (/[\r\n]/.test(apiKey)) {
      console.warn("API Key contains newlines, stripping them");
      apiKey = apiKey.replace(/[\r\n]+/g, "");
    }

    // Debug: Check for unusual characters
    console.log("API Key length after trim:", apiKey.length);
    console.log("API Key starts with:", apiKey.substring(0, 20));
    console.log("API Key ends with:", apiKey.substring(apiKey.length - 20));

    endpointUrl = endpointUrl.trim();

    // Fix URL for chat completions
    let cleanUrl = endpointUrl.replace(/\/$/, "");
    if (!cleanUrl.endsWith("/chat/completions")) {
      cleanUrl += "/chat/completions";
    }
    endpointUrl = cleanUrl;

    const modelName = model || settings.modelName || "gpt-3.5-turbo";
    const lowerModel = modelName.toLowerCase();

    // Check if thinking will be enabled (model-based or forced)
    const isClaudeModel = lowerModel.includes("claude");
    const isHaikuModel = lowerModel.includes("haiku");
    const isVersion45 =
      lowerModel.includes("4.5") || lowerModel.includes("4-5");

    // Only auto-enable thinking for specific models that support it
    // Exclude 4.5 models (they don't support extended thinking currently)
    const isAutoThinkingModel =
      (!isHaikuModel &&
        !isVersion45 &&
        ((lowerModel.includes("opus") && lowerModel.includes("4")) ||
          (lowerModel.includes("sonnet") && lowerModel.includes("4")) ||
          lowerModel.includes("claude-3.7") ||
          lowerModel.includes("claude-3-7"))) ||
      (lowerModel.includes("deepseek") &&
        (lowerModel.includes("r1") || lowerModel.includes("reasoner"))) ||
      lowerModel.includes("o1") ||
      lowerModel.includes("o3");

    const enableThinking = isAutoThinkingModel;

    // Get max output tokens from settings
    const maxOutputTokens = settings.maxOutputTokens || 32768; // Default to 32K if not set

    // Base payload
    const payload: any = {
      messages,
      model: modelName,
      stream: true,
      max_tokens: maxOutputTokens, // Use configurable value from settings
      temperature: enableThinking ? 1.0 : 0.1, // Temperature must be 1.0 for thinking models
      // Note: top_p is removed as Claude models don't support both temperature and top_p
      // presence_penalty is also removed as it's not supported by Claude models
    };

    // Add thinking/reasoning parameters based on model
    // Claude models: extended thinking
    if (isClaudeModel && isAutoThinkingModel) {
      payload.thinking = {
        type: "enabled",
        budget_tokens: 5000, // Configurable: 1024 - 128000, set to 5000 to work with all Claude models (Haiku max: 8192)
      };
    }

    // DeepSeek R1: thinking mode
    if (
      lowerModel.includes("deepseek") &&
      (lowerModel.includes("r1") || lowerModel.includes("reasoner"))
    ) {
      payload.thinking = {
        type: "enabled",
      };
    }

    // OpenAI o1/o3: reasoning effort
    if (lowerModel.includes("o1") || lowerModel.includes("o3")) {
      payload.reasoning_effort = "high"; // Options: "low", "medium", "high"
      // Note: Some endpoints may require nested format:
      // payload.reasoning = { effort: "high" };
    }

    // Google Gemini 3: thinking level
    if (lowerModel.includes("gemini") && lowerModel.includes("3")) {
      payload.thinking_level = "high"; // Options: "minimal", "low", "medium", "high"
    }

    // Google Gemini 2.5: thinking budget
    if (lowerModel.includes("gemini") && lowerModel.includes("2.5")) {
      payload.thinkingBudget = -1; // -1 for dynamic, 0 to disable, or 128-32768
    }

    // Google Gemini 2.0 Flash Thinking: automatic (model-based)
    // No additional parameters needed, controlled by model name

    console.log("Stream request sent to:", endpointUrl);
    console.log(
      "Thinking mode enabled:",
      !!(
        payload.thinking ||
        payload.reasoning_effort ||
        payload.thinking_level ||
        payload.thinkingBudget
      ),
    );
    if (payload.thinking) console.log("Thinking config:", payload.thinking);
    if (payload.reasoning_effort)
      console.log("Reasoning effort:", payload.reasoning_effort);
    if (payload.thinking_level)
      console.log("Thinking level:", payload.thinking_level);
    if (payload.thinkingBudget)
      console.log("Thinking budget:", payload.thinkingBudget);

    // Log key details for debugging (safe version)
    console.log("API Key length:", apiKey.length);

    let response;
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      // If external abort signal provided, listen to it
      if (abortSignal) {
        abortSignal.addEventListener("abort", () => controller.abort());
      }

      response = await fetch(endpointUrl, {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "curl/8.7.1",
          Accept: "*/*",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        // Add keepalive for better connection stability
        keepalive: true,
      });

      clearTimeout(timeoutId);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        if (abortSignal?.aborted) {
          // User-initiated abort - end gracefully without error
          console.log("Generation stopped by user");
          return;
        }
        console.error("Fetch failed:", e);
        throw new Error(
          "Request timeout - please check your connection and try again",
        );
      }
      console.error("Fetch failed:", e);
      throw e;
    }

    console.log("Response status:", response.status);
    console.log("Response url:", response.url);

    try {
      // Safely log headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log("Response headers:", headers);
    } catch (e) {
      console.warn("Failed to log headers:", e);
    }

    if (!response.ok) {
      let errorText = "";
      let errorData = null;
      try {
        errorText = await response.text();
        console.error("API Error Body:", errorText);

        // Try to parse as JSON for more details
        try {
          errorData = JSON.parse(errorText);
          console.error("Parsed error:", errorData);
        } catch (e) {
          // Not JSON, that's fine
        }
      } catch (e) {
        console.error("Failed to read error body:", e);
      }

      throw new Error(
        `API Error ${response.status}: ${errorData?.message || errorText || response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type") || "";

    // If not an event stream, check if it's JSON and extract content
    if (!contentType.includes("text/event-stream")) {
      console.log("Response is not event-stream, checking for JSON");
      const text = await response.text();
      console.log("Raw text length:", text.length);

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
        console.log("Failed to parse response as JSON:", e);
      }

      // Fallback: Wrap in code block to ensure it's visible
      yield "```\n" + text + "\n```";
      return;
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        // Check if abort signal was triggered
        if (abortSignal?.aborted) {
          console.log("Stream aborted by user");
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream done");
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log("Received chunk:", chunk); // DEBUG LOG
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.includes("[DONE]")) return;

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle different response formats
              // OpenAI/DeepSeek format: delta.content
              let content = data.choices[0]?.delta?.content || "";

              // Claude format: content blocks (thinking + text)
              if (!content && data.delta?.content) {
                const contentBlocks = Array.isArray(data.delta.content)
                  ? data.delta.content
                  : [data.delta.content];
                for (const block of contentBlocks) {
                  if (block.type === "thinking" && block.thinking) {
                    // Wrap Claude thinking in <think> tags for consistent display
                    content += `<think>${block.thinking}</think>\n\n`;
                  } else if (block.type === "text" && block.text) {
                    content += block.text;
                  }
                }
              }

              if (content) yield content;
            } catch (e) {
              console.warn("Failed to parse SSE message", line);
            }
          }
        }
      }
    } catch (e) {
      // Release the reader before throwing
      reader.releaseLock();
      if (e instanceof Error && e.name === "AbortError") {
        // User-initiated abort - end gracefully without error
        console.log("Stream stopped by user");
        return;
      }
      console.error("Stream reading error:", e);
      throw new Error("Stream interrupted - connection may have been lost");
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
