"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Metadata not needed for client components

export default function DashboardTemplate() {
  const [metrics] = useState({
    users: 1234,
    revenue: 45678,
    growth: 12.5,
    active: 89,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="Dashboard Template"
        description="Analytics dashboard with interactive metrics cards"
      >
        <Link href="/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </PageHeader>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.users.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${metrics.revenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +{metrics.growth}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.active}</div>
              <p className="text-xs text-muted-foreground">
                +5 since last hour
              </p>
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
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Template Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                This is an analytics dashboard template with interactive metrics
                cards. It includes:
              </p>
              <ul className="mt-4 space-y-2 list-disc list-inside">
                <li>Responsive grid layout for metrics cards</li>
                <li>Real-time data display with formatting</li>
                <li>Status indicators and badges</li>
                <li>Percentage changes and trends</li>
                <li>Professional dashboard styling</li>
              </ul>
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Custom content placeholder - additional dashboard widgets,
                  charts, or analytics would be inserted here when generating a
                  page from this template.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
