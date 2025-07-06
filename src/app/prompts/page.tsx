"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import {
  Edit,
  Trash2,
  MessageSquare,
  Save,
  X,
  Copy,
  Check,
  Bot,
  Send,
  User,
} from "lucide-react";

import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

// Chat message interface
interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export default function PromptsPage() {
  useSimpleHeader(
    "System Prompts",
    "Manage custom system prompts and templates"
  );

  const [systemPrompts, setSystemPrompts] = useState<
    Schema["systemPrompts"]["type"][]
  >([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<
    Schema["systemPrompts"]["type"] | null
  >(null);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Chat assistant state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to real-time updates for all prompts
    const sub = client.models.systemPrompts.observeQuery().subscribe({
      next: ({ items }) => {
        setSystemPrompts([...items]);
      },
      error: (error) => {
        console.error("Error in real-time subscription:", error);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  const handleAddPrompt = async () => {
    if (!formData.name.trim() || !formData.content.trim()) return;

    setLoading(true);
    try {
      await client.models.systemPrompts.create({
        name: formData.name.trim(),
        content: formData.content.trim(),
        isActive: true,
      });

      setFormData({ name: "", content: "" });
      setIsEditing(false);
    } catch (error) {
      console.error("Error creating prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrompt = (prompt: Schema["systemPrompts"]["type"]) => {
    setEditingPrompt(prompt);
    setFormData({ name: prompt.name, content: prompt.content });
    setIsEditing(true);
  };

  const handleUpdatePrompt = async () => {
    if (!editingPrompt || !formData.name.trim() || !formData.content.trim())
      return;

    setLoading(true);
    try {
      await client.models.systemPrompts.update({
        id: editingPrompt.id,
        name: formData.name.trim(),
        content: formData.content.trim(),
        isActive: true,
      });

      setFormData({ name: "", content: "" });
      setEditingPrompt(null);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    setLoading(true);
    try {
      await client.models.systemPrompts.delete({ id });
    } catch (error) {
      console.error("Error deleting prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePromptActive = async (id: string) => {
    const prompt = systemPrompts.find((p) => p.id === id);
    if (!prompt) return;

    setLoading(true);
    try {
      await client.models.systemPrompts.update({
        id,
        isActive: !prompt.isActive,
      });
    } catch (error) {
      console.error("Error updating prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({ name: "", content: "" });
    setEditingPrompt(null);
    setIsEditing(false);
  };

  const copyPromptContent = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handlers for AI assistant suggestions
  const handleApplyName = (name: string) => {
    setFormData((prev) => ({ ...prev, name }));
  };

  const handleApplyContent = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };

  // Chat assistant methods
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initialize with a helpful system message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          text: "Hello! I'm here to help you create and enhance system prompts. I can:\n\n• Generate prompt names based on your description\n• Create detailed system prompt content\n• Suggest improvements to existing prompts\n• Help you with specific prompt engineering techniques\n\nWhat would you like to work on today?",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [messages.length]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      text: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const systemPrompt = `You are a helpful AI assistant specializing in system prompt engineering and creation. 

Your role is to help users create, improve, and optimize system prompts for AI assistants. You should:

1. **Generate Names**: Create clear, descriptive names for system prompts based on their purpose
2. **Create Content**: Write detailed, effective system prompt content that follows best practices
3. **Improve Existing**: Suggest improvements to existing prompts for clarity, specificity, and effectiveness
4. **Provide Guidance**: Offer tips on prompt engineering techniques and best practices

Current prompt being worked on:
- Name: "${formData.name}"
- Content: "${formData.content}"

**IMPORTANT**: You must respond in JSON format with the following structure:
{
  "message": "Your helpful response and guidance to the user",
  "suggestions": {
    "name": "Suggested prompt name (if applicable)",
    "content": "Suggested prompt content (if applicable)"
  },
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Always provide:
- A helpful message with your advice
- Specific suggestions for name and/or content when relevant
- 2-3 practical tips for prompt engineering

Make your suggestions actionable and immediately useful. Focus on best practices and proven techniques.`;

      const response = await client.queries.chatWithBedrockTools({
        messages: messages.concat(userMessage),
        systemPrompt,
        modelId: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
        useTools: false,
        databaseIds: [],
        selectedToolIds: [],
        responseFormat: {
          json: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "The main response message to the user",
              },
              suggestions: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Suggested prompt name",
                  },
                  content: {
                    type: "string",
                    description: "Suggested prompt content",
                  },
                },
                description: "Suggested values for the prompt form fields",
              },
              tips: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "Helpful tips for prompt engineering",
              },
            },
            required: ["message"],
          },
        },
      });

      if (response.data) {
        let responseText = response.data.response;
        let parsedResponse = null;

        // Try to parse structured response
        try {
          parsedResponse = JSON.parse(responseText);
          if (parsedResponse && parsedResponse.message) {
            responseText = parsedResponse.message;

            // Add tips if available
            if (parsedResponse.tips && Array.isArray(parsedResponse.tips)) {
              const tips = parsedResponse.tips as string[];
              responseText +=
                "\n\nTips:\n" + tips.map((tip) => `• ${tip}`).join("\n");
            }
          }
        } catch (error) {
          // If parsing fails, use the raw response
          console.log("Using raw response text", error);
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          text: responseText,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Auto-apply suggestions if available
        if (parsedResponse && parsedResponse.suggestions) {
          const suggestions = parsedResponse.suggestions;
          if (suggestions.name && suggestions.name.trim()) {
            handleApplyName(suggestions.name.trim());
          }
          if (suggestions.content && suggestions.content.trim()) {
            handleApplyContent(suggestions.content.trim());
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        text: "I apologize, but I encountered an error while processing your message. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <AppHeader />
      <div className="h-[calc(100vh-5rem)] bg-background text-foreground flex">
        <div className="flex-1 flex">
          {/* Form Panel */}
          <div className="w-1/4 border-r border-border p-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {isEditing ? "Edit Prompt" : "Create New Prompt"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-3 overflow-y-auto">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">
                    Prompt Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Research Assistant, Code Helper"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="h-7 text-xs"
                  />
                </div>

                <div className="space-y-1 flex-1 flex flex-col">
                  <Label htmlFor="content" className="text-xs">
                    Prompt Content
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Enter the system prompt content..."
                    value={formData.content}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    className="flex-1 text-xs resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={isEditing ? handleUpdatePrompt : handleAddPrompt}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={
                      !formData.name.trim() ||
                      !formData.content.trim() ||
                      loading
                    }
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {loading ? "Saving..." : isEditing ? "Update" : "Create"}
                  </Button>
                  {isEditing && (
                    <Button
                      variant="outline"
                      onClick={cancelEdit}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      disabled={loading}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>

                {/* AI Assistant Info */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      AI Assistant available in chat panel →
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Assistant Panel */}
          <div className="w-1/3 border-r border-border p-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Prompt Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 p-3">
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <ScrollArea className="flex-1 pr-4 h-0">
                    <div className="space-y-4 p-2">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {message.role === "assistant" && (
                                <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              )}
                              {message.role === "user" && (
                                <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <div className="text-sm whitespace-pre-wrap">
                                  {message.text}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4" />
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                                <div
                                  className="w-2 h-2 bg-current rounded-full animate-bounce"
                                  style={{ animationDelay: "0.1s" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-current rounded-full animate-bounce"
                                  style={{ animationDelay: "0.2s" }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="border-t pt-4 mt-4">
                    <div className="flex gap-2">
                      <Textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me to help generate or improve your prompt..."
                        className="flex-1 resize-none"
                        rows={2}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        size="sm"
                        className="px-3"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Press Enter to send, Shift+Enter for new line
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prompts List */}
          <div className="flex-1 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">System Prompts</h2>
              <Badge variant="outline" className="text-xs">
                {systemPrompts.length} Prompts
              </Badge>
            </div>

            <ScrollArea className="flex-1">
              {systemPrompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No system prompts created yet</p>
                  <p className="text-xs">
                    Create your first system prompt above
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {systemPrompts.map((prompt) => (
                    <Card
                      key={prompt.id}
                      className={`hover:bg-muted/50 ${
                        !(prompt.isActive ?? true) ? "opacity-50" : ""
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium">
                                {prompt.name}
                              </h4>
                              <Switch
                                checked={prompt.isActive ?? true}
                                onCheckedChange={() =>
                                  togglePromptActive(prompt.id)
                                }
                                className="scale-75"
                              />
                              <Label className="text-xs">Active</Label>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {prompt.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyPromptContent(prompt.content, prompt.id)
                              }
                              className="h-6 w-6 p-0"
                              title="Copy prompt content"
                            >
                              {copiedId === prompt.id ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditPrompt(prompt)}
                              className="h-6 w-6 p-0"
                              title="Edit prompt"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePrompt(prompt.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              title="Delete prompt"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </>
  );
}
