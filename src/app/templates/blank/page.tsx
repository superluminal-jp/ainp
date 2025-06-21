"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Metadata not needed for client components

export default function BlankTemplate() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="Blank Page Template"
        description="Clean, minimal page template with basic layout structure"
      >
        <Link href="/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </PageHeader>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Blank Page Template</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              This is a clean, minimal page template with basic layout structure
              and navigation. It provides a starting point for creating new
              pages with consistent styling.
            </p>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Features:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="w-1 h-1 bg-current rounded-full mr-3"></span>
                  Header with navigation
                </li>
                <li className="flex items-center">
                  <span className="w-1 h-1 bg-current rounded-full mr-3"></span>
                  Card-based layout
                </li>
                <li className="flex items-center">
                  <span className="w-1 h-1 bg-current rounded-full mr-3"></span>
                  Responsive design
                </li>
                <li className="flex items-center">
                  <span className="w-1 h-1 bg-current rounded-full mr-3"></span>
                  Clean structure
                </li>
              </ul>
            </div>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Custom Content Area</h4>
              <p className="text-sm text-muted-foreground">
                This placeholder area would be replaced with custom content when
                generating a page from this template. You can add any
                components, text, or interactive elements here based on your
                specific needs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
