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
import { useToast } from '@/hooks/use-toast';
import { Plus, Mail, Gift, Percent, DollarSign, Clock, Edit, Trash2, Send, Copy } from 'lucide-react';
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

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
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

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
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
    toast({ title: 'Copied!', description: 'Promo code copied to clipboard' });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground">Manage promotional codes and email campaigns</p>
        </div>
        <div className="flex gap-2">
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingPromo ? 'Edit' : 'Create'} Promo Code</DialogTitle>
                <DialogDescription>
                  Create a new promotional code for discounts or extended trials
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                      <Button type="button" variant="outline" onClick={generateCode}>
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
                    <Label>Discount Type</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: 'percentage' | 'fixed' | 'trial_extension') =>
                        setFormData({ ...formData, discount_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage Off</SelectItem>
                        <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                        <SelectItem value="trial_extension">Trial Extension</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {formData.discount_type === 'trial_extension' ? (
                      <>
                        <Label>Extra Trial Days</Label>
                        <Input
                          type="number"
                          value={formData.trial_extension_days}
                          onChange={(e) =>
                            setFormData({ ...formData, trial_extension_days: parseInt(e.target.value) || 0 })
                          }
                          placeholder="e.g., 14"
                        />
                      </>
                    ) : (
                      <>
                        <Label>Discount Value {formData.discount_type === 'percentage' ? '(%)' : '($)'}</Label>
                        <Input
                          type="number"
                          value={formData.discount_value}
                          onChange={(e) =>
                            setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })
                          }
                          placeholder={formData.discount_type === 'percentage' ? 'e.g., 20' : 'e.g., 50'}
                        />
                      </>
                    )}
                  </div>
                </div>

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
                  <Label>Applicable Plans</Label>
                  <div className="flex gap-4 mt-2">
                    {['professional', 'advanced', 'enterprise'].map((plan) => (
                      <label key={plan} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.applicable_plans.includes(plan)}
                          onChange={(e) => {
                            if (e.target.checked) {
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
                          className="rounded"
                        />
                        <span className="capitalize">{plan}</span>
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

      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes">
            <Gift className="h-4 w-4 mr-2" />
            Promo Codes
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Mail className="h-4 w-4 mr-2" />
            Email Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codes">
          <Card>
            <CardHeader>
              <CardTitle>Active Promo Codes</CardTitle>
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
                      <TableHead>Type</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoCodes.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono">{promo.code}</code>
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
                        <TableCell>{promo.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDiscountIcon(promo.discount_type)}
                            <span className="capitalize">{promo.discount_type.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getDiscountDisplay(promo)}</Badge>
                        </TableCell>
                        <TableCell>
                          {promo.current_uses}
                          {promo.max_uses ? `/${promo.max_uses}` : ''}
                        </TableCell>
                        <TableCell>
                          {promo.valid_until ? format(new Date(promo.valid_until), 'MMM d, yyyy') : 'No expiry'}
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
