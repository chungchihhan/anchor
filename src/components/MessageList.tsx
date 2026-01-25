import { useRef, useEffect, useState, memo, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Message } from "@/types";
import { User, Copy, Check, RotateCcw, Pencil, Anchor } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onRetry?: (index: number) => void;
  onEdit?: (index: number, newContent: string) => void;
  displayMode?: "compact" | "columns";
  selectedMessageIndex?: number | null;
  shouldShake?: boolean;
  onScrollStateChange?: (showButton: boolean) => void;
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>;
}

// Memoized table block component
const TableBlock = memo(({ node, className, children, ...props }: any) => {
  return (
    <div className="relative group/code rounded-lg overflow-hidden border border-white/10 my-4 bg-black/50 text-left backdrop-blur-sm max-w-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 text-xs text-gray-400">
        <span>Table</span>
      </div>
      <div className="overflow-x-auto p-2">
        <table
          className={`w-full text-left border-separate border-spacing-0 text-sm ${className || ""}`}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  );
});
TableBlock.displayName = "TableBlock";

// Memoized think block component
const ThinkBlock = memo(({ children }: { children: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-3 rounded-md border border-white/10 bg-white/5 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="font-mono">Thinking...</span>
      </button>
      {isExpanded && (
        <div className="px-3 py-2 text-xs text-white/50 border-t border-white/10 bg-black/20 font-mono leading-relaxed whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  );
});
ThinkBlock.displayName = "ThinkBlock";

// Memoized code block component
const CodeBlock = memo(({ inline, className, children, ...props }: any) => {
  const isMatch = /language-(\w+)/.exec(className || "");
  const hasNewLine = String(children).replace(/\n$/, "").includes("\n");
  const isBlock = isMatch || hasNewLine;
  const [copied, setCopied] = useState(false);
  const codeContent = String(children).replace(/\n$/, "");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeContent]);

  if (!isBlock) {
    return (
      <code
        {...props}
        className={`${className} bg-white/10 rounded px-1.5 py-0.5 text-red-200`}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="relative group/code rounded-lg overflow-hidden border border-white/10 my-4 bg-black/50 text-left backdrop-blur-sm max-w-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 text-xs text-gray-400">
        <span>{isMatch ? isMatch[1] : "code"}</span>
        <button
          onClick={handleCopy}
          className="hover:text-white transition-colors"
        >
          {copied ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          {...props}
          style={oneDark}
          language={isMatch ? isMatch[1] : "text"}
          PreTag="div"
          wrapLongLines={false}
          codeTagProps={{
            style: { backgroundColor: "transparent", whiteSpace: "pre" },
          }}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            lineHeight: "1.5",
            fontSize: "0.875rem",
            whiteSpace: "pre",
            overflowX: "auto",
          }}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );
});
CodeBlock.displayName = "CodeBlock";

// Loading animation component with gibberish text - Claude style
const LoadingAnimation = memo(() => {
  const [currentFragment, setCurrentFragment] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // List of partial gibberish fragments that look like incomplete tokens
  const gibberishFragments = useMemo(
    () => [
      "Synthesizing",
      "Pondering",
      "Accomplishing",
      "Pontificating",
      "Tinkering",
      "Thinking",
      "Contemplating",
      "Analyzing",
      "Processing",
      "Formulating",
      "Constructing",
      "Deliberating",
      "Cogitating",
      "Ruminating",
      "Considering",
      "Evaluating",
      "Assembling",
      "Crafting",
      "Sussing",
      "Cooking",
      "Looking",
    ],
    [],
  );

  useEffect(() => {
    // Pick a random word only once when component mounts
    const randomWord =
      gibberishFragments[Math.floor(Math.random() * gibberishFragments.length)];
    setCurrentFragment(randomWord);

    // Optionally change word after a longer period with smooth transition
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        const newWord =
          gibberishFragments[
            Math.floor(Math.random() * gibberishFragments.length)
          ];
        setCurrentFragment(newWord);
        setIsTransitioning(false);
      }, 150); // Quick fade during transition
    }, 2000); // Change every 2 seconds instead of rapidly

    return () => clearInterval(interval);
  }, [gibberishFragments]);

  return (
    <div className="flex items-start h-6">
      <span
        className="text-gray-400/60 text-sm relative"
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          opacity: isTransitioning ? 0 : 1,
          transition: "opacity 150ms ease-in-out",
        }}
      >
        <span
          className="relative font-mono font-medium"
          style={{
            background:
              "linear-gradient(90deg, rgba(156, 163, 175, 0.4) 0%, rgba(156, 163, 175, 0.7) 50%, rgba(156, 163, 175, 0.4) 100%)",
            backgroundSize: "200% 100%",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 2s ease-in-out infinite",
          }}
        >
          {currentFragment}
        </span>
        <span
          className="inline-block ml-0.5"
          style={{
            animation: "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            animationDelay: "0.2s",
          }}
        >
          ...
        </span>
      </span>
    </div>
  );
});
LoadingAnimation.displayName = "LoadingAnimation";

// Memoized message content renderer
const MessageContent = memo(
  ({
    content,
    role,
    isStreaming = false,
  }: {
    content: any;
    role: "user" | "assistant";
    isStreaming?: boolean;
  }) => {
    const { processedContent, thinkBlocks } = useMemo(
      () => preprocessContent(content),
      [content],
    );
    const parts = useMemo(
      () => processedContent.split(/(__THINK_BLOCK_\d+__)/),
      [processedContent],
    );

    const markdownComponents = useMemo(
      () => ({
        p: ({ node, ...props }: any) => (
          <p
            className="my-2 break-words"
            style={{ overflowWrap: "anywhere" }}
            {...props}
          />
        ),
        h1: ({ node, ...props }: any) => (
          <h1
            className="text-2xl font-bold mb-3 break-words"
            style={{ overflowWrap: "anywhere" }}
            {...props}
          />
        ),
        h2: ({ node, ...props }: any) => (
          <h2
            className="text-xl font-bold my-3 break-words"
            style={{ overflowWrap: "anywhere" }}
            {...props}
          />
        ),
        h3: ({ node, ...props }: any) => (
          <h3
            className="text-lg font-semibold my-3 break-words"
            style={{ overflowWrap: "anywhere" }}
            {...props}
          />
        ),
        ul: ({ node, ...props }: any) => (
          <ul className="list-disc pl-4 ml-2 my-3 break-words" {...props} />
        ),
        ol: ({ node, ...props }: any) => (
          <ol className="list-decimal pl-4 ml-2 my-3 break-words" {...props} />
        ),
        li: ({ node, ...props }: any) => (
          <li
            className="my-1 break-words"
            style={{ overflowWrap: "anywhere" }}
            {...props}
          />
        ),
        blockquote: ({ node, ...props }: any) => (
          <blockquote
            className="border-l-4 border-white/20 pl-4 py-1 my-4 italic bg-white/5 rounded-r"
            {...props}
          />
        ),
        hr: ({ node, ...props }: any) => (
          <hr className="my-6 border-t-2 border-white/60" {...props} />
        ),
        pre: ({ children }: any) => <>{children}</>,
        table: TableBlock,
        thead: ({ node, ...props }: any) => (
          <thead
            className="bg-white/5 text-xs uppercase font-medium text-white/60"
            {...props}
          />
        ),
        tbody: ({ node, ...props }: any) => (
          <tbody className="text-gray-300" {...props} />
        ),
        tr: ({ node, ...props }: any) => <tr className="" {...props} />,
        th: ({ node, ...props }: any) => (
          <th
            className="px-4 py-2 font-medium first:rounded-tl-md last:rounded-tr-md border-b border-white/5"
            {...props}
          />
        ),
        td: ({ node, ...props }: any) => (
          <td
            className="px-4 py-2 border border-white/5 first:rounded-bl-md last:rounded-br-md"
            {...props}
          />
        ),
        code: CodeBlock,
      }),
      [],
    );

    const className = `leading-normal text-left break-words ${role === "user" ? "text-cyan-100" : "text-gray-300"} ${isStreaming ? "streaming-message" : ""}`;

    return (
      <div
        className={className}
        style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
      >
        {parts.map((part, i) => {
          const thinkMatch = part.match(/__THINK_BLOCK_(\d+)__/);
          if (thinkMatch) {
            const blockIndex = parseInt(thinkMatch[1]);
            return (
              <ThinkBlock key={`think-${i}`}>
                {thinkBlocks[blockIndex]}
              </ThinkBlock>
            );
          }
          if (!part.trim()) return null;
          return (
            <ReactMarkdown
              key={`md-${i}`}
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {part}
            </ReactMarkdown>
          );
        })}
      </div>
    );
  },
);
MessageContent.displayName = "MessageContent";

// Preprocess content to handle <think> tags
const preprocessContent = (
  content: any,
): { processedContent: string; thinkBlocks: string[] } => {
  const thinkBlocks: string[] = [];
  let processedContent = "";

  if (typeof content === "string") {
    processedContent = content;
  } else if (Array.isArray(content)) {
    processedContent = content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.type === "text") return item.text || "";
        return "";
      })
      .join("\n");
  } else if (content && typeof content === "object") {
    processedContent = content.text || content.content || "";
  }

  const thinkRegex = /<think>\s*([\s\S]*?)\s*<\/think>/g;
  let match;
  let index = 0;

  while ((match = thinkRegex.exec(processedContent)) !== null) {
    thinkBlocks.push(match[1].trim());
    processedContent = processedContent.replace(
      match[0],
      `__THINK_BLOCK_${index}__`,
    );
    index++;
  }

  return { processedContent, thinkBlocks };
};

// Memoized single message component
const SingleMessage = memo(
  ({
    msg,
    index,
    isLoading,
    onRetry,
    onEdit,
    onCopyMessage,
    editingIndex,
    editContent,
    setEditContent,
    setEditingIndex,
    msgsCopied,
    isLastMessage,
    displayMode,
  }: any) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isComposingRef = useRef(false);
    const justFinishedComposingRef = useRef(false);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.nativeEvent.keyCode === 229) return;
        if (e.nativeEvent.isComposing || isComposingRef.current) return;
        if (justFinishedComposingRef.current && e.key === "Enter") {
          justFinishedComposingRef.current = false;
          return;
        }

        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (editContent.trim() !== "" && onEdit) {
            onEdit(index, editContent);
            setEditingIndex(null);
            setEditContent("");
          }
        } else if (e.key === "Escape") {
          setEditingIndex(null);
          setEditContent("");
        }
      },
      [editContent, index, onEdit, setEditingIndex, setEditContent],
    );

    const isEditing = editingIndex === index;
    const showLoadingDots =
      msg.role === "assistant" &&
      msg.content === "" &&
      isLoading &&
      isLastMessage;

    // Auto-resize textarea
    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          textareaRef.current.scrollHeight + "px";
      }
    }, [editContent, isEditing]);

    if (showLoadingDots) {
      return <LoadingAnimation />;
    }

    if (isEditing) {
      return (
        <div className="flex flex-col gap-3 w-full backdrop-blur-xl bg-black/30 border border-white/10 shadow-2xl rounded-2xl p-4 transition-all">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true;
              justFinishedComposingRef.current = false;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
              justFinishedComposingRef.current = true;
              setTimeout(() => {
                justFinishedComposingRef.current = false;
              }, 200);
            }}
            className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-white/40 p-0 text-base leading-relaxed font-light tracking-wide"
            rows={1}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              onClick={() => {
                setEditingIndex(null);
                setEditContent("");
              }}
              className="px-4 py-2 rounded-full text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/5"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (editContent.trim() !== "" && onEdit) {
                  onEdit(index, editContent);
                  setEditingIndex(null);
                  setEditContent("");
                }
              }}
              className="px-4 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-all shadow-lg hover:shadow-blue-400/20 border border-white/10 backdrop-blur-md"
            >
              Save & Generate
            </button>
          </div>
        </div>
      );
    }

    // Check if this message is currently streaming
    const isStreaming =
      msg.role === "assistant" &&
      isLastMessage &&
      isLoading &&
      msg.content !== "";

    return (
      <div className={`message-container ${isStreaming ? "streaming" : ""}`}>
        <MessageContent
          content={msg.content}
          role={msg.role}
          isStreaming={isStreaming}
        />
      </div>
    );
  },
);
SingleMessage.displayName = "SingleMessage";

export const MessageList = memo(function MessageList({
  messages,
  isLoading,
  onRetry,
  onEdit,
  displayMode = "compact",
  selectedMessageIndex = null,
  shouldShake = false,
  onScrollStateChange,
  scrollToBottomRef,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [msgsCopied, setMsgsCopied] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const isAutoScrollingRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const prevMessagesLengthRef = useRef(0);
  const prevIsLoadingRef = useRef(false);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentLengthRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const targetScrollRef = useRef<number | null>(null);
  const hasUserScrolledDuringStreamRef = useRef(false);
  const isStreamingRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const wasAtBottomBeforeNewMessageRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const handleCopyMessage = useCallback((content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setMsgsCopied(index);
    setTimeout(() => setMsgsCopied(null), 2000);
  }, []);

  const startEditing = useCallback((index: number, content: string) => {
    setEditingIndex(index);
    setEditContent(content);
  }, []);

  // Scroll to selected message
  useEffect(() => {
    if (
      selectedMessageIndex !== null &&
      messageRefs.current[selectedMessageIndex]
    ) {
      const element = messageRefs.current[selectedMessageIndex];
      if (element) {
        const scrollContainer = element.closest(".overflow-y-auto");
        if (scrollContainer) {
          const topOffset = 30;
          const elementPosition = element.offsetTop;
          const offsetPosition = elementPosition - topOffset;

          scrollContainer.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }
    }
  }, [selectedMessageIndex]);

  // Set up scroll container
  useEffect(() => {
    if (!containerRef.current) return;

    let parent = containerRef.current.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        scrollContainerRef.current = parent;
        break;
      }
      parent = parent.parentElement;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // Consider user at bottom if within 10px (accounting for rounding)
    shouldAutoScrollRef.current = distanceFromBottom < 10;
    lastScrollTopRef.current = scrollTop;
    // Set initial scroll button visibility
    setShowScrollToBottom(distanceFromBottom > 100);

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      // If this scroll event was triggered by our auto-scroll, ignore it
      if (isAutoScrollingRef.current) {
        isAutoScrollingRef.current = false;
        lastScrollTopRef.current = scrollTop;
        return;
      }

      // This is a user-initiated scroll
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // If user scrolled away from bottom (even slightly during streaming)
      if (distanceFromBottom > (isStreamingRef.current ? 20 : 100)) {
        shouldAutoScrollRef.current = false;
        // Mark that user has scrolled during this streaming session
        if (isStreamingRef.current) {
          hasUserScrolledDuringStreamRef.current = true;
        }
        // Cancel any running animation immediately and forcefully
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
          isAutoScrollingRef.current = false;
        }
        // Show scroll to bottom button
        setShowScrollToBottom(true);
      } else if (distanceFromBottom < 10) {
        // User is very close to bottom, re-enable auto-scroll
        shouldAutoScrollRef.current = true;
        hasUserScrolledDuringStreamRef.current = false;
        // Hide scroll to bottom button
        setShowScrollToBottom(false);
      }

      lastScrollTopRef.current = scrollTop;
    };

    const handleWheel = (e: WheelEvent) => {
      // If user scrolls up during streaming, immediately stop auto-scroll
      if (e.deltaY < 0 && isStreamingRef.current) {
        hasUserScrolledDuringStreamRef.current = true;
        shouldAutoScrollRef.current = false;
        // Cancel animation immediately
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
          isAutoScrollingRef.current = false;
        }
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;

      // If user swipes down (scrolls up) during streaming
      if (deltaY < -10 && isStreamingRef.current) {
        hasUserScrolledDuringStreamRef.current = true;
        shouldAutoScrollRef.current = false;
        // Cancel animation immediately
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
          isAutoScrollingRef.current = false;
        }
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // Manual scroll to bottom function
  const scrollToBottomManual = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Instant scroll to bottom
    container.scrollTop = container.scrollHeight - container.clientHeight;
    lastScrollTopRef.current = container.scrollTop;
    shouldAutoScrollRef.current = true;
    hasUserScrolledDuringStreamRef.current = false;
    setShowScrollToBottom(false);
  }, []);

  // Update parent component when scroll button visibility changes
  useEffect(() => {
    onScrollStateChange?.(showScrollToBottom);
  }, [showScrollToBottom, onScrollStateChange]);

  // Expose scrollToBottom function to parent
  useEffect(() => {
    if (scrollToBottomRef) {
      scrollToBottomRef.current = scrollToBottomManual;
    }
  }, [scrollToBottomRef, scrollToBottomManual]);

  // RAF-based smooth scrolling with adaptive easing
  const smoothScrollToBottom = useCallback(
    (isStreamingMode: boolean = false) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Cancel any existing animation
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      const animate = () => {
        // Stop animation if user has scrolled away or has scrolled during streaming
        if (!container || !shouldAutoScrollRef.current || (isStreamingMode && hasUserScrolledDuringStreamRef.current)) {
          rafIdRef.current = null;
          isAutoScrollingRef.current = false;
          return;
        }

        const currentPosition = container.scrollTop;
        const targetPosition = container.scrollHeight - container.clientHeight;
        const distance = targetPosition - currentPosition;

        // Adaptive easing based on whether we're streaming
        // For streaming: faster to keep up with content
        // For regular: slower for smoother feel
        const easingFactor = isStreamingMode ? 0.18 : 0.12;

        // Calculate step with cubic easing for extra smoothness
        const normalizedDistance = Math.min(Math.abs(distance) / 100, 1);
        const cubicEasing = 1 - Math.pow(1 - normalizedDistance, 3);
        const step = distance * easingFactor * (1 + cubicEasing * 0.5);

        // Stop when we're close enough (within 0.5px for precision)
        if (Math.abs(distance) > 0.5) {
          isAutoScrollingRef.current = true;
          container.scrollTop = currentPosition + step;
          lastScrollTopRef.current = container.scrollTop;
          rafIdRef.current = requestAnimationFrame(animate);
        } else {
          // Snap to final position
          container.scrollTop = targetPosition;
          lastScrollTopRef.current = targetPosition;

          // For streaming, keep the animation loop running only if still auto-scrolling and user hasn't scrolled
          if (isStreamingMode && isLoading && shouldAutoScrollRef.current && !hasUserScrolledDuringStreamRef.current) {
            rafIdRef.current = requestAnimationFrame(animate);
          } else {
            rafIdRef.current = null;
            isAutoScrollingRef.current = false;
          }
        }
      };

      rafIdRef.current = requestAnimationFrame(animate);
    },
    [isLoading],
  );

  // Auto-scroll on message updates with smoother behavior
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || editingIndex !== null) return;

    const hasNewMessage = messages.length > prevMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    const secondLastMessage =
      messages.length > 1 ? messages[messages.length - 2] : null;

    // Check if this is a chat history load (many messages added at once)
    const isChatHistoryLoad = messages.length > prevMessagesLengthRef.current + 5;

    // Check if user is currently at or near bottom before processing
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 50;

    // Store whether we were at bottom before this update
    if (prevMessagesLengthRef.current > 0 && !hasNewMessage) {
      wasAtBottomBeforeNewMessageRef.current = isNearBottom;
    }

    const newUserPrompt =
      hasNewMessage &&
      (lastMessage?.role === "user" ||
        (secondLastMessage?.role === "user" &&
          prevMessagesLengthRef.current < messages.length - 1));

    const loadingStarted = !prevIsLoadingRef.current && isLoading;

    // Check if content is actively streaming (growing)
    const currentContentLength = lastMessage?.content?.length || 0;
    const isStreaming =
      isLoading &&
      lastMessage?.role === "assistant" &&
      currentContentLength > lastContentLengthRef.current;

    // Store streaming state for scroll handler to access
    // Consider it streaming if loading and there's assistant content (even empty string during initial load)
    isStreamingRef.current = isLoading && lastMessage?.role === "assistant";

    const scrollToBottom = (instant = false) => {
      // Don't scroll if user has manually scrolled during this stream
      if (hasUserScrolledDuringStreamRef.current && isStreaming) {
        return;
      }

      isAutoScrollingRef.current = true;

      // Clear any pending setTimeout-based scroll
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }

      // Instant scroll for new user messages when not at bottom
      if (instant) {
        container.scrollTop = container.scrollHeight - container.clientHeight;
        lastScrollTopRef.current = container.scrollTop;
        isAutoScrollingRef.current = false;
        return;
      }

      // For streaming content, use continuous RAF-based smooth scrolling
      if (isStreaming) {
        // Update target scroll position
        targetScrollRef.current = container.scrollHeight;

        // Start smooth scrolling with streaming mode for faster updates
        if (!rafIdRef.current && !hasUserScrolledDuringStreamRef.current) {
          smoothScrollToBottom(true);
        }
      } else {
        // For new messages, scroll immediately with regular smoothing
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (container) {
              smoothScrollToBottom(false);
            }
          });
        });
      }
    };

    // Skip auto-scroll for chat history loads - stay at top
    if (isChatHistoryLoad) {
      // Reset tracking after history load
      prevMessagesLengthRef.current = messages.length;
      lastContentLengthRef.current = currentContentLength;
      isInitialLoadRef.current = false;
      return;
    }

    // When user sends a new message
    if (newUserPrompt) {
      // Reset the flag when new message starts
      hasUserScrolledDuringStreamRef.current = false;
      shouldAutoScrollRef.current = true;

      // Instant jump if user wasn't at bottom before sending
      if (!wasAtBottomBeforeNewMessageRef.current) {
        scrollToBottom(true);
      } else {
        scrollToBottom();
      }
    } else if (loadingStarted) {
      hasUserScrolledDuringStreamRef.current = false;
      shouldAutoScrollRef.current = true;
      scrollToBottom();
    } else if (isStreaming && shouldAutoScrollRef.current) {
      // Only continue scrolling during streaming if user hasn't scrolled
      if (!hasUserScrolledDuringStreamRef.current) {
        scrollToBottom();
      }
    } else if (shouldAutoScrollRef.current && !isStreaming && hasNewMessage) {
      // Scroll for new complete messages
      hasUserScrolledDuringStreamRef.current = false;
      scrollToBottom();
    }

    // Reset scroll flag when streaming ends
    if (!isLoading && prevIsLoadingRef.current) {
      hasUserScrolledDuringStreamRef.current = false;
    }

    lastContentLengthRef.current = currentContentLength;
    prevMessagesLengthRef.current = messages.length;
    prevIsLoadingRef.current = isLoading;
    isInitialLoadRef.current = false;

    // Cleanup
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [messages, isLoading, editingIndex, smoothScrollToBottom]);

  // Process messages for columns mode
  const messageRows = useMemo(() => {
    if (displayMode !== "columns") return null;

    return messages.reduce((rows: any[], msg, index) => {
      if (msg.role === "user") {
        rows.push({
          userMsg: msg,
          userIndex: index,
          assistantMsg: null,
          assistantIndex: -1,
        });
      } else if (msg.role === "assistant" && rows.length > 0) {
        rows[rows.length - 1].assistantMsg = msg;
        rows[rows.length - 1].assistantIndex = index;
      }
      return rows;
    }, []);
  }, [messages, displayMode]);

  if (displayMode === "columns" && messageRows) {
    const lastMsg = messages[messages.length - 1];
    const isStreamingActive =
      isLoading && lastMsg?.role === "assistant" && lastMsg?.content !== "";

    return (
      <div
        ref={containerRef}
        className={`p-4 smooth-scroll ${isStreamingActive ? "streaming-container streaming-active" : ""}`}
      >
          <div className="space-y-0 min-w-0 overflow-hidden">
            {messageRows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              ref={(el) => {
                messageRefs.current[row.userIndex] = el;
                if (row.assistantIndex >= 0) {
                  messageRefs.current[row.assistantIndex] = el;
                }
              }}
              className="grid grid-cols-2 gap-0 py-6 first:pt-0 transition-all min-w-0 overflow-hidden"
              style={{
                animation:
                  (selectedMessageIndex === row.userIndex ||
                    selectedMessageIndex === row.assistantIndex) &&
                  shouldShake
                    ? "shake 0.5s ease-in-out"
                    : "none",
              }}
            >
              {/* Left Column - User */}
              <div
                id={`message-${row.userIndex}`}
                className="pr-6 border-r border-white/5 min-w-0 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-white" />
                  </div>
                  <span className="text-sm text-white/60 font-medium font-mono">
                    You
                  </span>
                </div>

                <SingleMessage
                  msg={row.userMsg}
                  index={row.userIndex}
                  isLoading={isLoading}
                  onRetry={onRetry}
                  onEdit={onEdit}
                  onCopyMessage={handleCopyMessage}
                  editingIndex={editingIndex}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  setEditingIndex={setEditingIndex}
                  msgsCopied={msgsCopied}
                  isLastMessage={false}
                  displayMode={displayMode}
                />

                <div className="flex items-center gap-2 mt-1.5 transition-opacity">
                  {row.userMsg.timestamp && (
                    <span className="text-[10px] text-white/30 font-mono">
                      {new Date(row.userMsg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {!isLoading && (
                    <>
                      <button
                        onClick={() =>
                          handleCopyMessage(row.userMsg.content, row.userIndex)
                        }
                        className="text-white/30 hover:text-white transition-colors p-1"
                        title="Copy Message"
                      >
                        {msgsCopied === row.userIndex ? (
                          <Check size={12} className="text-green-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          startEditing(row.userIndex, row.userMsg.content)
                        }
                        className="text-white/30 hover:text-white transition-colors p-1"
                        title="Edit Message"
                      >
                        <Pencil size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column - Assistant */}
              <div
                id={`message-${row.assistantIndex}`}
                className="pl-6 min-w-0 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Anchor size={14} className="text-white" />
                  </div>
                  <span className="text-sm text-white/60 font-medium font-mono">
                    Anchor
                  </span>
                </div>

                {row.assistantMsg ? (
                  <>
                    <SingleMessage
                      msg={row.assistantMsg}
                      index={row.assistantIndex}
                      isLoading={isLoading}
                      onRetry={onRetry}
                      onEdit={onEdit}
                      onCopyMessage={handleCopyMessage}
                      editingIndex={editingIndex}
                      editContent={editContent}
                      setEditContent={setEditContent}
                      setEditingIndex={setEditingIndex}
                      msgsCopied={msgsCopied}
                      isLastMessage={row.assistantIndex === messages.length - 1}
                      displayMode={displayMode}
                    />

                    {row.assistantMsg.content !== "" && (
                      <div className="flex items-center gap-2 mt-1.5 transition-opacity">
                        {row.assistantMsg.timestamp && (
                          <span className="text-[10px] text-white/30 font-mono">
                            {new Date(
                              row.assistantMsg.timestamp,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        <button
                          onClick={() =>
                            handleCopyMessage(
                              row.assistantMsg.content,
                              row.assistantIndex,
                            )
                          }
                          className="text-white/30 hover:text-white transition-colors p-1"
                          title="Copy Message"
                        >
                          {msgsCopied === row.assistantIndex ? (
                            <Check size={12} className="text-green-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                        <button
                          onClick={() => onRetry?.(row.assistantIndex)}
                          className="text-white/30 hover:text-white transition-colors p-1"
                          title="Regenerate Response"
                        >
                          <RotateCcw size={12} />
                        </button>
                        {row.assistantMsg.model && (
                          <span className="text-xs text-white/40 font-mono py-0.5 rounded-md">
                            {row.assistantMsg.model}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : isLoading &&
                  rowIndex ===
                    messages.filter((m) => m.role === "user").length - 1 ? (
                  <LoadingAnimation />
                ) : null}
              </div>
            </div>
          ))}
          </div>
          {/* Add buffer zone during streaming for smooth scrolling */}
          {isStreamingActive && (
            <div
              className="streaming-buffer"
              style={{
                height: "150px",
                transition: "height 0.3s ease-out",
                opacity: 0,
              }}
            />
          )}
          <div ref={bottomRef} />
        </div>
    );
  }

  // Compact mode
  // Determine if we're actively streaming
  const lastMsg = messages[messages.length - 1];
  const isStreamingActive =
    isLoading && lastMsg?.role === "assistant" && lastMsg?.content !== "";

  return (
    <div
      ref={containerRef}
      className={`p-4 space-y-8 smooth-scroll ${isStreamingActive ? "streaming-container streaming-active" : ""}`}
    >
        {messages.map((msg, index) => (
        <div
          id={`message-${index}`}
          key={index}
          ref={(el) => {
            messageRefs.current[index] = el;
          }}
          className="flex flex-col group transition-all min-w-0 overflow-hidden"
          style={{
            animation:
              selectedMessageIndex === index && shouldShake
                ? "shake 0.5s ease-in-out"
                : "none",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            {msg.role === "assistant" ? (
              <>
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Anchor size={16} className="text-white" />
                </div>
                <span className="text-sm text-white/60 font-medium font-mono">
                  Anchor
                </span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
                <span className="text-sm text-white/60 font-medium font-mono">
                  You
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col items-start w-full min-w-0 overflow-hidden">
            <div
              className={`w-full px-0 py-2 transition-all ${msg.role === "user" ? "bg-white/5 rounded-lg px-4 py-3 backdrop-blur-sm" : ""}`}
            >
              <SingleMessage
                msg={msg}
                index={index}
                isLoading={isLoading}
                onRetry={onRetry}
                onEdit={onEdit}
                onCopyMessage={handleCopyMessage}
                editingIndex={editingIndex}
                editContent={editContent}
                setEditContent={setEditContent}
                setEditingIndex={setEditingIndex}
                msgsCopied={msgsCopied}
                isLastMessage={index === messages.length - 1}
                displayMode={displayMode}
              />
            </div>

            <div
              className={`flex items-center gap-2 mt-1.5 ${editingIndex === index ? "opacity-0 pointer-events-none" : ""} transition-opacity`}
            >
              {msg.timestamp && (
                <span className="text-[10px] text-white/30 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}

              {msg.role === "assistant" && msg.content !== "" && (
                <>
                  <button
                    onClick={() => handleCopyMessage(msg.content, index)}
                    className="text-white/30 hover:text-white transition-colors p-1"
                    title="Copy Message"
                  >
                    {msgsCopied === index ? (
                      <Check size={12} className="text-green-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                  <button
                    onClick={() => onRetry?.(index)}
                    className="text-white/30 hover:text-white transition-colors p-1"
                    title="Regenerate Response"
                  >
                    <RotateCcw size={12} />
                  </button>
                  {msg.model && (
                    <span className="text-xs text-white/40 font-mono py-0.5 rounded-md">
                      {msg.model}
                    </span>
                  )}
                </>
              )}

              {msg.role === "user" && !isLoading && (
                <>
                  <button
                    onClick={() => handleCopyMessage(msg.content, index)}
                    className="text-white/30 hover:text-white transition-colors p-1"
                    title="Copy Message"
                  >
                    {msgsCopied === index ? (
                      <Check size={12} className="text-green-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                  <button
                    onClick={() => startEditing(index, msg.content)}
                    className="text-white/30 hover:text-white transition-colors p-1"
                    title="Edit Message"
                  >
                    <Pencil size={12} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
      {/* Dynamic buffer zone during streaming for smooth scrolling */}
      {isStreamingActive && (
        <div
          className="streaming-buffer"
          style={{
            height: "150px",
            transition: "height 0.3s ease-out",
            opacity: 0,
          }}
        />
      )}
        <div ref={bottomRef} />
      </div>
  );
});
