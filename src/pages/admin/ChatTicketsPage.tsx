import { ChatTicketSystem } from "@/components/ChatTicketSystem";

export default function ChatTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">
          Manage and respond to support tickets with priority queues and quick replies
        </p>
      </div>
      <ChatTicketSystem />
    </div>
  );
}
