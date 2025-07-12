#!/bin/bash

# Deploy script for Amplify Gen 2 with Docker support
# This script helps test the deployment with the new Docker configuration

echo "🚀 Starting Amplify Gen 2 deployment with Docker support..."

# Check if Docker is running (for local development)
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running locally. This is okay for Amplify cloud deployment."
else
    echo "✅ Docker is running locally."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Note: Amplify directory has no dependencies to install

# Build the custom Docker image locally for testing (optional)
echo "🐳 Building custom Docker image for testing..."
docker build -t amplify-docker-build -f Dockerfile.amplify . || {
    echo "❌ Failed to build custom Docker image. This may be expected in CI/CD."
}

# Deploy to Amplify
echo "🚀 Deploying to Amplify..."
npx ampx pipeline-deploy --branch main --app-id ${AWS_APP_ID:-"your-app-id"}

echo "✅ Deployment script completed!"
echo "ℹ️  Check the Amplify console for deployment status." 