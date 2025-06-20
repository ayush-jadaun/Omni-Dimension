/**
 * Workflow System Types
 * Current Time: 2025-06-20 07:26:28 UTC
 * Current User: ayush20244048
 */

export interface WorkflowStep {
  id: string;
  name: string;
  type: "nlp" | "search" | "call" | "booking" | "notification" | "decision";
  agent: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  input: Record<string, any>;
  output?: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  retryCount: number;
  metadata: {
    description: string;
    expectedDuration: number;
    priority: number;
    dependencies: string[];
  };
}

export interface Workflow {
  _id: string;
  workflowId: string;
  userId: string;
  sessionId: string;
  conversationId?: string;
  type:
    | "restaurant_booking"
    | "appointment_scheduling"
    | "travel_planning"
    | "general_assistance"
    | "system_task";
  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "cancelled"
    | "paused";
  priority: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  title: string;
  description: string;
  steps: WorkflowStep[];
  currentStep: number;
  result?: {
    success: boolean;
    data: Record<string, any>;
    message: string;
    confidence: number;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration: number;
  actualDuration?: number;
  metadata: {
    initiatedBy: string;
    userRequest: string;
    context: Record<string, any>;
    tags: string[];
    category: string;
    currentUser: string;
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  steps: Omit<WorkflowStep, "id" | "status" | "startedAt" | "completedAt">[];
  estimatedDuration: number;
  requiredInputs: string[];
  optionalInputs: string[];
  tags: string[];
}
