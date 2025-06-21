"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { FileText, Plus, Home, Eye } from "lucide-react";
import Link from "next/link";

// Metadata not needed for client components

interface GeneratedPage {
  id: string;
  name: string;
  path: string;
  template: string;
  customCode: string;
  createdAt: Date;
  description: string;
}

const templateNames: { [key: string]: string } = {
  blank: "Blank Page",
  dashboard: "Dashboard",
  form: "Form Page",
  list: "List/Table Page",
};

export default function GeneratedPagesIndex() {
  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);

  useEffect(() => {
    // Load generated pages from localStorage
    const saved = localStorage.getItem("generatedPages");
    if (saved) {
      const pages = JSON.parse(saved);
      // Convert date strings back to Date objects
      const pagesWithDates = pages.map(
        (page: GeneratedPage & { createdAt: string }) => ({
          ...page,
          createdAt: new Date(page.createdAt),
        })
      );
      setGeneratedPages(pagesWithDates);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Generated Pages</h1>
              <p className="text-muted-foreground">
                All pages created with the page generator
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/generator">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Page
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {generatedPages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">No pages generated yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the page generator to create your first page
                  </p>
                </div>
                <Link href="/generator">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Page
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {generatedPages.length} Generated Page
                {generatedPages.length !== 1 ? "s" : ""}
              </h2>
              <Badge variant="outline">Total: {generatedPages.length}</Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {generatedPages.map((page) => (
                <Card
                  key={page.id}
                  className="group hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{page.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline">
                            {templateNames[page.template] || page.template}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {page.createdAt.toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {page.description || "No description provided"}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Path: {page.path}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={page.path}>
                          <Button size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats Section */}
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {generatedPages.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Pages</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {new Set(generatedPages.map((p) => p.template)).size}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Templates Used
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {
                      generatedPages.filter(
                        (p) =>
                          new Date().getTime() - p.createdAt.getTime() <
                          24 * 60 * 60 * 1000
                      ).length
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Created Today</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {
                      generatedPages.filter(
                        (p) =>
                          new Date().getTime() - p.createdAt.getTime() <
                          7 * 24 * 60 * 60 * 1000
                      ).length
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
