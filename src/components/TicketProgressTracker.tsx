import { cn } from "@/lib/utils";
import { 
  Clock, 
  UserCheck, 
  Car, 
  MapPin, 
  Wrench, 
  CheckCircle, 
  XCircle 
} from "lucide-react";

interface TicketProgressTrackerProps {
  status: string | null;
  adminApprovalStatus?: string | null;
  compact?: boolean;
}

const WORKFLOW_STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "assigned", label: "Assigned", icon: UserCheck },
  { key: "en_route", label: "En Route", icon: Car },
  { key: "on_site", label: "On Site", icon: MapPin },
  { key: "working", label: "Working", icon: Wrench },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

export function TicketProgressTracker({ 
  status, 
  adminApprovalStatus,
  compact = false 
}: TicketProgressTrackerProps) {
  // Handle pending approval or declined states
  if (adminApprovalStatus === "pending_approval") {
    return (
      <div className={cn(
        "flex items-center gap-2 text-amber-600",
        compact ? "text-xs" : "text-sm"
      )}>
        <Clock className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
        <span>Awaiting Admin Approval</span>
      </div>
    );
  }

  if (adminApprovalStatus === "declined") {
    return (
      <div className={cn(
        "flex items-center gap-2 text-destructive",
        compact ? "text-xs" : "text-sm"
      )}>
        <XCircle className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
        <span>Request Declined</span>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className={cn(
        "flex items-center gap-2 text-destructive",
        compact ? "text-xs" : "text-sm"
      )}>
        <XCircle className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
        <span>Cancelled</span>
      </div>
    );
  }

  // Map status to step index
  const getStepIndex = (status: string | null): number => {
    if (!status) return 0;
    // Handle confirmed as pending with assigned
    if (status === "confirmed") return 1;
    if (status === "in_progress") return 4; // working
    const index = WORKFLOW_STEPS.findIndex(s => s.key === status);
    return index >= 0 ? index : 0;
  };

  const currentStepIndex = getStepIndex(status);
  const progressPercent = Math.round((currentStepIndex / (WORKFLOW_STEPS.length - 1)) * 100);

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{WORKFLOW_STEPS[currentStepIndex]?.label}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              currentStepIndex === WORKFLOW_STEPS.length - 1 
                ? "bg-success" 
                : "bg-primary"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Ticket Progress</span>
        <span className="font-medium text-primary">{progressPercent}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            currentStepIndex === WORKFLOW_STEPS.length - 1 
              ? "bg-success" 
              : "bg-primary"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between">
        {WORKFLOW_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div 
              key={step.key} 
              className={cn(
                "flex flex-col items-center gap-1",
                isCompleted ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full transition-colors",
                isCurrent && "bg-primary/10 ring-2 ring-primary",
                isCompleted && !isCurrent && "bg-primary/5",
                index === WORKFLOW_STEPS.length - 1 && isCompleted && "bg-success/10 text-success"
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className={cn(
                "text-[10px] text-center leading-tight hidden sm:block",
                isCurrent && "font-medium"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
