import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, KeyRound, Settings } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface PasswordResetReminderProps {
  userId: string;
}

export const PasswordResetReminder = ({ userId }: PasswordResetReminderProps) => {
  const [showReminder, setShowReminder] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(0);
  const [requireMonthlyReset, setRequireMonthlyReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPasswordStatus();
  }, [userId]);

  const checkPasswordStatus = async () => {
    if (!userId) return;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('password_changed_at, require_monthly_password_reset')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !profile) return;

    setRequireMonthlyReset(profile.require_monthly_password_reset || false);

    // Only show reminder if user has enabled the preference
    if (profile.require_monthly_password_reset && profile.password_changed_at) {
      const daysSinceChange = differenceInDays(new Date(), new Date(profile.password_changed_at));
      if (daysSinceChange >= 30) {
        setDaysOverdue(daysSinceChange - 30);
        setShowReminder(true);
      }
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      
      if (authError) throw authError;

      // Update password_changed_at in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_changed_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Failed to update password timestamp:', profileError);
      }

      toast({ title: 'Success', description: 'Password updated successfully.' });
      setShowReminder(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePreference = async (enabled: boolean) => {
    setRequireMonthlyReset(enabled);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        require_monthly_password_reset: enabled,
        // Reset the timer when enabling
        password_changed_at: enabled ? new Date().toISOString() : undefined
      })
      .eq('user_id', userId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update preference.' });
      setRequireMonthlyReset(!enabled);
    } else {
      toast({ 
        title: enabled ? 'Enabled' : 'Disabled', 
        description: enabled 
          ? 'You will be reminded to change your password every 30 days.' 
          : 'Monthly password reset reminders disabled.'
      });
    }
  };

  const dismissReminder = () => {
    setShowReminder(false);
  };

  return (
    <>
      {/* Settings Button - can be placed in header or settings page */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSettings(true)}
        className="gap-2"
      >
        <Shield className="h-4 w-4" />
        Security Settings
      </Button>

      {/* Password Reset Reminder Dialog */}
      <Dialog open={showReminder} onOpenChange={setShowReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <KeyRound className="h-5 w-5" />
              Password Reset Required
            </DialogTitle>
            <DialogDescription>
              Your password is {daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due'} for a security update. 
              Please change your password to continue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={dismissReminder}>
              Remind Me Later
            </Button>
            <Button onClick={handlePasswordChange} disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Security Settings
            </DialogTitle>
            <DialogDescription>
              Manage your account security preferences.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="monthly-reset" className="text-base">Monthly Password Reset</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded to change your password every 30 days for extra security.
                </p>
              </div>
              <Switch
                id="monthly-reset"
                checked={requireMonthlyReset}
                onCheckedChange={handleTogglePreference}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Change Password Now</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="settings-new-password">New Password</Label>
                  <Input
                    id="settings-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-confirm-password">Confirm Password</Label>
                  <Input
                    id="settings-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {loading ? 'Updating...' : 'Change Password'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
