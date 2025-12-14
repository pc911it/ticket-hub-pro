import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Eye, Calendar, MapPin, DollarSign, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PartnerProject {
  id: string;
  project_id: string;
  status: string;
  role: string;
  projects: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    address: string | null;
    budget: number | null;
    companies: { name: string } | null;
    clients: { full_name: string } | null;
  };
}

export function PartnerProjects() {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<PartnerProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPartnerProjects();
    }
  }, [user]);

  const fetchPartnerProjects = async () => {
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
        status,
        role,
        projects!inner(
          id,
          name,
          description,
          status,
          start_date,
          end_date,
          address,
          budget,
          companies:company_id(name),
          clients:client_id(full_name)
        )
      `)
      .eq('company_id', membership.company_id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPartnerships(data as unknown as PartnerProject[]);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/30';
      case 'completed': return 'bg-info/10 text-info border-info/30';
      case 'on-hold': return 'bg-warning/10 text-warning border-warning/30';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
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
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Partner Projects
        </CardTitle>
        <CardDescription>
          Projects from other companies where you have collaboration access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partnerships.map((partnership, index) => (
            <Card
              key={partnership.id}
              className="border shadow-sm hover:shadow-md transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold truncate">{partnership.projects.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-xs", getStatusColor(partnership.projects.status))}>
                        {partnership.projects.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Partner
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    asChild
                  >
                    <Link to={`/admin/projects/${partnership.projects.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mb-2">
                  Owner: {partnership.projects.companies?.name}
                </p>

                {partnership.projects.clients && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Client: {partnership.projects.clients.full_name}
                  </p>
                )}

                <div className="space-y-1 text-sm">
                  {partnership.projects.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate text-xs">{partnership.projects.address}</span>
                    </div>
                  )}
                  {(partnership.projects.start_date || partnership.projects.end_date) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="text-xs">
                        {partnership.projects.start_date && format(new Date(partnership.projects.start_date), 'MMM d, yyyy')}
                        {partnership.projects.start_date && partnership.projects.end_date && ' - '}
                        {partnership.projects.end_date && format(new Date(partnership.projects.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {partnership.projects.budget && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-3 w-3 shrink-0" />
                      <span className="text-xs">${partnership.projects.budget.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}