import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface PendingPartnership {
  id: string;
  project_id: string;
  company_id: string;
  status: string;
  created_at: string;
  projects: {
    id: string;
    name: string;
    description: string | null;
    companies: {
      name: string;
    } | null;
  };
}

export function PendingPartnerships() {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<PendingPartnership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPendingPartnerships();
    }
  }, [user]);

  const fetchPendingPartnerships = async () => {
    if (!user) return;

    // Get user's company
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('project_companies')
      .select(`
        id,
        project_id,
        company_id,
        status,
        created_at,
        projects!inner(
          id,
          name,
          description,
          companies:company_id(name)
        )
      `)
      .eq('company_id', membership.company_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPartnerships(data as unknown as PendingPartnership[]);
    }
    setLoading(false);
  };

  const respondToInvitation = async (partnershipId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('project_companies')
        .update({
          status: accept ? 'accepted' : 'declined',
          accepted_at: accept ? new Date().toISOString() : null
        })
        .eq('id', partnershipId);

      if (error) throw error;
      toast.success(accept ? 'Partnership accepted! You now have access to this project.' : 'Partnership declined');
      fetchPendingPartnerships();
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond to invitation');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (partnerships.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-warning" />
          Pending Partnership Invitations
        </CardTitle>
        <CardDescription>
          Other companies have invited your company to collaborate on their projects.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {partnerships.map((partnership) => (
          <div
            key={partnership.id}
            className="flex items-center justify-between p-4 bg-background rounded-lg border"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{partnership.projects.name}</p>
                <p className="text-sm text-muted-foreground">
                  From: {partnership.projects.companies?.name}
                </p>
                {partnership.projects.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {partnership.projects.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => respondToInvitation(partnership.id, false)}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => respondToInvitation(partnership.id, true)}
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