# AINP - AI Neural Platform

A comprehensive AI-native platform built with Next.js and AWS Amplify, featuring advanced conversational AI, knowledge management, custom tools, and intelligent automation.

## ✨ Features

### 🎯 Use Case Builder

- **Requirements Gathering**: Systematic business process analysis
- **Decision Tree**: AI layer selection based on task requirements
- **Business Flow Mapping**: Visual process optimization
- **Strategic Planning**: Structured approach to AI implementation
- **Best Practices**: Proven methodologies for AI adoption

### 🤖 AI Chat

- **Multi-Model Support**: Claude 4 Sonnet, Amazon Nova Pro, and more
- **RAG Integration**: Query your knowledge bases in real-time
- **Custom Tools**: Execute Python functions during conversations
- **Structured Output**: JSON schema support for formatted responses
- **File Attachments**: Multimodal inputs with document processing
- **Real-time Sync**: AWS Amplify subscriptions for live updates

### 📚 Knowledge Bases

- **File Upload**: Drag-and-drop support for various file types
- **Vector Embeddings**: Automatic processing with AWS Bedrock
- **Smart Search**: Semantic search across your documents
- **Hierarchical Structure**: Organized folder management
- **Real-time Processing**: Live progress tracking for embeddings

### 🔧 Custom Tools

- **Python Lambda Functions**: AI-generated serverless tools
- **Input Schema Designer**: Visual schema builder
- **Code Templates**: Pre-built function examples
- **AWS Integration**: Seamless Lambda deployment
- **Security Validation**: Code review and error handling

### 💬 System Prompts

- **Prompt Engineering**: AI-assisted prompt creation
- **Template Library**: Reusable prompt configurations
- **Active Management**: Enable/disable prompts dynamically
- **Smart Suggestions**: Auto-optimization recommendations

### ⚡ Templates

- **Pre-configured Setups**: Common workflow templates
- **Quick Start**: Instant deployment of AI configurations
- **Custom Combinations**: Mix and match features

## 🏗️ Architecture

### Frontend

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component library
- **Real-time Updates**: WebSocket subscriptions

### Backend

- **AWS Amplify**: Serverless backend infrastructure
- **AWS Bedrock**: AI model access and embeddings
- **AWS Lambda**: Serverless function execution
- **AWS S3**: File storage and management
- **AWS Cognito**: User authentication and authorization

### AI Services

- **Amazon Bedrock**: Claude 4 Sonnet, Nova Pro models
- **Vector Embeddings**: Knowledge base search
- **Function Calling**: Custom tool execution
- **Structured Output**: JSON schema validation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS Account with Amplify access
- AWS CLI configured

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ainp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up AWS Amplify**

   ```bash
   npm install -g @aws-amplify/cli
   amplify configure
   amplify init
   ```

4. **Deploy backend resources**

   ```bash
   amplify push
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Getting Started

1. **Sign up/Sign in** using AWS Cognito authentication
2. **Use the Use Case Builder** to define your AI implementation strategy
3. **Create a System Prompt** to define your AI assistant's behavior
4. **Upload Knowledge Base** files for RAG-powered conversations
5. **Build Custom Tools** for specialized functions
6. **Start Chatting** with your personalized AI assistant

### Use Case Builder

- Define business requirements systematically
- Follow the decision tree for optimal AI layer selection
- Map current business processes and identify improvements
- Plan strategic AI implementation with proven methodologies

### Chat Interface

- Select AI models (Claude 4 Sonnet, Nova Pro)
- Choose active system prompts
- Enable relevant databases for context
- Attach files for document analysis
- Use structured output for formatted responses

### Knowledge Management

- Upload documents (PDF, DOC, TXT, MD, etc.)
- Organize files in hierarchical folders
- Monitor embedding processing progress
- Search and preview documents

### Tool Development

- Design input schemas visually
- Generate Python code with AI assistance
- Test and validate functions
- Deploy to AWS Lambda automatically

## 🔧 Configuration

### Environment Variables

```env
NEXT_PUBLIC_AMPLIFY_REGION=us-east-1
NEXT_PUBLIC_AMPLIFY_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_AMPLIFY_USER_POOL_CLIENT_ID=your-client-id
```

### AWS Services Required

- **Amplify**: Backend infrastructure
- **Bedrock**: AI model access
- **Lambda**: Function execution
- **S3**: File storage
- **Cognito**: Authentication

## 📁 Project Structure

```
ainp/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── chat/              # AI chat interface
│   │   ├── databases/         # Knowledge base management
│   │   ├── prompts/           # System prompt editor
│   │   ├── tools/             # Custom tool builder
│   │   ├── templates/         # Template library
│   │   └── use-case-builder/  # Requirements gathering tool
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   └── app-sidebar.tsx   # Main navigation
│   └── lib/                   # Utilities and types
├── amplify/                   # AWS Amplify configuration
│   ├── auth/                 # Cognito authentication
│   ├── data/                 # GraphQL schema and resolvers
│   ├── functions/            # Lambda functions
│   └── storage/              # S3 bucket configuration
└── public/                    # Static assets
```

## 📚 Documentation

### Feature Documentation

Each major feature has detailed documentation:

- **[Chat System](src/app/chat/README.md)**: Comprehensive AI chat interface guide
- **[System Prompts](src/app/prompts/README.md)**: Prompt engineering and management
- **[Knowledge Bases](src/app/databases/README.md)**: File management and RAG implementation
- **[Custom Tools](src/app/tools/README.md)**: Python Lambda function development

### Getting Help

- Check the feature-specific README files for detailed information
- Review the AWS Amplify documentation for backend configuration
- Consult the Next.js documentation for frontend development

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Adding New Features

1. Create React components in `src/components/`
2. Add pages in `src/app/`
3. Update AWS resources in `amplify/`
4. Deploy changes with `amplify push`

## 🔐 Security

- **Authentication**: AWS Cognito with MFA support
- **Authorization**: Role-based access control
- **Code Validation**: Python function security checks
- **Data Encryption**: In-transit and at-rest encryption
- **API Security**: Rate limiting and input validation

## 🚀 Deployment

### AWS Amplify Hosting

```bash
amplify add hosting
amplify publish
```

### Custom Domain

```bash
amplify add hosting
# Configure custom domain in AWS Console
```

## 📊 Performance

- **Lazy Loading**: Component-based code splitting
- **Caching**: AWS CloudFront CDN
- **Optimization**: Next.js automatic optimizations
- **Monitoring**: AWS CloudWatch integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
