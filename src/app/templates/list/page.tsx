"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";

// Metadata not needed for client components

interface ListItem {
  id: string;
  name: string;
  status: "active" | "inactive" | "pending";
  category: string;
  createdAt: Date;
  description: string;
}

const sampleData: ListItem[] = [
  {
    id: "1",
    name: "Sample Item 1",
    status: "active",
    category: "Category A",
    createdAt: new Date("2024-01-15"),
    description: "This is a sample item for demonstration",
  },
  {
    id: "2",
    name: "Sample Item 2",
    status: "pending",
    category: "Category B",
    createdAt: new Date("2024-01-20"),
    description: "Another sample item with different status",
  },
  {
    id: "3",
    name: "Sample Item 3",
    status: "inactive",
    category: "Category A",
    createdAt: new Date("2024-01-25"),
    description: "Inactive sample item for testing",
  },
  {
    id: "4",
    name: "Sample Item 4",
    status: "active",
    category: "Category C",
    createdAt: new Date("2024-02-01"),
    description: "Another active item in different category",
  },
];

export default function ListTemplate() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredData = sampleData.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      pending: "secondary",
      inactive: "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="List/Table Template"
        description="Data table with search, filtering, sorting, and actions"
      >
        <Link href="/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </PageHeader>

      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Data Management</CardTitle>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Category A">Category A</SelectItem>
                    <SelectItem value="Category B">Category B</SelectItem>
                    <SelectItem value="Category C">Category C</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items ({filteredData.length})</CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {filteredData.length} of {sampleData.length} items
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-4">
                  <Search className="h-12 w-12 mx-auto opacity-50" />
                </div>
                <p>No items found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredData.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{item.name}</h3>
                        {getStatusBadge(item.status)}
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {item.description}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Created: {item.createdAt.toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>List Template Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="font-medium text-sm mb-2">Search & Filter</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Real-time search</li>
                  <li>• Status filtering</li>
                  <li>• Category filtering</li>
                  <li>• Advanced filters</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Data Display</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Responsive cards</li>
                  <li>• Status badges</li>
                  <li>• Date formatting</li>
                  <li>• Empty states</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Actions</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• View details</li>
                  <li>• Edit items</li>
                  <li>• Delete items</li>
                  <li>• Bulk operations</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Custom data loading, sorting, pagination, and CRUD operations
                would be implemented here when generating a page from this
                template. This includes API integration and state management for
                real data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
