"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Database,
  Upload,
  File,
  X,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { uploadData, downloadData, remove, list } from "aws-amplify/storage";
import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  fileKey: string;
  uploadDate: Date;
}

interface FolderStructure {
  name: string;
  path: string;
  files: StorageFile[];
  folders: FolderStructure[];
  isExpanded: boolean;
}

interface StorageFile {
  key: string;
  lastModified?: Date;
  size?: number;
  name: string;
}

export default function DatabasesPage() {
  const [isDark, setIsDark] = useState(true);
  const [databases, setDatabases] = useState<Schema["databases"]["type"][]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState<
    Schema["databases"]["type"] | null
  >(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderStructure, setFolderStructure] =
    useState<FolderStructure | null>(null);
  const [showFolderView, setShowFolderView] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<
    Schema["databases"]["type"] | null
  >(null);
  const [databaseFiles, setDatabaseFiles] = useState<
    Schema["databaseFiles"]["type"][]
  >([]);
  const [showDatabaseView, setShowDatabaseView] = useState(false);
  const [addingFilesToDatabase, setAddingFilesToDatabase] = useState(false);
  const [databaseUploadFiles, setDatabaseUploadFiles] = useState<
    UploadedFile[]
  >([]);
  const databaseFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const darkClass = document.documentElement.classList.contains("dark");
    setIsDark(darkClass);
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    try {
      const { data } = await client.models.databases.list();
      setDatabases(data || []);
    } catch (error) {
      console.error("Error fetching databases:", error);
    }
  };

  const fetchDatabaseFiles = async (databaseId: string) => {
    try {
      setLoading(true);
      const { data } = await client.models.databaseFiles.list({
        filter: { databaseId: { eq: databaseId } },
      });
      setDatabaseFiles(data || []);
    } catch (error) {
      console.error("Error fetching database files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseClick = async (database: Schema["databases"]["type"]) => {
    setSelectedDatabase(database);
    setShowDatabaseView(true);
    setShowFolderView(false);
    await fetchDatabaseFiles(database.id);
  };

  const goBackToList = () => {
    setSelectedDatabase(null);
    setShowDatabaseView(false);
    setDatabaseFiles([]);
  };

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const fetchFolderStructure = async () => {
    try {
      setLoading(true);
      const result = await list({
        path: "databases/",
        options: {
          listAll: true,
        },
      });

      const files = result.items || [];
      const structure = buildFolderStructure(files);
      setFolderStructure(structure);
    } catch (error) {
      console.error("Error fetching folder structure:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildFolderStructure = (files: any[]): FolderStructure => {
    const root: FolderStructure = {
      name: "databases",
      path: "databases/",
      files: [],
      folders: [],
      isExpanded: true,
    };

    const folderMap = new Map<string, FolderStructure>();
    folderMap.set("databases/", root);

    files.forEach((file) => {
      const parts = file.path.split("/").filter(Boolean);
      let currentPath = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        currentPath += part + "/";

        if (i === parts.length - 1 && !file.path.endsWith("/")) {
          // This is a file, not a folder
          const parentFolder = folderMap.get(parentPath + "/") || root;
          parentFolder.files.push({
            key: file.path,
            lastModified: file.lastModified,
            size: file.size,
            name: part,
          });
        } else {
          // This is a folder
          if (!folderMap.has(currentPath)) {
            const newFolder: FolderStructure = {
              name: part,
              path: currentPath,
              files: [],
              folders: [],
              isExpanded: false,
            };

            const parentFolder = folderMap.get(parentPath + "/") || root;
            parentFolder.folders.push(newFolder);
            folderMap.set(currentPath, newFolder);
          }
        }
      }
    });

    return root;
  };

  const toggleFolder = (path: string) => {
    const updateFolderExpansion = (
      folder: FolderStructure
    ): FolderStructure => {
      if (folder.path === path) {
        return { ...folder, isExpanded: !folder.isExpanded };
      }
      return {
        ...folder,
        folders: folder.folders.map(updateFolderExpansion),
      };
    };

    if (folderStructure) {
      setFolderStructure(updateFolderExpansion(folderStructure));
    }
  };

  const renderFolderStructure = (folder: FolderStructure, depth = 0) => {
    return (
      <div key={folder.path} className="space-y-1">
        {depth > 0 && (
          <div
            className="flex items-center space-x-2 p-1 rounded hover:bg-muted/50 cursor-pointer"
            style={{ paddingLeft: `${depth * 12}px` }}
            onClick={() => toggleFolder(folder.path)}
          >
            {folder.isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {folder.isExpanded ? (
              <FolderOpen className="h-3 w-3 text-blue-500" />
            ) : (
              <Folder className="h-3 w-3 text-blue-500" />
            )}
            <span className="text-xs font-medium">{folder.name}</span>
            <span className="text-xs text-muted-foreground">
              ({folder.files.length + folder.folders.length})
            </span>
          </div>
        )}

        {folder.isExpanded && (
          <>
            {folder.folders.map((subfolder) =>
              renderFolderStructure(subfolder, depth + 1)
            )}
            {folder.files.map((file) => (
              <div
                key={file.key}
                className="group flex items-center justify-between space-x-2 p-1 rounded hover:bg-muted/50 cursor-pointer"
                style={{ paddingLeft: `${(depth + 1) * 12 + 20}px` }}
                onClick={() => {
                  const uploadedFile: UploadedFile = {
                    id: file.key,
                    name: file.name,
                    size: file.size || 0,
                    type: "unknown",
                    fileKey: file.key,
                    uploadDate: file.lastModified || new Date(),
                  };
                  viewFile(uploadedFile);
                }}
              >
                <div className="flex items-center space-x-2">
                  <File className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{file.name}</span>
                  {file.size && (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const uploadedFile: UploadedFile = {
                        id: file.key,
                        name: file.name,
                        size: file.size || 0,
                        type: "unknown",
                        fileKey: file.key,
                        uploadDate: file.lastModified || new Date(),
                      };
                      downloadFile(uploadedFile);
                    }}
                    className="h-4 w-4 p-0"
                    title="Download file"
                  >
                    <Download className="h-2 w-2" />
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  const handleFileUpload = async (files: FileList) => {
    setLoading(true);
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Upload to shared folder for collaborative databases
        // You could also use `databases/private/${userId}/` for user-specific files
        const fileKey = `databases/shared/${Date.now()}-${file.name}`;

        await uploadData({
          path: fileKey,
          data: file,
        }).result;

        const uploadedFile: UploadedFile = {
          id: Date.now().toString() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          fileKey: fileKey,
          uploadDate: new Date(),
        };

        newFiles.push(uploadedFile);
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Refresh folder structure if viewing it
    if (showFolderView) {
      fetchFolderStructure();
    }

    setLoading(false);
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

  const removeFile = async (fileId: string) => {
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (file) {
      try {
        await remove({ path: file.fileKey });
        setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));

        // Refresh folder structure if viewing it
        if (showFolderView) {
          fetchFolderStructure();
        }
      } catch (error) {
        console.error("Failed to delete file:", error);
      }
    }
  };

  const viewFile = async (file: UploadedFile) => {
    setViewingFile(file);
    if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv")
    ) {
      try {
        const result = await downloadData({ path: file.fileKey }).result;
        const text = await result.body.text();
        setFileContent(text);
      } catch (error) {
        console.error("Failed to load file content:", error);
        setFileContent(null);
      }
    } else {
      setFileContent(null);
    }
  };

  const downloadFile = async (file: UploadedFile) => {
    try {
      const result = await downloadData({ path: file.fileKey }).result;
      const blob = await result.body.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download file:", error);
    }
  };

  const handleAddDatabase = async () => {
    if (!formData.name.trim() || !formData.description.trim()) return;

    setLoading(true);
    try {
      const { data: newDatabase } = await client.models.databases.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        isActive: true,
      });

      if (newDatabase && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          await client.models.databaseFiles.create({
            databaseId: newDatabase.id,
            fileName: file.name,
            fileKey: file.fileKey,
            fileSize: file.size,
            fileType: file.type,
            uploadDate: file.uploadDate.toISOString(),
          });
        }
      }

      fetchDatabases();
      setFormData({ name: "", description: "" });
      setUploadedFiles([]);
      setIsEditing(false);

      // If viewing a database, refresh its files
      if (showDatabaseView && selectedDatabase) {
        fetchDatabaseFiles(selectedDatabase.id);
      }
    } catch (error) {
      console.error("Error creating database:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDatabase = async (database: Schema["databases"]["type"]) => {
    setEditingDatabase(database);
    setFormData({
      name: database.name,
      description: database.description,
    });
    setIsEditing(true);
  };

  const handleUpdateDatabase = async () => {
    if (
      !editingDatabase ||
      !formData.name.trim() ||
      !formData.description.trim()
    )
      return;

    setLoading(true);
    try {
      await client.models.databases.update({
        id: editingDatabase.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
      });

      fetchDatabases();
      setFormData({ name: "", description: "" });
      setUploadedFiles([]);
      setEditingDatabase(null);
      setIsEditing(false);

      // If viewing a database, refresh its files
      if (showDatabaseView && selectedDatabase) {
        fetchDatabaseFiles(selectedDatabase.id);
      }
    } catch (error) {
      console.error("Error updating database:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDatabase = async (id: string) => {
    setLoading(true);
    try {
      // Also delete related files if viewing this database
      if (showDatabaseView && selectedDatabase?.id === id) {
        goBackToList();
      }

      await client.models.databases.delete({ id });
      fetchDatabases();
    } catch (error) {
      console.error("Error deleting database:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDatabaseActive = async (id: string) => {
    const database = databases.find((db) => db.id === id);
    if (!database) return;

    try {
      await client.models.databases.update({
        id,
        isActive: !database.isActive,
      });
      fetchDatabases();
    } catch (error) {
      console.error("Error updating database:", error);
    }
  };

  const cancelEdit = () => {
    setFormData({ name: "", description: "" });
    setUploadedFiles([]);
    setEditingDatabase(null);
    setIsEditing(false);
  };

  const handleDatabaseFileUpload = async (files: FileList) => {
    if (!selectedDatabase) return;

    setAddingFilesToDatabase(true);
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Upload to database-specific folder
        const fileKey = `databases/shared/${selectedDatabase.id}/${Date.now()}-${file.name}`;

        await uploadData({
          path: fileKey,
          data: file,
        }).result;

        const uploadedFile: UploadedFile = {
          id: Date.now().toString() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          fileKey: fileKey,
          uploadDate: new Date(),
        };

        // Add to database files table
        await client.models.databaseFiles.create({
          databaseId: selectedDatabase.id,
          fileName: file.name,
          fileKey: fileKey,
          fileSize: file.size,
          fileType: file.type,
          uploadDate: new Date().toISOString(),
        });

        newFiles.push(uploadedFile);
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    }

    setDatabaseUploadFiles([]);
    // Refresh database files
    fetchDatabaseFiles(selectedDatabase.id);
    setAddingFilesToDatabase(false);
  };

  const handleDatabaseDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDatabaseFileUpload(e.dataTransfer.files);
    }
  };

  const removeDatabaseUploadFile = (fileId: string) => {
    setDatabaseUploadFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const deleteDatabaseFile = async (fileId: string, fileKey: string) => {
    if (!selectedDatabase) return;

    try {
      setLoading(true);
      // Delete from storage
      await remove({ path: fileKey });

      // Delete from database
      await client.models.databaseFiles.delete({ id: fileId });

      // Refresh database files
      fetchDatabaseFiles(selectedDatabase.id);
    } catch (error) {
      console.error("Failed to delete file:", error);
    } finally {
      setLoading(false);
    }
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
                      disabled={loading}
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
                          !formData.name.trim() ||
                          !formData.description.trim() ||
                          loading
                        }
                      >
                        {loading ? "Updating..." : "Update"}
                      </Button>
                      <Button
                        onClick={cancelEdit}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        disabled={loading}
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
                        !formData.name.trim() ||
                        !formData.description.trim() ||
                        loading
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {loading ? "Creating..." : "Add Database"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Databases List */}
          <div className="flex-1 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {showDatabaseView && selectedDatabase && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goBackToList}
                    className="h-7 text-xs"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Back
                  </Button>
                )}
                <h2 className="text-sm font-semibold">
                  {showDatabaseView && selectedDatabase
                    ? `${selectedDatabase.name} - Files`
                    : "Databases"}
                </h2>
              </div>
            </div>

            <ScrollArea className="h-full">
              {showDatabaseView && selectedDatabase ? (
                /* Database Files View */
                <div className="space-y-2">
                  {selectedDatabase && (
                    <Card>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">
                              {selectedDatabase.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {databaseFiles.length} files
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedDatabase.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* File Upload Section for Database */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Add Files to Database
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                          dragActive
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        onDrop={handleDatabaseDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                      >
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground mb-2">
                          Drag & drop files here, or click to select
                        </p>
                        <Button
                          type="button"
                          onClick={() => databaseFileInputRef.current?.click()}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          disabled={addingFilesToDatabase}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Files
                        </Button>
                        <input
                          ref={databaseFileInputRef}
                          type="file"
                          multiple
                          accept=".txt,.md,.csv,.json,.pdf,.doc,.docx"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleDatabaseFileUpload(e.target.files);
                            }
                          }}
                          className="hidden"
                        />
                      </div>

                      {/* Upload Progress */}
                      {addingFilesToDatabase && (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Progress
                              value={undefined}
                              className="flex-1 h-2"
                            />
                            <span className="text-xs text-muted-foreground">
                              Uploading...
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Temporary upload files list */}
                      {databaseUploadFiles.length > 0 && (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          <p className="text-xs text-muted-foreground">
                            Files to Upload ({databaseUploadFiles.length}):
                          </p>
                          {databaseUploadFiles.map((file) => (
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeDatabaseUploadFile(file.id)
                                }
                                className="h-4 w-4 p-0"
                                title="Remove file"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {loading ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Loading files...
                    </div>
                  ) : databaseFiles.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No files found in this database.
                    </div>
                  ) : (
                    databaseFiles.map((file) => (
                      <Card
                        key={file.id}
                        className="hover:bg-muted/50 cursor-pointer"
                      >
                        <CardContent
                          className="p-3"
                          onClick={async () => {
                            const uploadedFile: UploadedFile = {
                              id: file.id,
                              name: file.fileName,
                              size: file.fileSize || 0,
                              type: file.fileType || "unknown",
                              fileKey: file.fileKey,
                              uploadDate: new Date(
                                file.uploadDate || Date.now()
                              ),
                            };
                            await viewFile(uploadedFile);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <File className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <h3 className="text-sm font-medium">
                                  {file.fileName}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {file.fileSize &&
                                    formatFileSize(file.fileSize)}{" "}
                                  • {file.fileType} •{" "}
                                  {file.uploadDate &&
                                    new Date(
                                      file.uploadDate
                                    ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const uploadedFile: UploadedFile = {
                                    id: file.id,
                                    name: file.fileName,
                                    size: file.fileSize || 0,
                                    type: file.fileType || "unknown",
                                    fileKey: file.fileKey,
                                    uploadDate: new Date(
                                      file.uploadDate || Date.now()
                                    ),
                                  };
                                  await viewFile(uploadedFile);
                                }}
                                className="h-6 w-6 p-0"
                                title="View file"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const uploadedFile: UploadedFile = {
                                    id: file.id,
                                    name: file.fileName,
                                    size: file.fileSize || 0,
                                    type: file.fileType || "unknown",
                                    fileKey: file.fileKey,
                                    uploadDate: new Date(
                                      file.uploadDate || Date.now()
                                    ),
                                  };
                                  await downloadFile(uploadedFile);
                                }}
                                className="h-6 w-6 p-0"
                                title="Download file"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      `Are you sure you want to delete "${file.fileName}"?`
                                    )
                                  ) {
                                    await deleteDatabaseFile(
                                      file.id,
                                      file.fileKey
                                    );
                                  }
                                }}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                title="Delete file"
                                disabled={loading}
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
              ) : showFolderView ? (
                /* Folder Structure View */
                <div className="space-y-2">
                  {folderStructure ? (
                    <Card>
                      <CardContent className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">
                              Storage Structure
                            </span>
                          </div>
                          {renderFolderStructure(folderStructure)}
                        </div>
                      </CardContent>
                    </Card>
                  ) : loading ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Loading folder structure...
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No folder structure available.
                    </div>
                  )}
                </div>
              ) : (
                /* Database List View */
                <div className="space-y-2">
                  {databases.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No databases yet. Add one to get started.
                    </div>
                  ) : (
                    databases.map((database) => (
                      <Card
                        key={database.id}
                        className={`hover:bg-muted/50 cursor-pointer ${
                          !(database.isActive ?? true) ? "opacity-50" : ""
                        }`}
                        onClick={() => handleDatabaseClick(database)}
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
                                  checked={database.isActive ?? true}
                                  onCheckedChange={(checked) => {
                                    toggleDatabaseActive(database.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="scale-75"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {database.description}
                              </p>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditDatabase(database);
                                }}
                                className="h-6 w-6 p-0"
                                disabled={loading}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDatabase(database.id);
                                }}
                                className="h-6 w-6 p-0"
                                disabled={loading}
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
              )}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadFile(viewingFile)}
                    className="h-6 w-6 p-0"
                    title="Download file"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
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
                {fileContent ? (
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <pre className="text-xs whitespace-pre-wrap break-words font-mono bg-muted/50 rounded p-3">
                        {fileContent}
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
    </>
  );
}
