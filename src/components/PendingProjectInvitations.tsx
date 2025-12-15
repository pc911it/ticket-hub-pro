import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, X, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectInvitation {
  id: string;
  project_id: string;
  invited_email: string;
  status: string;
  created_at: string;
  projects: { name: string } | null;
}

export function PendingProjectInvitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserEmail();
    }
  }, [user]);

  useEffect(() => {
    if (userEmail) {
      fetchInvitations();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('project-invitations-live')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_invitations',
            filter: `invited_email=eq.${userEmail}`
          },
          (payload) => {
            console.log('Project invitation change:', payload);
            fetchInvitations();
            if (payload.eventType === 'INSERT') {
              toast.info('You have a new project invitation!', {
                icon: <Mail className="h-4 w-4" />,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userEmail]);

  const fetchUserEmail = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.email) {
      setUserEmail(data.email);
    }
  };

  const fetchInvitations = async () => {
    if (!userEmail) return;
    
    const { data, error } = await supabase
      .from('project_invitations')
      .select('*, projects(name)')
      .eq('invited_email', userEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvitations(data);
    }
    setLoading(false);
  };

  const handleInvitation = async (invitationId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('project_invitations')
        .update({
          status: accept ? 'accepted' : 'declined',
          accepted_at: accept ? new Date().toISOString() : null,
          invited_user_id: user?.id
        })
        .eq('id', invitationId);

      if (error) throw error;
      
      toast.success(accept ? 'Invitation accepted!' : 'Invitation declined');
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update invitation');
    }
  };

  if (loading || invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/30 shadow-lg bg-gradient-to-r from-primary/5 to-transparent animate-pulse-slow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-primary/10 rounded-lg relative">
            <Mail className="h-5 w-5 text-primary" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
          </div>
          Project Invitations
          <Badge className="ml-auto bg-primary text-primary-foreground animate-bounce">
            {invitations.length} New
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 rounded-lg bg-card border-2 border-primary/20 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {invitation.projects?.name || 'Unknown Project'}
                </p>
                <p className="text-sm text-muted-foreground">
                  You've been invited to collaborate
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInvitation(invitation.id, false);
                }}
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInvitation(invitation.id, true);
                }}
                className="bg-success hover:bg-success/90 text-white"
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
