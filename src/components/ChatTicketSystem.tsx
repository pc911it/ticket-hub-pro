import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  Plus,
  Tag,
  UserPlus,
  Zap,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  RefreshCw,
  Search,
  Inbox,
  Users,
  CircleDot,
  CheckCircle,
  Archive,
  Settings,
  MoreHorizontal,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Calendar,
  Hash,
  Edit3,
  Trash2,
  Star,
  StarOff,
  Eye,
  EyeOff
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

interface TicketView {
  id: string;
  name: string;
  icon: React.ReactNode;
  filter: (tickets: ChatTicket[], userId?: string) => ChatTicket[];
  count?: number;
}

const priorityConfig = {
  urgent: { color: 'bg-red-500', textColor: 'text-red-600', label: 'Urgent', icon: ArrowUpCircle },
  high: { color: 'bg-orange-500', textColor: 'text-orange-600', label: 'High', icon: ArrowUpCircle },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-600', label: 'Medium', icon: MinusCircle },
  low: { color: 'bg-green-500', textColor: 'text-green-600', label: 'Low', icon: ArrowDownCircle },
};

const statusConfig = {
  open: { color: 'bg-blue-500', label: 'Open', icon: CircleDot },
  pending: { color: 'bg-yellow-500', label: 'Pending', icon: Clock },
  in_progress: { color: 'bg-purple-500', label: 'In Progress', icon: Loader2 },
  resolved: { color: 'bg-green-500', label: 'Resolved', icon: CheckCircle },
  closed: { color: 'bg-gray-500', label: 'Closed', icon: Archive },
};

export function ChatTicketSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allTickets, setAllTickets] = useState<ChatTicket[]>([]);
  const [tickets, setTickets] = useState<ChatTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ChatTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('all');
  const [showNewCannedDialog, setShowNewCannedDialog] = useState(false);
  const [newCannedResponse, setNewCannedResponse] = useState({ title: '', content: '', category: 'general', shortcut: '' });
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Views configuration
  const views: TicketView[] = [
    {
      id: 'all',
      name: 'All Tickets',
      icon: <Inbox className="h-4 w-4" />,
      filter: (t) => t,
    },
    {
      id: 'open',
      name: 'Open',
      icon: <CircleDot className="h-4 w-4" />,
      filter: (t) => t.filter(ticket => ticket.status === 'open'),
    },
    {
      id: 'pending',
      name: 'Pending',
      icon: <Clock className="h-4 w-4" />,
      filter: (t) => t.filter(ticket => ticket.status === 'pending'),
    },
    {
      id: 'mine',
      name: 'My Tickets',
      icon: <User className="h-4 w-4" />,
      filter: (t, userId) => t.filter(ticket => ticket.assigned_to === userId),
    },
    {
      id: 'unassigned',
      name: 'Unassigned',
      icon: <Users className="h-4 w-4" />,
      filter: (t) => t.filter(ticket => !ticket.assigned_to),
    },
    {
      id: 'urgent',
      name: 'Urgent',
      icon: <AlertCircle className="h-4 w-4" />,
      filter: (t) => t.filter(ticket => ticket.priority === 'urgent' || ticket.priority === 'high'),
    },
    {
      id: 'resolved',
      name: 'Resolved',
      icon: <CheckCircle className="h-4 w-4" />,
      filter: (t) => t.filter(ticket => ticket.status === 'resolved' || ticket.status === 'closed'),
    },
  ];

  // Fetch all tickets
  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
      } else {
        setAllTickets((data || []) as ChatTicket[]);
      }
      setIsLoading(false);
    };

    fetchTickets();

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
  }, []);

  // Apply view filter and search
  useEffect(() => {
    const currentView = views.find(v => v.id === activeView);
    if (!currentView) return;

    let filtered = currentView.filter(allTickets, user?.id);

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.subject.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.id.toLowerCase().includes(lowerQuery)
      );
    }

    setTickets(filtered);
  }, [allTickets, activeView, searchQuery, user?.id]);

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

  // Fetch agents
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

      if (!error && data) {
        setMessages(data as TicketMessage[]);
      }
    };

    fetchMessages();

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
      const { error: msgError } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          message: messageContent,
          is_staff_reply: true,
        });

      if (msgError) throw msgError;

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
        description: 'Your response has been added.',
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

      setAllTickets(prev => prev.map(t => 
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

      const { data } = await supabase.from('canned_responses').select('*').order('title');
      if (data) setCannedResponses(data as CannedResponse[]);

      setShowNewCannedDialog(false);
      setNewCannedResponse({ title: '', content: '', category: 'general', shortcut: '' });
      toast({ title: 'Quick reply saved' });
    } catch (error) {
      console.error('Error saving canned response:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save' });
    }
  };

  const getPriorityIndicator = (priority: string | null) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return <div className={`w-1 h-full ${config.color} rounded-full absolute left-0 top-0`} />;
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;
    return <Icon className={`h-3 w-3`} />;
  };

  const getAgentName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const agent = agents.find(a => a.user_id === userId);
    return agent?.full_name || 'Unknown';
  };

  const getViewCount = (viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (!view) return 0;
    return view.filter(allTickets, user?.id).length;
  };

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-10rem)] flex bg-background border rounded-lg overflow-hidden">
        {/* Left Sidebar - Views */}
        <div className="w-56 border-r bg-muted/30 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <span className="font-semibold">Support</span>
            </div>
          </div>

          {/* Views List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Views
              </p>
              {views.map((view) => {
                const count = getViewCount(view.id);
                const isActive = activeView === view.id;
                return (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {view.icon}
                      <span>{view.name}</span>
                    </div>
                    {count > 0 && (
                      <Badge 
                        variant={isActive ? 'secondary' : 'outline'} 
                        className="h-5 min-w-[20px] justify-center"
                      >
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            <Separator className="my-2" />

            {/* Quick Replies Section */}
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Quick Actions
              </p>
              <Dialog open={showNewCannedDialog} onOpenChange={setShowNewCannedDialog}>
                <DialogTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted text-foreground">
                    <Plus className="h-4 w-4" />
                    <span>New Quick Reply</span>
                  </button>
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
                        placeholder="e.g., greet (type /greet)"
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
                        placeholder="Enter your quick reply..."
                        rows={4}
                      />
                    </div>
                    <Button onClick={saveCannedResponse} className="w-full">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <button 
                onClick={() => setShowCannedResponses(!showCannedResponses)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted text-foreground"
              >
                <Zap className="h-4 w-4" />
                <span>Browse Replies ({cannedResponses.length})</span>
              </button>
            </div>
          </ScrollArea>

          {/* Settings */}
          <div className="p-2 border-t">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted text-foreground">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Middle Panel - Ticket List */}
        <div className="w-80 border-r flex flex-col">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Ticket List Header */}
          <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/30">
            <span className="text-sm font-medium">
              {views.find(v => v.id === activeView)?.name} ({tickets.length})
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.location.reload()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Ticket List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No tickets found</p>
              </div>
            ) : (
              <div className="divide-y">
                {tickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`relative p-3 pl-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50'
                      }`}
                    >
                      {getPriorityIndicator(ticket.priority)}
                      
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground font-mono">
                              #{ticket.id.slice(0, 6)}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${statusConfig[ticket.status as keyof typeof statusConfig]?.color || 'bg-gray-400'}`} />
                          </div>
                          <h4 className="text-sm font-medium line-clamp-1 mb-1">{ticket.subject}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {getAgentName(ticket.assigned_to)}
                        </span>
                        <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Ticket Detail */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedTicket ? (
            <>
              {/* Ticket Header */}
              <div className="p-4 border-b bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{selectedTicket.id.slice(0, 8)}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <Badge 
                        variant="outline" 
                        className={`${statusConfig[selectedTicket.status as keyof typeof statusConfig]?.color || 'bg-gray-500'} text-white border-0`}
                      >
                        {statusConfig[selectedTicket.status as keyof typeof statusConfig]?.label || selectedTicket.status}
                      </Badge>
                      {selectedTicket.priority && (
                        <Badge variant="outline" className={priorityConfig[selectedTicket.priority as keyof typeof priorityConfig]?.textColor}>
                          {priorityConfig[selectedTicket.priority as keyof typeof priorityConfig]?.label || selectedTicket.priority}
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold line-clamp-1">{selectedTicket.subject}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                        >
                          {showDetailsPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Toggle details panel</TooltipContent>
                    </Tooltip>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Conversation Panel */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4 max-w-3xl mx-auto">
                      {/* Initial ticket message */}
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                            {selectedTicket.user_id?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">Requester</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                          </div>
                        </div>
                      </div>

                      {messages.map((message) => (
                        <div key={message.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`text-xs ${message.is_staff_reply ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                              {message.is_staff_reply ? 'A' : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {message.is_staff_reply ? 'Agent' : 'Requester'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                              </span>
                              {message.is_staff_reply && (
                                <Badge variant="outline" className="text-xs h-5">Staff</Badge>
                              )}
                            </div>
                            <div className={`rounded-lg p-3 ${message.is_staff_reply ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}>
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Reply Input */}
                  <div className="p-4 border-t bg-card">
                    {/* Canned responses dropdown */}
                    {showCannedResponses && cannedResponses.length > 0 && (
                      <div className="mb-3 p-3 bg-muted rounded-lg border max-h-48 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Quick Replies</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCannedResponses(false)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-1">
                          {cannedResponses.map((response) => (
                            <button
                              key={response.id}
                              className="w-full text-left p-2 hover:bg-background rounded-md text-sm transition-colors"
                              onClick={() => useCannedResponse(response)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{response.title}</span>
                                {response.shortcut && (
                                  <Badge variant="outline" className="text-xs">/{response.shortcut}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{response.content}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowCannedResponses(!showCannedResponses)}
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Quick replies</TooltipContent>
                      </Tooltip>
                      <Textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                        placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                        disabled={isSending}
                        className="flex-1 min-h-[80px] max-h-40 resize-none"
                      />
                      <Button
                        onClick={sendReply}
                        disabled={isSending || !inputValue.trim()}
                        className="h-10"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Details Sidebar */}
                {showDetailsPanel && (
                  <div className="w-72 border-l bg-muted/20 overflow-y-auto">
                    <div className="p-4 space-y-6">
                      {/* Requester Info */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Requester</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-secondary">
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">User</p>
                            <p className="text-xs text-muted-foreground">ID: {selectedTicket.user_id?.slice(0, 8)}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Ticket Properties */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Properties</h4>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Status</Label>
                            <Select 
                              value={selectedTicket.status} 
                              onValueChange={(v) => updateTicket(selectedTicket.id, { status: v })}
                            >
                              <SelectTrigger className="h-8 mt-1">
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
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground">Priority</Label>
                            <Select 
                              value={selectedTicket.priority || 'medium'} 
                              onValueChange={(v) => updateTicket(selectedTicket.id, { priority: v })}
                            >
                              <SelectTrigger className="h-8 mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground">Assignee</Label>
                            <Select 
                              value={selectedTicket.assigned_to || 'unassigned'} 
                              onValueChange={(v) => updateTicket(selectedTicket.id, { assigned_to: v === 'unassigned' ? null : v })}
                            >
                              <SelectTrigger className="h-8 mt-1">
                                <SelectValue placeholder="Select assignee" />
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

                          {selectedTicket.category && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Category</Label>
                              <Badge variant="outline" className="mt-1">{selectedTicket.category}</Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Timeline */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Timeline</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Created: {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Updated: {formatDistanceToNow(new Date(selectedTicket.updated_at), { addSuffix: true })}</span>
                          </div>
                          {selectedTicket.resolved_at && (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              <span>Resolved: {format(new Date(selectedTicket.resolved_at), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No ticket selected</p>
                <p className="text-sm">Select a ticket from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
