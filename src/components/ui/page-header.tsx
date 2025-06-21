import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  showBackToHome?: boolean;
}

export function PageHeader({
  title,
  description,
  children,
  showBackToHome = true,
}: PageHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {children}
            {showBackToHome && (
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
