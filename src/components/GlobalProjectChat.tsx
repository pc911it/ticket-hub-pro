import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, ChevronLeft, Building2 } from 'lucide-react';
import { ProjectChat } from './ProjectChat';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  status: string;
  company_id: string | null;
}

export function GlobalProjectChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchProjects();
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

  const handleBack = () => {
    setSelectedProject(null);
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
      if (!open) setSelectedProject(null);
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
                <MessageCircle className="h-5 w-5 text-primary" />
                {selectedProject.name}
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
          <div className="flex-1 overflow-hidden p-4">
            <ProjectChat projectId={selectedProject.id} />
          </div>
        ) : (
          <ScrollArea className="flex-1">
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
