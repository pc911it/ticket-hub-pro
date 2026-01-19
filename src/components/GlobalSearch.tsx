import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Building2, 
  Users, 
  FolderKanban, 
  Ticket, 
  FileText, 
  User,
  Loader2,
  X
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'company' | 'user' | 'project' | 'ticket' | 'client' | 'invoice';
  title: string;
  subtitle?: string;
  url: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search when query changes
  useEffect(() => {
    const search = async () => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      const searchResults: SearchResult[] = [];
      const searchTerm = `%${query}%`;

      try {
        // Search companies (super admin only)
        if (isSuperAdmin) {
          const { data: companies, error: companyError } = await supabase
            .from('companies')
            .select('id, name, email')
            .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
            .is('deleted_at', null)
            .limit(5);

          if (!companyError && companies) {
            companies.forEach(c => {
              searchResults.push({
                id: c.id,
                type: 'company',
                title: c.name,
                subtitle: c.email,
                url: `/admin/dashboard`,
              });
            });
          }
        }

        // Search users/profiles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email')
          .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(5);

        if (!profileError && profiles) {
          profiles.forEach(p => {
            searchResults.push({
              id: p.id,
              type: 'user',
              title: p.full_name || 'Unknown',
              subtitle: p.email || undefined,
              url: '/admin/users',
            });
          });
        }

        // Search projects
        const { data: projects, error: projectError } = await supabase
          .from('projects')
          .select('id, name, description')
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .is('deleted_at', null)
          .limit(5);

        if (!projectError && projects) {
          projects.forEach(p => {
            searchResults.push({
              id: p.id,
              type: 'project',
              title: p.name,
              subtitle: p.description?.substring(0, 50) || undefined,
              url: `/admin/projects/${p.id}`,
            });
          });
        }

        // Search tickets
        const { data: tickets, error: ticketError } = await supabase
          .from('tickets')
          .select('id, title, status')
          .ilike('title', searchTerm)
          .is('deleted_at', null)
          .limit(5);

        if (!ticketError && tickets) {
          tickets.forEach(t => {
            searchResults.push({
              id: t.id,
              type: 'ticket',
              title: t.title,
              subtitle: `Status: ${t.status}`,
              url: '/admin/tickets',
            });
          });
        }

        // Search clients
        const { data: clients, error: clientError } = await supabase
          .from('clients')
          .select('id, full_name, email')
          .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .is('deleted_at', null)
          .limit(5);

        if (!clientError && clients) {
          clients.forEach(c => {
            searchResults.push({
              id: c.id,
              type: 'client',
              title: c.full_name,
              subtitle: c.email || undefined,
              url: '/admin/clients',
            });
          });
        }

        // Search invoices
        const { data: invoices, error: invoiceError } = await supabase
          .from('client_invoices')
          .select('id, invoice_number, amount, status')
          .ilike('invoice_number', searchTerm)
          .limit(5);

        if (!invoiceError && invoices) {
          invoices.forEach(i => {
            searchResults.push({
              id: i.id,
              type: 'invoice',
              title: `Invoice ${i.invoice_number}`,
              subtitle: `$${(i.amount / 100).toFixed(2)} - ${i.status}`,
              url: '/admin/billing',
            });
          });
        }

        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, isSuperAdmin]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    navigate(result.url);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'company': return <Building2 className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'project': return <FolderKanban className="h-4 w-4" />;
      case 'ticket': return <Ticket className="h-4 w-4" />;
      case 'client': return <Users className="h-4 w-4" />;
      case 'invoice': return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getTypeBadgeVariant = (type: SearchResult['type']) => {
    switch (type) {
      case 'company': return 'default';
      case 'user': return 'secondary';
      case 'project': return 'outline';
      case 'ticket': return 'destructive';
      case 'client': return 'default';
      case 'invoice': return 'secondary';
    }
  };

  return (
    <>
      {/* Search trigger button */}
      <Button
        variant="outline"
        size="sm"
        className="relative h-9 w-9 p-0 xl:h-9 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search companies, users, projects, tickets..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 px-0"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="border-t max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {query.length < 2 
                  ? 'Type at least 2 characters to search...' 
                  : 'No results found.'}
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      index === selectedIndex 
                        ? 'bg-accent text-accent-foreground' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex-shrink-0 text-muted-foreground">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    <Badge variant={getTypeBadgeVariant(result.type)} className="flex-shrink-0 text-xs">
                      {getTypeLabel(result.type)}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center gap-4">
            <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Enter</kbd> Select</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Esc</kbd> Close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}