"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
// Remove unused Select imports
import { useState } from "react";
import Link from "next/link";
import { Copy, Download, Eye, Zap, FileText, Layout } from "lucide-react";

// Metadata not needed for client components

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  previewHref: string;
}

const templates: Template[] = [
  {
    id: "blank",
    name: "Blank Page",
    description:
      "A clean, minimal page template with basic layout structure and navigation.",
    category: "Basic",
    features: [
      "Header with navigation",
      "Card layout",
      "Responsive design",
      "Clean structure",
    ],
    previewHref: "/templates/blank",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description:
      "Analytics dashboard with metrics cards, real-time data display, and status indicators.",
    category: "Interactive",
    features: [
      "Metrics cards",
      "Real-time data",
      "Status badges",
      "Responsive grid",
    ],
    previewHref: "/templates/dashboard",
  },
  {
    id: "form",
    name: "Form Page",
    description:
      "Contact or data entry form with validation, proper labels, and form handling.",
    category: "Interactive",
    features: [
      "Form inputs",
      "Validation ready",
      "State management",
      "Accessibility",
    ],
    previewHref: "/templates/form",
  },
  {
    id: "list",
    name: "List/Table",
    description:
      "Data table with search functionality, filtering, sorting, and action buttons.",
    category: "Data",
    features: [
      "Search & filter",
      "Data table",
      "Action buttons",
      "Empty states",
    ],
    previewHref: "/templates/list",
  },
];

// Template code generators
const generateTemplateCode = (
  templateId: string,
  pageName: string,
  title: string,
  description: string,
  customContent: string
) => {
  const componentName = pageName
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  const baseImports = `"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";`;

  const baseHeader = `      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">${title}</h1>
            <div className="flex items-center space-x-2">
              <Link href="/generated">
                <Button variant="outline" size="sm">Generated Pages</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="sm">Back to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>`;

  switch (templateId) {
    case "blank":
      return `${baseImports}

export default function ${componentName}() {
  return (
    <div className="min-h-screen bg-background text-foreground">
${baseHeader}
      
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>${title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>${description}</p>
            ${
              customContent
                ? `
            <div className="mt-6">
              ${customContent}
            </div>`
                : ""
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;

    case "dashboard":
      return `${baseImports}
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function ${componentName}() {
  const [metrics, setMetrics] = useState({
    users: 1234,
    revenue: 45678,
    growth: 12.5,
    active: 89
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
${baseHeader}
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$\{metrics.revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+{metrics.growth}% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.active}</div>
              <p className="text-xs text-muted-foreground">+5 since last hour</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant="default">Online</Badge>
              </div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>${title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>${description}</p>
              ${
                customContent
                  ? `
              <div className="mt-6">
                ${customContent}
              </div>`
                  : ""
              }
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}`;

    case "form":
      return `${baseImports}
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function ${componentName}() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert("Form submitted! Check console for data.");
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
${baseHeader}
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>${title}</CardTitle>
            <p className="text-muted-foreground">${description}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  placeholder="Enter your message"
                  rows={4}
                />
              </div>
              
              ${
                customContent
                  ? `
              <div className="mt-6 p-4 bg-muted rounded-lg">
                ${customContent}
              </div>`
                  : ""
              }
              
              <Button type="submit" className="w-full">
                Submit Form
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;

    case "list":
      return `${baseImports}
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ListItem {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  role: string;
}

export default function ${componentName}() {
  const [items, setItems] = useState<ListItem[]>([
    { id: 1, name: "John Doe", email: "john@example.com", status: "active", role: "Admin" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", status: "active", role: "User" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", status: "inactive", role: "User" },
    { id: 4, name: "Alice Brown", email: "alice@example.com", status: "active", role: "Editor" },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
${baseHeader}
      
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>${title}</CardTitle>
            <p className="text-muted-foreground">${description}</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Button 
                  variant={filter === "all" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
                <Button 
                  variant={filter === "active" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilter("active")}
                >
                  Active
                </Button>
                <Button 
                  variant={filter === "inactive" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilter("inactive")}
                >
                  Inactive
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Email</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Role</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-4 align-middle">{item.name}</td>
                        <td className="p-4 align-middle text-muted-foreground">{item.email}</td>
                        <td className="p-4 align-middle">{item.role}</td>
                        <td className="p-4 align-middle">
                          <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm">Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No items found matching your criteria.
              </div>
            )}

            ${
              customContent
                ? `
            <div className="mt-6 p-4 bg-muted rounded-lg">
              ${customContent}
            </div>`
                : ""
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;

    default:
      return generateTemplateCode(
        "blank",
        pageName,
        title,
        description,
        customContent
      );
  }
};

export default function PageGenerator() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formData, setFormData] = useState({
    pageName: "",
    title: "",
    description: "",
    customContent: "",
  });
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    success: boolean;
    message: string;
    path?: string;
  } | null>(null);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template && !formData.title) {
      setFormData((prev) => ({
        ...prev,
        title: template.name,
        description: template.description,
      }));
    }
    updatePreview(templateId, formData);
  };

  const handleFormChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    if (selectedTemplate) {
      updatePreview(selectedTemplate, newFormData);
    }
  };

  const updatePreview = (templateId: string, data: typeof formData) => {
    if (!templateId || !data.pageName) return;

    const code = generateTemplateCode(
      templateId,
      data.pageName,
      data.title || "Generated Page",
      data.description || "A generated page from template",
      data.customContent
    );
    setGeneratedCode(code);
  };

  const generatePage = async () => {
    if (!selectedTemplate || !formData.pageName || !generatedCode) {
      alert("Please fill in all required fields and select a template");
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const response = await fetch("/api/generate-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.pageName,
          path: `/${formData.pageName}`,
          code: generatedCode,
        }),
      });

      const result = await response.json();
      setGenerationResult(result);

      if (result.success) {
        // Store in localStorage for the generated pages list
        const existingPages = JSON.parse(
          localStorage.getItem("generatedPages") || "[]"
        );
        const newPage = {
          name: formData.pageName,
          title: formData.title,
          template: selectedTemplate,
          path: result.path,
          createdAt: new Date().toISOString(),
        };
        existingPages.push(newPage);
        localStorage.setItem("generatedPages", JSON.stringify(existingPages));
      }
    } catch {
      setGenerationResult({
        success: false,
        message: "Failed to generate page. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    alert("Code copied to clipboard!");
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formData.pageName || "page"}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Template data for reference (unused in current implementation)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Page Generator</h1>
              <p className="text-muted-foreground">
                Create pages from templates
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/templates">
                <Button variant="outline" size="sm">
                  <Layout className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </Link>
              <Link href="/generated">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Generated
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="sm">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Template</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose a template to start with
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{template.name}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{template.category}</Badge>
                          <Link href={template.previewHref}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.features.map((feature, index) => (
                          <span
                            key={index}
                            className="text-xs bg-muted px-2 py-1 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle>Page Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure your new page
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pageName">Page Name *</Label>
                    <Input
                      id="pageName"
                      placeholder="my-awesome-page"
                      value={formData.pageName}
                      onChange={(e) =>
                        handleFormChange("pageName", e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for the URL and file name. Use lowercase with
                      hyphens.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Page Title</Label>
                    <Input
                      id="title"
                      placeholder="My Awesome Page"
                      value={formData.title}
                      onChange={(e) =>
                        handleFormChange("title", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="A brief description of your page..."
                      value={formData.description}
                      onChange={(e) =>
                        handleFormChange("description", e.target.value)
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customContent">Custom Content</Label>
                    <Textarea
                      id="customContent"
                      placeholder="Add any custom JSX content here..."
                      value={formData.customContent}
                      onChange={(e) =>
                        handleFormChange("customContent", e.target.value)
                      }
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Add custom JSX content to be inserted into the
                      template.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={generatePage}
                      disabled={!formData.pageName || isGenerating}
                      className="flex-1"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Generate Page
                        </>
                      )}
                    </Button>
                  </div>

                  {generationResult && (
                    <div
                      className={`p-4 rounded-lg ${
                        generationResult.success
                          ? "bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800"
                          : "bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          generationResult.success
                            ? "text-green-800 dark:text-green-200"
                            : "text-red-800 dark:text-red-200"
                        }`}
                      >
                        {generationResult.message}
                      </p>
                      {generationResult.success && generationResult.path && (
                        <div className="mt-2 flex gap-2">
                          <Link href={generationResult.path}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              View Page
                            </Button>
                          </Link>
                          <Link href="/generated">
                            <Button size="sm" variant="outline">
                              <FileText className="h-3 w-3 mr-1" />
                              All Generated
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Code Preview Panel */}
          <div className="space-y-6">
            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Code Preview</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Generated React component code
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyCode}
                        disabled={!generatedCode}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadCode}
                        disabled={!generatedCode}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] w-full">
                    <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                      <code>
                        {generatedCode ||
                          "Select a template and enter a page name to see the preview..."}
                      </code>
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {!selectedTemplate && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Layout className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Select a Template
                  </h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Choose a template from the left panel to start generating
                    your page.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
