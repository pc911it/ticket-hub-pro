import { ReactNode } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeatureGateProps {
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  featureName?: string;
}

export function FeatureGate({ 
  featureKey, 
  children, 
  fallback,
  showUpgradePrompt = true,
  featureName
}: FeatureGateProps) {
  const { hasFeature, isLoading, companyPlan } = useFeatureAccess();

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // If user has the feature, render children
  if (hasFeature(featureKey)) {
    return <>{children}</>;
  }

  // If a custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  if (showUpgradePrompt) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">
            {featureName || 'Premium Feature'}
          </CardTitle>
          <CardDescription>
            This feature is not included in your current {companyPlan || 'plan'}.
            Upgrade to unlock this and more powerful features.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/admin/billing">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" />
              Upgrade Plan
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Hide completely if no upgrade prompt
  return null;
}

// HOC for page-level feature gating
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureKey: string,
  featureName?: string
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate featureKey={featureKey} featureName={featureName}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}
