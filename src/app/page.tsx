"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import { ReadmeDisplay } from "@/components/readme-display";
import { MessageSquare, Database, Wrench, FileText, Zap } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useSimpleHeader("AINP", "AI Neural Platform");

  const quickActions = [
    {
      icon: MessageSquare,
      title: "Chat",
      path: "/chat",
    },
    {
      icon: FileText,
      title: "Prompts",
      path: "/prompts",
    },
    {
      icon: Database,
      title: "Databases",
      path: "/databases",
    },
    {
      icon: Wrench,
      title: "Tools",
      path: "/tools",
    },
    {
      icon: Zap,
      title: "Templates",
      path: "/templates",
    },
  ];

  return (
    <>
      <AppHeader />
      <div className="flex-1 flex flex-col items-center justify-start bg-background p-6 space-y-8">
        <div className="text-center space-y-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to AINP
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-2xl">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.path}
                  variant="outline"
                  onClick={() => router.push(action.path)}
                  className="h-20 flex-col gap-2 hover:bg-primary/5"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{action.title}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-4xl">
          <ReadmeDisplay />
        </div>
      </div>
    </>
  );
}
