"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, RefreshCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: Date;
  files?: File[];
}

interface ChatDisplayProps {
  messages: ChatMessage[];
  isTyping?: boolean;
  onCopy?: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  onLike?: (messageId: string) => void;
  onDislike?: (messageId: string) => void;
  className?: string;
}

export default function ChatDisplay({
  messages,
  isTyping = false,
  onCopy,
  onRegenerate,
  onLike,
  onDislike,
  className = "",
}: ChatDisplayProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleCopy = (text: string) => {
    if (onCopy) {
      onCopy(text);
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    }
  };

  return (
    <ScrollArea ref={scrollAreaRef} className={`h-full p-4 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            } group`}
          >
            <div className="max-w-[80%]">
              <div
                className={`px-4 py-3 rounded-lg relative ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
              <div
                className={`flex items-center ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopy(message.text)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {message.role === "assistant" && (
                  <>
                    {onLike && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onLike(message.id)}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                    )}
                    {onDislike && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onDislike(message.id)}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    )}
                    {onRegenerate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRegenerate(message.id)}
                      >
                        <RefreshCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-3 rounded-lg max-w-[80%]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
