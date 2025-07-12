"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import { ReadmeDisplay } from "@/components/readme-display";
import ChatAssistant from "@/components/chat-assistant";
import {
  Edit,
  Trash2,
  MessageSquare,
  Save,
  X,
  Copy,
  Check,
  FileText,
} from "lucide-react";

import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { toast } from "sonner";
import type { PromptSuggestion } from "@/lib/types";

const client = generateClient<Schema>();

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

  // UI state
  const [showReadme, setShowReadme] = useState(false);

  // AI Assistant system prompt
  const PROMPTS_ASSISTANT_PROMPT = `You are an expert AI assistant specialized in helping users create effective system prompts. Your role is to:

**Primary Functions:**
- Generate comprehensive system prompts for various AI assistant roles
- Optimize existing prompts for clarity and effectiveness
- Provide best practices for prompt engineering
- Help users understand prompt structure and components
- Suggest improvements for prompt performance

**Response Format:**
You will use structured output to return a JSON object with the prompt specification. The response will be automatically formatted as JSON with the following fields:

- **name**: Prompt name (string)
- **content**: Complete system prompt content (string)

**Example Prompt Concept:**
A data analysis assistant that helps users analyze complex datasets, create visualizations, and provide insights. Should include clear instructions for methodology, response style, and deliverables.

**Prompt Engineering Guidelines:**
- Create clear, specific instructions for AI behavior
- Include role definition, task description, and output format
- Use structured format with headers and bullet points
- Provide examples and context when helpful
- Consider constraints and ethical guidelines

**Best Practices:**
- Start with role definition (e.g., "You are a...")
- Include specific instructions and guidelines
- Define expected output format and style
- Add constraints and limitations
- Use clear, concise language
- Structure content with proper formatting

**Code Standards:**
- Generate comprehensive and well-structured prompts
- Include proper formatting with headers and bullet points
- Use clear, actionable language
- Follow prompt engineering best practices
- Make prompts immediately usable for AI assistants

**Important Notes:**
- Response will be automatically formatted as structured JSON
- Include both required fields: name and content
- Make prompts comprehensive and immediately usable
- Focus on creating specialized, domain-specific assistants
- Use proper line breaks and formatting in content

Be helpful, practical, and provide actionable suggestions that users can immediately apply to improve their prompts.`;

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

  const clearForm = () => {
    setFormData({ name: "", content: "" });
    if (isEditing) {
      setEditingPrompt(null);
      setIsEditing(false);
    }
    toast.success("Form cleared");
  };

  const copyPromptContent = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSuggestionReceived = (suggestions: PromptSuggestion) => {
    console.log("🔍 AI suggestions received:", suggestions);
    console.log("🔍 Suggestions type:", typeof suggestions);
    console.log("🔍 Suggestions keys:", Object.keys(suggestions || {}));

    // Apply suggestions to form data
    setFormData((prev) => {
      const updated = { ...prev };

      if (suggestions.name) {
        updated.name = suggestions.name;
        console.log("✅ Applied name suggestion:", suggestions.name);
      }

      if (suggestions.content) {
        // Use structured output directly (no escape conversion needed)
        updated.content = suggestions.content;
        console.log(
          "✅ Applied content suggestion (length):",
          suggestions.content.length
        );
        console.log(
          "✅ Content preview:",
          updated.content?.substring(0, 100) + "..."
        );
      } else {
        console.log("❌ No content found in suggestions");
      }

      return updated;
    });

    // Show success message
    const appliedFields = [];
    if (suggestions.name) appliedFields.push("name");
    if (suggestions.content) appliedFields.push("content");

    if (appliedFields.length > 0) {
      toast.success(`Applied AI suggestions to: ${appliedFields.join(", ")}`);
      console.log("✅ Successfully applied suggestions:", appliedFields);
    } else {
      console.log("⚠️ No applicable suggestions found");
    }
  };

  return (
    <>
      <AppHeader />
      <div className="h-[calc(100vh-5rem)] bg-background text-foreground flex flex-col">
        {/* README Display Section */}
        {showReadme && (
          <div className="border-b border-border p-4 bg-muted/30">
            <ReadmeDisplay
              path="/app/prompts/README.md"
              title="Prompts Documentation"
              className="max-w-6xl mx-auto"
            />
          </div>
        )}

        <div className="flex-1 flex">
          {/* Form Panel */}
          <div className="w-1/4 border-r border-border p-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {isEditing ? "Edit Prompt" : "Create New Prompt"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReadme(!showReadme)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {showReadme ? "Hide Docs" : "Show Docs"}
                  </Button>
                </div>
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

                  {!isEditing && (
                    <Button
                      variant="outline"
                      onClick={clearForm}
                      size="sm"
                      className="h-7 text-xs"
                      disabled={loading}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Assistant Panel */}
          <div className="w-1/3 border-r border-border p-3">
            <ChatAssistant
              title="Prompts Assistant"
              placeholder="Ask me to help create a prompt, optimize existing content, or suggest improvements..."
              systemPrompt={PROMPTS_ASSISTANT_PROMPT}
              onSuggestionReceived={handleSuggestionReceived}
              suggestionType="prompt"
            />
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
                    Create your first system prompt using the form
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
                            <p className="text-xs text-muted-foreground line-clamp-3">
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
