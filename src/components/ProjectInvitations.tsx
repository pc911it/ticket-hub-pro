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
      // Check if email exists in the system
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (!existingUser) {
        toast.error('This email is not registered in the system. The user must have an account first.');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('project_invitations')
        .insert({
          project_id: projectId,
          invited_email: email.trim().toLowerCase(),
          invited_by: user.id,
          invited_user_id: existingUser.id,
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
        return (
          <Badge className="bg-emerald-500 text-white border-emerald-600 shadow-sm">
            <Check className="h-3 w-3 mr-1" /> Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge className="bg-red-500 text-white border-red-600 shadow-sm">
            <X className="h-3 w-3 mr-1" /> Declined
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          Project Invitations
          {invitations.filter(i => i.status === 'pending').length > 0 && (
            <Badge className="ml-auto bg-amber-500 text-white animate-pulse">
              {invitations.filter(i => i.status === 'pending').length} Pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email to invite..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendInvitation()}
            className="border-2 focus:border-primary"
          />
          <Button type="button" onClick={sendInvitation} disabled={loading || !email.trim()} className="shadow-md">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
        </div>

        {invitations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-2 w-2 bg-primary rounded-full"></span>
              Sent Invitations ({invitations.length})
            </h4>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    invitation.status === 'pending' 
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700' 
                      : invitation.status === 'accepted'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700'
                      : 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      invitation.status === 'pending' 
                        ? 'bg-amber-200 dark:bg-amber-800' 
                        : invitation.status === 'accepted'
                        ? 'bg-emerald-200 dark:bg-emerald-800'
                        : 'bg-red-200 dark:bg-red-800'
                    }`}>
                      <Mail className={`h-4 w-4 ${
                        invitation.status === 'pending' 
                          ? 'text-amber-700 dark:text-amber-300' 
                          : invitation.status === 'accepted'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-red-700 dark:text-red-300'
                      }`} />
                    </div>
                    <span className="text-sm font-medium">{invitation.invited_email}</span>
                    {getStatusBadge(invitation.status)}
                  </div>
                  {invitation.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelInvitation(invitation.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
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
          <div className="text-center py-6 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
            <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No invitations sent yet. Invite external collaborators by email.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
