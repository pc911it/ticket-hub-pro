import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Printer, Loader2 } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface WorkOrderPDFProps {
  ticket: any;
  variant?: "button" | "icon";
}

export function WorkOrderPDF({ ticket, variant = "button" }: WorkOrderPDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch job updates for this ticket
  const { data: jobUpdates } = useQuery({
    queryKey: ["ticket-job-updates-pdf", ticket?.id],
    queryFn: async () => {
      if (!ticket?.id) return [];
      
      const { data, error } = await supabase
        .from("job_updates")
        .select("*, agents(full_name)")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticket?.id,
  });

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("WORK ORDER", pageWidth / 2, y, { align: "center" });
      y += 10;

      // Ticket number
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`#${ticket.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, y, { align: "center" });
      y += 15;

      // Divider line
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(ticket.title, margin, y);
      y += 8;

      // Status badge
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const statusText = `Status: ${(ticket.status || "pending").toUpperCase()}`;
      doc.text(statusText, margin, y);
      y += 10;

      // Details section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Details", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // Scheduled date
      doc.text(`Scheduled Date: ${format(new Date(ticket.scheduled_date), "MMMM d, yyyy")}`, margin, y);
      y += 6;

      // Scheduled time
      doc.text(`Scheduled Time: ${ticket.scheduled_time}`, margin, y);
      y += 6;

      // Priority
      doc.text(`Priority: ${(ticket.priority || "normal").charAt(0).toUpperCase() + (ticket.priority || "normal").slice(1)}`, margin, y);
      y += 6;

      // Project
      if (ticket.projects?.name) {
        doc.text(`Project: ${ticket.projects.name}`, margin, y);
        y += 6;
      }

      // Technician
      if (ticket.agents?.full_name) {
        doc.text(`Technician: ${ticket.agents.full_name}`, margin, y);
        y += 6;
      }

      y += 5;

      // Description
      if (ticket.description) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Description", margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Wrap text for description
        const descriptionLines = doc.splitTextToSize(ticket.description, pageWidth - (margin * 2));
        doc.text(descriptionLines, margin, y);
        y += descriptionLines.length * 5 + 10;
      }

      // Work Activity
      if (jobUpdates && jobUpdates.length > 0) {
        // Check if we need a new page
        if (y > 200) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Work Activity", margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        for (const update of jobUpdates) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          const statusLabel = update.status.replace(/_/g, " ").toUpperCase();
          const dateStr = format(new Date(update.created_at), "MMM d, yyyy h:mm a");
          const agentName = update.agents?.full_name || "Unknown";

          doc.setFont("helvetica", "bold");
          doc.text(`${statusLabel}`, margin, y);
          doc.setFont("helvetica", "normal");
          doc.text(` - ${agentName} - ${dateStr}`, margin + doc.getTextWidth(`${statusLabel}`), y);
          y += 5;

          if (update.notes) {
            const noteLines = doc.splitTextToSize(update.notes, pageWidth - (margin * 2) - 10);
            doc.setTextColor(80);
            doc.text(noteLines, margin + 5, y);
            doc.setTextColor(0);
            y += noteLines.length * 5;
          }
          y += 5;
        }
      }

      // Client Signature
      if (ticket.client_signature_url && ticket.client_approved_at) {
        if (y > 220) {
          doc.addPage();
          y = 20;
        }

        y += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Client Approval", margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Signed on: ${format(new Date(ticket.client_approved_at), "MMMM d, yyyy 'at' h:mm a")}`, margin, y);
        y += 15;

        // Draw signature box
        doc.setDrawColor(180);
        doc.rect(margin, y, 80, 30);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Client Signature on File", margin + 5, y + 18);
        y += 40;
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );

      // Save the PDF
      doc.save(`work-order-${ticket.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={generatePDF}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </>
      )}
    </Button>
  );
}
