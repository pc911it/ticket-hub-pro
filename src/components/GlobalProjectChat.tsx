import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ChevronLeft, Building2, Users, Clock, Check, X } from 'lucide-react';
import { ProjectChat } from './ProjectChat';
import { CompanyPartnerships } from './CompanyPartnerships';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  status: string;
  company_id: string | null;
}

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
    company_id: string;
    companies: { name: string } | null;
  };
}

export function GlobalProjectChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingPartnerships, setPendingPartnerships] = useState<PendingPartnership[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'share'>('chat');
  const [mainView, setMainView] = useState<'projects' | 'invitations'>('projects');
  const [loading, setLoading] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchProjects();
      fetchPendingPartnerships();
    }
  }, [isOpen, user]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, company_id')
      .order('updated_at', { ascending: false })
      .limit(20);
    
    if (data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const fetchPendingPartnerships = async () => {
    if (!user) return;

    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) return;

    setUserCompanyId(membership.company_id);

    const { data } = await supabase
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
          company_id,
          companies:company_id(name)
        )
      `)
      .eq('company_id', membership.company_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      setPendingPartnerships(data as unknown as PendingPartnership[]);
    }
  };

  const respondToInvitation = async (partnership: PendingPartnership, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('project_companies')
        .update({
          status: accept ? 'accepted' : 'declined',
          accepted_at: accept ? new Date().toISOString() : null
        })
        .eq('id', partnership.id);

      if (error) throw error;

      try {
        await supabase.functions.invoke('send-partnership-email', {
          body: {
            type: accept ? 'accepted' : 'declined',
            project_id: partnership.project_id,
            partner_company_id: userCompanyId,
            inviting_company_id: partnership.projects.company_id
          }
        });
      } catch (emailError) {
        console.error('Failed to send partnership email:', emailError);
      }

      toast.success(accept ? 'Partnership accepted!' : 'Partnership declined');
      fetchPendingPartnerships();
      fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond');
    }
  };

  const handleBack = () => {
    if (selectedProject) {
      setSelectedProject(null);
      setActiveTab('chat');
    } else {
      setMainView('projects');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success';
      case 'completed': return 'bg-info/10 text-info';
      case 'on-hold': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setSelectedProject(null);
        setActiveTab('chat');
        setMainView('projects');
      }
    }}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className={cn(
            "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "transition-all duration-200 hover:scale-105"
          )}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b bg-background">
          <SheetTitle className="flex items-center gap-2">
            {selectedProject ? (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {activeTab === 'chat' ? (
                  <MessageCircle className="h-5 w-5 text-primary" />
                ) : (
                  <Users className="h-5 w-5 text-primary" />
                )}
                {selectedProject.name}
              </>
            ) : mainView === 'invitations' ? (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Clock className="h-5 w-5 text-warning" />
                Pending Invitations
              </>
            ) : (
              <>
                <MessageCircle className="h-5 w-5 text-primary" />
                Project Chats
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        {selectedProject ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'share')} className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="mx-4 mt-2 grid grid-cols-2">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="share" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Share
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="flex-1 overflow-hidden p-4 mt-0">
                <ProjectChat projectId={selectedProject.id} />
              </TabsContent>
              <TabsContent value="share" className="flex-1 overflow-auto p-4 mt-0">
                <CompanyPartnerships projectId={selectedProject.id} projectName={selectedProject.name} />
              </TabsContent>
            </Tabs>
          </div>
        ) : mainView === 'invitations' ? (
          <ScrollArea className="flex-1 p-4">
            {pendingPartnerships.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No pending invitations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPartnerships.map((partnership) => (
                  <div
                    key={partnership.id}
                    className="p-4 bg-muted/50 rounded-lg border space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{partnership.projects.name}</p>
                        <p className="text-xs text-muted-foreground">
                          From: {partnership.projects.companies?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => respondToInvitation(partnership, false)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => respondToInvitation(partnership, true)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1">
            {/* Pending Invitations Banner */}
            {pendingPartnerships.length > 0 && (
              <button
                onClick={() => setMainView('invitations')}
                className="w-full p-3 bg-warning/10 border-b border-warning/20 flex items-center justify-between hover:bg-warning/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Pending Invitations</span>
                </div>
                <Badge variant="secondary" className="bg-warning/20 text-warning">
                  {pendingPartnerships.length}
                </Badge>
              </button>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No projects available</p>
                <p className="text-muted-foreground text-xs mt-1">Create a project to start chatting</p>
              </div>
            ) : (
              <div className="p-2">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <span className={cn(
                        "inline-block text-xs px-2 py-0.5 rounded-full mt-1",
                        getStatusColor(project.status)
                      )}>
                        {project.status}
                      </span>
                    </div>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
