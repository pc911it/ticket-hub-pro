import { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CreatePermitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
}

const permitTypes = [
  'Building Permit',
  'Electrical Permit',
  'Plumbing Permit',
  'Mechanical Permit',
  'Fire Permit',
  'Demolition Permit',
  'Grading Permit',
  'Occupancy Permit',
  'Special Use Permit',
  'Other',
];

export function CreatePermitDialog({ open, onOpenChange, companyId }: CreatePermitDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [permitType, setPermitType] = useState('');
  const [description, setDescription] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [applicationDate, setApplicationDate] = useState<Date>();
  const [expirationDate, setExpirationDate] = useState<Date>();
  const [feeAmount, setFeeAmount] = useState('');
  const [feePaid, setFeePaid] = useState(false);
  const [conditions, setConditions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const generatePermitNumber = async () => {
    const { count } = await supabase
      .from('permits')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const num = (count || 0) + 1;
    return `PER-${String(num).padStart(4, '0')}`;
  };

  const handleSubmit = async () => {
    if (!companyId || !title.trim() || !permitType) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const permitNumber = await generatePermitNumber();

      const { error } = await supabase
        .from('permits')
        .insert({
          company_id: companyId,
          project_id: projectId || null,
          permit_number: permitNumber,
          permit_type: permitType,
          title: title.trim(),
          description: description.trim() || null,
          issuing_authority: issuingAuthority.trim() || null,
          application_date: applicationDate?.toISOString().split('T')[0] || null,
          expiration_date: expirationDate?.toISOString().split('T')[0] || null,
          fee_amount: feeAmount ? parseFloat(feeAmount) : null,
          fee_paid: feePaid,
          conditions: conditions.trim() || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('Permit created successfully');
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating permit:', error);
      toast.error(error.message || 'Failed to create permit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setPermitType('');
    setDescription('');
    setIssuingAuthority('');
    setProjectId('');
    setApplicationDate(undefined);
    setExpirationDate(undefined);
    setFeeAmount('');
    setFeePaid(false);
    setConditions('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Permit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Permit title"
              />
            </div>

            <div>
              <Label>Permit Type *</Label>
              <Select value={permitType} onValueChange={setPermitType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {permitTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="issuingAuthority">Issuing Authority</Label>
              <Input
                id="issuingAuthority"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="e.g., City Planning Dept"
              />
            </div>

            <div>
              <Label>Application Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !applicationDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {applicationDate ? format(applicationDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={applicationDate}
                    onSelect={setApplicationDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !expirationDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? format(expirationDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={setExpirationDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="feeAmount">Fee Amount</Label>
              <Input
                id="feeAmount"
                type="number"
                step="0.01"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="feePaid"
                checked={feePaid}
                onCheckedChange={(checked) => setFeePaid(checked as boolean)}
              />
              <Label htmlFor="feePaid" className="font-normal">Fee Paid</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Permit description..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="conditions">Conditions</Label>
            <Textarea
              id="conditions"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Special conditions or requirements..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim() || !permitType}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Permit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
