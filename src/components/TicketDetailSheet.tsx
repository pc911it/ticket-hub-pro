import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SignaturePad } from '@/components/SignaturePad';
import { JobTimelineMap } from '@/components/JobTimelineMap';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  CheckCircle2, 
  Circle, 
  Truck, 
  MapPin, 
  Wrench, 
  XCircle,
  PenTool,
  Radio
} from 'lucide-react';

interface JobUpdate {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  location_lat: number | null;
  location_lng: number | null;
  agents: { full_name: string } | null;
}

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  total_time_minutes: number | null;
  client_signature_url: string | null;
  client_approved_at: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  clients: { full_name: string } | null;
  projects: { name: string } | null;
  agents: { full_name: string } | null;
}

interface TicketDetailSheetProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const STATUS_STEPS = [
  { key: 'assigned', label: 'Assigned', icon: CheckCircle2 },
  { key: 'en_route', label: 'En Route', icon: Truck },
  { key: 'on_site', label: 'On Site', icon: MapPin },
  { key: 'working', label: 'Working', icon: Wrench },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const getStatusIndex = (status: string) => {
  const ticketStatusMap: Record<string, number> = {
    'pending': 0,
    'confirmed': 0,
    'assigned': 0,
    'en_route': 1,
    'on_site': 2,
    'working': 3,
    'completed': 4,
    'cancelled': -1,
  };
  return ticketStatusMap[status] ?? 0;
};

export function TicketDetailSheet({ ticket, open, onOpenChange, onUpdate }: TicketDetailSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobUpdates, setJobUpdates] = useState<JobUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [liveStatus, setLiveStatus] = useState(ticket?.status || 'pending');

  useEffect(() => {
    if (ticket) {
      setLiveStatus(ticket.status);
      fetchJobUpdates();
    }
  }, [ticket?.id]);

  // Real-time subscription for ticket status updates
  useEffect(() => {
    if (!ticket?.id) return;

    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticket.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          setLiveStatus(newStatus);
          toast({
            title: 'Status Updated',
            description: `Ticket status changed to ${newStatus}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_updates',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        () => {
          fetchJobUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket?.id]);

  const fetchJobUpdates = async () => {
    if (!ticket?.id) return;

    const { data } = await supabase
      .from('job_updates')
      .select('id, status, notes, created_at, location_lat, location_lng, agents(full_name)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    if (data) setJobUpdates(data as JobUpdate[]);
  };

  const handleSignatureSave = async (signatureDataUrl: string) => {
    if (!ticket?.id || !user) return;
    setSigningLoading(true);

    try {
      // Convert base64 to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();
      
      const fileName = `${ticket.id}-${Date.now()}.png`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('client-signatures')
        .upload(fileName, blob, {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('client-signatures')
        .getPublicUrl(fileName);

      // Update ticket with signature
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          client_signature_url: urlData.publicUrl,
          client_approved_at: new Date().toISOString(),
          client_approved_by: user.id,
        })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      toast({
        title: 'Signature Saved',
        description: 'The ticket has been signed and can now be completed.',
      });

      setShowSignature(false);
      onUpdate();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save signature. Please try again.',
      });
    } finally {
      setSigningLoading(false);
    }
  };

  const handleCompleteTicket = async () => {
    if (!ticket?.id) return;

    if (!ticket.client_signature_url) {
      toast({
        variant: 'destructive',
        title: 'Signature Required',
        description: 'Please capture a signature before completing this ticket.',
      });
      return;
    }

    const { error } = await supabase
      .from('tickets')
      .update({ status: 'completed' })
      .eq('id', ticket.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete ticket.' });
    } else {
      toast({ title: 'Completed', description: 'Ticket has been marked as completed.' });
      onUpdate();
      onOpenChange(false);
    }
  };

  if (!ticket) return null;

  const currentStatusIndex = getStatusIndex(liveStatus);
  const progressPercent = liveStatus === 'cancelled' ? 0 : ((currentStatusIndex + 1) / STATUS_STEPS.length) * 100;
  const isSigned = !!ticket.client_signature_url;
  const canComplete = isSigned && liveStatus !== 'completed' && liveStatus !== 'cancelled';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return CheckCircle2;
      case 'en_route': return Truck;
      case 'on_site': return MapPin;
      case 'working': return Wrench;
      case 'completed': return CheckCircle2;
      case 'cancelled': return XCircle;
      default: return Circle;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="font-display">{ticket.title}</SheetTitle>
            <Badge className={cn(
              "animate-pulse",
              liveStatus === 'completed' ? 'bg-success text-success-foreground' :
              liveStatus === 'cancelled' ? 'bg-destructive text-destructive-foreground' :
              'bg-primary text-primary-foreground'
            )}>
              <Radio className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </div>
          <SheetDescription>
            Track progress and manage this ticket in real-time.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Live Status Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Status</span>
                <Badge variant="outline" className="capitalize text-base px-3 py-1">
                  {liveStatus.replace('_', ' ')}
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-2" />
              
              {/* Progress Steps */}
              <div className="flex justify-between pt-2">
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = currentStatusIndex >= index;
                  const isCurrent = currentStatusIndex === index;
                  const StepIcon = step.icon;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        isCurrent && 'ring-2 ring-primary ring-offset-2'
                      )}>
                        <StepIcon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-[10px] text-center",
                        isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{ticket.clients?.full_name || 'No client'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{ticket.projects?.name || 'No project'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(ticket.scheduled_date), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{ticket.scheduled_time}</span>
            </div>
          </div>

          {ticket.description && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {ticket.description}
            </div>
          )}

          {/* Location Timeline Map */}
          <JobTimelineMap 
            jobUpdates={jobUpdates}
            callStartedAt={ticket.call_started_at}
            callEndedAt={ticket.call_ended_at}
          />

          {/* Activity Timeline */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Activity Timeline</h4>
            {jobUpdates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
                No activity updates yet. Updates will appear here in real-time.
              </p>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                {jobUpdates.map((update, index) => {
                  const UpdateIcon = getStatusIcon(update.status);
                  const hasLocation = update.location_lat && update.location_lng;
                  return (
                    <div key={update.id} className="relative flex gap-4 pb-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0",
                        index === jobUpdates.length - 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        <UpdateIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm capitalize">
                              {update.status.replace('_', ' ')}
                            </span>
                            {hasLocation && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                GPS
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(update.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {update.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{update.notes}</p>
                        )}
                        {update.agents?.full_name && (
                          <span className="text-xs text-muted-foreground">
                            by {update.agents.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Signature Section */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Client Signature
            </h4>
            
            {showSignature ? (
              <SignaturePad
                onSave={handleSignatureSave}
                onCancel={() => setShowSignature(false)}
                isLoading={signingLoading}
                title="Sign to Confirm Work"
              />
            ) : isSigned ? (
              <div className="space-y-2">
                <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-success">Signature Captured</p>
                    <p className="text-xs text-muted-foreground">
                      Signed on {ticket.client_approved_at && format(new Date(ticket.client_approved_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <img 
                  src={ticket.client_signature_url!} 
                  alt="Client signature" 
                  className="max-h-24 border rounded-lg bg-white"
                />
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowSignature(true)}
              >
                <PenTool className="h-4 w-4 mr-2" />
                Capture Signature
              </Button>
            )}
          </div>

          {/* Complete Button */}
          {canComplete && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleCompleteTicket}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Completed
            </Button>
          )}

          {!isSigned && liveStatus !== 'completed' && liveStatus !== 'cancelled' && (
            <p className="text-xs text-muted-foreground text-center bg-warning/10 p-2 rounded-lg">
              A client signature is required before this ticket can be completed.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}