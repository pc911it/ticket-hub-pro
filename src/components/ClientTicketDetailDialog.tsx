import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  User, 
  FolderOpen, 
  MapPin, 
  FileText,
  CheckCircle,
  AlertCircle,
  Wrench,
  CircleDot,
  Paperclip,
  Image as ImageIcon,
  File
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ClientTicketDetailDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientTicketDetailDialog({ ticket, open, onOpenChange }: ClientTicketDetailDialogProps) {
  // Fetch job updates for this ticket
  const { data: jobUpdates } = useQuery({
    queryKey: ["ticket-job-updates", ticket?.id],
    queryFn: async () => {
      if (!ticket?.id) return [];
      
      const { data, error } = await supabase
        .from("job_updates")
        .select("*, agents(full_name)")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticket?.id && open,
  });

  // Fetch attachments for this ticket
  const { data: attachments } = useQuery({
    queryKey: ["ticket-attachments", ticket?.id],
    queryFn: async () => {
      if (!ticket?.id) return [];
      
      const { data, error } = await supabase
        .from("ticket_attachments")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticket?.id && open,
  });

  if (!ticket) return null;

  const getStatusConfig = (status: string | null) => {
    const config: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
      pending: { color: "text-warning", bg: "bg-warning/10", icon: <Clock className="h-4 w-4" />, label: "Pending" },
      confirmed: { color: "text-info", bg: "bg-info/10", icon: <CheckCircle className="h-4 w-4" />, label: "Confirmed" },
      in_progress: { color: "text-primary", bg: "bg-primary/10", icon: <Wrench className="h-4 w-4" />, label: "In Progress" },
      completed: { color: "text-success", bg: "bg-success/10", icon: <CheckCircle className="h-4 w-4" />, label: "Completed" },
      cancelled: { color: "text-destructive", bg: "bg-destructive/10", icon: <AlertCircle className="h-4 w-4" />, label: "Cancelled" },
    };
    return config[status || "pending"] || config.pending;
  };

  const getJobStatusConfig = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      assigned: { color: "bg-info/10 text-info border-info/30", label: "Assigned" },
      en_route: { color: "bg-warning/10 text-warning border-warning/30", label: "En Route" },
      on_site: { color: "bg-primary/10 text-primary border-primary/30", label: "On Site" },
      working: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "Working" },
      completed: { color: "bg-success/10 text-success border-success/30", label: "Completed" },
      cancelled: { color: "bg-destructive/10 text-destructive border-destructive/30", label: "Cancelled" },
    };
    return config[status] || { color: "bg-muted text-muted-foreground", label: status };
  };

  const statusConfig = getStatusConfig(ticket.status);
  const isImage = (fileType: string) => fileType?.startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", statusConfig.bg, statusConfig.color)}>
              {statusConfig.icon}
            </div>
            <span className="truncate">{ticket.title}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Status and Priority */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className={cn(statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className={cn(
                ticket.priority === "high" && "border-destructive text-destructive",
                ticket.priority === "low" && "border-muted-foreground text-muted-foreground"
              )}>
                {ticket.priority || "normal"} priority
              </Badge>
              {ticket.client_approved_at && (
                <Badge variant="outline" className="border-success text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Client Approved
                </Badge>
              )}
            </div>

            {/* Description */}
            {ticket.description && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {ticket.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Scheduled Date
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(ticket.scheduled_date), "MMMM d, yyyy")}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Scheduled Time
                </p>
                <p className="text-sm font-medium">{ticket.scheduled_time}</p>
              </div>
              {ticket.agents?.full_name && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Assigned Technician
                  </p>
                  <p className="text-sm font-medium">{ticket.agents.full_name}</p>
                </div>
              )}
              {ticket.projects?.name && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    Project
                  </p>
                  <p className="text-sm font-medium">{ticket.projects.name}</p>
                </div>
              )}
            </div>

            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        {isImage(attachment.file_type) ? (
                          <img 
                            src={attachment.file_url} 
                            alt={attachment.file_name}
                            className="h-16 w-16 object-cover rounded mb-2"
                          />
                        ) : (
                          <File className="h-10 w-10 text-muted-foreground mb-2" />
                        )}
                        <p className="text-xs text-center truncate w-full">{attachment.file_name}</p>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Activity Timeline */}
            {jobUpdates && jobUpdates.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <CircleDot className="h-4 w-4" />
                    Work Activity
                  </h4>
                  <div className="space-y-4">
                    {jobUpdates.map((update, index) => {
                      const updateStatusConfig = getJobStatusConfig(update.status);
                      return (
                        <div key={update.id} className="flex gap-3">
                          <div className="relative">
                            <CircleDot className={cn("h-4 w-4 mt-0.5", 
                              update.status === "completed" ? "text-success" : "text-primary"
                            )} />
                            {index < jobUpdates.length - 1 && (
                              <div className="absolute left-[7px] top-5 w-0.5 h-[calc(100%+8px)] bg-border" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={cn("text-xs", updateStatusConfig.color)}>
                                {updateStatusConfig.label}
                              </Badge>
                              {update.agents?.full_name && (
                                <span className="text-xs text-muted-foreground">
                                  by {update.agents.full_name}
                                </span>
                              )}
                            </div>
                            {update.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{update.notes}</p>
                            )}
                            {update.photo_url && (
                              <a href={update.photo_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                <img 
                                  src={update.photo_url} 
                                  alt="Update photo" 
                                  className="h-20 w-auto rounded border"
                                />
                              </a>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* No Activity Message */}
            {(!jobUpdates || jobUpdates.length === 0) && (
              <>
                <Separator />
                <div className="text-center py-4 text-muted-foreground">
                  <CircleDot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No work activity recorded yet</p>
                </div>
              </>
            )}

            {/* Client Signature */}
            {ticket.client_signature_url && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Client Approval Signature
                  </h4>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <img 
                      src={ticket.client_signature_url} 
                      alt="Client signature" 
                      className="max-h-24 mx-auto"
                    />
                    {ticket.client_approved_at && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Signed on {format(new Date(ticket.client_approved_at), "MMMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
