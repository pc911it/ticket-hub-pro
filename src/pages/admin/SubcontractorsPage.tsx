import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  HardHat,
  Star,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  AlertTriangle,
  Building2
} from 'lucide-react';

const tradeOptions = [
  'Electrical', 'Plumbing', 'HVAC', 'Framing', 'Drywall', 'Painting',
  'Roofing', 'Flooring', 'Concrete', 'Masonry', 'Landscaping', 'Excavation',
  'Insulation', 'Windows & Doors', 'Siding', 'Gutters', 'Fencing', 'Other'
];

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-500' },
  inactive: { label: 'Inactive', color: 'bg-muted text-muted-foreground' },
  blacklisted: { label: 'Blacklisted', color: 'bg-red-500/10 text-red-500' },
};

const SubcontractorsPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    trades: [] as string[],
    license_number: '',
    license_expiry: '',
    insurance_expiry: '',
    notes: '',
  });

  const { data: subcontractors, isLoading } = useQuery({
    queryKey: ['subcontractors', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('business_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('subcontractors').insert({
        company_id: effectiveCompanyId,
        business_name: data.business_name,
        contact_name: data.contact_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        trades: data.trades,
        license_number: data.license_number,
        license_expiry: data.license_expiry || null,
        insurance_expiry: data.insurance_expiry || null,
        notes: data.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
      toast.success('Subcontractor added');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to add subcontractor'),
  });

  const resetForm = () => {
    setFormData({
      business_name: '',
      contact_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      trades: [],
      license_number: '',
      license_expiry: '',
      insurance_expiry: '',
      notes: '',
    });
  };

  const toggleTrade = (trade: string) => {
    setFormData(prev => ({
      ...prev,
      trades: prev.trades.includes(trade)
        ? prev.trades.filter(t => t !== trade)
        : [...prev.trades, trade]
    }));
  };

  const filteredSubs = subcontractors?.filter(sub => {
    const matchesSearch = sub.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrade = tradeFilter === 'all' || sub.trades?.includes(tradeFilter);
    return matchesSearch && matchesTrade;
  }) || [];

  const stats = [
    { title: 'Total Subs', value: subcontractors?.length || 0, icon: HardHat, color: 'text-blue-500' },
    { title: 'Active', value: subcontractors?.filter(s => s.status === 'active').length || 0, icon: Building2, color: 'text-green-500' },
    { title: 'Expiring Docs', value: subcontractors?.filter(s => {
      const licenseExp = s.license_expiry ? new Date(s.license_expiry) : null;
      const insuranceExp = s.insurance_expiry ? new Date(s.insurance_expiry) : null;
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return (licenseExp && licenseExp < thirtyDays) || (insuranceExp && insuranceExp < thirtyDays);
    }).length || 0, icon: AlertTriangle, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subcontractors</h1>
          <p className="text-muted-foreground">Manage your trade partners and subcontractors</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subcontractor
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subcontractors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tradeFilter} onValueChange={setTradeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Trades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            {tradeOptions.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSubs.map((sub) => (
          <Card 
            key={sub.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedSub(sub)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium">{sub.business_name}</h3>
                  {sub.contact_name && (
                    <p className="text-sm text-muted-foreground">{sub.contact_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {sub.rating && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {sub.rating.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {sub.trades?.slice(0, 3).map((trade: string) => (
                  <Badge key={trade} variant="outline" className="text-xs">
                    {trade}
                  </Badge>
                ))}
                {sub.trades?.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{sub.trades.length - 3}
                  </Badge>
                )}
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                {sub.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {sub.phone}
                  </div>
                )}
                {sub.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {sub.city}, {sub.state}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                {sub.w9_on_file && <Badge className="bg-green-500/10 text-green-500 text-xs">W-9</Badge>}
                {sub.coi_on_file && <Badge className="bg-green-500/10 text-green-500 text-xs">COI</Badge>}
                <Badge className={statusConfig[sub.status]?.color}>
                  {statusConfig[sub.status]?.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSubs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No subcontractors found
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Subcontractor</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Business Name *</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>License Number</Label>
                <Input
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                />
              </div>
              <div>
                <Label>License Expiry</Label>
                <Input
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                />
              </div>
              <div>
                <Label>Insurance Expiry</Label>
                <Input
                  type="date"
                  value={formData.insurance_expiry}
                  onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              
              <div className="col-span-2">
                <Label>Trades</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tradeOptions.map((trade) => (
                    <Badge
                      key={trade}
                      variant={formData.trades.includes(trade) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleTrade(trade)}
                    >
                      {trade}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Subcontractor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!selectedSub} onOpenChange={() => setSelectedSub(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedSub && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedSub.business_name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <Badge className={statusConfig[selectedSub.status]?.color}>
                  {statusConfig[selectedSub.status]?.label}
                </Badge>

                {selectedSub.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-medium">{selectedSub.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({selectedSub.total_projects || 0} projects)</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedSub.trades?.map((trade: string) => (
                    <Badge key={trade} variant="secondary">{trade}</Badge>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Contact Information</h4>
                  {selectedSub.contact_name && (
                    <p className="text-sm">{selectedSub.contact_name}</p>
                  )}
                  {selectedSub.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedSub.email}`} className="hover:underline">
                        {selectedSub.email}
                      </a>
                    </div>
                  )}
                  {selectedSub.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedSub.phone}`} className="hover:underline">
                        {selectedSub.phone}
                      </a>
                    </div>
                  )}
                  {selectedSub.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedSub.address}, {selectedSub.city} {selectedSub.state}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Compliance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">License</p>
                      <p className="font-medium">{selectedSub.license_number || 'N/A'}</p>
                      {selectedSub.license_expiry && (
                        <p className="text-xs text-muted-foreground">
                          Exp: {format(new Date(selectedSub.license_expiry), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Insurance</p>
                      {selectedSub.insurance_expiry ? (
                        <p className="text-xs">
                          Exp: {format(new Date(selectedSub.insurance_expiry), 'MMM d, yyyy')}
                        </p>
                      ) : (
                        <p className="font-medium">N/A</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={selectedSub.w9_on_file ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}>
                      <FileCheck className="h-3 w-3 mr-1" />
                      W-9 {selectedSub.w9_on_file ? '✓' : 'Missing'}
                    </Badge>
                    <Badge className={selectedSub.coi_on_file ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}>
                      <FileCheck className="h-3 w-3 mr-1" />
                      COI {selectedSub.coi_on_file ? '✓' : 'Missing'}
                    </Badge>
                  </div>
                </div>

                {selectedSub.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedSub.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SubcontractorsPage;
