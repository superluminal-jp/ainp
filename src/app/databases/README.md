# Databases Page Component

A comprehensive database management interface built with Next.js and AWS Amplify, featuring advanced file management, RAG (Retrieval-Augmented Generation) capabilities, real-time embedding progress tracking, and sophisticated error handling with a three-panel layout design.

## Overview

The Databases Page (`/databases`) serves as the central hub for managing knowledge databases in the application, providing users with:

- **Database Management**: Create, edit, delete, and toggle database status with comprehensive CRUD operations
- **File Management**: Upload, organize, and manage files with advanced drag-and-drop support and file preview
- **RAG Integration**: Automatic vector embedding processing with real-time progress tracking and manual re-embedding
- **Storage Organization**: Hierarchical folder structure visualization with expandable navigation
- **Error Handling**: Comprehensive error management with auto-dismissal and user feedback
- **File Operations**: Preview, download, and delete files with detailed metadata display
- **Real-time Updates**: Live synchronization with backend changes and embedding progress

## Features

### 🗄️ Database Management

- **Create Databases**: Add new knowledge bases with name, description, and optional file uploads
- **Edit Databases**: Modify existing database information with form pre-population
- **Delete Databases**: Remove databases with confirmation prompts and automatic cleanup
- **Toggle Status**: Enable/disable databases using Switch component for chat integration
- **Real-time Updates**: Live synchronization with AWS Amplify backend changes

### 📁 File Management

- **Multi-file Upload**: Upload multiple files simultaneously with progress tracking
- **Dual Upload Zones**: General file upload and database-specific file upload areas
- **Drag & Drop**: Intuitive drag-and-drop interface with visual feedback
- **File Types**: Support for various formats (TXT, MD, CSV, JSON, PDF, DOC, DOCX)
- **File Preview**: Text-based file content preview in modal with syntax highlighting
- **File Download**: Direct file download functionality with blob handling
- **File Deletion**: Remove files from storage and database with confirmation prompts
- **Metadata Display**: File size, type, upload date, and storage path information

### 🔍 RAG & Vector Embedding

- **Automatic Processing**: Files automatically processed for vector embeddings upon upload
- **Progress Tracking**: Real-time embedding status with animated progress indicators
- **Manual Re-embedding**: Trigger embedding process manually for existing files
- **Status Indicators**: Visual feedback with CheckCircle, AlertCircle, and loading animations
- **Background Processing**: Non-blocking embedding operations with progress persistence
- **Error Recovery**: Comprehensive error handling for embedding failures with retry capabilities

### 📊 Storage Organization

- **Folder Structure**: Hierarchical view of file organization with expandable folders
- **Path-based Organization**: Organized storage paths (`databases/shared/`, `databases/shared/{databaseId}/`)
- **Expandable Navigation**: Collapsible folder tree with chevron indicators
- **File Counts**: Visual indicators showing folder contents and file counts
- **Interactive Navigation**: Click-to-expand folders and file actions
- **Depth Visualization**: Indented folder structure with proper nesting

### 🎛️ User Interface

- **Three-Panel Layout**: Form panel (1/3), main content panel (2/3), and modal overlay
- **Responsive Design**: Adaptive interface with proper breakpoints and mobile support
- **Error Display**: Contextual error messages with color-coded severity and auto-dismissal
- **Loading States**: Comprehensive loading feedback with skeleton states and progress bars
- **Confirmation Dialogs**: Safety prompts using browser confirm() for destructive operations
- **Toggle States**: README documentation toggle and view state management

### 🚀 Performance Features

- **Lazy Loading**: Efficient data loading strategies with selective database file fetching
- **Progress Indicators**: Visual feedback with animated spinners and progress bars
- **Optimistic Updates**: Immediate UI feedback for user actions with rollback capability
- **Error Recovery**: Graceful handling of failed operations with retry mechanisms
- **Memory Management**: Efficient state cleanup and automatic progress tracking cleanup

## Architecture

### State Management

The component uses comprehensive React state management with type safety:

```typescript
// Database State
const [databases, setDatabases] = useState<Schema["databases"]["type"][]>([]);
const [selectedDatabase, setSelectedDatabase] = useState<
  Schema["databases"]["type"] | null
>(null);
const [databaseFiles, setDatabaseFiles] = useState<
  Schema["databaseFiles"]["type"][]
>([]);

// File State
const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
const [databaseUploadFiles, setDatabaseUploadFiles] = useState<UploadedFile[]>(
  []
);
const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
const [fileContent, setFileContent] = useState<string | null>(null);

// UI State
const [loading, setLoading] = useState(false);
const [dragActive, setDragActive] = useState(false);
const [isEditing, setIsEditing] = useState(false);
const [editingDatabase, setEditingDatabase] = useState<
  Schema["databases"]["type"] | null
>(null);
const [showFolderView, setShowFolderView] = useState(false);
const [showDatabaseView, setShowDatabaseView] = useState(false);
const [addingFilesToDatabase, setAddingFilesToDatabase] = useState(false);
const [showReadme, setShowReadme] = useState(false);

// Form State
const [formData, setFormData] = useState({
  name: "",
  description: "",
});

// Embedding State
const [embeddingProgress, setEmbeddingProgress] = useState<{
  [key: string]: string;
}>({});

// Error State
const [errors, setErrors] = useState<ErrorState[]>([]);

// Folder Structure State
const [folderStructure, setFolderStructure] = useState<FolderStructure | null>(
  null
);
```

### Component Layout

```
DatabasesPage
├── AppHeader
├── Error Display Panel (Auto-dismissing with X buttons)
├── README Display Section (Toggle-able)
├── Main Content Flex Container
│   ├── Form Panel (w-1/3)
│   │   ├── Database Form Card
│   │   │   ├── Name & Description Fields
│   │   │   ├── Embedding Progress Section
│   │   │   ├── File Upload Zone (Drag & Drop)
│   │   │   ├── Uploaded Files List
│   │   │   └── Action Buttons (Add/Update/Cancel)
│   │   └── Real-time Progress Tracking
│   └── Main Content Panel (flex-1)
│       ├── Navigation Header with Back Button
│       ├── Database List View
│       ├── Database Detail View
│       │   ├── Database Info Card
│       │   ├── Embedding Progress Card
│       │   ├── File Upload Card
│       │   └── Database Files List
│       └── Folder Structure View
└── File Viewer Modal (Fixed overlay)
    ├── Modal Header with Actions
    ├── File Content Preview
    └── Download/Close Actions
```

### Data Flow

1. **Database Creation** → Form validation → AWS Amplify API → Database record → File processing → Auto-embedding
2. **File Upload** → Drag & drop or file selection → AWS S3 Storage → Database file record → Embedding trigger
3. **Vector Embedding** → AWS Lambda mutation → Progress tracking → Status updates → UI feedback
4. **File Management** → Storage operations → Database synchronization → Real-time UI updates
5. **Error Handling** → Error capture → State management → Auto-dismissal → User feedback

### Error Handling System

```typescript
interface ErrorState {
  message: string;
  type: "error" | "warning" | "info";
  timestamp: Date;
}

// Error Management
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
```

## Usage

### Creating a New Database

1. Navigate to `/databases`
2. Fill in database name and description in the form panel
3. Optionally upload files using drag & drop or file selection
4. Click "Add Database" to create with automatic file processing
5. Monitor embedding progress in real-time with visual indicators

### Managing Database Files

1. Click on a database card to enter database detail view
2. Use the "Add Files to Database" card to upload new files
3. Drag and drop files directly into the upload zone
4. Monitor embedding progress with animated indicators
5. Use file actions (view, download, re-embed, delete) from the file cards

### File Operations

```typescript
// File Upload with Progress Tracking
const handleFileUpload = async (files: FileList): Promise<void> => {
  setLoading(true);
  const newFiles: UploadedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
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
      addError(`Failed to upload ${file.name}`);
    }
  }

  setUploadedFiles((prev) => [...prev, ...newFiles]);
  setLoading(false);
};
```

### Vector Embedding Process

```typescript
// Comprehensive Embedding Process
const embedFile = async (
  fileKey: string,
  fileName: string,
  databaseId: string,
  databaseFileId: string
): Promise<void> => {
  try {
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

    setEmbeddingProgress((prev) => ({
      ...prev,
      [fileName]: "Embedding completed",
    }));

    // Auto-cleanup after 3 seconds
    setTimeout(() => {
      setEmbeddingProgress((prev) => {
        const updated = { ...prev };
        delete updated[fileName];
        return updated;
      });
    }, 3000);
  } catch (embedError) {
    setEmbeddingProgress((prev) => ({
      ...prev,
      [fileName]: "Embedding failed",
    }));

    addError(`Embedding failed for ${fileName}`);
  }
};
```

### Folder Structure Management

```typescript
// Hierarchical Folder Structure
const buildFolderStructure = (
  files: Array<{
    path: string;
    lastModified?: Date;
    size?: number;
  }>
): FolderStructure => {
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
        // This is a file
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
```

## File Types and Support

### Supported Formats

- **Text Files**: `.txt`, `.md` with full content preview
- **Data Files**: `.csv`, `.json` with structured display
- **Documents**: `.pdf`, `.doc`, `.docx` with metadata display
- **Custom**: Additional formats via configuration

### File Preview System

```typescript
// File Content Preview
const viewFile = async (file: UploadedFile): Promise<void> => {
  setViewingFile(file);

  const isTextFile =
    file.type.startsWith("text/") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".md") ||
    file.name.endsWith(".json") ||
    file.name.endsWith(".csv");

  if (isTextFile) {
    try {
      const result = await downloadData({ path: file.fileKey }).result;
      const text = await result.body.text();
      setFileContent(text);
    } catch (error) {
      addError(`Failed to load content for ${file.name}`);
      setFileContent(null);
    }
  } else {
    setFileContent(null);
  }
};
```

### Storage Organization

```
databases/
├── shared/
│   ├── [timestamp]-[filename]     # General uploaded files
│   └── [database-id]/
│       └── [filename]             # Database-specific files
└── [expandable-folder-structure]  # Hierarchical organization
```

## Performance Optimization

### Loading Strategies

- **Selective Loading**: Database files loaded only when database is selected
- **Lazy Folder Structure**: Folder structure loaded on demand
- **Progress Tracking**: Memory-efficient progress state management
- **Auto-cleanup**: Automatic cleanup of completed progress tracking

### Memory Management

```typescript
// Automatic Progress Cleanup
setTimeout(() => {
  setEmbeddingProgress((prev) => {
    const updated = { ...prev };
    delete updated[fileName];
    return updated;
  });
}, 3000); // Success cleanup

setTimeout(() => {
  setEmbeddingProgress((prev) => {
    const updated = { ...prev };
    delete updated[fileName];
    return updated;
  });
}, 5000); // Error cleanup
```

## Error Handling & Recovery

### Error Types and Management

```typescript
// Comprehensive Error Handling
const handleDatabaseClick = async (
  database: Schema["databases"]["type"]
): Promise<void> => {
  try {
    setSelectedDatabase(database);
    setShowDatabaseView(true);
    setShowFolderView(false);
    await fetchDatabaseFiles(database.id);
  } catch (error) {
    console.error("[DatabasesPage] Error in handleDatabaseClick:", error);
    addError("Failed to load database details");
  }
};
```

### Visual Error Display

- **Color-coded Severity**: Red for errors, yellow for warnings, blue for info
- **Auto-dismissal**: Errors automatically removed after 5 seconds
- **Manual Dismissal**: X button for immediate error removal
- **Error Stacking**: Multiple errors displayed with latest 3 visible

## Integration Points

### AWS Amplify Integration

```typescript
// Database Operations
const client = generateClient<Schema>();

// Storage Operations
import { uploadData, downloadData, remove, list } from "aws-amplify/storage";

// Real-time Updates
const { data } = await client.models.databases.list();
```

### Component Integration

- **AppHeader**: Consistent header across all pages
- **ReadmeDisplay**: Toggle-able documentation display
- **UI Components**: Comprehensive use of shadcn/ui components
- **Storage Integration**: Direct AWS S3 integration for file operations

## Testing and Troubleshooting

### Console Logging

The component includes comprehensive logging:

```typescript
console.log("[DatabasesPage] Component initialized");
console.log(
  `[DatabasesPage] Successfully fetched ${data?.length || 0} databases`
);
console.error("[DatabasesPage] Error fetching databases:", error);
```

### Common Issues

1. **File Upload Failures**: Check AWS permissions and file size limits
2. **Embedding Failures**: Verify AWS Lambda function deployment
3. **Database Operations**: Confirm AWS Amplify configuration
4. **Storage Issues**: Check AWS S3 bucket permissions and connectivity

### Debug Features

- **Development Mode**: Enhanced logging in development environment
- **Error Boundaries**: Graceful error handling with user feedback
- **State Inspection**: Comprehensive state management for debugging
- **Performance Monitoring**: Built-in performance tracking capabilities
