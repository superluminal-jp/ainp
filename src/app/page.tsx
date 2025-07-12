"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import {
  MessageCircle,
  Database,
  FileText,
  Wrench,
  Layers,
  ArrowRight,
  Target,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  useSimpleHeader(
    "AINP",
    "AI Neural Platform - Intelligent Business Process Optimization"
  );

  return (
    <>
      <AppHeader />
      <div className="flex-1 flex flex-col bg-background">
        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          {/* Top Layer - Simple Chat */}
          <div className="mb-12">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Simple Chat
              </h2>
              <p className="text-muted-foreground">
                Direct AI interaction without additional layers
              </p>
            </div>
            <Card className="max-w-2xl mx-auto border-2">
              <CardHeader>
                <div className="flex items-center justify-center gap-4">
                  <MessageCircle className="h-8 w-8 text-foreground" />
                  <div>
                    <CardTitle className="text-xl">Chat with LLM</CardTitle>
                    <CardDescription>
                      Pure AI generation for creative and exploratory tasks
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/chat">
                    Start Chatting <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Middle Layer - Enhanced AI Components */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Enhanced AI Components
              </h2>
              <p className="text-muted-foreground">
                Add structure, knowledge, and actions to your AI
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* System Prompt */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-lg">
                      1
                    </div>
                  </div>
                  <CardTitle className="text-center">
                    System Prompt Control
                  </CardTitle>
                  <CardDescription className="text-center">
                    Structured output with consistent persona and format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/prompts">
                      <FileText className="mr-2 h-4 w-4" />
                      View Prompts
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Database/RAG */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-lg">
                      2
                    </div>
                  </div>
                  <CardTitle className="text-center">Knowledge Base</CardTitle>
                  <CardDescription className="text-center">
                    Fresh, verifiable knowledge with citations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/databases">
                      <Database className="mr-2 h-4 w-4" />
                      Manage Data
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Tools */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-lg">
                      3
                    </div>
                  </div>
                  <CardTitle className="text-center">
                    Tool Integration
                  </CardTitle>
                  <CardDescription className="text-center">
                    Execute actions on external systems and APIs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/tools">
                      <Wrench className="mr-2 h-4 w-4" />
                      Use Tools
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Layer - Templates */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Complete Solutions
              </h2>
              <p className="text-muted-foreground">
                Pre-built templates that combine multiple AI components
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Layers className="h-8 w-8 text-foreground" />
                    <div>
                      <CardTitle>Templates</CardTitle>
                      <CardDescription>
                        Ready-to-use business workflows
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Combines system prompts, knowledge bases, and tools into
                    complete business solutions
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/templates">
                      <Layers className="mr-2 h-4 w-4" />
                      Browse Templates
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Target className="h-8 w-8 text-foreground" />
                    <div>
                      <CardTitle>Use Case Builder</CardTitle>
                      <CardDescription>
                        Build your custom solution
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Analyze your needs and create the perfect combination of AI
                    components
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/use-case-builder">
                      <Target className="mr-2 h-4 w-4" />
                      Build Use Case
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
