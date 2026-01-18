import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { ImportDataType } from './ImportDialog';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDataType?: ImportDataType;
}

const DATA_TYPE_CONFIG: Record<ImportDataType, { 
  label: string; 
  tableName: string;
  selectFields: string;
}> = {
  clients: {
    label: 'Clients',
    tableName: 'clients',
    selectFields: 'id, full_name, email, phone, address, notes, created_at',
  },
  projects: {
    label: 'Projects',
    tableName: 'projects',
    selectFields: 'id, project_number, name, description, address, status, start_date, end_date, budget, created_at',
  },
  tickets: {
    label: 'Tickets',
    tableName: 'tickets',
    selectFields: 'id, ticket_number, title, description, status, priority, category, created_at',
  },
  invoices: {
    label: 'Invoices',
    tableName: 'client_invoices',
    selectFields: 'id, invoice_number, amount, currency, status, due_date, paid_at, created_at',
  },
  estimates: {
    label: 'Estimates',
    tableName: 'estimates',
    selectFields: 'id, estimate_number, amount, currency, status, valid_until, created_at',
  },
  equipment: {
    label: 'Equipment',
    tableName: 'equipment',
    selectFields: 'id, name, equipment_type, make, model, year, serial_number, status, purchase_price, created_at',
  },
  agents: {
    label: 'Employees/Agents',
    tableName: 'agents',
    selectFields: 'id, full_name, phone, vehicle_info, is_online, is_available, created_at',
  },
};

export const ExportDialog = ({ 
  open, 
  onOpenChange, 
  defaultDataType 
}: ExportDialogProps) => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const [dataType, setDataType] = useState<ImportDataType>(defaultDataType || 'clients');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const config = DATA_TYPE_CONFIG[dataType];

  const handleExport = async () => {
    if (!effectiveCompanyId) {
      toast.error('Company not found');
      return;
    }

    setIsExporting(true);

    try {
      // Type-safe query using switch statement
      let data: Record<string, any>[] | null = null;
      let error: any = null;

      switch (dataType) {
        case 'clients': {
          const result = await supabase.from('clients').select('id, full_name, email, phone, address, notes, created_at').eq('company_id', effectiveCompanyId).is('deleted_at', null);
          data = result.data;
          error = result.error;
          break;
        }
        case 'projects': {
          const result = await supabase.from('projects').select('id, project_number, name, description, address, status, start_date, end_date, budget, created_at').eq('company_id', effectiveCompanyId).is('deleted_at', null);
          data = result.data;
          error = result.error;
          break;
        }
        case 'tickets': {
          const result = await supabase.from('tickets').select('id, ticket_number, title, description, status, priority, category, created_at').eq('company_id', effectiveCompanyId).is('deleted_at', null);
          data = result.data;
          error = result.error;
          break;
        }
        case 'invoices': {
          const result = await supabase.from('client_invoices').select('id, invoice_number, amount, currency, status, due_date, paid_at, created_at').eq('company_id', effectiveCompanyId);
          data = result.data;
          error = result.error;
          break;
        }
        case 'estimates': {
          const result = await supabase.from('estimates').select('id, estimate_number, amount, currency, status, valid_until, created_at').eq('company_id', effectiveCompanyId);
          data = result.data;
          error = result.error;
          break;
        }
        case 'equipment': {
          const result = await supabase.from('equipment').select('id, name, equipment_type, make, model, year, serial_number, status, purchase_price, created_at').eq('company_id', effectiveCompanyId);
          data = result.data;
          error = result.error;
          break;
        }
        case 'agents': {
          const result = await supabase.from('agents').select('id, full_name, phone, vehicle_info, is_online, is_available, created_at').eq('company_id', effectiveCompanyId);
          data = result.data;
          error = result.error;
          break;
        }
      }

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error(`No ${config.label.toLowerCase()} found to export`);
        setIsExporting(false);
        return;
      }

      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        // CSV format
        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header as keyof typeof row];
              if (value === null || value === undefined) return '';
              const stringValue = String(value);
              // Escape quotes and wrap in quotes if contains comma
              if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            }).join(',')
          )
        ];
        content = csvRows.join('\n');
        mimeType = 'text/csv';
        extension = 'csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}_export_${new Date().toISOString().split('T')[0]}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} ${config.label.toLowerCase()}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export your data to CSV or JSON format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data Type Selection */}
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as ImportDataType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATA_TYPE_CONFIG).map(([key, conf]) => (
                  <SelectItem key={key} value={key}>{conf.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup 
              value={format} 
              onValueChange={(v) => setFormat(v as 'csv' | 'json')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4" />
                  JSON
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {config.label}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
