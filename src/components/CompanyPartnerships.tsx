import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  UserPlus, 
  X, 
  Check, 
  Clock, 
  Search,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProjectCompany {
  id: string;
  project_id: string;
  company_id: string;
  invited_by: string;
  status: string;
  role: string;
  created_at: string;
  accepted_at: string | null;
  companies?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Company {
  id: string;
  name: string;
  email: string;
}

interface CompanyPartnershipsProps {
  projectId: string;
  projectName: string;
}

export function CompanyPartnerships({ projectId, projectName }: CompanyPartnershipsProps) {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<ProjectCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserCompany();
    fetchPartnerships();
  }, [projectId]);

  const fetchUserCompany = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (data) {
      setUserCompanyId(data.company_id);
      fetchCompanies(data.company_id);
    }
  };

  const fetchCompanies = async (excludeCompanyId: string) => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, email')
      .neq('id', excludeCompanyId)
      .eq('approval_status', 'approved')
      .order('name');

    if (!error && data) {
      setCompanies(data);
    }
  };

  const fetchPartnerships = async () => {
    const { data, error } = await supabase
      .from('project_companies')
      .select('*, companies(id, name, email)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPartnerships(data as ProjectCompany[]);
    }
  };

  const inviteByEmail = async () => {
    if (!email.trim() || !user) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Find company by email
      const { data: company, error: findError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (findError) throw findError;

      if (!company) {
        toast.error('No company found with this email address');
        setLoading(false);
        return;
      }

      if (company.id === userCompanyId) {
        toast.error('You cannot invite your own company');
        setLoading(false);
        return;
      }

      // Check if already invited
      const existing = partnerships.find(p => p.company_id === company.id);
      if (existing) {
        toast.error('This company has already been invited to this project');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('project_companies')
        .insert({
          project_id: projectId,
          company_id: company.id,
          invited_by: user.id,
          status: 'pending',
          role: 'partner'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This company has already been invited to this project');
        } else {
          throw error;
        }
      } else {
        toast.success(`Partnership invitation sent to ${company.name}`);
        setEmail('');
        fetchPartnerships();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const inviteByCompany = async (company: Company) => {
    if (!user) return;

    if (company.id === userCompanyId) {
      toast.error('You cannot invite your own company');
      return;
    }

    const existing = partnerships.find(p => p.company_id === company.id);
    if (existing) {
      toast.error('This company has already been invited to this project');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_companies')
        .insert({
          project_id: projectId,
          company_id: company.id,
          invited_by: user.id,
          status: 'pending',
          role: 'partner'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This company has already been invited to this project');
        } else {
          throw error;
        }
      } else {
        toast.success(`Partnership invitation sent to ${company.name}`);
        setSearchOpen(false);
        setSearchQuery('');
        fetchPartnerships();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const removePartnership = async (partnershipId: string) => {
    try {
      const { error } = await supabase
        .from('project_companies')
        .delete()
        .eq('id', partnershipId);

      if (error) throw error;
      toast.success('Partnership removed');
      fetchPartnerships();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove partnership');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-success text-success-foreground"><Check className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'declined':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Declined</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          Company Partnerships
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Company</TabsTrigger>
            <TabsTrigger value="email">Invite by Email</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-2">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={searchOpen}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search registered companies...
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search companies..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No companies found.</CommandEmpty>
                    <CommandGroup>
                      {filteredCompanies.map((company) => (
                        <CommandItem
                          key={company.id}
                          value={company.name}
                          onSelect={() => inviteByCompany(company)}
                          className="cursor-pointer"
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          <div className="flex flex-col">
                            <span>{company.name}</span>
                            <span className="text-xs text-muted-foreground">{company.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter company email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inviteByEmail()}
              />
              <Button onClick={inviteByEmail} disabled={loading || !email.trim()}>
                <Mail className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {partnerships.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Partner Companies</h4>
            <div className="space-y-2">
              {partnerships.map((partnership) => (
                <div
                  key={partnership.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{partnership.companies?.name}</span>
                      <p className="text-xs text-muted-foreground">{partnership.companies?.email}</p>
                    </div>
                    {getStatusBadge(partnership.status)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePartnership(partnership.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {partnerships.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No partner companies yet. Invite other companies to collaborate on this project.
          </p>
        )}
      </CardContent>
    </Card>
  );
}