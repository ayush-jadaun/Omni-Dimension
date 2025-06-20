/**
 * Root Application Layout
 * Current Time: 2025-06-20 07:33:02 UTC
 * Current User: ayush20244048
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import { APP_CONFIG } from "@/lib/config";
import "./globals.css"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.NAME,
    template: `%s | ${APP_CONFIG.NAME}`,
  },
  description: APP_CONFIG.DESCRIPTION,
  keywords: [
    "AI automation",
    "multi-agent system",
    "voice calling",
    "appointment booking",
    "restaurant reservations",
    "intelligent assistant",
    "workflow automation",
  ],
  authors: [{ name: "OmniDimension Team" }],
  creator: "ayush20244048",
  publisher: "OmniDimension",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    title: APP_CONFIG.NAME,
    description: APP_CONFIG.DESCRIPTION,
    url: "/",
    siteName: APP_CONFIG.NAME,
    locale: "en_US",
    type: "website",
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
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="build-time" content="2025-06-20 07:33:02" />
        <meta name="current-user" content="ayush20244048" />
        <meta name="app-version" content={APP_CONFIG.VERSION} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <div className="min-h-screen bg-background">{children}</div>

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              },
              success: {
                iconTheme: {
                  primary: "hsl(var(--primary))",
                  secondary: "hsl(var(--primary-foreground))",
                },
              },
              error: {
                iconTheme: {
                  primary: "hsl(var(--destructive))",
                  secondary: "hsl(var(--destructive-foreground))",
                },
              },
            }}
          />

          {/* System Info (Development) */}
          {APP_CONFIG.FEATURES.DEBUG && (
            <div className="fixed bottom-2 left-2 z-50 opacity-30 hover:opacity-100 transition-opacity">
              <div className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                v{APP_CONFIG.VERSION} | {APP_CONFIG.BUILD_TIME} |{" "}
                {APP_CONFIG.CURRENT_USER}
              </div>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
