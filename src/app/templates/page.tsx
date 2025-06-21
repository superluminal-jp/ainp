"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Home, Zap } from "lucide-react";

// Metadata not needed for client components

const templates = [
  {
    id: "blank",
    name: "Blank Page",
    description:
      "A clean, minimal page template with basic layout structure and navigation.",
    category: "Basic",
    href: "/templates/blank",
    features: [
      "Header with navigation",
      "Card layout",
      "Responsive design",
      "Clean structure",
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description:
      "Analytics dashboard with metrics cards, real-time data display, and status indicators.",
    category: "Interactive",
    href: "/templates/dashboard",
    features: [
      "Metrics cards",
      "Real-time data",
      "Status badges",
      "Responsive grid",
    ],
  },
  {
    id: "form",
    name: "Form Page",
    description:
      "Contact or data entry form with validation, proper labels, and form handling.",
    category: "Interactive",
    href: "/templates/form",
    features: [
      "Form inputs",
      "Validation ready",
      "State management",
      "Accessibility",
    ],
  },
  {
    id: "list",
    name: "List/Table",
    description:
      "Data table with search functionality, filtering, sorting, and action buttons.",
    category: "Data",
    href: "/templates/list",
    features: [
      "Search & filter",
      "Data table",
      "Action buttons",
      "Empty states",
    ],
  },
];

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Page Templates</h1>
              <p className="text-muted-foreground">
                Browse and preview available page templates
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/generator">
                <Button variant="outline" size="sm">
                  <Zap className="h-4 w-4 mr-2" />
                  Generator
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="group hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Features:</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {template.features.map((feature, index) => (
                        <div
                          key={index}
                          className="text-xs text-muted-foreground flex items-center"
                        >
                          <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={template.href} className="flex-1">
                      <Button variant="default" size="sm" className="w-full">
                        Preview Template
                      </Button>
                    </Link>
                    <Link href="/generator" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        Use in Generator
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>About Page Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                These templates serve as both preview pages and base structures
                for the page generator. You can preview each template to see how
                it looks and works, then use the generator to create customized
                versions with your own content and configuration.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Preview</h4>
                  <p className="text-xs text-muted-foreground">
                    Click &quot;Preview Template&quot; to see the template in
                    action with sample data and interactions.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Generate</h4>
                  <p className="text-xs text-muted-foreground">
                    Use the Page Generator to customize templates with your own
                    content, titles, and configurations.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Customize</h4>
                  <p className="text-xs text-muted-foreground">
                    Generated pages include placeholder areas where you can add
                    custom content and functionality.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Link href="/generator">
                  <Button>Start Creating Pages</Button>
                </Link>
                <Link href="/generated">
                  <Button variant="outline">View Generated Pages</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
