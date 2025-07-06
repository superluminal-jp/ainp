"use client";

import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

import { useAuthenticator } from "@aws-amplify/ui-react";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare,
  Database,
  Wrench,
  FileText,
  Zap,
  Home,
} from "lucide-react";

// Navigation items for the sidebar
const navigationItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    description: "Platform overview and quick access",
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
    description: "AI conversation interface",
  },
  {
    title: "Prompts",
    url: "/prompts",
    icon: FileText,
    description: "Manage custom AI prompts",
  },
  {
    title: "Databases",
    url: "/databases",
    icon: Database,
    description: "Configure knowledge bases",
  },
  {
    title: "Tools",
    url: "/tools",
    icon: Wrench,
    description: "AI tools and utilities",
  },
  {
    title: "Templates",
    url: "/templates",
    icon: Zap,
    description: "Pre-built configurations",
  },
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut, user } = useAuthenticator((context) => [context.user]);

  const handleNavigation = (url: string) => {
    router.push(url);
  };

  return (
    <TooltipProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="border-b">
          <div className="p-4">
            <h1 className="font-semibold text-lg">AINP</h1>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <ScrollArea className="flex-1">
            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2 space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.url;

                    return (
                      <Button
                        key={item.title}
                        variant={isActive ? "secondary" : "ghost"}
                        className={`w-full justify-start text-sm ${
                          isActive
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => handleNavigation(item.url)}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{item.title}</span>
                        </div>
                        {isActive && (
                          <div className="ml-auto h-2 w-2 bg-primary rounded-full" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Quick Actions - Only show on non-home pages */}
            {pathname !== "/" && (
              <SidebarGroup>
                <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-2 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => handleNavigation("/chat")}
                    >
                      <MessageSquare className="h-3 w-3 mr-2" />
                      New Chat
                    </Button>

                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Current Page Info */}
            {pathname !== "/" && (
              <SidebarGroup>
                <SidebarGroupLabel>Current Page</SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-2">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {(() => {
                          const currentItem = navigationItems.find(
                            (item) => item.url === pathname
                          );
                          if (currentItem) {
                            const Icon = currentItem.icon;
                            return (
                              <>
                                <Icon className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">
                                  {currentItem.title}
                                </span>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {navigationItems.find((item) => item.url === pathname)
                          ?.description || "Current page"}
                      </p>
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </ScrollArea>
        </SidebarContent>

        <SidebarFooter>
          {/* User Info and Sign Out */}
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2 py-2 border-t">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.signInDetails?.loginId} />
                          <AvatarFallback>
                            {user?.username?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium truncate max-w-[120px]">
                            {user?.username || "User"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {user?.signInDetails?.loginId || "user@example.com"}
                          </span>
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleNavigation("/profile")}
                    >
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleNavigation("/settings")}
                    >
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
