import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, UserPlus, X, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ProjectInvitation {
  id: string;
  project_id: string;
  invited_email: string;
  invited_user_id: string | null;
  invited_by: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

interface ProjectInvitationsProps {
  projectId: string;
  projectName: string;
}

export function ProjectInvitations({ projectId, projectName }: ProjectInvitationsProps) {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, [projectId]);

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvitations(data);
    }
  };

  const sendInvitation = async () => {
    if (!email.trim() || !user) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_invitations')
        .insert({
          project_id: projectId,
          invited_email: email.trim().toLowerCase(),
          invited_by: user.id,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This email has already been invited to this project');
        } else {
          throw error;
        }
      } else {
        toast.success(`Invitation sent to ${email}`);
        setEmail('');
        fetchInvitations();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('project_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      toast.success('Invitation cancelled');
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel invitation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Declined</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Project Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email to invite..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendInvitation()}
          />
          <Button onClick={sendInvitation} disabled={loading || !email.trim()}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
        </div>

        {invitations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Sent Invitations</h4>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{invitation.invited_email}</span>
                    {getStatusBadge(invitation.status)}
                  </div>
                  {invitation.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelInvitation(invitation.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {invitations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No invitations sent yet. Invite external collaborators by email.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
