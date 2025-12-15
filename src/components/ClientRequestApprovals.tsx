import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, User, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PendingRequest {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  scheduled_date: string;
  scheduled_time: string;
  created_at: string;
  admin_approval_status: string;
  clients: { full_name: string; email: string } | null;
  projects: { name: string } | null;
}

export function ClientRequestApprovals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Fetch pending approval requests
  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ["pending-approval-requests"],
    queryFn: async () => {
      const { data: memberData } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!memberData?.company_id) return [];

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          title,
          description,
          priority,
          scheduled_date,
          scheduled_time,
          created_at,
          admin_approval_status,
          clients (full_name, email),
          projects (name)
        `)
        .eq("company_id", memberData.company_id)
        .eq("admin_approval_status", "pending_approval")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingRequest[];
    },
    enabled: !!user,
  });

  // Approve request mutation
  const approveRequest = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("tickets")
        .update({
          admin_approval_status: "approved",
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: user?.id,
        })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request Approved", description: "The client's work request has been approved." });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-requests"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to approve request." });
    },
  });

  // Decline request mutation
  const declineRequest = useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({
          admin_approval_status: "declined",
          admin_rejection_reason: reason,
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: user?.id,
        })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request Declined", description: "The client's work request has been declined." });
      setDeclineDialogOpen(false);
      setSelectedRequest(null);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["pending-approval-requests"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to decline request." });
    },
  });

  const handleDeclineClick = (request: PendingRequest) => {
    setSelectedRequest(request);
    setDeclineDialogOpen(true);
  };

  const handleDeclineSubmit = () => {
    if (selectedRequest) {
      declineRequest.mutate({ ticketId: selectedRequest.id, reason: declineReason });
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/30";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-warning/10 text-warning border-warning/30";
    }
  };

  if (isLoading || !pendingRequests || pendingRequests.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg font-display text-amber-800 dark:text-amber-200">
              Client Requests Pending Approval
            </CardTitle>
          </div>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            {pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''} waiting for your approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-background border"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{request.title}</span>
                  <Badge variant="outline" className={cn("text-xs", getPriorityColor(request.priority))}>
                    {request.priority || "normal"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {request.clients?.full_name}
                  </span>
                  {request.projects && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {request.projects.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(request.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
                {request.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {request.description.split('\n--- Attachments ---')[0]}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeclineClick(request)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveRequest.mutate(request.id)}
                  disabled={approveRequest.isPending}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Work Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this request. The client will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">{selectedRequest?.title}</p>
              <p className="text-sm text-muted-foreground">From: {selectedRequest?.clients?.full_name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for declining (optional)</Label>
              <Textarea
                id="reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g., We don't offer this service, Insufficient details provided..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineSubmit}
              disabled={declineRequest.isPending}
            >
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
