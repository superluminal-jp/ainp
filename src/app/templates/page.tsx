"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import {
  Edit,
  Trash2,
  Zap,
  Save,
  X,
  Copy,
  Check,
  Database,
  MessageSquare,
  Wrench,
  Eye,
} from "lucide-react";

import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

interface TemplateData {
  id: string;
  name: string;
  description: string;
  systemPromptId: string;
  databaseIds: string[];
  toolIds: string[];
  isActive: boolean;
  createdAt: Date;
  // Populated data for display
  systemPrompt?: Schema["systemPrompts"]["type"];
  databases?: Schema["databases"]["type"][];
  tools?: Schema["tools"]["type"][];
}

export default function TemplatesPage() {
  useSimpleHeader(
    "Templates",
    "Manage template combinations of prompts, databases, and tools"
  );

  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<
    Schema["systemPrompts"]["type"][]
  >([]);
  const [databases, setDatabases] = useState<Schema["databases"]["type"][]>([]);
  const [tools, setTools] = useState<Schema["tools"]["type"][]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(
    null
  );
  const [viewingTemplate, setViewingTemplate] = useState<TemplateData | null>(
    null
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPromptId: "",
    databaseIds: [] as string[],
    toolIds: [] as string[],
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch all required data
      const [templatesRes, promptsRes, databasesRes, toolsRes] =
        await Promise.all([
          client.models.templates.list(),
          client.models.systemPrompts.list(),
          client.models.databases.list(),
          client.models.tools.list(),
        ]);

      setSystemPrompts(promptsRes.data || []);
      setDatabases(databasesRes.data || []);
      setTools(toolsRes.data || []);

      // Process templates and populate related data
      const processedTemplates = await Promise.all(
        (templatesRes.data || []).map(async (template) => {
          const databaseIds = Array.isArray(template.databaseIds)
            ? template.databaseIds
            : JSON.parse((template.databaseIds as string) || "[]");
          const toolIds = Array.isArray(template.toolIds)
            ? template.toolIds
            : JSON.parse((template.toolIds as string) || "[]");

          // Find related data
          const systemPrompt = promptsRes.data?.find(
            (p) => p.id === template.systemPromptId
          );
          const relatedDatabases = databasesRes.data?.filter((d) =>
            databaseIds.includes(d.id)
          );
          const relatedTools = toolsRes.data?.filter((t) =>
            toolIds.includes(t.id)
          );

          return {
            id: template.id,
            name: template.name,
            description: template.description,
            systemPromptId: template.systemPromptId,
            databaseIds,
            toolIds,
            isActive: template.isActive ?? true,
            createdAt: new Date(template.createdAt),
            systemPrompt,
            databases: relatedDatabases,
            tools: relatedTools,
          } as TemplateData;
        })
      );

      setTemplates(processedTemplates);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async () => {
    if (
      !formData.name.trim() ||
      !formData.description.trim() ||
      !formData.systemPromptId
    )
      return;

    setLoading(true);
    try {
      await client.models.templates.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        systemPromptId: formData.systemPromptId,
        databaseIds: JSON.stringify(formData.databaseIds),
        toolIds: JSON.stringify(formData.toolIds),
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      resetForm();
      await fetchAllData();
    } catch (error) {
      console.error("Error creating template:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: TemplateData) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      systemPromptId: template.systemPromptId,
      databaseIds: template.databaseIds,
      toolIds: template.toolIds,
    });
    setIsEditing(true);
  };

  const handleUpdateTemplate = async () => {
    if (
      !editingTemplate ||
      !formData.name.trim() ||
      !formData.description.trim() ||
      !formData.systemPromptId
    )
      return;

    setLoading(true);
    try {
      await client.models.templates.update({
        id: editingTemplate.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        systemPromptId: formData.systemPromptId,
        databaseIds: JSON.stringify(formData.databaseIds),
        toolIds: JSON.stringify(formData.toolIds),
      });

      resetForm();
      await fetchAllData();
    } catch (error) {
      console.error("Error updating template:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    setLoading(true);
    try {
      await client.models.templates.delete({ id });
      await fetchAllData();
    } catch (error) {
      console.error("Error deleting template:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateActive = async (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    setLoading(true);
    try {
      await client.models.templates.update({
        id,
        isActive: !template.isActive,
      });
      await fetchAllData();
    } catch (error) {
      console.error("Error updating template:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      systemPromptId: "",
      databaseIds: [],
      toolIds: [],
    });
    setEditingTemplate(null);
    setIsEditing(false);
  };

  const copyTemplateId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDatabaseToggle = (databaseId: string) => {
    setFormData((prev) => ({
      ...prev,
      databaseIds: prev.databaseIds.includes(databaseId)
        ? prev.databaseIds.filter((id) => id !== databaseId)
        : [...prev.databaseIds, databaseId],
    }));
  };

  const handleToolToggle = (toolId: string) => {
    setFormData((prev) => ({
      ...prev,
      toolIds: prev.toolIds.includes(toolId)
        ? prev.toolIds.filter((id) => id !== toolId)
        : [...prev.toolIds, toolId],
    }));
  };

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8">
            {/* Add/Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {isEditing ? "Edit Template" : "Create New Template"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Research Assistant Setup"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <Select
                      value={formData.systemPromptId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          systemPromptId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a system prompt" />
                      </SelectTrigger>
                      <SelectContent>
                        {systemPrompts.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this template configuration is for..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Databases Selection */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Databases
                    </Label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                      {databases.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No databases available
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {databases.map((database) => (
                            <div
                              key={database.id}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                id={`db-${database.id}`}
                                checked={formData.databaseIds.includes(
                                  database.id
                                )}
                                onChange={() =>
                                  handleDatabaseToggle(database.id)
                                }
                                className="h-4 w-4"
                              />
                              <label
                                htmlFor={`db-${database.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {database.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tools Selection */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Tools
                    </Label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                      {tools.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No tools available
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {tools.map((tool) => (
                            <div
                              key={tool.id}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                id={`tool-${tool.id}`}
                                checked={formData.toolIds.includes(tool.id)}
                                onChange={() => handleToolToggle(tool.id)}
                                className="h-4 w-4"
                              />
                              <label
                                htmlFor={`tool-${tool.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {tool.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={
                      isEditing ? handleUpdateTemplate : handleAddTemplate
                    }
                    disabled={
                      !formData.name.trim() ||
                      !formData.description.trim() ||
                      !formData.systemPromptId ||
                      loading
                    }
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? "Update Template" : "Create Template"}
                  </Button>
                  {isEditing && (
                    <Button variant="outline" onClick={resetForm}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Templates List */}
            <Card>
              <CardHeader>
                <CardTitle>Templates ({templates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading templates...</div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No templates created yet. Create your first template above.
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{template.name}</h3>
                                <Switch
                                  checked={template.isActive}
                                  onCheckedChange={() =>
                                    toggleTemplateActive(template.id)
                                  }
                                  disabled={loading}
                                />
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {template.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created:{" "}
                                {template.createdAt.toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingTemplate(template)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyTemplateId(template.id)}
                              >
                                {copiedId === template.id ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteTemplate(template.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <div>
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                System Prompt
                              </Label>
                              <Badge variant="outline" className="mt-1">
                                {template.systemPrompt?.name || "Not found"}
                              </Badge>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Database className="h-3 w-3" />
                                Databases ({template.databases?.length || 0})
                              </Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {template.databases?.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    None
                                  </span>
                                ) : (
                                  template.databases?.map((db) => (
                                    <Badge
                                      key={db.id}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {db.name}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Wrench className="h-3 w-3" />
                                Tools ({template.tools?.length || 0})
                              </Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {template.tools?.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    None
                                  </span>
                                ) : (
                                  template.tools?.map((tool) => (
                                    <Badge
                                      key={tool.id}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tool.name}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
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

      {/* Template Details Dialog */}
      <Dialog
        open={!!viewingTemplate}
        onOpenChange={() => setViewingTemplate(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Template Details
            </DialogTitle>
            <DialogDescription>
              Complete configuration for &quot;{viewingTemplate?.name}&quot;
            </DialogDescription>
          </DialogHeader>

          {viewingTemplate && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {viewingTemplate.description}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  System Prompt
                </Label>
                <div className="mt-2 p-3 border rounded-lg">
                  <h4 className="font-medium">
                    {viewingTemplate.systemPrompt?.name || "Not found"}
                  </h4>
                  {viewingTemplate.systemPrompt && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {viewingTemplate.systemPrompt.content.length > 200
                        ? `${viewingTemplate.systemPrompt.content.substring(
                            0,
                            200
                          )}...`
                        : viewingTemplate.systemPrompt.content}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Databases ({viewingTemplate.databases?.length || 0})
                  </Label>
                  <div className="mt-2 space-y-2">
                    {viewingTemplate.databases?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No databases selected
                      </p>
                    ) : (
                      viewingTemplate.databases?.map((db) => (
                        <div key={db.id} className="p-2 border rounded">
                          <h5 className="font-medium text-sm">{db.name}</h5>
                          <p className="text-xs text-muted-foreground">
                            {db.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Tools ({viewingTemplate.tools?.length || 0})
                  </Label>
                  <div className="mt-2 space-y-2">
                    {viewingTemplate.tools?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No tools selected
                      </p>
                    ) : (
                      viewingTemplate.tools?.map((tool) => (
                        <div key={tool.id} className="p-2 border rounded">
                          <h5 className="font-medium text-sm">{tool.name}</h5>
                          <p className="text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTemplate(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
