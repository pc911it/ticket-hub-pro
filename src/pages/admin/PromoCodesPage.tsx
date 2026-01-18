import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Plus, Mail, Gift, Percent, DollarSign, Clock, Edit, Trash2, Send, Copy, Users, Repeat, Zap, Calendar, Tag, Layers, Star, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'trial_extension';
  discount_value: number;
  trial_extension_days: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  applicable_plans: string[];
  created_at: string;
  // New fields
  is_recurring: boolean;
  recurring_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  is_stackable: boolean;
  promo_category: 'standard' | 'referral' | 'loyalty' | 'seasonal' | 'flash_sale' | 'event';
  referral_bonus_value: number;
  referral_bonus_type: 'percentage' | 'fixed' | 'trial_extension' | null;
  min_purchase_amount: number;
  first_time_only: boolean;
  applies_to_renewals: boolean;
}

interface ReferralCode {
  id: string;
  code: string;
  owner_user_id: string | null;
  owner_company_id: string | null;
  promo_code_id: string | null;
  total_referrals: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
}

interface EmailCampaign {
  id: string;
  promo_code_id: string;
  name: string;
  subject: string;
  body: string;
  recipient_emails: string[] | null;
  sent_count: number;
  sent_at: string | null;
  status: 'draft' | 'scheduled' | 'sent';
  scheduled_for: string | null;
  created_at: string;
}

const PRESET_PERCENTAGES = [5, 10, 15, 20, 25, 30, 40, 50, 75];
const PRESET_FIXED_AMOUNTS = [10, 25, 50, 100, 150, 200, 250, 500];
const PRESET_TRIAL_DAYS = [7, 14, 21, 30, 60, 90];

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [selectedPromoForCampaign, setSelectedPromoForCampaign] = useState<string>('');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'trial_extension',
    discount_value: 0,
    trial_extension_days: 0,
    max_uses: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    applicable_plans: ['professional', 'advanced', 'enterprise'],
    // New fields
    is_recurring: false,
    recurring_interval: '' as string,
    is_stackable: false,
    promo_category: 'standard' as PromoCode['promo_category'],
    referral_bonus_value: 0,
    referral_bonus_type: '' as string,
    min_purchase_amount: 0,
    first_time_only: false,
    applies_to_renewals: false,
  });

  // Referral form state
  const [referralFormData, setReferralFormData] = useState({
    code: '',
    promo_code_id: '',
  });

  // Campaign form state
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    body: '',
    recipient_emails: '',
  });

  useEffect(() => {
    fetchPromoCodes();
    fetchReferralCodes();
    fetchCampaigns();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes((data || []) as PromoCode[]);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch promo codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferralCodes((data || []) as ReferralCode[]);
    } catch (error) {
      console.error('Error fetching referral codes:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as EmailCampaign[]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const generateCode = (prefix?: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix || '';
    const length = prefix ? 6 : 8;
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'REF-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setReferralFormData({ ...referralFormData, code });
  };

  const handleCreatePromo = async () => {
    try {
      const promoData = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name,
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_type !== 'trial_extension' ? formData.discount_value : 0,
        trial_extension_days: formData.discount_type === 'trial_extension' ? formData.trial_extension_days : 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
        applicable_plans: formData.applicable_plans,
        is_recurring: formData.is_recurring,
        recurring_interval: formData.is_recurring ? formData.recurring_interval : null,
        is_stackable: formData.is_stackable,
        promo_category: formData.promo_category,
        referral_bonus_value: formData.promo_category === 'referral' ? formData.referral_bonus_value : 0,
        referral_bonus_type: formData.promo_category === 'referral' ? formData.referral_bonus_type : null,
        min_purchase_amount: formData.min_purchase_amount,
        first_time_only: formData.first_time_only,
        applies_to_renewals: formData.applies_to_renewals,
      };

      if (editingPromo) {
        const { error } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingPromo.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Promo code updated successfully' });
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert(promoData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Promo code created successfully' });
      }

      setIsCreateDialogOpen(false);
      setEditingPromo(null);
      resetForm();
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save promo code',
        variant: 'destructive',
      });
    }
  };

  const handleCreateReferralCode = async () => {
    try {
      const { error } = await supabase.from('referral_codes').insert({
        code: referralFormData.code.toUpperCase().trim(),
        promo_code_id: referralFormData.promo_code_id || null,
      });

      if (error) throw error;
      toast({ title: 'Success', description: 'Referral code created successfully' });
      setIsReferralDialogOpen(false);
      setReferralFormData({ code: '', promo_code_id: '' });
      fetchReferralCodes();
    } catch (error: any) {
      console.error('Error creating referral code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create referral code',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      fetchPromoCodes();
      toast({
        title: 'Success',
        description: `Promo code ${isActive ? 'deactivated' : 'activated'}`,
      });
    } catch (error) {
      console.error('Error toggling promo code:', error);
      toast({
        title: 'Error',
        description: 'Failed to update promo code',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchPromoCodes();
      toast({ title: 'Success', description: 'Promo code deleted' });
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete promo code',
        variant: 'destructive',
      });
    }
  };

  const handleEditPromo = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      trial_extension_days: promo.trial_extension_days,
      max_uses: promo.max_uses?.toString() || '',
      valid_from: promo.valid_from.split('T')[0],
      valid_until: promo.valid_until?.split('T')[0] || '',
      applicable_plans: promo.applicable_plans,
      is_recurring: promo.is_recurring || false,
      recurring_interval: promo.recurring_interval || '',
      is_stackable: promo.is_stackable || false,
      promo_category: promo.promo_category || 'standard',
      referral_bonus_value: promo.referral_bonus_value || 0,
      referral_bonus_type: promo.referral_bonus_type || '',
      min_purchase_amount: promo.min_purchase_amount || 0,
      first_time_only: promo.first_time_only || false,
      applies_to_renewals: promo.applies_to_renewals || false,
    });
    setIsCreateDialogOpen(true);
  };

  const handleCreateCampaign = async () => {
    try {
      const emails = campaignData.recipient_emails
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter((e) => e && e.includes('@'));

      const { error } = await supabase.from('promo_email_campaigns').insert({
        promo_code_id: selectedPromoForCampaign,
        name: campaignData.name,
        subject: campaignData.subject,
        body: campaignData.body,
        recipient_emails: emails,
        status: 'draft',
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Email campaign created' });
      setIsCampaignDialogOpen(false);
      setCampaignData({ name: '', subject: '', body: '', recipient_emails: '' });
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!campaign) return;

      const promo = promoCodes.find((p) => p.id === campaign.promo_code_id);
      if (!promo) return;

      const { error } = await supabase.functions.invoke('send-promo-email', {
        body: {
          campaignId,
          promoCode: promo.code,
          subject: campaign.subject,
          body: campaign.body,
          emails: campaign.recipient_emails,
        },
      });

      if (error) throw error;

      await supabase
        .from('promo_email_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: campaign.recipient_emails?.length || 0,
        })
        .eq('id', campaignId);

      toast({ title: 'Success', description: 'Campaign sent successfully!' });
      fetchCampaigns();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to send campaign',
        variant: 'destructive',
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: 'Code copied to clipboard' });
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      trial_extension_days: 0,
      max_uses: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      applicable_plans: ['professional', 'advanced', 'enterprise'],
      is_recurring: false,
      recurring_interval: '',
      is_stackable: false,
      promo_category: 'standard',
      referral_bonus_value: 0,
      referral_bonus_type: '',
      min_purchase_amount: 0,
      first_time_only: false,
      applies_to_renewals: false,
    });
  };

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />;
      case 'fixed':
        return <DollarSign className="h-4 w-4" />;
      case 'trial_extension':
        return <Clock className="h-4 w-4" />;
      default:
        return <Gift className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'referral':
        return <Users className="h-4 w-4" />;
      case 'loyalty':
        return <Star className="h-4 w-4" />;
      case 'seasonal':
        return <Calendar className="h-4 w-4" />;
      case 'flash_sale':
        return <Zap className="h-4 w-4" />;
      case 'event':
        return <Tag className="h-4 w-4" />;
      default:
        return <Gift className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'referral':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'loyalty':
        return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'seasonal':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'flash_sale':
        return 'bg-red-500/10 text-red-600 border-red-200';
      case 'event':
        return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getDiscountDisplay = (promo: PromoCode) => {
    switch (promo.discount_type) {
      case 'percentage':
        return `${promo.discount_value}% off`;
      case 'fixed':
        return `$${promo.discount_value} off`;
      case 'trial_extension':
        return `+${promo.trial_extension_days} days`;
      default:
        return '';
    }
  };

  // Stats
  const stats = {
    totalActive: promoCodes.filter(p => p.is_active).length,
    totalUsed: promoCodes.reduce((sum, p) => sum + p.current_uses, 0),
    referralCodes: referralCodes.length,
    totalReferrals: referralCodes.reduce((sum, r) => sum + r.total_referrals, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes & Discounts</h1>
          <p className="text-muted-foreground">Manage promotional codes, referrals, and email campaigns</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isReferralDialogOpen} onOpenChange={setIsReferralDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                New Referral Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Referral Code</DialogTitle>
                <DialogDescription>Create a referral code that users can share</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Referral Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={referralFormData.code}
                      onChange={(e) => setReferralFormData({ ...referralFormData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., REF-JOHN123"
                      className="uppercase"
                    />
                    <Button type="button" variant="outline" onClick={generateReferralCode}>
                      Generate
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Link to Promo Code (Optional)</Label>
                  <Select
                    value={referralFormData.promo_code_id}
                    onValueChange={(value) => setReferralFormData({ ...referralFormData, promo_code_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a promo code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {promoCodes.filter(p => p.is_active && p.promo_category === 'referral').map((promo) => (
                        <SelectItem key={promo.id} value={promo.id}>
                          {promo.code} - {promo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReferralDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReferralCode}>Create Referral Code</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Email Campaign</DialogTitle>
                <DialogDescription>Send promotional codes to customers via email</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Promo Code</Label>
                  <Select value={selectedPromoForCampaign} onValueChange={setSelectedPromoForCampaign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a promo code" />
                    </SelectTrigger>
                    <SelectContent>
                      {promoCodes
                        .filter((p) => p.is_active)
                        .map((promo) => (
                          <SelectItem key={promo.id} value={promo.id}>
                            {promo.code} - {promo.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    value={campaignData.name}
                    onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                    placeholder="e.g., January 2026 Promotion"
                  />
                </div>
                <div>
                  <Label>Email Subject</Label>
                  <Input
                    value={campaignData.subject}
                    onChange={(e) => setCampaignData({ ...campaignData, subject: e.target.value })}
                    placeholder="e.g., 🎉 Exclusive 20% Off for You!"
                  />
                </div>
                <div>
                  <Label>Email Body</Label>
                  <Textarea
                    value={campaignData.body}
                    onChange={(e) => setCampaignData({ ...campaignData, body: e.target.value })}
                    placeholder="Write your promotional email message here..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The promo code will be automatically included in the email.
                  </p>
                </div>
                <div>
                  <Label>Recipient Emails</Label>
                  <Textarea
                    value={campaignData.recipient_emails}
                    onChange={(e) => setCampaignData({ ...campaignData, recipient_emails: e.target.value })}
                    placeholder="Enter emails separated by commas or new lines..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCampaignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign} disabled={!selectedPromoForCampaign}>
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingPromo(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Promo Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPromo ? 'Edit' : 'Create'} Promo Code</DialogTitle>
                <DialogDescription>
                  Create a promotional code with custom discounts and settings
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Promo Code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="e.g., SAVE20"
                          className="uppercase"
                        />
                        <Button type="button" variant="outline" onClick={() => generateCode()}>
                          Generate
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., New Year Sale"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Internal description for this promo..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={formData.promo_category}
                        onValueChange={(value: PromoCode['promo_category']) =>
                          setFormData({ ...formData, promo_category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">
                            <div className="flex items-center gap-2">
                              <Gift className="h-4 w-4" /> Standard
                            </div>
                          </SelectItem>
                          <SelectItem value="referral">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" /> Referral
                            </div>
                          </SelectItem>
                          <SelectItem value="loyalty">
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4" /> Loyalty
                            </div>
                          </SelectItem>
                          <SelectItem value="seasonal">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" /> Seasonal
                            </div>
                          </SelectItem>
                          <SelectItem value="flash_sale">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4" /> Flash Sale
                            </div>
                          </SelectItem>
                          <SelectItem value="event">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4" /> Event
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Discount Type</Label>
                      <Select
                        value={formData.discount_type}
                        onValueChange={(value: 'percentage' | 'fixed' | 'trial_extension') =>
                          setFormData({ ...formData, discount_type: value, discount_value: 0, trial_extension_days: 0 })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">
                            <div className="flex items-center gap-2">
                              <Percent className="h-4 w-4" /> Percentage Off
                            </div>
                          </SelectItem>
                          <SelectItem value="fixed">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" /> Fixed Amount Off
                            </div>
                          </SelectItem>
                          <SelectItem value="trial_extension">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" /> Trial Extension
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Discount Value */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    {formData.discount_type === 'percentage' ? <Percent className="h-4 w-4" /> : 
                     formData.discount_type === 'fixed' ? <DollarSign className="h-4 w-4" /> : 
                     <Clock className="h-4 w-4" />}
                    Discount Value
                  </h3>
                  
                  {formData.discount_type === 'percentage' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Select Percentage</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {PRESET_PERCENTAGES.map((pct) => (
                            <Button
                              key={pct}
                              type="button"
                              variant={formData.discount_value === pct ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setFormData({ ...formData, discount_value: pct })}
                            >
                              {pct}%
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Or enter custom: {formData.discount_value}%</Label>
                        <Slider
                          value={[formData.discount_value]}
                          onValueChange={([value]) => setFormData({ ...formData, discount_value: value })}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}

                  {formData.discount_type === 'fixed' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Select Amount</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {PRESET_FIXED_AMOUNTS.map((amt) => (
                            <Button
                              key={amt}
                              type="button"
                              variant={formData.discount_value === amt ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setFormData({ ...formData, discount_value: amt })}
                            >
                              ${amt}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Or enter custom amount ($)</Label>
                        <Input
                          type="number"
                          value={formData.discount_value}
                          onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                          placeholder="e.g., 75"
                        />
                      </div>
                    </div>
                  )}

                  {formData.discount_type === 'trial_extension' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Select Trial Days</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {PRESET_TRIAL_DAYS.map((days) => (
                            <Button
                              key={days}
                              type="button"
                              variant={formData.trial_extension_days === days ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setFormData({ ...formData, trial_extension_days: days })}
                            >
                              +{days} days
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Or enter custom days</Label>
                        <Input
                          type="number"
                          value={formData.trial_extension_days}
                          onChange={(e) => setFormData({ ...formData, trial_extension_days: parseInt(e.target.value) || 0 })}
                          placeholder="e.g., 14"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Referral Settings - only show for referral category */}
                {formData.promo_category === 'referral' && (
                  <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Users className="h-4 w-4" />
                      Referral Bonus Settings
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Configure bonus for the referrer when someone uses their code
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Referrer Bonus Type</Label>
                        <Select
                          value={formData.referral_bonus_type}
                          onValueChange={(value) => setFormData({ ...formData, referral_bonus_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select bonus type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                            <SelectItem value="trial_extension">Trial Extension</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Referrer Bonus Value</Label>
                        <Input
                          type="number"
                          value={formData.referral_bonus_value}
                          onChange={(e) => setFormData({ ...formData, referral_bonus_value: parseFloat(e.target.value) || 0 })}
                          placeholder="e.g., 10"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Validity & Limits */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Validity & Limits
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Max Uses (optional)</Label>
                      <Input
                        type="number"
                        value={formData.max_uses}
                        onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div>
                      <Label>Valid From</Label>
                      <Input
                        type="date"
                        value={formData.valid_from}
                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Valid Until (optional)</Label>
                      <Input
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Minimum Purchase Amount ($)</Label>
                    <Input
                      type="number"
                      value={formData.min_purchase_amount}
                      onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0 (no minimum)"
                    />
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Advanced Options
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id="recurring"
                        checked={formData.is_recurring}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: !!checked })}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                          <Repeat className="h-4 w-4" /> Recurring Discount
                        </Label>
                        <p className="text-xs text-muted-foreground">Automatically reactivates</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id="stackable"
                        checked={formData.is_stackable}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_stackable: !!checked })}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="stackable" className="flex items-center gap-2 cursor-pointer">
                          <Layers className="h-4 w-4" /> Stackable
                        </Label>
                        <p className="text-xs text-muted-foreground">Can combine with other codes</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id="first_time"
                        checked={formData.first_time_only}
                        onCheckedChange={(checked) => setFormData({ ...formData, first_time_only: !!checked })}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="first_time" className="flex items-center gap-2 cursor-pointer">
                          <Star className="h-4 w-4" /> First-Time Only
                        </Label>
                        <p className="text-xs text-muted-foreground">Only for new customers</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id="renewals"
                        checked={formData.applies_to_renewals}
                        onCheckedChange={(checked) => setFormData({ ...formData, applies_to_renewals: !!checked })}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="renewals" className="flex items-center gap-2 cursor-pointer">
                          <TrendingUp className="h-4 w-4" /> Apply to Renewals
                        </Label>
                        <p className="text-xs text-muted-foreground">Discount on subscription renewals</p>
                      </div>
                    </div>
                  </div>

                  {formData.is_recurring && (
                    <div>
                      <Label>Recurring Interval</Label>
                      <Select
                        value={formData.recurring_interval}
                        onValueChange={(value) => setFormData({ ...formData, recurring_interval: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Applicable Plans */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Applicable Plans</h3>
                  <div className="flex gap-4">
                    {['professional', 'advanced', 'enterprise'].map((plan) => (
                      <label key={plan} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={formData.applicable_plans.includes(plan)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                applicable_plans: [...formData.applicable_plans, plan],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                applicable_plans: formData.applicable_plans.filter((p) => p !== plan),
                              });
                            }
                          }}
                        />
                        <span className="capitalize font-medium">{plan}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePromo}>{editingPromo ? 'Update' : 'Create'} Promo Code</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Gift className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalActive}</p>
                <p className="text-sm text-muted-foreground">Active Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsed}</p>
                <p className="text-sm text-muted-foreground">Total Uses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.referralCodes}</p>
                <p className="text-sm text-muted-foreground">Referral Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes">
            <Gift className="h-4 w-4 mr-2" />
            Promo Codes
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <Users className="h-4 w-4 mr-2" />
            Referral Codes
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Mail className="h-4 w-4 mr-2" />
            Email Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codes">
          <Card>
            <CardHeader>
              <CardTitle>All Promo Codes</CardTitle>
              <CardDescription>Manage your promotional codes and discounts</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading...</p>
              ) : promoCodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No promo codes yet. Create your first one!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoCodes.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono text-sm">{promo.code}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyCode(promo.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{promo.name}</TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(promo.promo_category)}>
                            <span className="flex items-center gap-1">
                              {getCategoryIcon(promo.promo_category)}
                              <span className="capitalize">{promo.promo_category?.replace('_', ' ')}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            {getDiscountIcon(promo.discount_type)}
                            {getDiscountDisplay(promo)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {promo.current_uses}
                          {promo.max_uses ? `/${promo.max_uses}` : ''}
                        </TableCell>
                        <TableCell>
                          {promo.valid_until ? format(new Date(promo.valid_until), 'MMM d, yyyy') : 'No expiry'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {promo.is_recurring && (
                              <Badge variant="outline" className="text-xs">
                                <Repeat className="h-3 w-3 mr-1" />
                                {promo.recurring_interval}
                              </Badge>
                            )}
                            {promo.is_stackable && (
                              <Badge variant="outline" className="text-xs">
                                <Layers className="h-3 w-3" />
                              </Badge>
                            )}
                            {promo.first_time_only && (
                              <Badge variant="outline" className="text-xs">New</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={promo.is_active}
                            onCheckedChange={() => handleToggleActive(promo.id, promo.is_active)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditPromo(promo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeletePromo(promo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Referral Codes</CardTitle>
              <CardDescription>Track referral performance and earnings</CardDescription>
            </CardHeader>
            <CardContent>
              {referralCodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No referral codes yet. Create one to start tracking referrals!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Linked Promo</TableHead>
                      <TableHead>Total Referrals</TableHead>
                      <TableHead>Total Earnings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralCodes.map((ref) => (
                      <TableRow key={ref.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono">{ref.code}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyCode(ref.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ref.promo_code_id ? (
                            promoCodes.find(p => p.id === ref.promo_code_id)?.code || '-'
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ref.total_referrals}</Badge>
                        </TableCell>
                        <TableCell>${ref.total_earnings.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={ref.is_active ? 'default' : 'outline'}>
                            {ref.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(ref.created_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaigns</CardTitle>
              <CardDescription>Send promotional codes to customers</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No email campaigns yet. Create one to distribute promo codes!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>{campaign.subject}</TableCell>
                        <TableCell>{campaign.recipient_emails?.length || 0} recipients</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              campaign.status === 'sent'
                                ? 'default'
                                : campaign.status === 'scheduled'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {campaign.sent_at ? format(new Date(campaign.sent_at), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {campaign.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendCampaign(campaign.id)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send Now
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}