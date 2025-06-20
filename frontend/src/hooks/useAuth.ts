/**
 * Authentication Hook
 * Pure hook without JSX - imports context from separate file
 */

import { useContext } from "react";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
