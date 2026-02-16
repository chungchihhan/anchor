import { useEffect, useState, useRef, memo, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  FolderOpen,
  Trash2,
  Copy,
  Check,
  User,
  Anchor,
  ChevronDown,
} from "lucide-react";
import { ChatSession, Message } from "@/types";

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Lightweight message preview - no markdown processing initially
const LightweightMessagePreview = memo(
  ({ message, index }: { message: Message; index: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const MAX_PREVIEW_LENGTH = 500; // Increased to show more content

    const truncatedContent = useMemo(() => {
      const content = message.content || "";
      if (content.length <= MAX_PREVIEW_LENGTH) return content;
      return content.substring(0, MAX_PREVIEW_LENGTH) + "...";
    }, [message.content]);

    const needsExpansion = (message.content?.length || 0) > MAX_PREVIEW_LENGTH;

    return (
      <div className="flex flex-col w-full max-w-full min-w-0">
        {/* Avatar and name on top */}
        <div className="flex items-center gap-2 mb-2">
          {message.role === "assistant" ? (
            <>
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <Anchor size={16} className="text-white" />
              </div>
              <span className="text-sm text-white/60 font-medium">Anchor</span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <span className="text-sm text-white/60 font-medium">You</span>
            </>
          )}
        </div>

        <div
          className={`w-full px-0 py-2 transition-all ${
            message.role === "user" ? "bg-white/5 rounded-lg px-4 py-3" : ""
          }`}
        >
          <div
            className={`leading-normal text-left break-words overflow-wrap-anywhere ${
              message.role === "user" ? "text-cyan-100" : "text-gray-300"
            }`}
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
          >
            {/* Simple text preview without markdown processing */}
            <div className="whitespace-pre-wrap font-sans">
              {isExpanded ? message.content : truncatedContent}
            </div>

            {needsExpansion && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center mt-3 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-md transition-all cursor-pointer"
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>

        {/* Meta info */}
        {message.timestamp && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-white/30 font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {message.model && (
              <span className="text-xs text-white/40 font-mono py-0.5 rounded-md">
                {message.model}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);
LightweightMessagePreview.displayName = "LightweightMessagePreview";

// Virtualized message list with pagination
const VirtualizedMessageList = memo(
  ({ messages, sessionId }: { messages: Message[]; sessionId: string }) => {
    const MESSAGES_PER_PAGE = 20;
    const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset visible count when session changes
    useEffect(() => {
      setVisibleCount(MESSAGES_PER_PAGE);
      containerRef.current?.scrollTo(0, 0);
    }, [sessionId]);

    const visibleMessages = useMemo(
      () => messages.slice(0, visibleCount),
      [messages, visibleCount],
    );

    const hasMore = visibleCount < messages.length;

    const loadMore = useCallback(() => {
      setVisibleCount((prev) =>
        Math.min(prev + MESSAGES_PER_PAGE, messages.length),
      );
    }, [messages.length]);

    return (
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 custom-scrollbar relative"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)",
        }}
      >
        {visibleMessages.map((msg, idx) => (
          <LightweightMessagePreview
            key={`${sessionId}-${idx}`}
            message={msg}
            index={idx}
          />
        ))}

        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-all flex items-center gap-2"
            >
              <ChevronDown size={16} />
              Load {Math.min(
                MESSAGES_PER_PAGE,
                messages.length - visibleCount,
              )}{" "}
              more messages
            </button>
          </div>
        )}
      </div>
    );
  },
);
VirtualizedMessageList.displayName = "VirtualizedMessageList";

export function OptimizedChatHistoryModal({
  isOpen,
  onClose,
  sessions,
  onSelect,
  onDelete,
}: ChatHistoryModalProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shouldShake, setShouldShake] = useState(false);
  const [deleteKeyPressed, setDeleteKeyPressed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Lazy loading for sessions list
  const INITIAL_SESSIONS_COUNT = 10;
  const LOAD_MORE_COUNT = 10;
  const [visibleSessionsCount, setVisibleSessionsCount] = useState(INITIAL_SESSIONS_COUNT);

  // Debounce session switching to reduce re-renders
  const [pendingHighlight, setPendingHighlight] = useState<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (pendingHighlight !== null) {
      debounceTimerRef.current = setTimeout(() => {
        setHighlightedIndex(pendingHighlight);
        setPendingHighlight(null);
      }, 150); // 150ms debounce

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }
  }, [pendingHighlight]);

  // Filter sessions with memoization
  const allFilteredSessions = useMemo(
    () =>
      sessions.filter((session) =>
        (session.title || "Untitled")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      ),
    [sessions, searchQuery],
  );

  // Apply lazy loading to filtered sessions
  const filteredSessions = useMemo(
    () => allFilteredSessions.slice(0, visibleSessionsCount),
    [allFilteredSessions, visibleSessionsCount]
  );

  const hasMoreSessions = visibleSessionsCount < allFilteredSessions.length;

  // Load more sessions function
  const loadMoreSessions = useCallback(() => {
    setVisibleSessionsCount(prev =>
      Math.min(prev + LOAD_MORE_COUNT, allFilteredSessions.length)
    );
  }, [allFilteredSessions.length]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setSearchQuery("");
      setPendingHighlight(null);
      setVisibleSessionsCount(INITIAL_SESSIONS_COUNT);
      setDeleteKeyPressed(false);
    }
  }, [isOpen]);

  // Reset visible sessions when search changes
  useEffect(() => {
    setVisibleSessionsCount(INITIAL_SESSIONS_COUNT);
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (highlightedIndex >= filteredSessions.length - 1) {
          // If there are more sessions to load, load them
          if (hasMoreSessions) {
            loadMoreSessions();
            setPendingHighlight(highlightedIndex + 1);
          } else {
            setShouldShake(true);
            setTimeout(() => setShouldShake(false), 500);
          }
        } else {
          setPendingHighlight(highlightedIndex + 1);
          // Load more when approaching the end (2 items from bottom)
          if (highlightedIndex >= filteredSessions.length - 3 && hasMoreSessions) {
            loadMoreSessions();
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (highlightedIndex <= 0) {
          setShouldShake(true);
          setTimeout(() => setShouldShake(false), 500);
        } else {
          setPendingHighlight(highlightedIndex - 1);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (deleteKeyPressed && onDelete && filteredSessions.length > 0) {
          // If 'd' was pressed before, delete the selected chat
          onDelete(filteredSessions[highlightedIndex].id);
          setDeleteKeyPressed(false);
        } else if (filteredSessions.length > 0) {
          // Normal enter - select the chat
          onSelect(filteredSessions[highlightedIndex].id);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setDeleteKeyPressed(false); // Reset delete key state
        onClose();
      } else if (e.key === "d" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (onDelete && filteredSessions.length > 0) {
          setDeleteKeyPressed(true);
        }
      } else if (
        e.key === "Backspace" &&
        e.metaKey &&
        onDelete &&
        filteredSessions.length > 0
      ) {
        e.preventDefault();
        onDelete(filteredSessions[highlightedIndex].id);
        setDeleteKeyPressed(false);
      } else if (e.key !== "Shift" && e.key !== "Meta" && e.key !== "Control" && e.key !== "Alt") {
        // Reset delete key state on any other key press (except modifiers)
        setDeleteKeyPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredSessions, highlightedIndex, onSelect, onClose, onDelete, hasMoreSessions, loadMoreSessions, deleteKeyPressed]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const element = listRef.current.children[highlightedIndex] as HTMLElement;
      if (element) {
        const container = listRef.current;
        const elementTop = element.offsetTop;
        const elementBottom = elementTop + element.offsetHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;

        if (elementTop < containerTop) {
          element.scrollIntoView({ block: "start", behavior: "smooth" });
        } else if (elementBottom > containerBottom) {
          element.scrollIntoView({ block: "end", behavior: "smooth" });
        }
      }
    }
  }, [highlightedIndex, isOpen, filteredSessions]);

  if (!isOpen) return null;

  const selectedSession = filteredSessions[highlightedIndex];

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6 transition-all">
      <div className="bg-black/95 border border-white/10 rounded-2xl w-full max-w-6xl h-[85vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
          <h3 className="text-white font-medium tracking-wide flex items-center gap-2">
            <FolderOpen size={18} className="text-cyan-400" />
            Open Chat
          </h3>
          <div className="flex items-center gap-3">
            {deleteKeyPressed ? (
              <span className="text-xs text-red-400 bg-red-500/20 border border-red-400/50 px-2 py-1 rounded font-mono animate-pulse">
                Press Enter to confirm delete
              </span>
            ) : (
              <span className="text-[10px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded font-mono hidden sm:inline-block">
                Type to search • ↑↓ navigate • Enter open • D+Enter delete
              </span>
            )}
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar: Chat List */}
          <div className="w-1/3 border-r border-white/10 flex flex-col bg-black/20 flex-shrink-0">
            {/* Search Bar */}
            <div className="p-3 border-b border-white/5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                  setPendingHighlight(null);
                }}
                placeholder="Search titles..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
              />
            </div>

            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-2 custom-scrollbar"
              onScroll={(e) => {
                const container = e.currentTarget;
                const { scrollTop, scrollHeight, clientHeight } = container;
                // Load more when scrolled to within 50px of the bottom
                if (scrollHeight - scrollTop - clientHeight < 50 && hasMoreSessions) {
                  loadMoreSessions();
                }
              }}
            >
              {filteredSessions.length === 0 ? (
                <div className="text-center py-12 text-white/30 text-sm">
                  {searchQuery
                    ? `No chats match "${searchQuery}"`
                    : "No saved chats found"}
                </div>
              ) : (
                filteredSessions.map((session, index) => (
                  <div
                    key={session.id}
                    className={`w-full px-3 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 group border border-transparent relative mb-1 ${
                      index === highlightedIndex
                        ? deleteKeyPressed
                          ? "bg-red-500/20 border-red-400/50 shadow-lg shadow-red-500/20"
                          : "bg-white/10 border-white/5 shadow-lg"
                        : "hover:bg-white/5 hover:border-white/5"
                    }`}
                    style={{
                      animation:
                        index === highlightedIndex && shouldShake
                          ? "shake 0.5s ease-in-out"
                          : "none",
                    }}
                    onClick={() => {
                      onSelect(session.id);
                      onClose();
                    }}
                  >
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center transition-all shadow-inner shrink-0 ${
                        index === highlightedIndex
                          ? "from-cyan-500/30 to-blue-600/30 text-cyan-400 shadow-cyan-500/20"
                          : "from-white/5 to-white/10 text-white/30 group-hover:text-white/70"
                      }`}
                    >
                      <FolderOpen size={14} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer">
                      <p
                        className={`text-sm font-medium truncate ${
                          index === highlightedIndex
                            ? "text-white"
                            : "text-gray-300"
                        }`}
                      >
                        {session.title || "Untitled Chat"}
                      </p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>
                          {new Date(session.timestamp).toLocaleDateString()}
                        </span>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-600"></span>
                        <span>
                          {new Date(session.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-600"></span>
                        <span>{session.messages.length} msgs</span>
                      </p>
                    </div>
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (deletingId === session.id) {
                            onDelete(session.id);
                            setDeletingId(null);
                          } else {
                            setDeletingId(session.id);
                            setTimeout(
                              () =>
                                setDeletingId((prev) =>
                                  prev === session.id ? null : prev,
                                ),
                              3000,
                            );
                          }
                        }}
                        className={`p-1.5 rounded-md transition-all z-10 relative flex items-center justify-center ${
                          deletingId === session.id
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "text-white/20 hover:text-red-400 hover:bg-red-500/10"
                        } ${
                          index === highlightedIndex
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                        title="Delete Chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}

              {/* Load more indicator */}
              {hasMoreSessions && filteredSessions.length > 0 && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={loadMoreSessions}
                    className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 rounded-md transition-all flex items-center gap-2"
                  >
                    <ChevronDown size={14} />
                    Load more ({allFilteredSessions.length - filteredSessions.length} remaining)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Chat Preview */}
          <div className="flex-1 flex flex-col bg-black/40 relative min-w-0 overflow-hidden">
            {selectedSession ? (
              <>
                <div className="p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
                  <h4 className="text-white/90 font-medium truncate text-lg">
                    {selectedSession.title || "Untitled Chat"}
                  </h4>
                  <p className="text-xs text-white/40 font-mono shrink-0 ml-4">
                    {selectedSession.messages.length} messages
                  </p>
                </div>

                {/* Virtualized message list with pagination */}
                <VirtualizedMessageList
                  messages={selectedSession.messages}
                  sessionId={selectedSession.id}
                />

                {/* Gradient Overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                <FolderOpen size={48} className="mb-4 opacity-20" />
                <p>Select a chat to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
