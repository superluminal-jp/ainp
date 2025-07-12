"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowFileAttach?: boolean;
  className?: string;
}

export default function ChatInput({
  onSendMessage,
  placeholder = "Type your message here... (Shift+Enter for new line, Enter to send)",
  disabled = false,
  allowFileAttach = false,
  className = "",
}: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    const trimmedInput = inputMessage.trim();

    if (!trimmedInput && !attachedFile) {
      return;
    }

    let text = trimmedInput;
    const files: File[] = [];

    if (attachedFile) {
      files.push(attachedFile);
      if (!trimmedInput) {
        text = `I've attached a file: ${attachedFile.name}. Please help me with this file.`;
      } else {
        text += `\n📎 ${attachedFile.name}`;
      }
    }

    onSendMessage(text, files.length > 0 ? files : undefined);
    setInputMessage("");
    setAttachedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      toast.success(`File attached: ${file.name}`);
    }
  };

  const removeAttachedFile = () => {
    if (attachedFile) {
      setAttachedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.info("File removed");
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* File attachment display */}
      {attachedFile && (
        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">
              {attachedFile.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeAttachedFile}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Message input */}
      <div className="flex gap-2 items-end">
        <Textarea
          placeholder={placeholder}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none"
          disabled={disabled}
          rows={1}
        />

        {/* File attachment input */}
        {allowFileAttach && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={handleFileSelect}
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={disabled}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </>
        )}

        <Button
          onClick={handleSendMessage}
          disabled={(!inputMessage.trim() && !attachedFile) || disabled}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
