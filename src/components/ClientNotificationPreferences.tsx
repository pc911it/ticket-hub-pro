import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, CheckCircle, UserCheck, Receipt, Loader2 } from "lucide-react";

interface NotificationPreferences {
  status_updates: boolean;
  work_completed: boolean;
  agent_assigned: boolean;
  new_invoice: boolean;
}

interface ClientNotificationPreferencesProps {
  clientId: string;
  initialPreferences?: NotificationPreferences | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  status_updates: true,
  work_completed: true,
  agent_assigned: true,
  new_invoice: true,
};

export function ClientNotificationPreferences({ 
  clientId, 
  initialPreferences 
}: ClientNotificationPreferencesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    initialPreferences || DEFAULT_PREFERENCES
  );

  const updatePreferences = useMutation({
    mutationFn: async (newPreferences: NotificationPreferences) => {
      const { error } = await supabase
        .from("clients")
        .update({ notification_preferences: newPreferences as unknown as Json })
        .eq("id", clientId);
      
      if (error) throw error;
      return newPreferences;
    },
    onSuccess: () => {
      toast({ title: "Preferences Saved", description: "Your notification preferences have been updated." });
      queryClient.invalidateQueries({ queryKey: ["client-record"] });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message || "Failed to save preferences" 
      });
    },
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPreferences);
  };

  const handleSave = () => {
    updatePreferences.mutate(preferences);
  };

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(initialPreferences || DEFAULT_PREFERENCES);

  const preferenceItems = [
    {
      key: "status_updates" as const,
      label: "Status Updates",
      description: "Get notified when your work order status changes",
      icon: Bell,
    },
    {
      key: "work_completed" as const,
      label: "Work Completed",
      description: "Get notified when work is completed on your ticket",
      icon: CheckCircle,
    },
    {
      key: "agent_assigned" as const,
      label: "Technician Assigned",
      description: "Get notified when a technician is assigned to your job",
      icon: UserCheck,
    },
    {
      key: "new_invoice" as const,
      label: "New Invoices",
      description: "Get notified when a new invoice is created",
      icon: Receipt,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Choose which email notifications you'd like to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {preferenceItems.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.key}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <Label htmlFor={item.key} className="font-medium cursor-pointer">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={item.key}
                  checked={preferences[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                />
              </div>
            );
          })}
        </div>

        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updatePreferences.isPending}
          className="w-full"
        >
          {updatePreferences.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
