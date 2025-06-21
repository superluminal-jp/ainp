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
import {
  Edit,
  Trash2,
  MessageSquare,
  Save,
  X,
  Copy,
  Check,
} from "lucide-react";
import { CustomPrompt } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

// Metadata not needed for client components

const defaultPrompts = [
  {
    id: "default",
    name: "Default Assistant",
    content: "I'm your AI assistant. How can I help you today?",
    isSystem: true,
  },
  {
    id: "helpful",
    name: "Helpful Assistant",
    content:
      "I'm a helpful assistant focused on providing clear, practical solutions.",
    isSystem: true,
  },
  {
    id: "creative",
    name: "Creative Assistant",
    content:
      "I'm a creative assistant here to help with brainstorming and innovative ideas.",
    isSystem: true,
  },
  {
    id: "technical",
    name: "Technical Assistant",
    content:
      "I'm a technical assistant specialized in programming and technical problems.",
    isSystem: true,
  },
  {
    id: "casual",
    name: "Casual Assistant",
    content: "Hey! I'm your friendly AI buddy here to chat and help out.",
    isSystem: true,
  },
  {
    id: "professional",
    name: "Professional Assistant",
    content:
      "I'm a professional assistant providing formal, business-oriented support.",
    isSystem: true,
  },
];

export default function PromptsPage() {
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Load custom prompts from localStorage
    const saved = localStorage.getItem("customPrompts");
    if (saved) {
      setCustomPrompts(JSON.parse(saved));
    }
  }, []);

  const savePrompts = (prompts: CustomPrompt[]) => {
    setCustomPrompts(prompts);
    localStorage.setItem("customPrompts", JSON.stringify(prompts));
  };

  const handleAddPrompt = () => {
    if (!formData.name.trim() || !formData.content.trim()) return;

    const newPrompt: CustomPrompt = {
      id: generateId(),
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

  const copyPromptContent = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="System Prompts"
        description="Manage custom system prompts and templates"
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Add/Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {isEditing ? "Edit Prompt" : "Create New Prompt"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Prompt Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Research Assistant, Code Helper"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Prompt Content</Label>
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
                  rows={6}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={isEditing ? handleUpdatePrompt : handleAddPrompt}
                  disabled={!formData.name.trim() || !formData.content.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Update" : "Create"} Prompt
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={cancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Prompts */}
          <Card>
            <CardHeader>
              <CardTitle>System Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {defaultPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{prompt.name}</h4>
                          <Badge variant="secondary">System</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {prompt.content}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyPromptContent(prompt.content, prompt.id)
                        }
                      >
                        {copiedId === prompt.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Custom Prompts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Custom Prompts</CardTitle>
                <Badge variant="outline">{customPrompts.length} Custom</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {customPrompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No custom prompts created yet</p>
                  <p className="text-sm">
                    Create your first custom prompt above
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {customPrompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className="flex items-start justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{prompt.name}</h4>
                            <Badge
                              variant={
                                prompt.isActive ? "default" : "secondary"
                              }
                            >
                              {prompt.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {prompt.content}
                          </p>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={prompt.isActive}
                              onCheckedChange={() =>
                                togglePromptActive(prompt.id)
                              }
                            />
                            <Label className="text-xs">Active</Label>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyPromptContent(prompt.content, prompt.id)
                            }
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
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeletePrompt(prompt.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
