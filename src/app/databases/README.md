# Databases Page Component

A comprehensive database management interface built with Next.js and AWS Amplify, providing full-featured database creation, file management, and RAG (Retrieval-Augmented Generation) capabilities with vector embedding support.

## Overview

The Databases Page (`/databases`) is the central hub for managing knowledge databases in the application, providing users with:

- **Database Management**: Create, edit, and delete custom databases
- **File Management**: Upload, organize, and manage files with drag-and-drop support
- **RAG Integration**: Automatic vector embedding processing for uploaded files
- **Real-time Monitoring**: Live progress tracking for embedding operations
- **File Operations**: Preview, download, and delete files with comprehensive metadata
- **Folder Structure**: Hierarchical visualization of storage organization
- **Error Handling**: Comprehensive error management with user feedback
- **AWS Integration**: Seamless integration with AWS Amplify Storage and backend services

## Features

### 🗄️ Database Management

- **Create Databases**: Add new knowledge bases with name and description
- **Edit Databases**: Modify existing database information
- **Delete Databases**: Remove databases with confirmation prompts
- **Toggle Status**: Enable/disable databases for use in chat
- **Real-time Updates**: Live synchronization with backend changes

### 📁 File Management

- **Multi-file Upload**: Upload multiple files simultaneously
- **Drag & Drop**: Intuitive drag-and-drop interface
- **File Types**: Support for various formats (TXT, MD, CSV, JSON, PDF, DOC, DOCX)
- **File Preview**: Text-based file content preview
- **File Download**: Direct file download functionality
- **File Deletion**: Remove files from databases with confirmation
- **Metadata Display**: File size, type, and upload date information

### 🔍 RAG & Vector Embedding

- **Automatic Processing**: Files automatically processed for vector embeddings
- **Progress Tracking**: Real-time embedding status with visual indicators
- **Manual Re-embedding**: Trigger embedding process manually for files
- **Status Indicators**: Visual feedback for embedding success/failure
- **Background Processing**: Non-blocking embedding operations

### 📊 Storage Organization

- **Folder Structure**: Hierarchical view of file organization
- **Expandable Folders**: Collapsible folder navigation
- **File Counts**: Visual indicators of folder contents
- **Path Management**: Organized storage paths for different databases
- **Shared Storage**: Collaborative file access across databases

### 🎛️ User Interface

- **Three-Panel Layout**: Form, file list, and detailed views
- **Responsive Design**: Adaptive interface for different screen sizes
- **Error Display**: Contextual error messages with auto-dismissal
- **Loading States**: Visual feedback during operations
- **Confirmation Dialogs**: Safety prompts for destructive operations

### 🚀 Performance Features

- **Lazy Loading**: Efficient data loading strategies
- **Progress Indicators**: Visual feedback for long-running operations
- **Optimistic Updates**: Immediate UI feedback for user actions
- **Error Recovery**: Graceful handling of failed operations
- **Memory Management**: Efficient state management and cleanup

## Architecture

### State Management

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
const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
const [fileContent, setFileContent] = useState<string | null>(null);

// UI State
const [loading, setLoading] = useState(false);
const [dragActive, setDragActive] = useState(false);
const [showFolderView, setShowFolderView] = useState(false);
const [showDatabaseView, setShowDatabaseView] = useState(false);

// Embedding State
const [embeddingProgress, setEmbeddingProgress] = useState<{
  [key: string]: string;
}>({});
const [errors, setErrors] = useState<ErrorState[]>([]);
```

### Data Flow

1. **Database Creation** → Form submission → AWS Amplify API → Database record creation
2. **File Upload** → AWS S3 Storage → Database file record → Auto-embedding trigger
3. **Vector Embedding** → AWS Lambda function → Vector database storage → Progress updates
4. **File Management** → Storage operations → Database updates → UI synchronization
5. **Real-time Updates** → AWS Amplify subscriptions → State updates → UI refresh

### Component Structure

```
DatabasesPage
├── Error Display Panel
├── Form Panel (Left 1/3)
│   ├── Database Form
│   ├── File Upload Zone
│   ├── Embedding Progress
│   └── Action Buttons
├── Main Content Panel (Right 2/3)
│   ├── Navigation Header
│   ├── Database List View
│   ├── Database Files View
│   ├── Folder Structure View
│   └── File Actions
└── File Viewer Modal
    ├── File Header
    ├── File Content Preview
    └── File Actions
```

## Usage

### Creating a New Database

1. Navigate to `/databases`
2. Fill in database name and description
3. Optionally upload files for initial RAG content
4. Click "Add Database"
5. Files automatically process for vector embeddings

### Managing Database Files

1. Click on a database to view its files
2. Use the "Add Files to Database" section to upload new files
3. Drag and drop files directly into the upload zone
4. Monitor embedding progress in real-time
5. Use file actions (view, download, re-embed, delete) as needed

### File Operations

```typescript
// File Upload
const handleFileUpload = async (files: FileList) => {
  // Upload to AWS S3
  const fileKey = `databases/shared/${Date.now()}-${file.name}`;
  await uploadData({ path: fileKey, data: file }).result;

  // Create database record
  await client.models.databaseFiles.create({
    databaseId: selectedDatabase.id,
    fileName: file.name,
    fileKey: fileKey,
    fileSize: file.size,
    fileType: file.type,
  });

  // Trigger embedding
  embedFile(fileKey, file.name, databaseId, databaseFileId);
};
```

### Vector Embedding Process

```typescript
// Embedding Process
const embedFile = async (
  fileKey: string,
  fileName: string,
  databaseId: string,
  databaseFileId: string
) => {
  setEmbeddingProgress((prev) => ({
    ...prev,
    [fileName]: "Embedding in progress...",
  }));

  await client.mutations.embedFiles({
    fileKey,
    fileName,
    databaseId,
    databaseFileId,
  });

  setEmbeddingProgress((prev) => ({
    ...prev,
    [fileName]: "Embedding completed",
  }));
};
```

## File Types and Support

### Supported Formats

- **Text Files**: `.txt`, `.md`
- **Data Files**: `.csv`, `.json`
- **Documents**: `.pdf`, `.doc`, `.docx`
- **Custom**: Additional formats via configuration

### File Preview

- **Text-based Files**: Full content preview in modal
- **Binary Files**: Metadata display with download option
- **Large Files**: Efficient handling with streaming support

### File Size Limits

- **Individual Files**: Configurable limits based on AWS S3 settings
- **Batch Uploads**: Multiple file support with progress tracking
- **Storage Optimization**: Automatic compression and optimization

## Error Handling

### Error Types

```typescript
interface ErrorState {
  message: string;
  type: "error" | "warning" | "info";
  timestamp: Date;
}
```

### Error Management

- **Auto-dismissal**: Errors automatically removed after 5 seconds
- **User Dismissal**: Manual error removal capability
- **Error Categorization**: Different visual styles for error types
- **Logging**: Comprehensive console logging for debugging

### Common Error Scenarios

- **Upload Failures**: Network issues, file size limits, permission errors
- **Database Errors**: Creation failures, update conflicts, deletion issues
- **Embedding Failures**: Processing errors, invalid file formats, service unavailable
- **Storage Issues**: AWS S3 connectivity, permission problems, quota exceeded

## API Integration

### Database Operations

```typescript
// Create Database
const { data: newDatabase } = await client.models.databases.create({
  name: formData.name.trim(),
  description: formData.description.trim(),
  isActive: true,
});

// Update Database
await client.models.databases.update({
  id: editingDatabase.id,
  name: formData.name.trim(),
  description: formData.description.trim(),
});

// Delete Database
await client.models.databases.delete({ id });
```

### File Operations

```typescript
// Upload File
await uploadData({
  path: fileKey,
  data: file,
}).result;

// Download File
const result = await downloadData({ path: file.fileKey }).result;
const blob = await result.body.blob();

// Delete File
await remove({ path: file.fileKey });
```

### Embedding Operations

```typescript
// Trigger Embedding
await client.mutations.embedFiles({
  fileKey: fileKey,
  fileName: fileName,
  databaseId: databaseId,
  databaseFileId: databaseFileId,
});
```

## Storage Organization

### File Paths

```
databases/
├── shared/
│   ├── [timestamp]-[filename]     # General uploaded files
│   └── [database-id]/
│       └── [filename]             # Database-specific files
└── [user-id]/                     # User-specific files (future)
    └── [database-id]/
        └── [filename]
```

### Folder Structure

- **Hierarchical Organization**: Nested folder support
- **Expandable Navigation**: Collapsible folder tree
- **File Counts**: Visual indicators of folder contents
- **Path Display**: Full path information for files

## Performance Optimization

### Loading Strategies

- **Lazy Loading**: Load database files only when needed
- **Pagination**: Handle large file lists efficiently
- **Caching**: Cache frequently accessed data
- **Debouncing**: Prevent excessive API calls

### Memory Management

- **File Cleanup**: Automatic cleanup of temporary files
- **State Optimization**: Efficient state updates and cleanup
- **Error Cleanup**: Automatic error state management
- **Progress Tracking**: Memory-efficient progress monitoring

### Network Optimization

- **Parallel Uploads**: Multiple file uploads simultaneously
- **Resumable Uploads**: Handle large file uploads efficiently
- **Compression**: Automatic file compression when beneficial
- **CDN Integration**: Optimized file delivery

## Security Features

### File Validation

- **File Type Checking**: Validate file extensions and MIME types
- **Size Limits**: Enforce maximum file size restrictions
- **Content Scanning**: Basic content validation for security
- **Path Sanitization**: Prevent directory traversal attacks

### Access Control

- **Database Permissions**: User-based database access control
- **File Permissions**: Secure file access and modification
- **Operation Logging**: Audit trail for all operations
- **Error Sanitization**: Prevent information leakage in errors

## Monitoring and Analytics

### Operation Tracking

- **Upload Metrics**: Track file upload success/failure rates
- **Embedding Metrics**: Monitor embedding processing times
- **Error Rates**: Track and analyze error patterns
- **Performance Metrics**: Monitor operation response times

### User Analytics

- **Database Usage**: Track database creation and usage patterns
- **File Access**: Monitor file view and download patterns
- **Feature Usage**: Analyze most/least used features
- **Error Analysis**: Identify common user pain points

## Integration Points

### Chat Integration

- **Database Selection**: Databases available in chat interface
- **RAG Queries**: Embedded content used for chat responses
- **Real-time Updates**: Database changes reflected in chat
- **Context Awareness**: Chat uses database content for responses

### Backend Services

- **AWS Amplify**: Database and file management
- **AWS S3**: File storage and retrieval
- **AWS Lambda**: Embedding processing and background tasks
- **Vector Database**: Embedding storage and retrieval

## Configuration

### Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# File Upload Configuration
MAX_FILE_SIZE=10MB
SUPPORTED_FORMATS=txt,md,csv,json,pdf,doc,docx

# Embedding Configuration
EMBEDDING_MODEL=text-embedding-ada-002
CHUNK_SIZE=1000
CHUNK_OVERLAP=100
```

### Amplify Configuration

```typescript
// amplify/storage/resource.ts
export const storage = defineStorage({
  name: "databases",
  access: (allow) => ({
    "databases/shared/*": [allow.authenticated.to(["read", "write", "delete"])],
    "databases/private/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],
  }),
});
```

## Testing

### Unit Tests

```typescript
// Database Operations
describe("Database Operations", () => {
  test("should create database successfully", async () => {
    // Test database creation
  });

  test("should handle file upload", async () => {
    // Test file upload functionality
  });

  test("should process embeddings", async () => {
    // Test embedding processing
  });
});
```

### Integration Tests

- **Full Workflow**: Test complete database creation to file embedding
- **Error Scenarios**: Test various error conditions and recovery
- **Performance**: Test with large files and multiple concurrent operations
- **Cross-component**: Test integration with chat and other components

## Troubleshooting

### Common Issues

#### Database Creation Fails

```bash
# Check AWS permissions
aws sts get-caller-identity

# Verify Amplify configuration
amplify status

# Check console for detailed errors
```

#### File Upload Issues

- **Network Problems**: Check internet connectivity and AWS region
- **File Size**: Verify file size within limits
- **File Type**: Ensure file type is supported
- **Permissions**: Check AWS S3 bucket permissions

#### Embedding Processing Failures

- **Service Availability**: Verify AWS Lambda function is deployed
- **File Format**: Ensure file format is supported for embedding
- **Processing Limits**: Check for service quotas and rate limits
- **Error Logs**: Review AWS CloudWatch logs for detailed errors

#### Performance Issues

- **Large Files**: Consider file size optimization
- **Concurrent Operations**: Reduce simultaneous operations
- **Memory Usage**: Monitor browser memory usage
- **Network Speed**: Check connection quality

### Debug Mode

```typescript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === "development";

if (DEBUG) {
  console.log("[DatabasesPage] Debug info:", {
    databases: databases.length,
    selectedDatabase: selectedDatabase?.name,
    uploadedFiles: uploadedFiles.length,
    embeddingProgress: Object.keys(embeddingProgress).length,
  });
}
```

## Future Enhancements

### Planned Features

- **Batch Operations**: Bulk file operations and database management
- **Advanced Search**: Full-text search across database files
- **File Versioning**: Track file changes and maintain history
- **Collaboration**: Multi-user database sharing and permissions
- **Import/Export**: Database backup and migration tools
- **Advanced Analytics**: Detailed usage and performance metrics

### Technical Improvements

- **Streaming Uploads**: Support for very large files
- **Progressive Web App**: Offline capabilities and better mobile support
- **Advanced Caching**: Intelligent caching strategies
- **Microservices**: Break down into smaller, focused services
- **GraphQL Subscriptions**: Real-time updates for all operations

## Dependencies

### Core Dependencies

- **Next.js**: React framework for the frontend
- **AWS Amplify**: Backend services and authentication
- **AWS S3**: File storage and management
- **React**: UI library with hooks for state management

### UI Dependencies

- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Sonner**: Toast notifications

### Utility Dependencies

- **Date-fns**: Date manipulation utilities
- **File-type**: File type detection
- **Mime-types**: MIME type handling

## Related Files

### Backend Configuration

- `amplify/data/resource.ts`: Database schema definitions
- `amplify/storage/resource.ts`: Storage configuration
- `amplify/functions/embed-files/`: Embedding processing function

### Frontend Components

- `src/components/ui/`: Reusable UI components
- `src/lib/types.ts`: TypeScript type definitions
- `src/hooks/`: Custom React hooks

### Configuration Files

- `amplify/backend.ts`: Main Amplify configuration
- `next.config.ts`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure AWS Amplify: `amplify configure`
4. Initialize Amplify: `amplify init`
5. Deploy backend: `amplify push`
6. Start development server: `npm run dev`

### Adding New Features

1. Update type definitions in `src/lib/types.ts`
2. Implement UI components in the databases page
3. Add backend functionality in Amplify functions
4. Update this README with new features
5. Add tests for new functionality

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comprehensive error handling
- Include detailed logging for debugging
- Write unit tests for new functionality

## License

This component is part of the AINP (AI-Native Platform) application. See the main project LICENSE file for details.
