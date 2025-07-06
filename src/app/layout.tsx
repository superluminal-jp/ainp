import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AmplifyProvider from "@/components/AmplifyProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { HeaderProvider } from "@/components/header-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AINP - AI is Not Perfect",
  description:
    "A comprehensive AI assistant platform with custom prompts, databases, tools, and page generation capabilities.",
  keywords: [
    "AI",
    "Assistant",
    "Platform",
    "Chat",
    "Tools",
    "Database",

    "Machine Learning",
    "Natural Language Processing",
    "Automation",
  ],
  authors: [{ name: "AINP Team" }],
  creator: "AINP Team",
  publisher: "AINP",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://ainp.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AINP - AI is Not Perfect",
    description:
      "A comprehensive AI assistant platform with custom prompts, databases, tools, and page generation capabilities.",
    url: "https://ainp.app",
    siteName: "AINP",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AINP - AI is Not Perfect",
    description:
      "A comprehensive AI assistant platform with custom prompts, databases, tools, and page generation capabilities.",
    creator: "@ainp_platform",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* <link rel="manifest" href="/manifest.json" /> */}
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="dark light" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans min-h-screen bg-background text-foreground selection:bg-primary/20`}
        suppressHydrationWarning
      >
        <TooltipProvider delayDuration={300}>
          <AmplifyProvider>
            <HeaderProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <div className="relative flex min-h-screen flex-col">
                    <div className="flex-1">{children}</div>
                  </div>
                </SidebarInset>
              </SidebarProvider>
            </HeaderProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                },
              }}
              closeButton
              richColors
              expand
            />
          </AmplifyProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
