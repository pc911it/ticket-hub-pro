import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { InvoicePDFPreview } from './InvoicePDFPreview';
import { LineItem } from './InvoiceLineItems';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Send, CheckCircle, Download, CreditCard, Loader2, FileText, XCircle, Ban, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  company: any;
  onSend: () => void;
  onMarkPaid: () => void;
  onCharge?: () => void;
  onCancel?: () => void;
  onVoid?: () => void;
  onDelete?: () => void;
  isSending?: boolean;
  isCharging?: boolean;
}

export const InvoiceDetailSheet = ({
  open,
  onOpenChange,
  invoice,
  company,
  onSend,
  onMarkPaid,
  onCharge,
  onCancel,
  onVoid,
  onDelete,
  isSending,
  isCharging,
}: InvoiceDetailSheetProps) => {
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'void' | 'delete' | null>(null);

  if (!invoice) return null;

  const lineItems: LineItem[] = Array.isArray(invoice.line_items) 
    ? invoice.line_items.map((item: any, index: number) => ({
        id: item.id || String(index),
        description: item.description || '',
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        amount: item.amount || 0,
      }))
    : [];

  const client = invoice.clients || {};

  const handleDownloadPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    let yPos = 20;
    
    // Company header
    if (company?.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = company.logo_url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        pdf.addImage(img, 'PNG', 20, yPos, 40, 20);
        yPos += 25;
      } catch {
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text(company?.name || 'Company', 20, yPos);
        yPos += 10;
      }
    } else {
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(company?.name || 'Company', 20, yPos);
      yPos += 10;
    }
    
    // Company info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    if (company?.address) {
      pdf.text(company.address, 20, yPos);
      yPos += 5;
    }
    if (company?.city || company?.state) {
      pdf.text([company?.city, company?.state].filter(Boolean).join(', '), 20, yPos);
      yPos += 5;
    }
    pdf.text(company?.email || '', 20, yPos);
    yPos += 15;
    
    // Invoice title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE', pageWidth - 20, 25, { align: 'right' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoice.invoice_number, pageWidth - 20, 35, { align: 'right' });
    
    // Status badge
    pdf.setFontSize(10);
    pdf.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - 20, 45, { align: 'right' });
    
    // Bill To
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BILL TO:', 20, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(client.full_name || 'Client', 20, yPos);
    yPos += 5;
    pdf.text(client.email || '', 20, yPos);
    yPos += 10;
    
    // Dates
    pdf.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, yPos);
    pdf.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 10;
    
    // Description
    if (invoice.description) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description:', 20, yPos);
      yPos += 5;
      pdf.setFont('helvetica', 'normal');
      const descLines = pdf.splitTextToSize(invoice.description, pageWidth - 40);
      pdf.text(descLines, 20, yPos);
      yPos += descLines.length * 5 + 5;
    }
    
    // Line items table
    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', 20, yPos);
    pdf.text('Qty', 100, yPos, { align: 'center' });
    pdf.text('Rate', 130, yPos, { align: 'right' });
    pdf.text('Amount', pageWidth - 20, yPos, { align: 'right' });
    yPos += 3;
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    lineItems.forEach(item => {
      pdf.text(item.description.substring(0, 40), 20, yPos);
      pdf.text(String(item.quantity), 100, yPos, { align: 'center' });
      pdf.text(`$${item.rate.toFixed(2)}`, 130, yPos, { align: 'right' });
      pdf.text(`$${item.amount.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 7;
    });
    
    // Total
    yPos += 5;
    pdf.line(100, yPos, pageWidth - 20, yPos);
    yPos += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Total:', 130, yPos, { align: 'right' });
    pdf.text(`$${(invoice.amount / 100).toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
    
    // Notes
    if (invoice.notes) {
      yPos += 15;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notes:', 20, yPos);
      yPos += 5;
      pdf.setFont('helvetica', 'normal');
      const noteLines = pdf.splitTextToSize(invoice.notes, pageWidth - 40);
      pdf.text(noteLines, 20, yPos);
    }
    
    // Footer
    pdf.setFontSize(9);
    pdf.text('Thank you for your business!', pageWidth / 2, 280, { align: 'center' });
    
    pdf.save(`${invoice.invoice_number}.pdf`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice {invoice.invoice_number}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {invoice.status === 'draft' && (
              <Button onClick={onSend} disabled={isSending}>
                {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send to Client
              </Button>
            )}
            {invoice.status === 'sent' && (
              <>
                <Button onClick={onMarkPaid} variant="secondary">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
                {onCharge && client.square_card_id && (
                  <Button onClick={onCharge} disabled={isCharging}>
                    {isCharging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                    Charge Card
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            
            {/* More Actions Dropdown */}
            {(invoice.status !== 'void' && invoice.status !== 'cancelled') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Cancel - available for draft and sent invoices */}
                  {(invoice.status === 'draft' || invoice.status === 'sent') && onCancel && (
                    <DropdownMenuItem onClick={() => setConfirmAction('cancel')} className="text-orange-600">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Invoice
                    </DropdownMenuItem>
                  )}
                  
                  {/* Void - available for paid invoices (reversal) */}
                  {invoice.status === 'paid' && onVoid && (
                    <DropdownMenuItem onClick={() => setConfirmAction('void')} className="text-purple-600">
                      <Ban className="h-4 w-4 mr-2" />
                      Void Invoice
                    </DropdownMenuItem>
                  )}
                  
                  {/* Delete - only for draft invoices */}
                  {invoice.status === 'draft' && onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setConfirmAction('delete')} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Invoice
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <Separator />

          {/* Preview */}
          <InvoicePDFPreview
            type="invoice"
            documentNumber={invoice.invoice_number}
            company={{
              name: company?.name || '',
              address: company?.address,
              city: company?.city,
              state: company?.state,
              phone: company?.phone,
              email: company?.email || '',
              logo_url: company?.logo_url,
            }}
            client={{
              full_name: client.full_name || '',
              email: client.email || '',
              address: client.address,
              phone: client.phone,
            }}
            lineItems={lineItems}
            description={invoice.description}
            notes={invoice.notes}
            dueDate={invoice.due_date}
            status={invoice.status}
            createdAt={invoice.created_at}
          />
        </div>

        {/* Confirmation Dialogs */}
        <AlertDialog open={confirmAction === 'cancel'} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the invoice as cancelled. The client will no longer be able to pay this invoice.
                This action can be undone by creating a new invoice.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => { onCancel?.(); setConfirmAction(null); }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Cancel Invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmAction === 'void'} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will void the paid invoice. Use this when you need to reverse a payment or correct an error.
                Note: This does not automatically refund the payment - you'll need to process any refunds separately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => { onVoid?.(); setConfirmAction(null); }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Void Invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmAction === 'delete'} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the draft invoice. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => { onDelete?.(); setConfirmAction(null); }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete Invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
};
