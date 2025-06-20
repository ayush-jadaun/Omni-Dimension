/**
 * Tooltip Component
 * Current Time: 2025-06-20 07:45:20 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  disabled?: boolean;
  className?: string;
  maxWidth?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 500,
  disabled = false,
  className,
  maxWidth = "200px",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (disabled || !content) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Calculate base position
    let x = 0;
    let y = 0;
    let finalPosition = position;

    switch (position) {
      case "top":
        x = rect.left + rect.width / 2;
        y = rect.top - 8;

        // Check if tooltip would be cut off at top
        if (y < 50) {
          finalPosition = "bottom";
          y = rect.bottom + 8;
        }
        break;

      case "bottom":
        x = rect.left + rect.width / 2;
        y = rect.bottom + 8;

        // Check if tooltip would be cut off at bottom
        if (y > viewport.height - 50) {
          finalPosition = "top";
          y = rect.top - 8;
        }
        break;

      case "left":
        x = rect.left - 8;
        y = rect.top + rect.height / 2;

        // Check if tooltip would be cut off on left
        if (x < 50) {
          finalPosition = "right";
          x = rect.right + 8;
        }
        break;

      case "right":
        x = rect.right + 8;
        y = rect.top + rect.height / 2;

        // Check if tooltip would be cut off on right
        if (x > viewport.width - 200) {
          finalPosition = "left";
          x = rect.left - 8;
        }
        break;
    }

    setTooltipPosition({ x, y });
    setActualPosition(finalPosition);
  };

  // Update position on scroll or resize
  useEffect(() => {
    if (isVisible) {
      const handleUpdate = () => updatePosition();

      window.addEventListener("scroll", handleUpdate, true);
      window.addEventListener("resize", handleUpdate);

      return () => {
        window.removeEventListener("scroll", handleUpdate, true);
        window.removeEventListener("resize", handleUpdate);
      };
    }
  }, [isVisible, position]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipStyles = () => {
    const baseStyles = {
      position: "fixed" as const,
      zIndex: 9999,
      maxWidth,
      pointerEvents: "none" as const,
    };

    switch (actualPosition) {
      case "top":
        return {
          ...baseStyles,
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: "translateX(-50%) translateY(-100%)",
        };
      case "bottom":
        return {
          ...baseStyles,
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          ...baseStyles,
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: "translateX(-100%) translateY(-50%)",
        };
      case "right":
        return {
          ...baseStyles,
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: "translateY(-50%)",
        };
      default:
        return baseStyles;
    }
  };

  const getArrowStyles = () => {
    const arrowSize = 6;

    switch (actualPosition) {
      case "top":
        return {
          position: "absolute" as const,
          bottom: -arrowSize,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderTop: `${arrowSize}px solid hsl(var(--popover))`,
        };
      case "bottom":
        return {
          position: "absolute" as const,
          top: -arrowSize,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid hsl(var(--popover))`,
        };
      case "left":
        return {
          position: "absolute" as const,
          right: -arrowSize,
          top: "50%",
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderLeft: `${arrowSize}px solid hsl(var(--popover))`,
        };
      case "right":
        return {
          position: "absolute" as const,
          left: -arrowSize,
          top: "50%",
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid hsl(var(--popover))`,
        };
      default:
        return {};
    }
  };

  const tooltipContent = isVisible && content && (
    <div
      ref={tooltipRef}
      style={getTooltipStyles()}
      className={clsx(
        "bg-popover text-popover-foreground border border-border rounded-md px-3 py-1.5 text-sm shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
      role="tooltip"
      data-user="ayush20244048"
      data-timestamp="2025-06-20 07:45:20"
    >
      {content}
      <div style={getArrowStyles()} />
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {typeof window !== "undefined" &&
        createPortal(tooltipContent, document.body)}
    </>
  );
}

// Convenience wrapper for buttons and icons
export function TooltipWrapper({
  tooltip,
  children,
  ...props
}: {
  tooltip: string;
  children: React.ReactNode;
} & Omit<TooltipProps, "content" | "children">) {
  return (
    <Tooltip content={tooltip} {...props}>
      {children}
    </Tooltip>
  );
}
