"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Database,
  Upload,
  File,
  X,
  FolderOpen,
  Eye,
  Download,
} from "lucide-react";
import Link from "next/link";

interface CustomDatabase {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  uploadedFiles?: UploadedFile[];
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  uploadDate: Date;
}

export default function DatabasesPage() {
  const [isDark, setIsDark] = useState(true);
  const [customDatabases, setCustomDatabases] = useState<CustomDatabase[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState<CustomDatabase | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const darkClass = document.documentElement.classList.contains("dark");
    setIsDark(darkClass);

    // Load custom databases from localStorage
    const saved = localStorage.getItem("customDatabases");
    if (saved) {
      const parsedDatabases = JSON.parse(saved).map(
        (
          db: CustomDatabase & {
            uploadedFiles?: Array<UploadedFile & { uploadDate: string }>;
          }
        ) => ({
          ...db,
          uploadedFiles: db.uploadedFiles?.map(
            (file: UploadedFile & { uploadDate: string }) => ({
              ...file,
              uploadDate: new Date(file.uploadDate),
            })
          ),
        })
      );
      setCustomDatabases(parsedDatabases);
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

  const saveDatabases = (databases: CustomDatabase[]) => {
    setCustomDatabases(databases);
    localStorage.setItem("customDatabases", JSON.stringify(databases));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleFileUpload = async (files: FileList) => {
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + i,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date(),
      };

      // Read text files content for RAG processing
      if (
        file.type.startsWith("text/") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".json") ||
        file.name.endsWith(".csv")
      ) {
        try {
          const content = await file.text();
          uploadedFile.content = content;
        } catch (error) {
          console.error("Failed to read file content:", error);
        }
      }

      newFiles.push(uploadedFile);
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const viewFile = (file: UploadedFile) => {
    setViewingFile(file);
  };

  const downloadFile = (file: UploadedFile) => {
    const blob = new Blob([file.content || ""], { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddDatabase = () => {
    if (!formData.name.trim() || !formData.description.trim()) return;

    const newDatabase: CustomDatabase = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      isActive: true,
      uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };

    saveDatabases([...customDatabases, newDatabase]);
    setFormData({
      name: "",
      description: "",
    });
    setUploadedFiles([]);
    setIsEditing(false);
  };

  const handleEditDatabase = (database: CustomDatabase) => {
    setEditingDatabase(database);
    setFormData({
      name: database.name,
      description: database.description,
    });
    setUploadedFiles(database.uploadedFiles || []);
    setIsEditing(true);
  };

  const handleUpdateDatabase = () => {
    if (
      !editingDatabase ||
      !formData.name.trim() ||
      !formData.description.trim()
    )
      return;

    const updated = customDatabases.map((db) =>
      db.id === editingDatabase.id
        ? {
            ...db,
            name: formData.name.trim(),
            description: formData.description.trim(),
            uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          }
        : db
    );

    saveDatabases(updated);
    setFormData({
      name: "",
      description: "",
    });
    setUploadedFiles([]);
    setEditingDatabase(null);
    setIsEditing(false);
  };

  const handleDeleteDatabase = (id: string) => {
    const filtered = customDatabases.filter((db) => db.id !== id);
    saveDatabases(filtered);
  };

  const toggleDatabaseActive = (id: string) => {
    const updated = customDatabases.map((db) =>
      db.id === id ? { ...db, isActive: !db.isActive } : db
    );
    saveDatabases(updated);
  };

  const cancelEdit = () => {
    setFormData({
      name: "",
      description: "",
    });
    setUploadedFiles([]);
    setEditingDatabase(null);
    setIsEditing(false);
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
            <h1 className="text-sm font-medium">RAG Databases</h1>
          </div>
          <div className="flex items-center space-x-2">
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
        <div className="w-1/3 border-r border-border p-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isEditing ? "Edit Database" : "Add New Database"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">
                  Database Name
                </Label>
                <Input
                  id="name"
                  placeholder="My Knowledge Base"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this database contains..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="min-h-20 text-xs"
                />
              </div>

              {/* File Upload Section */}
              <div className="space-y-2">
                <Label className="text-xs">Upload Files for RAG</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mb-2">
                    Drag & drop files here, or click to select
                  </p>
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                  >
                    Choose Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.csv,.json,.pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files);
                      }
                    }}
                    className="hidden"
                  />
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    <p className="text-xs text-muted-foreground">
                      Uploaded Files ({uploadedFiles.length}):
                    </p>
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between bg-muted rounded px-2 py-1"
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <File className="h-3 w-3 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-1 shrink-0">
                          {file.content && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => viewFile(file)}
                              className="h-4 w-4 p-0"
                              title="View file"
                            >
                              <Eye className="h-2 w-2" />
                            </Button>
                          )}
                          {file.content && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(file)}
                              className="h-4 w-4 p-0"
                              title="Download file"
                            >
                              <Download className="h-2 w-2" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="h-4 w-4 p-0"
                            title="Remove file"
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleUpdateDatabase}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      disabled={
                        !formData.name.trim() || !formData.description.trim()
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
                    onClick={handleAddDatabase}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={
                      !formData.name.trim() || !formData.description.trim()
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Database
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Databases List */}
        <div className="flex-1 p-3">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {customDatabases.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No custom databases yet. Add one to get started.
                </div>
              ) : (
                customDatabases.map((database) => {
                  return (
                    <Card
                      key={database.id}
                      className={!database.isActive ? "opacity-50" : ""}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Database className="h-4 w-4 text-muted-foreground" />
                              <h3 className="text-sm font-medium">
                                {database.name}
                              </h3>
                              <Switch
                                checked={database.isActive}
                                onCheckedChange={() =>
                                  toggleDatabaseActive(database.id)
                                }
                                className="scale-75"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {database.description}
                            </p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {database.uploadedFiles &&
                                database.uploadedFiles.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-1">
                                      <FolderOpen className="h-3 w-3" />
                                      <span>
                                        Files: {database.uploadedFiles.length}
                                      </span>
                                    </div>
                                    <div className="max-h-20 overflow-y-auto space-y-1">
                                      {database.uploadedFiles
                                        .slice(0, 3)
                                        .map((file) => (
                                          <div
                                            key={file.id}
                                            className="flex items-center justify-between text-xs bg-muted/50 rounded px-1 py-0.5"
                                          >
                                            <div className="flex items-center space-x-1 flex-1 min-w-0">
                                              <File className="h-2.5 w-2.5 shrink-0" />
                                              <span className="truncate">
                                                {file.name}
                                              </span>
                                            </div>
                                            {file.content && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  viewFile(file);
                                                }}
                                                className="h-3 w-3 p-0 shrink-0"
                                                title="View file"
                                              >
                                                <Eye className="h-2 w-2" />
                                              </Button>
                                            )}
                                          </div>
                                        ))}
                                      {database.uploadedFiles.length > 3 && (
                                        <div className="text-xs text-muted-foreground px-1">
                                          +{database.uploadedFiles.length - 3}{" "}
                                          more files
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDatabase(database)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDatabase(database.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-medium">{viewingFile.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(viewingFile.size)} • {viewingFile.type}
                  </p>
                </div>
              </div>
              <div className="flex space-x-1">
                {viewingFile.content && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadFile(viewingFile)}
                    className="h-6 w-6 p-0"
                    title="Download file"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingFile(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              {viewingFile.content ? (
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <pre className="text-xs whitespace-pre-wrap break-words font-mono bg-muted/50 rounded p-3">
                      {viewingFile.content}
                    </pre>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <File className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Preview not available</p>
                    <p className="text-xs">
                      This file type cannot be previewed
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
