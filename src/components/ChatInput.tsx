"use client";

import {
  useState,
  KeyboardEvent,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Send, Square, ChevronDown } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  disabled: boolean;
  isLoading: boolean;
  hideSendButton?: boolean;
  showScrollToBottom?: boolean;
  onScrollToBottom?: () => void;
}

export interface ChatInputRef {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      onStop,
      disabled,
      isLoading,
      hideSendButton = false,
      showScrollToBottom = false,
      onScrollToBottom,
    },
    ref,
  ) {
    const [input, setInput] = useState("");
    const [isMultiLine, setIsMultiLine] = useState(false);
    const isComposingRef = useRef(false);
    const justFinishedComposingRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isButtonVisible, setIsButtonVisible] = useState(false);
    const buttonTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    const handleSend = () => {
      if (input.trim() && !disabled) {
        onSend(input);
        setInput("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Check for IME composition using keyCode 229
      if (e.nativeEvent.keyCode === 229) {
        return;
      }

      // Block Enter if currently composing
      if (e.nativeEvent.isComposing || isComposingRef.current) {
        return;
      }

      // Block Enter if we just finished composing (to avoid sending when confirming IME)
      if (justFinishedComposingRef.current && e.key === "Enter") {
        justFinishedComposingRef.current = false;
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);

      // Update height and multi-line state immediately
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        const newHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${newHeight}px`;

        // Check if textarea is multi-line
        const lineHeight = 24;
        setIsMultiLine(newHeight > lineHeight * 1.5);
      }
    };

    useEffect(() => {
      // Reset on send
      if (!input && textareaRef.current) {
        textareaRef.current.style.height = "auto";
        setIsMultiLine(false);
      }
    }, [input]);

    // Handle window resize to adjust textarea height
    useEffect(() => {
      const handleResize = () => {
        if (textareaRef.current && input) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [input]);

    // Handle button visibility with delay to prevent flashing
    useEffect(() => {
      if (buttonTimeoutRef.current) {
        clearTimeout(buttonTimeoutRef.current);
      }

      if (showScrollToBottom) {
        // Show immediately when scrolling up
        setIsButtonVisible(true);
      } else {
        // Hide with a small delay when scrolling to bottom
        buttonTimeoutRef.current = setTimeout(() => {
          setIsButtonVisible(false);
        }, 100); // Small delay to prevent flash
      }

      return () => {
        if (buttonTimeoutRef.current) {
          clearTimeout(buttonTimeoutRef.current);
        }
      };
    }, [showScrollToBottom]);

    return (
      <div className="p-0 bg-transparent">
        {/* Scroll to bottom button */}
        <div
          className={`flex justify-center overflow-hidden transition-all ${
            isButtonVisible
              ? "animate-in slide-in-from-bottom-2 fade-in duration-300 max-h-12 mb-3"
              : "animate-out slide-out-to-bottom-2 fade-out duration-200 max-h-0 mb-0"
          }`}
          style={{
            transformOrigin: "bottom center",
          }}
        >
          <button
            onClick={onScrollToBottom}
            className={`w-12 h-12 border border-white/30 rounded-full bg-white/5 backdrop-blur-md hover:bg-white/10 text-white flex items-center justify-center transition-all ${
              isButtonVisible ? "" : "pointer-events-none"
            }`}
            title="Scroll to bottom"
          >
            <ChevronDown size={20} />
          </button>
        </div>
        <div
          className={`relative max-w-4xl mx-auto flex items-end gap-2 ${hideSendButton ? "justify-center" : ""}`}
        >
          <div
            className={`backdrop-blur-md bg-black/30 border border-white/30 shadow-2xl p-3 hover:bg-black/40 focus-within:bg-black/50 focus-within:border-white/70 ${isMultiLine ? "rounded-2xl" : "rounded-[32px]"} w-[calc(100%-60px)] transition-all duration-300 ease-out`}
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => {
                isComposingRef.current = true;
                justFinishedComposingRef.current = false;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
                justFinishedComposingRef.current = true;
                // Clear the flag after a delay to allow normal Enter after composition
                setTimeout(() => {
                  justFinishedComposingRef.current = false;
                }, 200);
              }}
              placeholder="Type a message..."
              disabled={disabled}
              rows={1}
              className="w-full bg-transparent text-white border-none placeholder-white/40 focus:outline-none resize-none max-h-24 overflow-y-auto px-2 font-light tracking-wide whitespace-pre-wrap"
            />
          </div>
          {!hideSendButton &&
            (isLoading ? (
              <button
                onClick={onStop}
                className="p-4 rounded-full bg-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-all backdrop-blur-md shadow-lg hover:shadow-red-400/20"
                style={{
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
                title="Stop generation"
              >
                <Square size={20} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-4 rounded-full backdrop-blur-xl bg-transparent border border-white/30 text-white/90 hover:text-white hover:bg-white/20 disabled:cursor-not-allowed transition-all shadow-2xl hover:shadow-blue-400/20"
                title="Send message"
              >
                <Send size={20} />
              </button>
            ))}
        </div>
        <div className="text-center mt-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <span className="text-[10px] text-white/20 uppercase tracking-widest font-mono">
            Press Enter to send
          </span>
        </div>
      </div>
    );
  },
);
