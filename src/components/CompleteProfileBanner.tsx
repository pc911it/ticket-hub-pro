import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight, X } from 'lucide-react';

export const CompleteProfileBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkCompanySetup = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user dismissed the banner in this session
      const dismissedKey = `profile_banner_dismissed_${user.id}`;
      if (sessionStorage.getItem(dismissedKey)) {
        setDismissed(true);
        setLoading(false);
        return;
      }

      try {
        // Check if user has a company
        const { data: membership } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle();

        // Show banner if user has no company
        setShowBanner(!membership);
      } catch (error) {
        console.error('Error checking company setup:', error);
      } finally {
        setLoading(false);
      }
    };

    checkCompanySetup();
  }, [user]);

  const handleDismiss = () => {
    if (user) {
      sessionStorage.setItem(`profile_banner_dismissed_${user.id}`, 'true');
    }
    setDismissed(true);
  };

  if (loading || !showBanner || dismissed) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 mb-6 animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Complete Your Company Setup</h3>
              <p className="text-sm text-muted-foreground">
                Set up your company to unlock all features like invoicing, team management, and more.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={() => navigate('/register-company')} className="gap-2">
              Complete Setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
