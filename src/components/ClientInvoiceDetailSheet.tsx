import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvoicePDFPreview } from "@/components/billing/InvoicePDFPreview";
import { Download, CreditCard, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ClientInvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  company?: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email: string;
    logo_url?: string;
  };
  client?: {
    full_name: string;
    email: string;
    address?: string;
    phone?: string;
  };
  onPayInvoice?: (invoice: any) => void;
  isPaying?: boolean;
  hasPaymentCard?: boolean;
}

export const ClientInvoiceDetailSheet = ({
  open,
  onOpenChange,
  invoice,
  company,
  client,
  onPayInvoice,
  isPaying,
  hasPaymentCard,
}: ClientInvoiceDetailSheetProps) => {
  if (!invoice) return null;

  const lineItems: LineItem[] = Array.isArray(invoice.line_items) 
    ? invoice.line_items.map((item: any, index: number) => ({
        id: item.id || `item-${index}`,
        description: item.description || 'Service',
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        amount: item.amount || (item.quantity || 1) * (item.rate || 0),
      }))
    : [{ id: '1', description: invoice.description || 'Service', quantity: 1, rate: invoice.amount, amount: invoice.amount }];

  const handleDownloadPDF = async () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Header
    pdf.setFontSize(24);
    pdf.setTextColor(0, 0, 0);
    pdf.text('INVOICE', pageWidth - margin, yPos, { align: 'right' });
    
    pdf.setFontSize(12);
    pdf.text(invoice.invoice_number, pageWidth - margin, yPos + 8, { align: 'right' });
    
    // Company info
    pdf.setFontSize(16);
    pdf.text(company?.name || 'Company', margin, yPos);
    yPos += 8;
    pdf.setFontSize(10);
    if (company?.address) {
      pdf.text(company.address, margin, yPos);
      yPos += 5;
    }
    if (company?.city || company?.state) {
      pdf.text([company?.city, company?.state].filter(Boolean).join(', '), margin, yPos);
      yPos += 5;
    }
    if (company?.phone) {
      pdf.text(company.phone, margin, yPos);
      yPos += 5;
    }
    if (company?.email) {
      pdf.text(company.email, margin, yPos);
      yPos += 5;
    }
    
    yPos += 15;

    // Dates
    pdf.setFontSize(10);
    pdf.text(`Date: ${format(new Date(invoice.created_at), 'MMM dd, yyyy')}`, pageWidth - margin - 50, yPos - 20);
    pdf.text(`Due: ${format(new Date(invoice.due_date), 'MMM dd, yyyy')}`, pageWidth - margin - 50, yPos - 15);
    pdf.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - margin - 50, yPos - 10);

    // Bill To
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('BILL TO', margin, yPos);
    yPos += 6;
    pdf.setTextColor(0, 0, 0);
    pdf.text(client?.full_name || 'Client', margin, yPos);
    yPos += 5;
    pdf.text(client?.email || '', margin, yPos);
    if (client?.address) {
      yPos += 5;
      pdf.text(client.address, margin, yPos);
    }
    if (client?.phone) {
      yPos += 5;
      pdf.text(client.phone, margin, yPos);
    }
    
    yPos += 15;

    // Line items header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Description', margin + 3, yPos + 5);
    pdf.text('Qty', 120, yPos + 5);
    pdf.text('Rate', 140, yPos + 5);
    pdf.text('Amount', pageWidth - margin - 10, yPos + 5, { align: 'right' });
    yPos += 12;

    // Line items
    pdf.setTextColor(0, 0, 0);
    lineItems.forEach((item) => {
      pdf.text(item.description.substring(0, 40), margin + 3, yPos);
      pdf.text(item.quantity.toString(), 120, yPos);
      pdf.text(`$${item.rate.toFixed(2)}`, 140, yPos);
      pdf.text(`$${item.amount.toFixed(2)}`, pageWidth - margin - 10, yPos, { align: 'right' });
      yPos += 8;
    });

    // Total
    yPos += 10;
    pdf.setDrawColor(0, 0, 0);
    pdf.line(120, yPos, pageWidth - margin, yPos);
    yPos += 8;
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Total:', 120, yPos);
    pdf.text(`$${invoice.amount.toFixed(2)}`, pageWidth - margin - 10, yPos, { align: 'right' });

    // Notes
    if (invoice.notes) {
      yPos += 20;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Notes:', margin, yPos);
      yPos += 6;
      pdf.setTextColor(0, 0, 0);
      const noteLines = pdf.splitTextToSize(invoice.notes, pageWidth - (margin * 2));
      pdf.text(noteLines, margin, yPos);
    }

    // Footer
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Thank you for your business!', pageWidth / 2, pdf.internal.pageSize.getHeight() - 20, { align: 'center' });

    pdf.save(`${invoice.invoice_number}.pdf`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Invoice {invoice.invoice_number}
            {invoice.status === 'paid' ? (
              <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />Paid
              </Badge>
            ) : invoice.status === 'sent' ? (
              <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                <Clock className="h-3 w-3 mr-1" />Pending
              </Badge>
            ) : (
              <Badge variant="outline">{invoice.status}</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Due: {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {invoice.status !== 'paid' && onPayInvoice && (
              <Button 
                size="sm" 
                onClick={() => onPayInvoice(invoice)}
                disabled={isPaying || !hasPaymentCard}
              >
                {isPaying ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Pay Now
              </Button>
            )}
          </div>

          {/* Invoice Preview */}
          {company && client && (
            <InvoicePDFPreview
              type="invoice"
              documentNumber={invoice.invoice_number}
              company={company}
              client={client}
              lineItems={lineItems}
              description={invoice.description}
              notes={invoice.notes}
              dueDate={invoice.due_date}
              status={invoice.status}
              createdAt={invoice.created_at}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
