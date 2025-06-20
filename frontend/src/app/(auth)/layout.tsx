/**
 * Authentication Layout
 * Current Time: 2025-06-20 07:33:02 UTC
 * Current User: ayush20244048
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/config";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect authenticated users away from auth pages
      router.replace(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render auth pages if user is authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-omnidimension-600 via-omnidimension-700 to-omnidimension-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/10 animate-pulse-slow"></div>
          <div
            className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/5 animate-pulse-slow"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/15 animate-pulse-slow"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center">
          <div className="space-y-6 max-w-md">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">OmniDimension</h1>
              <p className="text-xl opacity-90">
                Multi-Agent Automation System
              </p>
            </div>

            <div className="space-y-4 text-omnidimension-100">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-omnidimension-300 rounded-full"></div>
                <span>🤖 Intelligent AI Agents</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-omnidimension-300 rounded-full"></div>
                <span>📞 Automated Voice Calling</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-omnidimension-300 rounded-full"></div>
                <span>📅 Smart Appointment Booking</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-omnidimension-300 rounded-full"></div>
                <span>🍽️ Restaurant Reservations</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-omnidimension-300 rounded-full"></div>
                <span>🔄 Workflow Orchestration</span>
              </div>
            </div>

            <div className="pt-8 border-t border-white/20">
              <p className="text-sm opacity-70">
                Built for ayush20244048
                <br />
                Version 1.0.0 | 2025-06-20 07:33:02
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">{children}</div>
      </div>
    </div>
  );
}
