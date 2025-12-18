import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Send,
  XCircle,
  HeadphonesIcon
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

export function CompanySupportTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category: "general",
  });

  // Fetch user's company ID
  const { data: userCompanyId } = useQuery({
    queryKey: ["user-company-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.company_id || null;
    },
    enabled: !!user?.id,
  });

  // Fetch company's support tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["company-support-tickets", userCompanyId],
    queryFn: async () => {
      if (!userCompanyId) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("company_id", userCompanyId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!userCompanyId,
  });

  // Fetch messages for selected ticket
  const { data: messages } = useQuery({
    queryKey: ["company-ticket-messages", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      // Fetch profiles for message authors
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(msg => ({
        ...msg,
        profiles: profileMap.get(msg.user_id) || null
      })) as TicketMessage[];
    },
    enabled: !!selectedTicket,
  });

  // Real-time subscription for new messages (staff replies)
  useEffect(() => {
    if (!userCompanyId) return;

    console.log("Setting up company support realtime subscription for company:", userCompanyId);

    const channel = supabase
      .channel(`company-support-realtime-${userCompanyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
        },
        async (payload) => {
          console.log("New support message received:", payload);
          const newMessage = payload.new as any;
          // Check if this message is a staff reply for one of our tickets
          if (newMessage.is_staff_reply) {
            // Verify this is for our company's ticket
            const { data: ticket } = await supabase
              .from('support_tickets')
              .select('company_id, subject')
              .eq('id', newMessage.ticket_id)
              .single();
            
            if (ticket?.company_id === userCompanyId) {
              toast.success("🎉 New support response!", {
                description: `Staff replied to: ${ticket.subject}`,
                duration: 10000,
              });
              queryClient.invalidateQueries({ queryKey: ["company-support-tickets"] });
              queryClient.invalidateQueries({ queryKey: ["company-ticket-messages"] });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
        },
        async (payload) => {
          console.log("Support ticket updated:", payload);
          const updated = payload.new as any;
          if (updated.company_id === userCompanyId) {
            toast.info("📋 Ticket updated", {
              description: `Status changed to: ${updated.status}`,
              duration: 5000,
            });
            queryClient.invalidateQueries({ queryKey: ["company-support-tickets"] });
          }
        }
      )
      .subscribe((status) => {
        console.log("Company support realtime subscription status:", status);
      });

    return () => {
      console.log("Cleaning up company support realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [userCompanyId, queryClient]);

  // Create new ticket
  const createTicketMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !userCompanyId) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          company_id: userCompanyId,
          subject: newTicket.subject,
          description: newTicket.description,
          priority: newTicket.priority,
          category: newTicket.category,
          status: "open",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Support ticket created", { description: "Our team will respond shortly." });
      setCreateDialogOpen(false);
      setNewTicket({ subject: "", description: "", priority: "medium", category: "general" });
      queryClient.invalidateQueries({ queryKey: ["company-support-tickets"] });
    },
    onError: (error: any) => {
      toast.error("Failed to create ticket", { description: error.message });
    },
  });

  // Send reply
  const sendReplyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: ticketId,
          user_id: user?.id,
          message,
          is_staff_reply: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message sent");
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["company-ticket-messages"] });
    },
    onError: (error: any) => {
      toast.error("Failed to send message", { description: error.message });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><AlertCircle className="h-3 w-3 mr-1" />Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const openCount = tickets?.filter(t => t.status === 'open').length || 0;
  const inProgressCount = tickets?.filter(t => t.status === 'in_progress').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <HeadphonesIcon className="h-6 w-6" />
            Support
          </h2>
          <p className="text-muted-foreground">Get help from our support team</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and our team will respond as soon as possible.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newTicket.priority} onValueChange={(v) => setNewTicket({ ...newTicket, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newTicket.category} onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="bug_report">Bug Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide as much detail as possible..."
                  rows={5}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createTicketMutation.mutate()}
                disabled={!newTicket.subject.trim() || !newTicket.description.trim() || createTicketMutation.isPending}
              >
                {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tickets?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{openCount}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{inProgressCount}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{tickets?.filter(t => t.status === 'resolved').length || 0}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Support Tickets</CardTitle>
          <CardDescription>Click on a ticket to view conversation</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : !tickets?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <HeadphonesIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No support tickets yet</p>
              <p className="text-sm mt-1">Create a ticket if you need help</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{ticket.subject}</p>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ticket.category} • Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ticket.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Sheet */}
      <Sheet open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          {selectedTicket && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selectedTicket.subject}</SheetTitle>
                <SheetDescription className="text-left">
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                    <Badge variant="outline">{selectedTicket.category}</Badge>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Original Description */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Your Issue</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Conversation</p>
                  <ScrollArea className="h-[300px] pr-4">
                    {!messages?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No responses yet. Our team will respond soon.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-lg ${
                              msg.is_staff_reply 
                                ? "bg-primary/10 border border-primary/20" 
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">
                                {msg.is_staff_reply ? "Support Team" : msg.profiles?.full_name || "You"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Reply Form */}
                {selectedTicket.status !== 'closed' && (
                  <div className="space-y-2">
                    <Label>Add Reply</Label>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={3}
                        className="flex-1"
                      />
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => sendReplyMutation.mutate({ ticketId: selectedTicket.id, message: replyMessage })}
                      disabled={!replyMessage.trim() || sendReplyMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendReplyMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
