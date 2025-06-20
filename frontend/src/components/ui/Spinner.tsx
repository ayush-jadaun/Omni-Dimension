/**
 * Spinner Component
 * Current Time: 2025-06-20 07:42:31 UTC
 * Current User: ayush20244048
 */

"use client";

import { clsx } from "clsx";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={clsx(
        "spinner border-2 border-border border-t-primary rounded-full",
        sizeClasses[size],
        className
      )}
      data-user="ayush20244048"
      data-timestamp="2025-06-20 07:42:31"
    />
  );
}
