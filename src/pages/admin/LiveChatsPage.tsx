import { LiveChatDashboard } from "@/components/LiveChatDashboard";

export default function LiveChatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Live Support Chats</h1>
        <p className="text-muted-foreground">
          Manage and respond to visitor chat conversations in real-time
        </p>
      </div>
      <LiveChatDashboard />
    </div>
  );
}
