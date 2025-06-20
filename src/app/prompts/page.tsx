"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  MessageCircle,
  Send,
} from "lucide-react";
import Link from "next/link";

interface CustomPrompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

export default function PromptsPage() {
  const [isDark, setIsDark] = useState(true);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [formData, setFormData] = useState({ name: "", content: "" });
  const [showHelper, setShowHelper] = useState(false);
  const [helperMessages, setHelperMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content:
        "Hi! I'm here to help you craft better system prompts. Share your current prompt or describe what you want your AI to do, and I'll provide suggestions for improvement.",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [helperInput, setHelperInput] = useState("");
  const [isHelperTyping, setIsHelperTyping] = useState(false);

  useEffect(() => {
    const darkClass = document.documentElement.classList.contains("dark");
    setIsDark(darkClass);

    // Load custom prompts from localStorage
    const saved = localStorage.getItem("customPrompts");
    if (saved) {
      setCustomPrompts(JSON.parse(saved));
    }
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const savePrompts = (prompts: CustomPrompt[]) => {
    setCustomPrompts(prompts);
    localStorage.setItem("customPrompts", JSON.stringify(prompts));
  };

  const handleAddPrompt = () => {
    if (!formData.name.trim() || !formData.content.trim()) return;

    const newPrompt: CustomPrompt = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      content: formData.content.trim(),
      isActive: true,
    };

    savePrompts([...customPrompts, newPrompt]);
    setFormData({ name: "", content: "" });
    setIsEditing(false);
  };

  const handleEditPrompt = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
    setFormData({ name: prompt.name, content: prompt.content });
    setIsEditing(true);
  };

  const handleUpdatePrompt = () => {
    if (!editingPrompt || !formData.name.trim() || !formData.content.trim())
      return;

    const updated = customPrompts.map((p) =>
      p.id === editingPrompt.id
        ? { ...p, name: formData.name.trim(), content: formData.content.trim() }
        : p
    );

    savePrompts(updated);
    setFormData({ name: "", content: "" });
    setEditingPrompt(null);
    setIsEditing(false);
  };

  const handleDeletePrompt = (id: string) => {
    const filtered = customPrompts.filter((p) => p.id !== id);
    savePrompts(filtered);
  };

  const togglePromptActive = (id: string) => {
    const updated = customPrompts.map((p) =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    );
    savePrompts(updated);
  };

  const cancelEdit = () => {
    setFormData({ name: "", content: "" });
    setEditingPrompt(null);
    setIsEditing(false);
  };

  const handleHelperSend = () => {
    if (!helperInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: helperInput.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setHelperMessages((prev) => [...prev, userMessage]);
    setHelperInput("");
    setIsHelperTyping(true);

    // Simulate AI response with prompt engineering advice
    setTimeout(() => {
      const responses = [
        "Here are some suggestions to improve your prompt:\n\n1. Be more specific about the AI's role and expertise\n2. Add examples of desired output format\n3. Include constraints or guidelines\n4. Specify the tone and style you want",
        "Consider these prompt engineering best practices:\n\n• Start with 'You are a...' to establish role\n• Use bullet points for complex instructions\n• Add 'Always...' or 'Never...' for consistent behavior\n• Include edge case handling",
        "To make your prompt more effective:\n\n→ Define the context clearly\n→ Specify desired output format\n→ Add personality traits if needed\n→ Include example interactions\n→ Set clear boundaries",
        "Good prompt structure:\n\n**Role**: What the AI should be\n**Task**: What it should do\n**Context**: When/where it operates\n**Format**: How to respond\n**Constraints**: What to avoid",
      ];

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: "assistant",
        timestamp: new Date(),
      };

      setHelperMessages((prev) => [...prev, aiResponse]);
      setIsHelperTyping(false);
    }, 1500 + Math.random() * 2000);
  };

  const handleHelperKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleHelperSend();
    }
  };

  const applyHelperSuggestion = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
    setShowHelper(false);
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border shrink-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <ArrowLeft className="h-3 w-3" />
              </Button>
            </Link>
            <h1 className="text-sm font-medium">System Prompts</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelper(!showHelper)}
              className={`h-6 w-6 p-0 ${showHelper ? "bg-muted" : ""}`}
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
              className="scale-75"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Form Panel */}
        <div
          className={`${
            showHelper ? "w-1/4" : "w-1/3"
          } border-r border-border p-3`}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isEditing ? "Edit Prompt" : "Add New Prompt"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Prompt name..."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="content" className="text-xs">
                  System Prompt
                </Label>
                <Textarea
                  id="content"
                  placeholder="Enter your system prompt..."
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="min-h-32 text-xs"
                />
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleUpdatePrompt}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      disabled={
                        !formData.name.trim() || !formData.content.trim()
                      }
                    >
                      Update
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleAddPrompt}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={!formData.name.trim() || !formData.content.trim()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Prompt
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Helper Chat Panel */}
        {showHelper && (
          <div className="w-1/3 border-r border-border p-3 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Prompt Helper</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-3">
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {helperMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] px-2 py-1 rounded text-xs ${
                            message.sender === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                          {message.sender === "assistant" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                applyHelperSuggestion(message.content)
                              }
                              className="h-5 px-1 mt-1 text-xs"
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {isHelperTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted px-2 py-1 rounded text-xs">
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="flex space-x-1">
                  <Input
                    placeholder="Ask for help..."
                    value={helperInput}
                    onChange={(e) => setHelperInput(e.target.value)}
                    onKeyDown={handleHelperKeyDown}
                    className="h-6 text-xs"
                  />
                  <Button
                    onClick={handleHelperSend}
                    disabled={!helperInput.trim() || isHelperTyping}
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Prompts List */}
        <div className="flex-1 p-3">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {customPrompts.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No custom prompts yet. Add one to get started.
                </div>
              ) : (
                customPrompts.map((prompt) => (
                  <Card
                    key={prompt.id}
                    className={!prompt.isActive ? "opacity-50" : ""}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium">
                              {prompt.name}
                            </h3>
                            <Switch
                              checked={prompt.isActive}
                              onCheckedChange={() =>
                                togglePromptActive(prompt.id)
                              }
                              className="scale-75"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {prompt.content}
                          </p>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPrompt(prompt)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePrompt(prompt.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
