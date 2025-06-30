"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Wrench,
  Search,
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { generateClient } from "aws-amplify/data";
import { uploadData, getUrl } from "aws-amplify/storage";
import type { Schema } from "../../../amplify/data/resource";
import { Tool, ToolParameter } from "@/lib/types";

// Initialize Amplify client
const client = generateClient<Schema>();

export default function ToolsPage() {
  const [customTools, setCustomTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [pythonCode, setPythonCode] = useState("");
  const [requirementsTxt, setRequirementsTxt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [parameters, setParameters] = useState<ToolParameter[]>([]);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    // Load tools from Amplify
    loadTools();
  }, []);

  // Filter tools based on search and filters
  useEffect(() => {
    let filtered = customTools;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((tool) =>
        statusFilter === "active" ? tool.isActive : !tool.isActive
      );
    }

    setFilteredTools(filtered);
  }, [customTools, searchQuery, statusFilter]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadTools = async () => {
    try {
      const { data: tools } = await client.models.tools.list();
      const formattedTools: Tool[] = tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
          ? JSON.parse(tool.parameters as string)
          : [],
        pythonCodeKey: tool.pythonCodeKey,
        requirementsKey: tool.requirementsKey || undefined,
        isActive: Boolean(tool.isActive ?? true),
        createdAt: new Date(tool.createdAt),
        owner: tool.owner || undefined,
      }));
      setCustomTools(formattedTools);
    } catch (error) {
      console.error("Error loading tools:", error);
      showNotification("error", "Failed to load tools");
    }
  };

  const addParameter = () => {
    const newParam: ToolParameter = {
      id: Date.now().toString(),
      name: "",
      type: "string",
      description: "",
      required: false,
    };
    setParameters([...parameters, newParam]);
  };

  const updateParameter = (
    id: string,
    field: keyof ToolParameter,
    value: string | boolean
  ) => {
    setParameters((prev) =>
      prev.map((param) =>
        param.id === id ? { ...param, [field]: value } : param
      )
    );
  };

  const removeParameter = (id: string) => {
    setParameters((prev) => prev.filter((param) => param.id !== id));
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errors.name = "Tool name is required";
    }
    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }
    if (!pythonCode.trim()) {
      errors.pythonCode = "Python code is required";
    }

    // Validate parameters
    parameters.forEach((param, index) => {
      if (!param.name.trim()) {
        errors[`param_${index}_name`] = "Parameter name is required";
      }
      if (!param.description.trim()) {
        errors[`param_${index}_description`] =
          "Parameter description is required";
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const exportTool = (tool: Tool) => {
    const exportData = {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      hasRequirements: Boolean(tool.requirementsKey),
      // Note: Python code and requirements.txt would need to be fetched separately for security
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tool.name.replace(/\s+/g, "_")}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importTool = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      setFormData({
        name: importData.name || "",
        description: importData.description || "",
      });
      setParameters(importData.parameters || []);
      setRequirementsTxt(importData.requirements || "");
      setValidationErrors({});
      showNotification("success", "Tool configuration imported successfully");
    } catch (error) {
      showNotification("error", "Failed to import tool configuration");
    }

    // Reset file input
    event.target.value = "";
  };

  const uploadPythonCode = async (code: string, toolId: string) => {
    try {
      const fileName = `lambda_${toolId}.py`;
      const result = await uploadData({
        path: `tools/lambda/shared/${fileName}`,
        data: new Blob([code], { type: "text/plain" }),
      }).result;
      return result.path;
    } catch (error) {
      console.error("Error uploading Python code:", error);
      throw error;
    }
  };

  const uploadRequirementsTxt = async (
    requirements: string,
    toolId: string
  ) => {
    try {
      const fileName = `requirements_${toolId}.txt`;
      const result = await uploadData({
        path: `tools/lambda/shared/${fileName}`,
        data: new Blob([requirements], { type: "text/plain" }),
      }).result;
      return result.path;
    } catch (error) {
      console.error("Error uploading requirements.txt:", error);
      throw error;
    }
  };

  const downloadPythonCode = async (tool: Tool) => {
    try {
      const url = await getUrl({
        path: tool.pythonCodeKey,
      });
      const response = await fetch(url.url.toString());
      const code = await response.text();

      const blob = new Blob([code], { type: "text/plain" });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${tool.name.replace(/\s+/g, "_")}_lambda.py`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading Python code:", error);
      showNotification("error", "Failed to download Python code");
    }
  };

  const downloadRequirementsTxt = async (tool: Tool) => {
    try {
      if (!tool.requirementsKey) {
        showNotification("error", "No requirements.txt file available");
        return;
      }

      const url = await getUrl({
        path: tool.requirementsKey,
      });
      const response = await fetch(url.url.toString());
      const requirements = await response.text();

      const blob = new Blob([requirements], { type: "text/plain" });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${tool.name.replace(/\s+/g, "_")}_requirements.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading requirements.txt:", error);
      showNotification("error", "Failed to download requirements.txt");
    }
  };

  const handleAddTool = async () => {
    if (!validateForm()) {
      showNotification("error", "Please fix validation errors");
      return;
    }

    setIsSaving(true);
    try {
      const toolId = Date.now().toString();
      const pythonCodeKey = await uploadPythonCode(pythonCode, toolId);

      let requirementsKey: string | undefined;
      if (requirementsTxt.trim()) {
        requirementsKey = await uploadRequirementsTxt(requirementsTxt, toolId);
      }

      await client.models.tools.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        parameters: JSON.stringify(parameters.filter((p) => p.name.trim())),
        pythonCodeKey,
        requirementsKey,
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      await loadTools();
      resetForm();
      showNotification("success", "Tool created successfully!");
    } catch (error) {
      console.error("Error adding tool:", error);
      showNotification("error", "Failed to create tool");
    }
    setIsSaving(false);
  };

  const handleEditTool = async (tool: Tool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description,
    });
    setParameters(tool.parameters);
    setIsEditing(true);

    // Load existing Python code
    try {
      const url = await getUrl({
        path: tool.pythonCodeKey,
      });
      const response = await fetch(url.url.toString());
      const code = await response.text();
      setPythonCode(code);
    } catch (error) {
      console.error("Error loading Python code:", error);
      showNotification("error", "Failed to load Python code");
    }

    // Load existing requirements.txt if it exists
    if (tool.requirementsKey) {
      try {
        const requirementsUrl = await getUrl({
          path: tool.requirementsKey,
        });
        const requirementsResponse = await fetch(
          requirementsUrl.url.toString()
        );
        const requirements = await requirementsResponse.text();
        setRequirementsTxt(requirements);
      } catch (error) {
        console.error("Error loading requirements.txt:", error);
        showNotification("error", "Failed to load requirements.txt");
        setRequirementsTxt(""); // Set empty if failed to load
      }
    } else {
      setRequirementsTxt(""); // No requirements file exists
    }
  };

  const handleUpdateTool = async () => {
    if (!editingTool || !validateForm()) {
      showNotification("error", "Please fix validation errors");
      return;
    }

    setIsSaving(true);
    try {
      let pythonCodeKey = editingTool.pythonCodeKey;

      // Upload new Python code if changed
      const currentUrl = await getUrl({
        path: editingTool.pythonCodeKey,
      });
      const currentResponse = await fetch(currentUrl.url.toString());
      const currentCode = await currentResponse.text();

      if (currentCode !== pythonCode) {
        pythonCodeKey = await uploadPythonCode(pythonCode, editingTool.id);
      }

      // Handle requirements.txt updates
      let requirementsKey = editingTool.requirementsKey;
      let currentRequirements = "";

      // Get current requirements if they exist
      if (editingTool.requirementsKey) {
        try {
          const currentRequirementsUrl = await getUrl({
            path: editingTool.requirementsKey,
          });
          const currentRequirementsResponse = await fetch(
            currentRequirementsUrl.url.toString()
          );
          currentRequirements = await currentRequirementsResponse.text();
        } catch (error) {
          console.error("Error loading current requirements:", error);
        }
      }

      // Upload new requirements.txt if changed or if new content is provided
      if (requirementsTxt.trim() !== currentRequirements.trim()) {
        if (requirementsTxt.trim()) {
          requirementsKey = await uploadRequirementsTxt(
            requirementsTxt,
            editingTool.id
          );
        } else {
          requirementsKey = undefined; // Remove requirements if empty
        }
      }

      await client.models.tools.update({
        id: editingTool.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        parameters: JSON.stringify(parameters.filter((p) => p.name.trim())),
        pythonCodeKey,
        requirementsKey,
      });

      await loadTools();
      resetForm();
      showNotification("success", "Tool updated successfully!");
    } catch (error) {
      console.error("Error updating tool:", error);
      showNotification("error", "Failed to update tool");
    }
    setIsSaving(false);
  };

  const handleDeleteTool = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await client.models.tools.delete({ id });
      await loadTools();
      showNotification("success", "Tool deleted successfully");
    } catch (error) {
      console.error("Error deleting tool:", error);
      showNotification("error", "Failed to delete tool");
    }
  };

  const toggleToolActive = async (id: string) => {
    try {
      const tool = customTools.find((t) => t.id === id);
      if (tool) {
        await client.models.tools.update({
          id,
          isActive: !tool.isActive,
        });
        await loadTools();
        showNotification(
          "success",
          `Tool ${!tool.isActive ? "activated" : "deactivated"}`
        );
      }
    } catch (error) {
      console.error("Error toggling tool active state:", error);
      showNotification("error", "Failed to update tool status");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
    setParameters([]);
    setPythonCode("");
    setRequirementsTxt("");
    setEditingTool(null);
    setIsEditing(false);
  };

  return (
    <>
      <AppHeader />
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
              notification.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="h-screen bg-background text-foreground flex flex-col">
        <div className="flex-1 flex">
          {/* Form Panel */}
          <div className="w-1/3 border-r border-border p-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {isEditing ? "Edit Tool" : "Add New Tool"}
                  </CardTitle>
                  <div className="flex gap-1">
                    {!isEditing && (
                      <>
                        <input
                          type="file"
                          accept=".json"
                          onChange={importTool}
                          className="hidden"
                          id="import-tool"
                        />
                        <label htmlFor="import-tool">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            title="Import configuration"
                            asChild
                          >
                            <span>
                              <Upload className="h-3 w-3" />
                            </span>
                          </Button>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">
                    Tool Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="My Custom Tool"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (validationErrors.name) {
                        setValidationErrors((prev) => ({ ...prev, name: "" }));
                      }
                    }}
                    className={`h-7 text-xs ${validationErrors.name ? "border-red-500" : ""}`}
                  />
                  {validationErrors.name && (
                    <p className="text-xs text-red-500">
                      {validationErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description" className="text-xs">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this tool does..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="min-h-20 text-xs"
                  />
                </div>

                {/* Parameters Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Parameters</Label>
                    <Button
                      type="button"
                      onClick={addParameter}
                      variant="outline"
                      size="sm"
                      className="h-5 px-2 text-xs"
                    >
                      <Plus className="h-2 w-2 mr-1" />
                      Add
                    </Button>
                  </div>

                  {parameters.length > 0 && (
                    <ScrollArea className="max-h-40">
                      <div className="space-y-2">
                        {parameters.map((param) => (
                          <div
                            key={param.id}
                            className="border rounded p-2 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <Input
                                placeholder="Parameter name"
                                value={param.name}
                                onChange={(e) =>
                                  updateParameter(
                                    param.id,
                                    "name",
                                    e.target.value
                                  )
                                }
                                className="h-5 text-xs flex-1 mr-1"
                              />
                              <Button
                                type="button"
                                onClick={() => removeParameter(param.id)}
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <Select
                                value={param.type}
                                onValueChange={(value: string) =>
                                  updateParameter(param.id, "type", value)
                                }
                              >
                                <SelectTrigger className="h-5 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">
                                    Boolean
                                  </SelectItem>
                                  <SelectItem value="array">Array</SelectItem>
                                  <SelectItem value="object">Object</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="checkbox"
                                  checked={param.required}
                                  onChange={(e) =>
                                    updateParameter(
                                      param.id,
                                      "required",
                                      e.target.checked
                                    )
                                  }
                                  className="scale-75"
                                />
                                <span className="text-xs">Required</span>
                              </div>
                            </div>
                            <Input
                              placeholder="Parameter description"
                              value={param.description}
                              onChange={(e) =>
                                updateParameter(
                                  param.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="h-5 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Python Code Section */}
                <div className="space-y-1">
                  <Label htmlFor="python-code" className="text-xs">
                    Python Lambda Code <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="python-code"
                    placeholder={`def lambda_handler(event, context):
    # Your lambda function code here
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }`}
                    value={pythonCode}
                    onChange={(e) => setPythonCode(e.target.value)}
                    className="min-h-32 text-xs font-mono"
                  />
                </div>

                {/* Requirements.txt Section */}
                <div className="space-y-1">
                  <Label htmlFor="requirements-txt" className="text-xs">
                    Requirements.txt (Optional)
                  </Label>
                  <Textarea
                    id="requirements-txt"
                    placeholder={`# List your Python dependencies here
# Example:
requests==2.31.0
boto3==1.34.0
pandas==2.1.0`}
                    value={requirementsTxt}
                    onChange={(e) => setRequirementsTxt(e.target.value)}
                    className="min-h-24 text-xs font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Specify Python packages required by your Lambda function.
                    Leave empty if no additional dependencies are needed.
                  </p>
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={handleUpdateTool}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        disabled={
                          !formData.name.trim() ||
                          !formData.description.trim() ||
                          !pythonCode.trim() ||
                          isSaving
                        }
                      >
                        {isSaving ? (
                          <Upload className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Edit className="h-3 w-3 mr-1" />
                        )}
                        {isSaving ? "Updating..." : "Update"}
                      </Button>
                      <Button
                        onClick={resetForm}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleAddTool}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      disabled={
                        !formData.name.trim() ||
                        !formData.description.trim() ||
                        !pythonCode.trim() ||
                        isSaving
                      }
                    >
                      {isSaving ? (
                        <Upload className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3 mr-1" />
                      )}
                      {isSaving ? "Saving..." : "Add Tool"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tools List */}
          <div className="flex-1 p-3">
            {/* Search and Filter Bar */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-7 text-xs"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{filteredTools.length} tools</span>
                <span>•</span>
                <span>
                  {filteredTools.filter((t) => t.isActive).length} active
                </span>
                <span>•</span>
                <span>
                  {filteredTools.filter((t) => !t.isActive).length} inactive
                </span>
              </div>
            </div>

            <ScrollArea className="h-full">
              <div className="space-y-2">
                {filteredTools.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    {customTools.length === 0
                      ? "No tools yet. Add one to get started."
                      : "No tools match your search criteria."}
                  </div>
                ) : (
                  filteredTools.map((tool) => (
                    <Card
                      key={tool.id}
                      className={`transition-opacity ${!tool.isActive ? "opacity-50" : ""}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                              <h3 className="text-sm font-medium">
                                {tool.name}
                              </h3>
                              <Switch
                                checked={tool.isActive}
                                onCheckedChange={() =>
                                  toggleToolActive(tool.id)
                                }
                                className="scale-75"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {tool.description}
                            </p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {tool.parameters.length > 0 && (
                                <div>Parameters: {tool.parameters.length}</div>
                              )}
                              {tool.requirementsKey && (
                                <div>Has requirements.txt</div>
                              )}
                              <div>
                                Created: {tool.createdAt.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1 ml-2">
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadPythonCode(tool)}
                                className="h-6 w-6 p-0"
                                title="Download Python code"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              {tool.requirementsKey && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadRequirementsTxt(tool)}
                                  className="h-6 w-6 p-0"
                                  title="Download requirements.txt"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exportTool(tool)}
                                className="h-6 w-6 p-0"
                                title="Export configuration"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTool(tool)}
                                className="h-6 w-6 p-0"
                                title="Edit tool"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteTool(tool.id, tool.name)
                              }
                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              title="Delete tool"
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
    </>
  );
}
