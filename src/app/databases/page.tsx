"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef, useCallback } from "react";

import { AppHeader } from "@/components/app-header";
import { ReadmeDisplay } from "@/components/readme-display";
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
  FileText,
} from "lucide-react";

import { uploadData, downloadData, remove, list } from "aws-amplify/storage";
import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
const client = generateClient<Schema>();

/**
 * Interface for uploaded files with metadata
 */
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  fileKey: string;
  uploadDate: Date;
}

/**
 * Interface for folder structure representation
 */
interface FolderStructure {
  name: string;
  path: string;
  files: StorageFile[];
  folders: FolderStructure[];
  isExpanded: boolean;
}

/**
 * Interface for storage file metadata
 */
interface StorageFile {
  key: string;
  lastModified?: Date;
  size?: number;
  name: string;
}

/**
 * Interface for error state management
 */
interface ErrorState {
  message: string;
  type: "error" | "warning" | "info";
  timestamp: Date;
}

/**
 * DatabasesPage Component
 *
 * A comprehensive database management interface that provides:
 * - Database creation, editing, and deletion
 * - File upload and management with RAG capabilities
 * - Vector embedding processing
 * - File preview and download functionality
 * - Folder structure visualization
 *
 * @returns {React.ReactElement} The DatabasesPage component
 */
export default function DatabasesPage() {
  // UI State
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Database State
  const [databases, setDatabases] = useState<Schema["databases"]["type"][]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<
    Schema["databases"]["type"] | null
  >(null);
  const [databaseFiles, setDatabaseFiles] = useState<
    Schema["databaseFiles"]["type"][]
  >([]);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState<
    Schema["databases"]["type"] | null
  >(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // File State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [databaseUploadFiles, setDatabaseUploadFiles] = useState<
    UploadedFile[]
  >([]);
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  // View State
  const [showFolderView, setShowFolderView] = useState(false);
  const [showDatabaseView, setShowDatabaseView] = useState(false);
  const [addingFilesToDatabase, setAddingFilesToDatabase] = useState(false);
  const [folderStructure, setFolderStructure] =
    useState<FolderStructure | null>(null);

  // Embedding State
  const [embeddingProgress, setEmbeddingProgress] = useState<{
    [key: string]: string;
  }>({});

  // Error State
  const [errors, setErrors] = useState<ErrorState[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const databaseFileInputRef = useRef<HTMLInputElement>(null);

  // UI State - README toggle
  const [showReadme, setShowReadme] = useState(false);

  /**
   * Add an error to the error state with automatic cleanup
   * @param {string} message - Error message to display
   * @param {'error' | 'warning' | 'info'} type - Type of error
   */
  const addError = (
    message: string,
    type: "error" | "warning" | "info" = "error"
  ) => {
    const error: ErrorState = {
      message,
      type,
      timestamp: new Date(),
    };

    console.error(`[DatabasesPage] ${type.toUpperCase()}: ${message}`);
    setErrors((prev) => [...prev, error]);

    // Auto-remove error after 5 seconds
    setTimeout(() => {
      setErrors((prev) => prev.filter((e) => e.timestamp !== error.timestamp));
    }, 5000);
  };

  /**
   * Clear all errors from the error state
   */
  const clearErrors = () => {
    setErrors([]);
  };

  useEffect(() => {
    console.log("[DatabasesPage] Component initialized");
    fetchDatabases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetch all databases from the API
   * @returns {Promise<void>}
   */
  const fetchDatabases = useCallback(async (): Promise<void> => {
    try {
      console.log("[DatabasesPage] Fetching databases...");
      const { data } = await client.models.databases.list();
      setDatabases(data || []);
      console.log(
        `[DatabasesPage] Successfully fetched ${data?.length || 0} databases`
      );
    } catch (error) {
      const errorMessage = "Failed to fetch databases";
      console.error("[DatabasesPage] Error fetching databases:", error);
      addError(errorMessage);
    }
  }, []);

  /**
   * Fetch files for a specific database
   * @param {string} databaseId - The ID of the database
   * @returns {Promise<void>}
   */
  const fetchDatabaseFiles = async (databaseId: string): Promise<void> => {
    if (!databaseId) {
      console.warn(
        "[DatabasesPage] fetchDatabaseFiles called with empty databaseId"
      );
      return;
    }

    try {
      console.log(`[DatabasesPage] Fetching files for database: ${databaseId}`);
      setLoading(true);
      const { data } = await client.models.databaseFiles.list({
        filter: { databaseId: { eq: databaseId } },
      });
      setDatabaseFiles(data || []);
      console.log(
        `[DatabasesPage] Successfully fetched ${data?.length || 0} files for database ${databaseId}`
      );
    } catch (error) {
      const errorMessage = "Failed to fetch database files";
      console.error("[DatabasesPage] Error fetching database files:", error);
      addError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle database selection and navigate to database view
   * @param {Schema["databases"]["type"]} database - The selected database
   * @returns {Promise<void>}
   */
  const handleDatabaseClick = async (
    database: Schema["databases"]["type"]
  ): Promise<void> => {
    try {
      console.log(
        `[DatabasesPage] Selecting database: ${database.name} (${database.id})`
      );
      setSelectedDatabase(database);
      setShowDatabaseView(true);
      setShowFolderView(false);
      await fetchDatabaseFiles(database.id);
    } catch (error) {
      console.error("[DatabasesPage] Error in handleDatabaseClick:", error);
      addError("Failed to load database details");
    }
  };

  /**
   * Navigate back to the database list view
   */
  const goBackToList = (): void => {
    console.log("[DatabasesPage] Navigating back to database list");
    setSelectedDatabase(null);
    setShowDatabaseView(false);
    setDatabaseFiles([]);
    clearErrors();
  };

  /**
   * Format file size from bytes to human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  /**
   * Fetch and build folder structure from storage
   * @returns {Promise<void>}
   */
  const fetchFolderStructure = async (): Promise<void> => {
    try {
      console.log("[DatabasesPage] Fetching folder structure...");
      setLoading(true);
      const result = await list({
        path: "databases/",
        options: {
          listAll: true,
        },
      });

      const files = result.items || [];
      console.log(
        `[DatabasesPage] Found ${files.length} items in folder structure`
      );
      const structure = buildFolderStructure(files);
      setFolderStructure(structure);
    } catch (error) {
      const errorMessage = "Failed to load folder structure";
      console.error("[DatabasesPage] Error fetching folder structure:", error);
      addError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Build hierarchical folder structure from flat file list
   * @param {Array<{path: string; lastModified?: Date; size?: number}>} files - Array of file objects from storage
   * @returns {FolderStructure} Hierarchical folder structure
   */
  const buildFolderStructure = (
    files: Array<{ path: string; lastModified?: Date; size?: number }>
  ): FolderStructure => {
    console.log("[DatabasesPage] Building folder structure from files");
    const root: FolderStructure = {
      name: "databases",
      path: "databases/",
      files: [],
      folders: [],
      isExpanded: true,
    };

    const folderMap = new Map<string, FolderStructure>();
    folderMap.set("databases/", root);

    try {
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
    } catch (error) {
      console.error("[DatabasesPage] Error building folder structure:", error);
      addError("Failed to process folder structure");
    }

    return root;
  };

  /**
   * Toggle folder expansion state
   * @param {string} path - Path of the folder to toggle
   */
  const toggleFolder = (path: string): void => {
    console.log(`[DatabasesPage] Toggling folder: ${path}`);
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

  /**
   * Recursively render folder structure with files
   * @param {FolderStructure} folder - Folder structure to render
   * @param {number} depth - Current nesting depth for indentation
   * @returns {React.ReactElement} Rendered folder structure
   */
  const renderFolderStructure = (
    folder: FolderStructure,
    depth = 0
  ): React.ReactElement => {
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

  /**
   * Handle file upload to shared storage
   * @param {FileList} files - Files to upload
   * @returns {Promise<void>}
   */
  const handleFileUpload = async (files: FileList): Promise<void> => {
    if (!files || files.length === 0) {
      console.warn("[DatabasesPage] handleFileUpload called with empty files");
      return;
    }

    console.log(`[DatabasesPage] Starting upload of ${files.length} files`);
    setLoading(true);
    const newFiles: UploadedFile[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log(
          `[DatabasesPage] Uploading file: ${file.name} (${formatFileSize(file.size)})`
        );

        // Upload to shared folder for collaborative databases
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
        successCount++;
        console.log(`[DatabasesPage] Successfully uploaded: ${file.name}`);
      } catch (error) {
        errorCount++;
        console.error(
          `[DatabasesPage] Failed to upload file ${file.name}:`,
          error
        );
        addError(`Failed to upload ${file.name}`);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Refresh folder structure if viewing it
    if (showFolderView) {
      fetchFolderStructure();
    }

    console.log(
      `[DatabasesPage] Upload completed: ${successCount} successful, ${errorCount} failed`
    );
    // if (successCount > 0) {
    //   addError(`Successfully uploaded ${successCount} file(s)`, "info");
    // }

    setLoading(false);
  };

  /**
   * Handle drag and drop file upload
   * @param {React.DragEvent} e - Drag event
   */
  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log(
        `[DatabasesPage] Files dropped: ${e.dataTransfer.files.length}`
      );
      handleFileUpload(e.dataTransfer.files);
    }
  };

  /**
   * Handle drag over event
   * @param {React.DragEvent} e - Drag event
   */
  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragActive(true);
  };

  /**
   * Handle drag leave event
   * @param {React.DragEvent} e - Drag event
   */
  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragActive(false);
  };

  /**
   * Remove file from storage and local state
   * @param {string} fileId - ID of the file to remove
   * @returns {Promise<void>}
   */
  const removeFile = async (fileId: string): Promise<void> => {
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (!file) {
      console.warn(`[DatabasesPage] File not found for removal: ${fileId}`);
      return;
    }

    try {
      console.log(`[DatabasesPage] Removing file: ${file.name}`);
      await remove({ path: file.fileKey });
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));

      // Refresh folder structure if viewing it
      if (showFolderView) {
        fetchFolderStructure();
      }

      console.log(`[DatabasesPage] Successfully removed file: ${file.name}`);
    } catch (error) {
      const errorMessage = `Failed to delete ${file.name}`;
      console.error("[DatabasesPage] Failed to delete file:", error);
      addError(errorMessage);
    }
  };

  /**
   * View file content in modal
   * @param {UploadedFile} file - File to view
   * @returns {Promise<void>}
   */
  const viewFile = async (file: UploadedFile): Promise<void> => {
    if (!file) {
      console.warn("[DatabasesPage] viewFile called with null file");
      return;
    }

    console.log(`[DatabasesPage] Viewing file: ${file.name}`);
    setViewingFile(file);

    // Check if file is text-based for preview
    const isTextFile =
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv");

    if (isTextFile) {
      try {
        console.log(`[DatabasesPage] Loading text content for: ${file.name}`);
        const result = await downloadData({ path: file.fileKey }).result;
        const text = await result.body.text();
        setFileContent(text);
        console.log(
          `[DatabasesPage] Successfully loaded content for: ${file.name}`
        );
      } catch (error) {
        console.error(
          `[DatabasesPage] Failed to load file content for ${file.name}:`,
          error
        );
        addError(`Failed to load content for ${file.name}`);
        setFileContent(null);
      }
    } else {
      console.log(
        `[DatabasesPage] File ${file.name} is not text-based, preview not available`
      );
      setFileContent(null);
    }
  };

  /**
   * Download file from storage
   * @param {UploadedFile} file - File to download
   * @returns {Promise<void>}
   */
  const downloadFile = async (file: UploadedFile): Promise<void> => {
    if (!file) {
      console.warn("[DatabasesPage] downloadFile called with null file");
      return;
    }

    try {
      console.log(`[DatabasesPage] Downloading file: ${file.name}`);
      const result = await downloadData({ path: file.fileKey }).result;
      const blob = await result.body.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      console.log(`[DatabasesPage] Successfully downloaded: ${file.name}`);
    } catch (error) {
      const errorMessage = `Failed to download ${file.name}`;
      console.error("[DatabasesPage] Failed to download file:", error);
      addError(errorMessage);
    }
  };

  /**
   * Add new database with uploaded files
   * @returns {Promise<void>}
   */
  const handleAddDatabase = async (): Promise<void> => {
    if (!formData.name.trim() || !formData.description.trim()) {
      addError("Please fill in all required fields", "warning");
      return;
    }

    console.log(`[DatabasesPage] Creating new database: ${formData.name}`);
    setLoading(true);

    try {
      const { data: newDatabase } = await client.models.databases.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        isActive: true,
      });

      if (!newDatabase) {
        throw new Error("Failed to create database - no data returned");
      }

      console.log(
        `[DatabasesPage] Successfully created database: ${newDatabase.name} (${newDatabase.id})`
      );

      // Add files to database if any were uploaded
      if (uploadedFiles.length > 0) {
        console.log(
          `[DatabasesPage] Adding ${uploadedFiles.length} files to database`
        );
        let fileSuccessCount = 0;
        let fileErrorCount = 0;

        for (const file of uploadedFiles) {
          try {
            const { data: databaseFile } =
              await client.models.databaseFiles.create({
                databaseId: newDatabase.id,
                fileName: file.name,
                fileKey: file.fileKey,
                fileSize: file.size,
                fileType: file.type,
              });

            // Start embedding process automatically for each file
            if (databaseFile) {
              embedFile(
                file.fileKey,
                file.name,
                newDatabase.id,
                databaseFile.id
              );
              fileSuccessCount++;
            }
          } catch (error) {
            fileErrorCount++;
            console.error(
              `[DatabasesPage] Failed to add file ${file.name} to database:`,
              error
            );
            addError(`Failed to add ${file.name} to database`);
          }
        }

        console.log(
          `[DatabasesPage] File addition completed: ${fileSuccessCount} successful, ${fileErrorCount} failed`
        );
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
      const errorMessage = "Failed to create database";
      console.error("[DatabasesPage] Error creating database:", error);
      addError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Edit existing database
   * @param {Schema["databases"]["type"]} database - Database to edit
   */
  const handleEditDatabase = async (
    database: Schema["databases"]["type"]
  ): Promise<void> => {
    console.log(`[DatabasesPage] Editing database: ${database.name}`);
    setEditingDatabase(database);
    setFormData({
      name: database.name,
      description: database.description,
    });
    setIsEditing(true);
  };

  /**
   * Update existing database
   * @returns {Promise<void>}
   */
  const handleUpdateDatabase = async (): Promise<void> => {
    if (
      !editingDatabase ||
      !formData.name.trim() ||
      !formData.description.trim()
    ) {
      addError("Please fill in all required fields", "warning");
      return;
    }

    console.log(`[DatabasesPage] Updating database: ${editingDatabase.name}`);
    setLoading(true);

    try {
      await client.models.databases.update({
        id: editingDatabase.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
      });

      console.log(
        `[DatabasesPage] Successfully updated database: ${formData.name}`
      );
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
      const errorMessage = "Failed to update database";
      console.error("[DatabasesPage] Error updating database:", error);
      addError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete database and associated files
   * @param {string} id - Database ID to delete
   * @returns {Promise<void>}
   */
  const handleDeleteDatabase = async (id: string): Promise<void> => {
    if (!id) {
      console.warn("[DatabasesPage] handleDeleteDatabase called with empty id");
      return;
    }

    const database = databases.find((db) => db.id === id);
    const databaseName = database?.name || "Unknown";

    if (
      !confirm(
        `Are you sure you want to delete "${databaseName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    console.log(`[DatabasesPage] Deleting database: ${databaseName} (${id})`);
    setLoading(true);

    try {
      // Navigate away if currently viewing this database
      if (showDatabaseView && selectedDatabase?.id === id) {
        goBackToList();
      }

      await client.models.databases.delete({ id });
      console.log(
        `[DatabasesPage] Successfully deleted database: ${databaseName}`
      );
      fetchDatabases();
    } catch (error) {
      const errorMessage = `Failed to delete database "${databaseName}"`;
      console.error("[DatabasesPage] Error deleting database:", error);
      addError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle database active status
   * @param {string} id - Database ID to toggle
   * @returns {Promise<void>}
   */
  const toggleDatabaseActive = async (id: string): Promise<void> => {
    const database = databases.find((db) => db.id === id);
    if (!database) {
      console.warn(`[DatabasesPage] Database not found for toggle: ${id}`);
      return;
    }

    const newStatus = !database.isActive;
    console.log(
      `[DatabasesPage] Toggling database ${database.name} active status to: ${newStatus}`
    );

    try {
      await client.models.databases.update({
        id,
        isActive: newStatus,
      });

      console.log(
        `[DatabasesPage] Successfully toggled database ${database.name} status`
      );
      fetchDatabases();
    } catch (error) {
      const errorMessage = `Failed to update database status`;
      console.error("[DatabasesPage] Error updating database:", error);
      addError(errorMessage);
    }
  };

  /**
   * Cancel editing mode and reset form
   */
  const cancelEdit = (): void => {
    console.log("[DatabasesPage] Canceling edit mode");
    setFormData({ name: "", description: "" });
    setUploadedFiles([]);
    setEditingDatabase(null);
    setIsEditing(false);
    clearErrors();
  };

  /**
   * Start embedding process for a file
   * @param {string} fileKey - Storage key of the file
   * @param {string} fileName - Name of the file
   * @param {string} databaseId - ID of the target database
   * @param {string} databaseFileId - ID of the database file record
   * @returns {Promise<void>}
   */
  const embedFile = async (
    fileKey: string,
    fileName: string,
    databaseId: string,
    databaseFileId: string
  ): Promise<void> => {
    if (!fileKey || !fileName || !databaseId || !databaseFileId) {
      console.warn("[DatabasesPage] embedFile called with missing parameters");
      addError("Missing parameters for embedding process", "warning");
      return;
    }

    try {
      console.log(
        `[DatabasesPage] Starting embedding process for: ${fileName}`
      );
      setEmbeddingProgress((prev) => ({
        ...prev,
        [fileName]: "Embedding in progress...",
      }));

      await client.mutations.embedFiles({
        fileKey: fileKey,
        fileName: fileName,
        databaseId: databaseId,
        databaseFileId: databaseFileId,
      });

      console.log(
        `[DatabasesPage] Embedding process completed for: ${fileName}`
      );
      setEmbeddingProgress((prev) => ({
        ...prev,
        [fileName]: "Embedding completed",
      }));

      // Remove from progress after 3 seconds
      setTimeout(() => {
        setEmbeddingProgress((prev) => {
          const updated = { ...prev };
          delete updated[fileName];
          return updated;
        });
      }, 3000);
    } catch (embedError) {
      console.error(
        `[DatabasesPage] Failed to embed file ${fileName}:`,
        embedError
      );
      setEmbeddingProgress((prev) => ({
        ...prev,
        [fileName]: "Embedding failed",
      }));

      addError(`Embedding failed for ${fileName}`);

      // Remove from progress after 5 seconds
      setTimeout(() => {
        setEmbeddingProgress((prev) => {
          const updated = { ...prev };
          delete updated[fileName];
          return updated;
        });
      }, 5000);
    }
  };

  /**
   * Handle file upload to specific database
   * @param {FileList} files - Files to upload
   * @returns {Promise<void>}
   */
  const handleDatabaseFileUpload = async (files: FileList): Promise<void> => {
    if (!selectedDatabase) {
      console.warn(
        "[DatabasesPage] handleDatabaseFileUpload called without selected database"
      );
      addError("No database selected for file upload", "warning");
      return;
    }

    if (!files || files.length === 0) {
      console.warn(
        "[DatabasesPage] handleDatabaseFileUpload called with empty files"
      );
      return;
    }

    console.log(
      `[DatabasesPage] Starting upload of ${files.length} files to database: ${selectedDatabase.name}`
    );
    setAddingFilesToDatabase(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log(`[DatabasesPage] Uploading file to database: ${file.name}`);

        // Upload to database-specific folder
        const fileKey = `databases/shared/${selectedDatabase.id}/${file.name}`;

        await uploadData({
          path: fileKey,
          data: file,
        }).result;

        // Add to database files table
        const { data: databaseFile } = await client.models.databaseFiles.create(
          {
            databaseId: selectedDatabase.id,
            fileName: file.name,
            fileKey: fileKey,
            fileSize: file.size,
            fileType: file.type,
          }
        );

        // Start embedding process automatically
        if (databaseFile) {
          // Run embedding in background without blocking the upload process
          embedFile(fileKey, file.name, selectedDatabase.id, databaseFile.id);
        }

        successCount++;
        console.log(
          `[DatabasesPage] Successfully uploaded to database: ${file.name}`
        );
      } catch (error) {
        errorCount++;
        console.error(
          `[DatabasesPage] Failed to upload file ${file.name} to database:`,
          error
        );
        addError(`Failed to upload ${file.name} to database`);
      }
    }

    setDatabaseUploadFiles([]);
    // Refresh database files
    fetchDatabaseFiles(selectedDatabase.id);
    setAddingFilesToDatabase(false);

    console.log(
      `[DatabasesPage] Database upload completed: ${successCount} successful, ${errorCount} failed`
    );
    if (successCount > 0) {
      // addError(
      //   `Successfully uploaded ${successCount} file(s) to database`,
      //   "info"
      // );
    }
  };

  /**
   * Handle drag and drop for database files
   * @param {React.DragEvent} e - Drag event
   */
  const handleDatabaseDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log(
        `[DatabasesPage] Database files dropped: ${e.dataTransfer.files.length}`
      );
      handleDatabaseFileUpload(e.dataTransfer.files);
    }
  };

  /**
   * Remove file from database upload queue
   * @param {string} fileId - ID of file to remove
   */
  const removeDatabaseUploadFile = (fileId: string): void => {
    console.log(`[DatabasesPage] Removing file from upload queue: ${fileId}`);
    setDatabaseUploadFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  /**
   * Delete file from database and storage
   * @param {string} fileId - Database file ID
   * @param {string} fileKey - Storage file key
   * @returns {Promise<void>}
   */
  const deleteDatabaseFile = async (
    fileId: string,
    fileKey: string
  ): Promise<void> => {
    if (!selectedDatabase) {
      console.warn(
        "[DatabasesPage] deleteDatabaseFile called without selected database"
      );
      return;
    }

    if (!fileId || !fileKey) {
      console.warn(
        "[DatabasesPage] deleteDatabaseFile called with missing parameters"
      );
      return;
    }

    try {
      console.log(`[DatabasesPage] Deleting database file: ${fileKey}`);
      setLoading(true);

      // Delete from storage
      await remove({ path: fileKey });

      // Delete from database
      await client.models.databaseFiles.delete({ id: fileId });

      console.log(
        `[DatabasesPage] Successfully deleted database file: ${fileKey}`
      );

      // Refresh database files
      fetchDatabaseFiles(selectedDatabase.id);
    } catch (error) {
      const errorMessage = "Failed to delete file";
      console.error("[DatabasesPage] Failed to delete file:", error);
      addError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader />
      <div className="h-screen bg-background text-foreground flex flex-col">
        {/* Error Display */}
        {errors.length > 0 && (
          <div className="border-b border-border">
            {errors.slice(-3).map((error) => (
              <div
                key={error.timestamp.getTime()}
                className={`px-4 py-2 text-sm ${
                  error.type === "error"
                    ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
                    : error.type === "warning"
                      ? "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-800"
                      : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{error.message}</span>
                  <button
                    onClick={() =>
                      setErrors((prev) =>
                        prev.filter((e) => e.timestamp !== error.timestamp)
                      )
                    }
                    className="ml-2 text-current opacity-70 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* README Display Section */}
        {showReadme && (
          <div className="border-b border-border p-4 bg-muted/30">
            <ReadmeDisplay
              path="/app/databases/README.md"
              title="Databases Documentation"
              className="max-w-6xl mx-auto"
            />
          </div>
        )}

        <div className="flex-1 flex">
          {/* Form Panel */}
          <div className="w-1/3 border-r border-border p-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
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

                {/* Embedding Progress Section */}
                {Object.keys(embeddingProgress).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Embedding Status</Label>
                    <div className="max-h-24 overflow-y-auto space-y-1 p-2 border rounded-md bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                      {Object.entries(embeddingProgress).map(
                        ([fileName, status]) => (
                          <div
                            key={fileName}
                            className="flex items-center space-x-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {fileName}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1">
                              {status === "Embedding in progress..." && (
                                <div className="animate-spin h-2 w-2 border border-orange-500 border-t-transparent rounded-full"></div>
                              )}
                              {status === "Embedding completed" && (
                                <CheckCircle className="h-2 w-2 text-green-500" />
                              )}
                              {status === "Embedding failed" && (
                                <AlertCircle className="h-2 w-2 text-red-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {status}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

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
                <Badge variant="outline" className="text-xs">
                  {databases.length} Databases
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReadme(!showReadme)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <FileText className="h-3 w-3 mr-1" />
                {showReadme ? "Hide Documentation" : "Show Documentation"}
              </Button>
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

                  {/* Embedding Progress Section */}
                  {Object.keys(embeddingProgress).length > 0 && (
                    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center space-x-2">
                          <Database className="h-4 w-4 text-orange-500" />
                          <span>Embedding Status</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {Object.entries(embeddingProgress).map(
                          ([fileName, status]) => (
                            <div
                              key={fileName}
                              className="flex items-center space-x-2"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {fileName}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {status === "Embedding in progress..." && (
                                  <div className="animate-spin h-3 w-3 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                                )}
                                {status === "Embedding completed" && (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                )}
                                {status === "Embedding failed" && (
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {status}
                                </span>
                              </div>
                            </div>
                          )
                        )}
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
                                file.createdAt || Date.now()
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
                                  {file.createdAt &&
                                    new Date(
                                      file.createdAt
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
                                      file.createdAt || Date.now()
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
                                      file.createdAt || Date.now()
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
                                  if (!selectedDatabase) return;

                                  // Use the unified embedFile function
                                  embedFile(
                                    file.fileKey,
                                    file.fileName,
                                    selectedDatabase.id,
                                    file.id
                                  );
                                }}
                                className="h-6 w-6 p-0"
                                title="Embed file into vector database"
                                disabled={
                                  loading || !!embeddingProgress[file.fileName]
                                }
                              >
                                {embeddingProgress[file.fileName] ===
                                "Embedding in progress..." ? (
                                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
                                ) : (
                                  <Database className="h-3 w-3" />
                                )}
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
                                  onCheckedChange={() => {
                                    toggleDatabaseActive(database.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="scale-75"
                                />
                                <Label className="text-xs">Active</Label>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
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
                                title="Edit database"
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
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                disabled={loading}
                                title="Delete database"
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
