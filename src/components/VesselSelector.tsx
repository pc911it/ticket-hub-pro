import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ship, Loader2 } from 'lucide-react';

interface Vessel {
  id: string;
  boat_name: string;
  hull_id: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
}

interface VesselSelectorProps {
  clientId: string;
  value?: string;
  onValueChange: (vesselId: string, vessel?: Vessel) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const VesselSelector = ({ 
  clientId, 
  value, 
  onValueChange, 
  placeholder = 'Select vessel',
  disabled = false 
}: VesselSelectorProps) => {
  const { data: vessels, isLoading } = useQuery({
    queryKey: ['client-vessels-select', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from('vessels')
        .select('id, boat_name, hull_id, make, model, year')
        .eq('client_id', clientId)
        .order('boat_name');
      return (data || []) as Vessel[];
    },
    enabled: !!clientId,
  });

  const handleChange = (vesselId: string) => {
    const vessel = vessels?.find(v => v.id === vesselId);
    onValueChange(vesselId, vessel);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-sm">Loading vessels...</span>
      </div>
    );
  }

  if (!vessels || vessels.length === 0) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-muted-foreground text-sm">
        <Ship className="h-4 w-4" />
        No vessels registered
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <Ship className="h-4 w-4" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No vessel</SelectItem>
        {vessels.map((vessel) => (
          <SelectItem key={vessel.id} value={vessel.id}>
            <div className="flex flex-col">
              <span>{vessel.boat_name}</span>
              {(vessel.make || vessel.model || vessel.year) && (
                <span className="text-xs text-muted-foreground">
                  {[vessel.year, vessel.make, vessel.model].filter(Boolean).join(' ')}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
