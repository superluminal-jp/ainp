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
import {
  Edit,
  Trash2,
  MessageSquare,
  Save,
  X,
  Copy,
  Check,
} from "lucide-react";

import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

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

  return (
    <>
      <AppHeader />
      <div className="h-screen bg-background text-foreground flex flex-col">
        <div className="flex-1 flex">
          {/* Form Panel */}
          <div className="w-1/3 border-r border-border p-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {isEditing ? "Edit Prompt" : "Create New Prompt"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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

                <div className="space-y-1">
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
                    className="min-h-32 text-xs"
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
              </CardContent>
            </Card>
          </div>

          {/* Prompts List */}
          <div className="flex-1 p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">System Prompts</h2>
              <Badge variant="outline" className="text-xs">
                {systemPrompts.length} Prompts
              </Badge>
            </div>

            <ScrollArea className="h-full">
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
