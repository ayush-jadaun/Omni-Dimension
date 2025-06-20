/**
 * Loading Screen Component
 * Current Time: 2025-06-20 07:35:19 UTC
 * Current User: ayush20244048
 */

import React from "react";
import { clsx } from "clsx";

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  progress?: number;
  className?: string;
}

export function LoadingScreen({
  message = "Loading OmniDimension...",
  submessage,
  progress,
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={clsx(
        "min-h-screen flex items-center justify-center bg-gradient-to-br from-omnidimension-50 via-background to-omnidimension-50/50",
        className
      )}
    >
      <div className="text-center space-y-6 max-w-md px-6">
        {/* Logo/Brand */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-omnidimension-500 to-omnidimension-600 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="text-white text-2xl font-bold">OD</div>
          </div>

          <div>
            <h1 className="text-3xl font-bold gradient-text">OmniDimension</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Multi-Agent Automation System
            </p>
          </div>
        </div>

        {/* Loading Animation */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-omnidimension-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-omnidimension-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>

          {/* Progress Bar (if progress provided) */}
          {typeof progress === "number" && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-omnidimension-500 to-omnidimension-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="space-y-2">
          <p className="text-foreground font-medium">{message}</p>

          {submessage && (
            <p className="text-sm text-muted-foreground">{submessage}</p>
          )}

          {/* Dynamic loading indicators */}
          <div className="flex items-center justify-center space-x-1 text-omnidimension-500">
            <span className="text-xs">●</span>
            <span className="text-xs animate-pulse">●</span>
            <span
              className="text-xs animate-pulse"
              style={{ animationDelay: "0.2s" }}
            >
              ●
            </span>
            <span
              className="text-xs animate-pulse"
              style={{ animationDelay: "0.4s" }}
            >
              ●
            </span>
          </div>
        </div>

        {/* System Info */}
        <div className="pt-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Version 1.0.0 | Build: 2025-06-20 07:35:19</p>
            <p>User: ayush20244048 | Status: Initializing</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton loading components
export function SkeletonLine({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("animate-pulse rounded bg-muted h-4", className)}
      {...props}
    />
  );
}

export function SkeletonCircle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("animate-pulse rounded-full bg-muted", className)}
      {...props}
    />
  );
}

export function SkeletonCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("space-y-3 p-4 border rounded-lg", className)}
      {...props}
    >
      <SkeletonLine className="h-6 w-3/4" />
      <SkeletonLine className="h-4 w-full" />
      <SkeletonLine className="h-4 w-2/3" />
    </div>
  );
}
