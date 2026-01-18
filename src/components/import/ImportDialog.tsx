import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, FileJson, X, CheckCircle2, AlertCircle, Download, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';

export type ImportDataType = 'clients' | 'projects' | 'tickets' | 'invoices' | 'estimates' | 'equipment' | 'agents';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDataType?: ImportDataType;
  onImportComplete?: () => void;
}

interface ParsedRecord {
  data: Record<string, any>;
  errors: string[];
  row: number;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const DATA_TYPE_CONFIG: Record<ImportDataType, { 
  label: string; 
  requiredFields: string[];
  optionalFields: string[];
  tableName: string;
}> = {
  clients: {
    label: 'Clients',
    requiredFields: ['full_name', 'email'],
    optionalFields: ['phone', 'address', 'notes'],
    tableName: 'clients',
  },
  projects: {
    label: 'Projects',
    requiredFields: ['name'],
    optionalFields: ['description', 'address', 'status', 'start_date', 'end_date', 'budget'],
    tableName: 'projects',
  },
  tickets: {
    label: 'Tickets',
    requiredFields: ['title', 'project_id', 'scheduled_date', 'scheduled_time'],
    optionalFields: ['description', 'status', 'priority'],
    tableName: 'tickets',
  },
  invoices: {
    label: 'Invoices',
    requiredFields: ['amount', 'due_date'],
    optionalFields: ['description', 'notes', 'status'],
    tableName: 'client_invoices',
  },
  estimates: {
    label: 'Estimates',
    requiredFields: ['amount'],
    optionalFields: ['description', 'notes', 'valid_until'],
    tableName: 'estimates',
  },
  equipment: {
    label: 'Equipment',
    requiredFields: ['name'],
    optionalFields: ['equipment_type', 'make', 'model', 'year', 'serial_number', 'status', 'purchase_price', 'notes'],
    tableName: 'equipment',
  },
  agents: {
    label: 'Employees/Agents',
    requiredFields: ['full_name'],
    optionalFields: ['phone', 'vehicle_info'],
    tableName: 'agents',
  },
};

export const ImportDialog = ({ 
  open, 
  onOpenChange, 
  defaultDataType,
  onImportComplete 
}: ImportDialogProps) => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const [dataType, setDataType] = useState<ImportDataType>(defaultDataType || 'clients');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const config = DATA_TYPE_CONFIG[dataType];

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleDataTypeChange = (value: ImportDataType) => {
    setDataType(value);
    resetState();
  };

  const parseCSV = (content: string): Record<string, any>[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const records: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const record: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        if (values[index] !== undefined && values[index] !== '') {
          record[header] = values[index];
        }
      });
      
      if (Object.keys(record).length > 0) {
        records.push(record);
      }
    }

    return records;
  };

  const parseJSON = (content: string): Record<string, any>[] => {
    try {
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [data];
    } catch {
      return [];
    }
  };

  const validateRecord = (record: Record<string, any>, row: number): ParsedRecord => {
    const errors: string[] = [];
    
    config.requiredFields.forEach(field => {
      if (!record[field] || String(record[field]).trim() === '') {
        errors.push(`Missing required field: ${field}`);
      }
    });

    return { data: record, errors, row };
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setImportResult(null);

    const content = await selectedFile.text();
    let records: Record<string, any>[] = [];

    if (selectedFile.name.endsWith('.json')) {
      records = parseJSON(content);
    } else {
      records = parseCSV(content);
    }

    if (records.length === 0) {
      toast.error('No valid records found in file');
      return;
    }

    const validated = records.map((record, index) => validateRecord(record, index + 1));
    setParsedData(validated);
    
    const validCount = validated.filter(r => r.errors.length === 0).length;
    toast.info(`Found ${records.length} records, ${validCount} valid for import`);
  }, [config]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.json'))) {
      handleFileSelect(droppedFile);
    } else {
      toast.error('Please upload a CSV or JSON file');
    }
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!effectiveCompanyId) {
      toast.error('Company not found');
      return;
    }

    const validRecords = parsedData.filter(r => r.errors.length === 0);
    if (validRecords.length === 0) {
      toast.error('No valid records to import');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    const result: ImportResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 10;

    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          const insertData: Record<string, any> = {
            ...record.data,
            company_id: effectiveCompanyId,
          };

          let insertError: any = null;

          // Handle special cases and type-safe inserts
          switch (dataType) {
            case 'clients': {
              const { error } = await supabase.from('clients').insert({
                company_id: effectiveCompanyId,
                full_name: insertData.full_name,
                email: insertData.email,
                phone: insertData.phone || null,
                address: insertData.address || null,
                notes: insertData.notes || null,
              });
              insertError = error;
              break;
            }
            case 'projects': {
              const { error } = await supabase.from('projects').insert({
                company_id: effectiveCompanyId,
                name: insertData.name,
                project_number: insertData.project_number || `PRJ-${Date.now()}-${record.row}`,
                description: insertData.description || null,
                address: insertData.address || null,
                status: insertData.status || 'active',
                start_date: insertData.start_date || null,
                end_date: insertData.end_date || null,
                budget: insertData.budget ? parseFloat(insertData.budget) : null,
              });
              insertError = error;
              break;
            }
            case 'tickets': {
              const { error } = await supabase.from('tickets').insert({
                company_id: effectiveCompanyId,
                title: insertData.title,
                project_id: insertData.project_id,
                scheduled_date: insertData.scheduled_date,
                scheduled_time: insertData.scheduled_time,
                description: insertData.description || null,
                status: insertData.status || 'open',
                priority: insertData.priority || 'medium',
              });
              insertError = error;
              break;
            }
            case 'invoices': {
              if (!insertData.client_id) {
                result.failed++;
                result.errors.push(`Row ${record.row}: Missing client_id for invoices`);
                continue;
              }
              const { error } = await supabase.from('client_invoices').insert({
                company_id: effectiveCompanyId,
                client_id: insertData.client_id,
                amount: parseFloat(insertData.amount),
                due_date: insertData.due_date,
                invoice_number: insertData.invoice_number || `IMP-${Date.now()}-${record.row}`,
                description: insertData.description || null,
                notes: insertData.notes || null,
                status: insertData.status || 'draft',
              });
              insertError = error;
              break;
            }
            case 'estimates': {
              if (!insertData.client_id) {
                result.failed++;
                result.errors.push(`Row ${record.row}: Missing client_id for estimates`);
                continue;
              }
              const { error } = await supabase.from('estimates').insert({
                company_id: effectiveCompanyId,
                client_id: insertData.client_id,
                amount: parseFloat(insertData.amount),
                estimate_number: insertData.estimate_number || `EST-${Date.now()}-${record.row}`,
                description: insertData.description || null,
                notes: insertData.notes || null,
                valid_until: insertData.valid_until || null,
              });
              insertError = error;
              break;
            }
            case 'equipment': {
              const { error } = await supabase.from('equipment').insert({
                company_id: effectiveCompanyId,
                name: insertData.name,
                equipment_type: insertData.equipment_type || null,
                make: insertData.make || null,
                model: insertData.model || null,
                year: insertData.year ? parseInt(insertData.year) : null,
                serial_number: insertData.serial_number || null,
                status: insertData.status || 'available',
                purchase_price: insertData.purchase_price ? parseFloat(insertData.purchase_price) : null,
                notes: insertData.notes || null,
              });
              insertError = error;
              break;
            }
            case 'agents': {
              const { error } = await supabase.from('agents').insert({
                company_id: effectiveCompanyId,
                full_name: insertData.full_name,
                user_id: insertData.user_id || crypto.randomUUID(),
                phone: insertData.phone || null,
                vehicle_info: insertData.vehicle_info || null,
              });
              insertError = error;
              break;
            }
          }

          if (insertError) {
            result.failed++;
            result.errors.push(`Row ${record.row}: ${insertError.message}`);
          } else {
            result.success++;
          }
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Row ${record.row}: ${err.message}`);
        }
      }

      setImportProgress(Math.round(((i + batch.length) / validRecords.length) * 100));
    }

    setIsImporting(false);
    setImportResult(result);

    if (result.success > 0) {
      toast.success(`Successfully imported ${result.success} ${config.label.toLowerCase()}`);
      onImportComplete?.();
    }

    if (result.failed > 0) {
      toast.error(`Failed to import ${result.failed} records`);
    }
  };

  const downloadTemplate = () => {
    const allFields = [...config.requiredFields, ...config.optionalFields];
    const csvContent = allFields.join(',') + '\n' + allFields.map(() => '').join(',');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataType}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedData.filter(r => r.errors.length === 0).length;
  const invalidCount = parsedData.filter(r => r.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            Import data from CSV or JSON files into your system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Data Type Selection */}
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={dataType} onValueChange={(v) => handleDataTypeChange(v as ImportDataType)}>
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

          {/* Field Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Required:</strong> {config.requiredFields.join(', ')}
              <br />
              <strong>Optional:</strong> {config.optionalFields.join(', ')}
            </AlertDescription>
          </Alert>

          {/* Download Template */}
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-fit">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>

          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                {file.name.endsWith('.json') ? (
                  <FileJson className="h-8 w-8 text-primary" />
                ) : (
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                )}
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={resetState}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop a CSV or JSON file here
                </p>
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <Button variant="outline" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Browse Files
                  </label>
                </Button>
              </>
            )}
          </div>

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2">
                <Badge variant="default">{validCount} valid</Badge>
                {invalidCount > 0 && <Badge variant="destructive">{invalidCount} with errors</Badge>}
              </div>
              
              <ScrollArea className="flex-1 border rounded-md max-h-40">
                <div className="p-2 space-y-1">
                  {parsedData.slice(0, 20).map((record, i) => (
                    <div 
                      key={i} 
                      className={`text-xs p-2 rounded flex items-start gap-2 ${
                        record.errors.length > 0 ? 'bg-destructive/10' : 'bg-muted'
                      }`}
                    >
                      {record.errors.length > 0 ? (
                        <AlertCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">Row {record.row}:</span>{' '}
                        {record.errors.length > 0 
                          ? record.errors.join(', ')
                          : Object.entries(record.data).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')
                        }
                      </div>
                    </div>
                  ))}
                  {parsedData.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center p-2">
                      ... and {parsedData.length - 20} more records
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-xs text-center text-muted-foreground">
                Importing... {importProgress}%
              </p>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.failed > 0 ? 'destructive' : 'default'}>
              <AlertDescription>
                <strong>Import Complete:</strong> {importResult.success} succeeded, {importResult.failed} failed
                {importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs">View errors</summary>
                    <ul className="text-xs mt-1 space-y-1">
                      {importResult.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={validCount === 0 || isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${validCount} Records`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
