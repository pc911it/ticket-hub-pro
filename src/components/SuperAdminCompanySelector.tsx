import { Building2, X, Eye } from 'lucide-react';
import { useSuperAdminCompany } from '@/contexts/SuperAdminCompanyContext';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const SuperAdminCompanySelector = () => {
  const { isSuperAdmin } = useAuth();
  const { 
    companies, 
    selectedCompanyId, 
    selectedCompany,
    setSelectedCompanyId, 
    isLoading,
    clearSelection 
  } = useSuperAdminCompany();

  if (!isSuperAdmin) return null;

  return (
    <div className="flex items-center gap-2">
      {selectedCompany && (
        <Badge 
          variant="outline" 
          className="bg-amber-500/10 text-amber-600 border-amber-500/30 flex items-center gap-1"
        >
          <Eye className="h-3 w-3" />
          Viewing as Company
        </Badge>
      )}
      
      <Select
        value={selectedCompanyId || 'all'}
        onValueChange={(value) => setSelectedCompanyId(value === 'all' ? null : value)}
        disabled={isLoading}
      >
        <SelectTrigger className={cn(
          "w-[220px] h-9",
          selectedCompany && "border-amber-500/50 bg-amber-500/5"
        )}>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Select company...">
              {selectedCompany ? selectedCompany.name : 'All Companies'}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>All Companies (Platform View)</span>
            </div>
          </SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="truncate max-w-[180px]">{company.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCompany && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={clearSelection}
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
