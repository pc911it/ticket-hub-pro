import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Ticket, 
  MessageCircle, 
  Send, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  Plus,
  Tag,
  UserPlus,
  Zap,
  MoreVertical,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  RefreshCw,
  Search,
  Bot
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ChatTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string | null;
  category: string | null;
  assigned_to: string | null;
  user_id: string;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
}

interface Agent {
  id: string;
  user_id: string;
  full_name: string;
}

const priorityConfig = {
  urgent: { color: 'bg-red-100 text-red-800 border-red-200', icon: ArrowUpCircle, label: 'Urgent' },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: ArrowUpCircle, label: 'High' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: MinusCircle, label: 'Medium' },
  low: { color: 'bg-green-100 text-green-800 border-green-200', icon: ArrowDownCircle, label: 'Low' },
};

const statusConfig = {
  open: { color: 'bg-blue-100 text-blue-800', label: 'Open' },
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
  resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
  closed: { color: 'bg-gray-100 text-gray-800', label: 'Closed' },
};

export function ChatTicketSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<ChatTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ChatTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCannedDialog, setShowNewCannedDialog] = useState(false);
  const [newCannedResponse, setNewCannedResponse] = useState({ title: '', content: '', category: 'general', shortcut: '' });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch tickets
  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterPriority !== 'all') {
        query = query.eq('priority', filterPriority);
      }
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned') {
          query = query.is('assigned_to', null);
        } else if (filterAssignee === 'mine') {
          query = query.eq('assigned_to', user?.id);
        } else {
          query = query.eq('assigned_to', filterAssignee);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tickets:', error);
      } else {
        // Filter by search query client-side
        let filtered = data || [];
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          filtered = filtered.filter(t => 
            t.subject.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery)
          );
        }
        setTickets(filtered as ChatTicket[]);
      }
      setIsLoading(false);
    };

    fetchTickets();

    // Subscribe to ticket changes
    const channel = supabase
      .channel('ticket_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => fetchTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus, filterPriority, filterAssignee, searchQuery, user?.id]);

  // Fetch canned responses
  useEffect(() => {
    const fetchCannedResponses = async () => {
      const { data } = await supabase
        .from('canned_responses')
        .select('*')
        .order('title');
      
      if (data) {
        setCannedResponses(data as CannedResponse[]);
      }
    };

    fetchCannedResponses();
  }, []);

  // Fetch agents for assignment
  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, user_id, full_name');
      
      if (data) {
        setAgents(data as Agent[]);
      }
    };

    fetchAgents();
  }, []);

  // Fetch messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages((data || []) as TicketMessage[]);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`ticket_messages_${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TicketMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendReply = async () => {
    if (!inputValue.trim() || !selectedTicket || isSending) return;

    setIsSending(true);
    const messageContent = inputValue;
    setInputValue('');

    try {
      // Insert message
      const { error: msgError } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          message: messageContent,
          is_staff_reply: true,
        });

      if (msgError) throw msgError;

      // Update ticket status
      const updates: any = { 
        updated_at: new Date().toISOString(),
        status: selectedTicket.status === 'open' ? 'pending' : selectedTicket.status
      };

      await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', selectedTicket.id);

      toast({
        title: 'Reply sent',
        description: 'Your response has been added to the ticket.',
      });
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send reply',
      });
      setInputValue(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<ChatTicket>) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, ...updates } : t
      ));
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, ...updates } : null);
      }

      toast({ title: 'Ticket updated' });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update ticket' });
    }
  };

  const useCannedResponse = (response: CannedResponse) => {
    setInputValue(response.content);
    setShowCannedResponses(false);
  };

  const saveCannedResponse = async () => {
    if (!newCannedResponse.title || !newCannedResponse.content) return;

    try {
      const { error } = await supabase
        .from('canned_responses')
        .insert({
          ...newCannedResponse,
          created_by: user?.id,
        });

      if (error) throw error;

      // Refresh canned responses
      const { data } = await supabase.from('canned_responses').select('*').order('title');
      if (data) setCannedResponses(data as CannedResponse[]);

      setShowNewCannedDialog(false);
      setNewCannedResponse({ title: '', content: '', category: 'general', shortcut: '' });
      toast({ title: 'Canned response saved' });
    } catch (error) {
      console.error('Error saving canned response:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save canned response' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const ticketCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    mine: tickets.filter(t => t.assigned_to === user?.id).length,
  };

  return (
    <div className="h-[calc(100vh-12rem)]">
      <Tabs defaultValue="tickets" className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="h-4 w-4" />
              Tickets
              {ticketCounts.open > 0 && (
                <Badge variant="destructive" className="ml-1">{ticketCounts.open}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="canned" className="gap-2">
              <Zap className="h-4 w-4" />
              Quick Replies
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="tickets" className="flex-1 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Ticket List */}
            <Card className="lg:col-span-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-lg">Queue</CardTitle>
                  <Badge variant="secondary">{tickets.length} tickets</Badge>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-3 gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="mine">My Tickets</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tickets found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-24rem)]">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedTicket?.id === ticket.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-medium line-clamp-1">{ticket.subject}</h4>
                          {getPriorityBadge(ticket.priority || 'medium')}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center justify-between">
                          {getStatusBadge(ticket.status)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Ticket Detail & Conversation */}
            <Card className="lg:col-span-2 flex flex-col">
              {selectedTicket ? (
                <>
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Select 
                          value={selectedTicket.status} 
                          onValueChange={(v) => updateTicket(selectedTicket.id, { status: v })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select 
                          value={selectedTicket.priority || 'medium'} 
                          onValueChange={(v) => updateTicket(selectedTicket.id, { priority: v })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select 
                          value={selectedTicket.assigned_to || 'unassigned'} 
                          onValueChange={(v) => updateTicket(selectedTicket.id, { assigned_to: v === 'unassigned' ? null : v })}
                        >
                          <SelectTrigger className="w-36">
                            <UserPlus className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.user_id}>
                                {agent.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Ticket metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                      <span>Created: {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}</span>
                      {selectedTicket.category && (
                        <Badge variant="outline">{selectedTicket.category}</Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                      <div className="space-y-4">
                        {/* Initial ticket as first message */}
                        <div className="flex gap-2 justify-start">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="max-w-[75%]">
                            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-2">
                              <p className="text-sm">{selectedTicket.description}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(selectedTicket.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>

                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex gap-2 ${message.is_staff_reply ? 'justify-end' : 'justify-start'}`}
                          >
                            {!message.is_staff_reply && (
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                <User className="h-4 w-4" />
                              </div>
                            )}
                            <div className="max-w-[75%]">
                              <div
                                className={`rounded-2xl px-4 py-2 ${
                                  message.is_staff_reply
                                    ? 'bg-primary text-primary-foreground rounded-br-md'
                                    : 'bg-secondary rounded-bl-md'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                              </div>
                              <p className={`text-xs mt-1 ${message.is_staff_reply ? 'text-right' : ''} text-muted-foreground`}>
                                {format(new Date(message.created_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            {message.is_staff_reply && (
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Reply input */}
                    <div className="p-4 border-t">
                      {/* Canned responses */}
                      {showCannedResponses && cannedResponses.length > 0 && (
                        <div className="mb-3 p-2 bg-muted rounded-lg max-h-40 overflow-y-auto">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">Quick Replies</span>
                            <Button variant="ghost" size="sm" onClick={() => setShowCannedResponses(false)}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {cannedResponses.map((response) => (
                              <button
                                key={response.id}
                                className="w-full text-left p-2 hover:bg-background rounded text-sm"
                                onClick={() => useCannedResponse(response)}
                              >
                                <span className="font-medium">{response.title}</span>
                                {response.shortcut && (
                                  <span className="text-xs text-muted-foreground ml-2">/{response.shortcut}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowCannedResponses(!showCannedResponses)}
                          title="Quick replies"
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                        <Textarea
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendReply();
                            }
                          }}
                          placeholder="Type your reply..."
                          disabled={isSending}
                          className="flex-1 min-h-[60px] max-h-32 resize-none"
                        />
                        <Button
                          onClick={sendReply}
                          disabled={isSending || !inputValue.trim()}
                          className="self-end"
                        >
                          {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a ticket to view details</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="canned" className="flex-1 m-0">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Quick Reply Templates</CardTitle>
                <Dialog open={showNewCannedDialog} onOpenChange={setShowNewCannedDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Quick Reply</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={newCannedResponse.title}
                          onChange={(e) => setNewCannedResponse({ ...newCannedResponse, title: e.target.value })}
                          placeholder="e.g., Greeting"
                        />
                      </div>
                      <div>
                        <Label>Shortcut (optional)</Label>
                        <Input
                          value={newCannedResponse.shortcut}
                          onChange={(e) => setNewCannedResponse({ ...newCannedResponse, shortcut: e.target.value })}
                          placeholder="e.g., greet (type /greet to use)"
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select 
                          value={newCannedResponse.category} 
                          onValueChange={(v) => setNewCannedResponse({ ...newCannedResponse, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="greeting">Greeting</SelectItem>
                            <SelectItem value="closing">Closing</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Content</Label>
                        <Textarea
                          value={newCannedResponse.content}
                          onChange={(e) => setNewCannedResponse({ ...newCannedResponse, content: e.target.value })}
                          placeholder="Enter your quick reply content..."
                          rows={4}
                        />
                      </div>
                      <Button onClick={saveCannedResponse} className="w-full">Save Template</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {cannedResponses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No quick replies yet</p>
                  <p className="text-sm">Create templates for common responses</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cannedResponses.map((response) => (
                    <Card key={response.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{response.title}</h4>
                        <Badge variant="outline">{response.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{response.content}</p>
                      {response.shortcut && (
                        <p className="text-xs text-primary mt-2">Shortcut: /{response.shortcut}</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
