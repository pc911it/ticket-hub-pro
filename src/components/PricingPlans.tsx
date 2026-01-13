import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Zap, Shield, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  highlighted?: string[];
  popular?: boolean;
  icon: 'professional' | 'advanced' | 'enterprise';
  isCustomPricing?: boolean;
}

export const defaultPlans: PricingPlan[] = [
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 349,
    yearlyPrice: 2990,
    description: 'Perfect for growing teams ready to scale operations',
    icon: 'professional',
    features: [
      '1,000 tickets/month',
      'Unlimited projects',
      'Up to 10 staff members',
      'Full Inventory with barcode & supplier',
      'Full Client Portal access',
      'Geolocation Verification',
      'Admin Approval Workflow',
      'Project Chat',
      'File Uploads (Tickets & Projects)',
      'Billing Integration (Stripe/Square)',
      'Standard Support',
    ],
    highlighted: ['Full Inventory with barcode & supplier', 'Geolocation Verification'],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    monthlyPrice: 899,
    yearlyPrice: 7490,
    description: 'Complete solution for high-volume organizations',
    icon: 'advanced',
    popular: true,
    features: [
      'Unlimited tickets',
      'Unlimited projects',
      'Unlimited staff members',
      'Full Inventory + advanced reports',
      'Full Portal + external company collaboration',
      'Geolocation Verification',
      'Admin Approval Workflow',
      'Project Chat',
      'File Uploads (Tickets & Projects)',
      'Branding / White-label',
      'Billing Integration (Stripe/Square)',
      'Priority Support',
    ],
    highlighted: ['Unlimited staff members', 'External company collaboration', 'Branding / White-label'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Tailored solutions for large-scale operations',
    icon: 'enterprise',
    isCustomPricing: true,
    features: [
      'Unlimited tickets',
      'Unlimited + multi-company projects',
      'Enterprise-level users',
      'Full Inventory + multi-location tracking',
      'Full Portal + SLA & dedicated onboarding',
      'Geolocation Verification',
      'Admin Approval Workflow',
      'Project Chat',
      'File Uploads (Tickets & Projects)',
      'Branding / White-label',
      'Billing Integration (Stripe/Square)',
      'Dedicated Support + SLA',
    ],
    highlighted: ['Multi-company projects', 'Multi-location tracking', 'Dedicated Support + SLA'],
  },
];

const iconMap = {
  professional: Zap,
  advanced: Shield,
  enterprise: Users,
};

interface PricingPlansProps {
  currentPlan?: string;
  onSelectPlan?: (planId: string, isYearly: boolean) => void;
  showCurrentBadge?: boolean;
  variant?: 'default' | 'compact' | 'landing';
  className?: string;
}

export function PricingPlans({
  currentPlan,
  onSelectPlan,
  showCurrentBadge = true,
  variant = 'default',
  className,
}: PricingPlansProps) {
  const [isYearly, setIsYearly] = useState(false);

  const getPrice = (plan: PricingPlan) => {
    if (isYearly) {
      return Math.round(plan.yearlyPrice / 12);
    }
    return plan.monthlyPrice;
  };

  const getSavings = (plan: PricingPlan) => {
    const yearlySavings = (plan.monthlyPrice * 12) - plan.yearlyPrice;
    return yearlySavings;
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <span className={cn(
          'text-sm font-medium transition-colors',
          !isYearly ? 'text-foreground' : 'text-muted-foreground'
        )}>
          Monthly
        </span>
        <Switch
          checked={isYearly}
          onCheckedChange={setIsYearly}
          className="data-[state=checked]:bg-secondary"
        />
        <span className={cn(
          'text-sm font-medium transition-colors',
          isYearly ? 'text-foreground' : 'text-muted-foreground'
        )}>
          Yearly
        </span>
        {isYearly && (
          <Badge variant="secondary" className="ml-2 animate-scale-in">
            <Sparkles className="h-3 w-3 mr-1" />
            Save up to 17%
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      <div className={cn(
        'grid gap-6',
        variant === 'compact' ? 'md:grid-cols-3' : 'lg:grid-cols-3 md:grid-cols-2'
      )}>
        {defaultPlans.map((plan, index) => {
          const Icon = iconMap[plan.icon];
          const isCurrentPlan = plan.id === currentPlan;
          const price = getPrice(plan);
          const savings = getSavings(plan);

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative overflow-hidden transition-all duration-300 hover:shadow-xl group',
                plan.popular && 'border-secondary shadow-lg scale-[1.02] z-10',
                isCurrentPlan && 'ring-2 ring-primary border-primary',
                variant === 'landing' && 'bg-card/80 backdrop-blur-sm'
              )}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground text-center py-1.5 text-xs font-semibold">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  MOST POPULAR
                </div>
              )}

              {/* Current Plan Badge */}
              {showCurrentBadge && isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Current Plan
                </div>
              )}

              <CardHeader className={cn('text-center', plan.popular && 'pt-10')}>
                {/* Icon */}
                <div className={cn(
                  'mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300',
                  plan.popular 
                    ? 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/25' 
                    : 'bg-muted group-hover:bg-primary/10'
                )}>
                  <Icon className="h-7 w-7" />
                </div>

                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>

                {/* Pricing */}
                <div className="mt-6 space-y-1">
                  {plan.isCustomPricing ? (
                    <>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold text-foreground">Contact Us</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Custom pricing for your needs
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold text-foreground">${price}</span>
                        <span className="text-muted-foreground">/mo</span>
                      </div>
                      {isYearly && (
                        <p className="text-xs text-muted-foreground">
                          Billed ${plan.yearlyPrice}/year
                          <span className="text-green-600 ml-1">(Save ${savings})</span>
                        </p>
                      )}
                      {!isYearly && (
                        <p className="text-xs text-muted-foreground">
                          Billed monthly
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="border-t pt-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => {
                      const isHighlighted = plan.highlighted?.includes(feature);
                      return (
                        <li key={feature} className="flex items-start gap-3">
                          <div className={cn(
                            'mt-0.5 rounded-full p-0.5',
                            isHighlighted ? 'bg-secondary/20' : ''
                          )}>
                            <Check className={cn(
                              'h-4 w-4',
                              isHighlighted ? 'text-secondary' : 'text-muted-foreground'
                            )} />
                          </div>
                          <span className={cn(
                            'text-sm',
                            isHighlighted && 'font-medium text-foreground'
                          )}>
                            {feature}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                {onSelectPlan ? (
                  isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      variant={plan.popular ? 'default' : 'outline'}
                      className={cn(
                        'w-full transition-all duration-300',
                        plan.popular && 'bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25'
                      )}
                      onClick={() => onSelectPlan(plan.id, isYearly)}
                    >
                      {plan.isCustomPricing ? 'Contact Sales' : (currentPlan ? 'Switch Plan' : 'Get Started')}
                    </Button>
                  )
                ) : (
                  <Button
                    variant={plan.popular ? 'default' : 'outline'}
                    className={cn(
                      'w-full transition-all duration-300',
                      plan.popular && 'bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25'
                    )}
                    asChild
                  >
                    <a href={plan.isCustomPricing ? 'mailto:sales@yourcompany.com' : '/register-company'}>
                      {plan.isCustomPricing ? 'Contact Sales' : 'Start Free Trial'}
                    </a>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Bottom Note */}
      <div className="text-center mt-8 space-y-2">
        <p className="text-sm text-muted-foreground">
          All plans include a 14-day free trial. No credit card required to start.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Payment processing fees (2.9% + $0.30 per transaction) apply when billing your clients.
        </p>
      </div>
    </div>
  );
}

export { defaultPlans as plans };
