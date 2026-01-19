import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Search, 
  Building2, 
  Users, 
  FolderKanban, 
  Ticket, 
  FileText, 
  User,
  Loader2,
  X,
  LayoutDashboard,
  Text,
  Table,
  CreditCard,
  Hash
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'company' | 'user' | 'project' | 'ticket' | 'client' | 'invoice' | 'page' | 'page-content' | 'table-row' | 'card' | 'text';
  title: string;
  subtitle?: string;
  url: string;
  element?: Element;
}

// All navigable pages in the app
const PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', subtitle: 'Main overview', url: '/admin/dashboard' },
  { id: 'projects', type: 'page', title: 'Projects', subtitle: 'Manage projects', url: '/admin/projects' },
  { id: 'tickets', type: 'page', title: 'Tickets', subtitle: 'Support tickets', url: '/admin/tickets' },
  { id: 'clients', type: 'page', title: 'Clients', subtitle: 'Client management', url: '/admin/clients' },
  { id: 'users', type: 'page', title: 'Users', subtitle: 'User management', url: '/admin/users' },
  { id: 'employees', type: 'page', title: 'Employees', subtitle: 'Employee management', url: '/admin/employees' },
  { id: 'billing', type: 'page', title: 'Billing', subtitle: 'Invoices & payments', url: '/admin/billing' },
  { id: 'calendar', type: 'page', title: 'Calendar', subtitle: 'Schedule & events', url: '/admin/calendar' },
  { id: 'leads', type: 'page', title: 'Leads', subtitle: 'Lead management', url: '/admin/leads' },
  { id: 'bids', type: 'page', title: 'Bids', subtitle: 'Bid management', url: '/admin/bids' },
  { id: 'contracts', type: 'page', title: 'Contracts', subtitle: 'Contract management', url: '/admin/contracts' },
  { id: 'permits', type: 'page', title: 'Permits', subtitle: 'Permit tracking', url: '/admin/permits' },
  { id: 'rfis', type: 'page', title: 'RFIs', subtitle: 'Request for information', url: '/admin/rfis' },
  { id: 'submittals', type: 'page', title: 'Submittals', subtitle: 'Submittal tracking', url: '/admin/submittals' },
  { id: 'change-orders', type: 'page', title: 'Change Orders', subtitle: 'Change order management', url: '/admin/change-orders' },
  { id: 'daily-logs', type: 'page', title: 'Daily Logs', subtitle: 'Daily log entries', url: '/admin/daily-logs' },
  { id: 'punch-lists', type: 'page', title: 'Punch Lists', subtitle: 'Punch list items', url: '/admin/punch-lists' },
  { id: 'inspections', type: 'page', title: 'Inspections', subtitle: 'Inspection tracking', url: '/admin/inspections' },
  { id: 'warranties', type: 'page', title: 'Warranties', subtitle: 'Warranty management', url: '/admin/warranties' },
  { id: 'equipment', type: 'page', title: 'Equipment', subtitle: 'Equipment tracking', url: '/admin/equipment' },
  { id: 'inventory', type: 'page', title: 'Inventory', subtitle: 'Inventory management', url: '/admin/inventory' },
  { id: 'suppliers', type: 'page', title: 'Suppliers', subtitle: 'Supplier management', url: '/admin/suppliers' },
  { id: 'subcontractors', type: 'page', title: 'Subcontractors', subtitle: 'Subcontractor management', url: '/admin/subcontractors' },
  { id: 'purchase-orders', type: 'page', title: 'Purchase Orders', subtitle: 'PO management', url: '/admin/purchase-orders' },
  { id: 'budgeting', type: 'page', title: 'Budgeting', subtitle: 'Budget tracking', url: '/admin/budgeting' },
  { id: 'floor-plans', type: 'page', title: 'Floor Plans', subtitle: 'Floor plan viewer', url: '/admin/floor-plans' },
  { id: 'construction-plans', type: 'page', title: 'Construction Plans', subtitle: 'Construction documents', url: '/admin/construction-plans' },
  { id: 'selections', type: 'page', title: 'Selections', subtitle: 'Material selections', url: '/admin/selections' },
  { id: 'mood-boards', type: 'page', title: 'Mood Boards', subtitle: 'Design mood boards', url: '/admin/mood-boards' },
  { id: 'product-library', type: 'page', title: 'Product Library', subtitle: 'Product catalog', url: '/admin/product-library' },
  { id: 'cost-calculator', type: 'page', title: 'Cost Calculator', subtitle: 'Cost estimation', url: '/admin/cost-calculator' },
  { id: 'ai-tools', type: 'page', title: 'AI Tools', subtitle: 'AI-powered features', url: '/admin/ai-tools' },
  { id: 'follow-ups', type: 'page', title: 'Follow Ups', subtitle: 'Follow up tasks', url: '/admin/follow-ups' },
  { id: 'dispatcher', type: 'page', title: 'Dispatcher', subtitle: 'Dispatch dashboard', url: '/admin/dispatcher' },
  { id: 'live-chats', type: 'page', title: 'Live Chats', subtitle: 'Live chat support', url: '/admin/live-chats' },
  { id: 'notifications', type: 'page', title: 'Notifications', subtitle: 'Notification center', url: '/admin/notifications' },
  { id: 'updates', type: 'page', title: 'Updates', subtitle: 'System updates', url: '/admin/updates' },
  { id: 'settings', type: 'page', title: 'Company Settings', subtitle: 'Company configuration', url: '/admin/settings' },
  { id: 'billing-settings', type: 'page', title: 'Billing Settings', subtitle: 'Payment configuration', url: '/admin/billing-settings' },
  { id: 'service-types', type: 'page', title: 'Service Types', subtitle: 'Service configuration', url: '/admin/service-types' },
  { id: 'integrations', type: 'page', title: 'Integrations', subtitle: 'Third-party integrations', url: '/admin/integrations' },
  { id: 'import-export', type: 'page', title: 'Import/Export', subtitle: 'Data import & export', url: '/admin/import-export' },
  { id: 'trash', type: 'page', title: 'Trash', subtitle: 'Deleted items', url: '/admin/trash' },
  { id: 'support', type: 'page', title: 'Support', subtitle: 'Get help', url: '/admin/support' },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin } = useAuth();

  // Helper function for fuzzy/flexible matching
  const matchesQuery = useCallback((text: string, searchTerms: string[]): boolean => {
    const lowerText = text.toLowerCase();
    // Match if ALL terms are found anywhere in the text (allows flexible word order)
    return searchTerms.every(term => lowerText.includes(term));
  }, []);

  // Function to get match score for ranking
  const getMatchScore = useCallback((text: string, searchTerms: string[], originalQuery: string): number => {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    // Exact match gets highest score
    if (lowerText.includes(originalQuery.toLowerCase())) {
      score += 100;
    }
    
    // Starting with query gets high score
    if (lowerText.startsWith(originalQuery.toLowerCase())) {
      score += 50;
    }
    
    // Each term found adds to score
    searchTerms.forEach(term => {
      if (lowerText.includes(term)) {
        score += 10;
        // Bonus if word starts with term
        if (lowerText.split(/\s+/).some(word => word.startsWith(term))) {
          score += 5;
        }
      }
    });
    
    // Shorter matches are often more relevant
    score -= Math.min(text.length / 10, 20);
    
    return score;
  }, []);

  // Function to search visible page content - comprehensive search
  const searchPageContent = useCallback((searchQuery: string): SearchResult[] => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    const searchTerms = lowerQuery.split(/\s+/).filter(term => term.length > 0);
    const pageResults: SearchResult[] = [];
    const seenTexts = new Set<string>();
    
    // Helper to add result with deduplication
    const addResult = (id: string, type: SearchResult['type'], title: string, subtitle: string, element: Element, key: string) => {
      if (!seenTexts.has(key) && title.length > 1) {
        seenTexts.add(key);
        pageResults.push({
          id,
          type,
          title: title.substring(0, 80),
          subtitle,
          url: location.pathname,
          element,
          score: getMatchScore(title + ' ' + subtitle, searchTerms, lowerQuery),
        } as SearchResult & { score: number });
      }
    };

    // Search ALL visible text nodes on the page
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip hidden elements, scripts, styles
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          const text = node.textContent?.trim() || '';
          if (text.length < 2 || text.length > 200) return NodeFilter.FILTER_REJECT;
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let textNode;
    while ((textNode = walker.nextNode())) {
      const text = textNode.textContent?.trim() || '';
      if (matchesQuery(text, searchTerms)) {
        const parent = textNode.parentElement!;
        const tagName = parent.tagName.toLowerCase();
        
        // Determine type based on element
        let type: SearchResult['type'] = 'text';
        let subtitle = 'Text match';
        
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          type = 'page-content';
          subtitle = 'Heading';
        } else if (tagName === 'button' || parent.getAttribute('role') === 'button') {
          type = 'text';
          subtitle = 'Button';
        } else if (tagName === 'a') {
          type = 'text';
          subtitle = 'Link';
        } else if (tagName === 'label') {
          type = 'text';
          subtitle = 'Label';
        } else if (parent.classList.toString().includes('badge') || parent.classList.toString().includes('Badge')) {
          type = 'text';
          subtitle = 'Badge';
        }
        
        const key = `text-${text.substring(0, 50)}`;
        addResult(`text-${seenTexts.size}`, type, text, subtitle, parent, key);
      }
    }

    // Search table rows (comprehensive)
    const tableRows = document.querySelectorAll('table tbody tr');
    tableRows.forEach((row, index) => {
      const rowText = row.textContent || '';
      if (matchesQuery(rowText, searchTerms)) {
        const cells = row.querySelectorAll('td');
        const cellTexts = Array.from(cells).map(c => c.textContent?.trim()).filter(Boolean);
        const title = cellTexts[0] || `Row ${index + 1}`;
        const subtitle = cellTexts.slice(1).join(' • ').substring(0, 80) || 'Table row';
        const key = `table-${index}-${title.substring(0, 20)}`;
        addResult(`table-row-${index}`, 'table-row', title, subtitle, row as Element, key);
      }
    });

    // Search cards (comprehensive)
    const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
    cards.forEach((card, index) => {
      const cardText = card.textContent || '';
      if (matchesQuery(cardText, searchTerms)) {
        const heading = card.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="Title"]');
        const title = heading?.textContent?.trim() || cardText.trim().substring(0, 50);
        const key = `card-${title.substring(0, 30)}`;
        addResult(`card-${index}`, 'card', title, 'Card content', card as Element, key);
      }
    });

    // Search list items
    const listItems = document.querySelectorAll('li, [role="listitem"], [role="option"]');
    listItems.forEach((item, index) => {
      const itemText = item.textContent || '';
      if (matchesQuery(itemText, searchTerms) && itemText.length < 150) {
        const title = itemText.trim().substring(0, 80);
        const key = `list-${title.substring(0, 30)}`;
        addResult(`list-${index}`, 'text', title, 'List item', item as Element, key);
      }
    });

    // Search input placeholders and values
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input, index) => {
      const el = input as HTMLInputElement;
      const placeholder = el.placeholder || '';
      const value = el.value || '';
      const label = document.querySelector(`label[for="${el.id}"]`)?.textContent || '';
      const combined = `${label} ${placeholder} ${value}`;
      
      if (matchesQuery(combined, searchTerms)) {
        const title = label || placeholder || `Input field`;
        const key = `input-${title.substring(0, 30)}`;
        addResult(`input-${index}`, 'text', title, 'Form field', input as Element, key);
      }
    });

    // Search data attributes that might contain searchable content
    const dataElements = document.querySelectorAll('[data-label], [data-name], [data-title], [aria-label]');
    dataElements.forEach((el, index) => {
      const dataLabel = el.getAttribute('data-label') || el.getAttribute('data-name') || 
                        el.getAttribute('data-title') || el.getAttribute('aria-label') || '';
      if (matchesQuery(dataLabel, searchTerms)) {
        const key = `data-${dataLabel.substring(0, 30)}`;
        addResult(`data-${index}`, 'text', dataLabel, 'Element', el as Element, key);
      }
    });

    // Sort by match score and return top results
    return (pageResults as (SearchResult & { score: number })[])
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20)
      .map(({ score, ...result }) => result);
  }, [location.pathname, matchesQuery, getMatchScore]);

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
      const lowerQuery = query.toLowerCase();

      // Search current page content first (instant, no DB call)
      const pageContentResults = searchPageContent(query);
      searchResults.push(...pageContentResults);

      // Search pages/navigation with flexible matching (instant, no DB call)
      const searchTerms = lowerQuery.split(/\s+/).filter(term => term.length > 0);
      const matchingPages = PAGES.filter(page => {
        const pageText = `${page.title} ${page.subtitle || ''}`.toLowerCase();
        return searchTerms.every(term => pageText.includes(term));
      }).slice(0, 5);
      searchResults.push(...matchingPages);

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
  }, [query, isSuperAdmin, searchPageContent]);

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
    
    // If result has an element reference, scroll to it and highlight
    if (result.element) {
      setTimeout(() => {
        result.element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight effect
        const el = result.element as HTMLElement;
        const originalBg = el.style.backgroundColor;
        const originalTransition = el.style.transition;
        el.style.transition = 'background-color 0.3s ease';
        el.style.backgroundColor = 'hsl(var(--primary) / 0.2)';
        
        setTimeout(() => {
          el.style.backgroundColor = originalBg;
          setTimeout(() => {
            el.style.transition = originalTransition;
          }, 300);
        }, 2000);
      }, 100);
    } else {
      navigate(result.url);
    }
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'company': return <Building2 className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'project': return <FolderKanban className="h-4 w-4" />;
      case 'ticket': return <Ticket className="h-4 w-4" />;
      case 'client': return <Users className="h-4 w-4" />;
      case 'invoice': return <FileText className="h-4 w-4" />;
      case 'page': return <LayoutDashboard className="h-4 w-4" />;
      case 'page-content': return <Hash className="h-4 w-4" />;
      case 'table-row': return <Table className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'text': return <Text className="h-4 w-4" />;
    }
  };


  const getTypeBadgeVariant = (type: SearchResult['type']) => {
    switch (type) {
      case 'company': return 'default';
      case 'user': return 'secondary';
      case 'project': return 'outline';
      case 'ticket': return 'destructive';
      case 'client': return 'default';
      case 'invoice': return 'secondary';
      case 'page': return 'outline';
      case 'page-content': return 'secondary';
      case 'table-row': return 'default';
      case 'card': return 'secondary';
      case 'text': return 'outline';
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'page-content': return 'Heading';
      case 'table-row': return 'Table';
      case 'card': return 'Card';
      case 'text': return 'Text';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
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
            <DialogDescription className="sr-only">Search across companies, users, projects, tickets, and pages</DialogDescription>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search everything... (try multiple words)"
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