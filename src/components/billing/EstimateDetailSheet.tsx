import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { InvoicePDFPreview } from './InvoicePDFPreview';
import { LineItem } from './InvoiceLineItems';
import { Send, CheckCircle, Download, FileText, Loader2, ArrowRight, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';

interface EstimateDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimate: any;
  company: any;
  onSend: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onConvertToInvoice: () => void;
  isSending?: boolean;
  isConverting?: boolean;
}

export const EstimateDetailSheet = ({
  open,
  onOpenChange,
  estimate,
  company,
  onSend,
  onAccept,
  onDecline,
  onConvertToInvoice,
  isSending,
  isConverting,
}: EstimateDetailSheetProps) => {
  if (!estimate) return null;

  const lineItems: LineItem[] = Array.isArray(estimate.line_items) 
    ? estimate.line_items.map((item: any, index: number) => ({
        id: item.id || String(index),
        description: item.description || '',
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        amount: item.amount || 0,
      }))
    : [];

  const client = estimate.clients || {};

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
    
    // Estimate title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ESTIMATE', pageWidth - 20, 25, { align: 'right' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(estimate.estimate_number, pageWidth - 20, 35, { align: 'right' });
    
    // Status badge
    pdf.setFontSize(10);
    pdf.text(`Status: ${estimate.status.toUpperCase()}`, pageWidth - 20, 45, { align: 'right' });
    
    // Bill To
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PREPARED FOR:', 20, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(client.full_name || 'Client', 20, yPos);
    yPos += 5;
    pdf.text(client.email || '', 20, yPos);
    yPos += 10;
    
    // Dates
    pdf.text(`Date: ${new Date(estimate.created_at).toLocaleDateString()}`, 20, yPos);
    if (estimate.valid_until) {
      pdf.text(`Valid Until: ${new Date(estimate.valid_until).toLocaleDateString()}`, pageWidth - 20, yPos, { align: 'right' });
    }
    yPos += 10;
    
    // Description
    if (estimate.description) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description:', 20, yPos);
      yPos += 5;
      pdf.setFont('helvetica', 'normal');
      const descLines = pdf.splitTextToSize(estimate.description, pageWidth - 40);
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
    pdf.text(`$${(estimate.amount / 100).toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
    
    // Notes
    if (estimate.notes) {
      yPos += 15;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Terms & Notes:', 20, yPos);
      yPos += 5;
      pdf.setFont('helvetica', 'normal');
      const noteLines = pdf.splitTextToSize(estimate.notes, pageWidth - 40);
      pdf.text(noteLines, 20, yPos);
    }
    
    // Footer
    pdf.setFontSize(9);
    pdf.text('This estimate is valid for the period indicated above.', pageWidth / 2, 280, { align: 'center' });
    
    pdf.save(`${estimate.estimate_number}.pdf`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Estimate {estimate.estimate_number}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {estimate.status === 'draft' && (
              <Button onClick={onSend} disabled={isSending}>
                {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send to Client
              </Button>
            )}
            {estimate.status === 'sent' && (
              <>
                <Button onClick={onAccept} variant="secondary">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Accepted
                </Button>
                <Button onClick={onDecline} variant="outline">
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark Declined
                </Button>
              </>
            )}
            {estimate.status === 'accepted' && !estimate.converted_to_invoice_id && (
              <Button onClick={onConvertToInvoice} disabled={isConverting}>
                {isConverting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Convert to Invoice
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>

          <Separator />

          {/* Preview */}
          <InvoicePDFPreview
            type="estimate"
            documentNumber={estimate.estimate_number}
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
            description={estimate.description}
            notes={estimate.notes}
            validUntil={estimate.valid_until}
            status={estimate.status}
            createdAt={estimate.created_at}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
