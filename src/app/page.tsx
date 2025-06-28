"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import {
  MessageSquare,
  Database,
  Wrench,
  Zap,
  ArrowRight,
  Bot,
  Settings,
  FileText,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useSimpleHeader(
    "AI Neural Platform",
    "Your comprehensive AI assistant platform"
  );

  const features = [
    {
      icon: MessageSquare,
      title: "AI Chat",
      description:
        "Advanced conversational AI with context awareness and memory",
    },
    {
      icon: Database,
      title: "Knowledge Bases",
      description:
        "Connect multiple databases and knowledge sources for enhanced responses",
    },
    {
      icon: Wrench,
      title: "AI Tools",
      description:
        "Powerful utilities including web browsing, code execution, and file processing",
    },
    {
      icon: FileText,
      title: "Custom Prompts",
      description:
        "Create and manage personalized AI prompts for specific use cases",
    },
    {
      icon: Zap,
      title: "Templates",
      description: "Pre-configured setups for common workflows and scenarios",
    },
    {
      icon: Sparkles,
      title: "Page Generation",
      description:
        "Automatically generate new pages and components with AI assistance",
    },
  ];

  return (
    <>
      <AppHeader />
      <div className="flex-1 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-primary/10 rounded-full">
                <Bot className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-6">
              Welcome to AINP
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Your comprehensive AI assistant platform with advanced
              conversation capabilities, knowledge management, and intelligent
              automation tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => router.push("/chat")}
                className="text-lg px-8"
              >
                Start Chatting
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/templates")}
                className="text-lg px-8"
              >
                Browse Templates
              </Button>
            </div>
          </div>

          {/* Features Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="group hover:shadow-lg transition-all duration-300 border-muted hover:border-primary/50"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                      </div>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Platform Statistics */}
          <div className="bg-muted/50 rounded-lg p-8 text-center mb-16">
            <h3 className="text-2xl font-semibold mb-6">
              Platform Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">∞</div>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">5+</div>
                <p className="text-sm text-muted-foreground">Database Types</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">10+</div>
                <p className="text-sm text-muted-foreground">AI Tools</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">∞</div>
                <p className="text-sm text-muted-foreground">
                  Custom Templates
                </p>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-4">
              Ready to get started?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Use the sidebar to navigate between different sections of the
              platform. Start with a chat conversation, or explore our
              management tools to configure your AI assistant exactly how you
              want it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => router.push("/chat")}
                className="text-lg px-12"
              >
                Launch Chat Interface
                <MessageSquare className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/prompts")}
                className="text-lg px-12"
              >
                Manage Prompts
                <Settings className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
