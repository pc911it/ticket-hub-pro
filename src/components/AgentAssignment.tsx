import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, X, User, Signal, SignalZero } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  full_name: string;
  is_online: boolean;
  is_available: boolean;
  phone: string | null;
}

interface AssignedAgent {
  id: string;
  agent_id: string;
  agent: Agent;
  role: string;
}

interface AgentAssignmentProps {
  projectId: string;
  onUpdate?: () => void;
}

export const AgentAssignment = ({ projectId, onUpdate }: AgentAssignmentProps) => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<AssignedAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      // Get user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData?.company_id) return;

      // Fetch all agents for this company
      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, full_name, is_online, is_available, phone')
        .eq('company_id', memberData.company_id)
        .order('full_name');

      if (agentsData) setAgents(agentsData);

      // Fetch assigned agents for this project
      const { data: assignedData } = await supabase
        .from('project_agents')
        .select(`
          id,
          agent_id,
          role,
          agents (
            id,
            full_name,
            is_online,
            is_available,
            phone
          )
        `)
        .eq('project_id', projectId);

      if (assignedData) {
        setAssignedAgents(
          assignedData.map((a: any) => ({
            id: a.id,
            agent_id: a.agent_id,
            agent: a.agents,
            role: a.role,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('project_agents')
      .insert({
        project_id: projectId,
        agent_id: selectedAgentId,
        assigned_by: user?.id,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ variant: 'destructive', title: 'Error', description: 'Agent is already assigned to this project.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign agent.' });
      }
    } else {
      toast({ title: 'Success', description: 'Agent assigned to project.' });
      setSelectedAgentId('');
      fetchData();
      onUpdate?.();
    }
  };

  const handleRemoveAgent = async (assignmentId: string) => {
    const { error } = await supabase
      .from('project_agents')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove agent.' });
    } else {
      toast({ title: 'Success', description: 'Agent removed from project.' });
      fetchData();
      onUpdate?.();
    }
  };

  // Filter out already assigned agents
  const assignedAgentIds = assignedAgents.map(a => a.agent_id);
  const availableAgents = agents.filter(a => !assignedAgentIds.includes(a.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Assigned Agents ({assignedAgents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Assigned Agents List */}
        {assignedAgents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {assignedAgents.map((assignment) => (
              <Badge
                key={assignment.id}
                variant="secondary"
                className="pl-2 pr-1 py-1 flex items-center gap-2"
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    assignment.agent.is_online ? "bg-success" : "bg-muted-foreground"
                  )}
                />
                {assignment.agent.full_name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => handleRemoveAgent(assignment.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add Agent */}
        <div className="flex gap-2">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select agent to assign" />
            </SelectTrigger>
            <SelectContent>
              {availableAgents.length === 0 ? (
                <SelectItem value="none" disabled>
                  No agents available
                </SelectItem>
              ) : (
                availableAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          agent.is_online ? "bg-success" : "bg-muted-foreground"
                        )}
                      />
                      {agent.full_name}
                      {agent.is_online && (
                        <span className="text-xs text-muted-foreground">
                          ({agent.is_available ? 'Available' : 'Busy'})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            onClick={handleAssignAgent}
            disabled={!selectedAgentId || availableAgents.length === 0}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {agents.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No agents in your company yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentAssignment;