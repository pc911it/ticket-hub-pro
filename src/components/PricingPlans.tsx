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
  icon: 'starter' | 'professional' | 'enterprise';
}

export const defaultPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    description: 'Perfect for small teams getting started',
    icon: 'starter',
    features: [
      'Up to 5 dispatchers',
      'Up to 10 field agents',
      '100 tickets/month',
      'Basic notifications',
      'Email support',
      'Client management',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 79,
    yearlyPrice: 790,
    description: 'For growing companies with more needs',
    icon: 'professional',
    popular: true,
    features: [
      'Up to 15 dispatchers',
      'Up to 50 field agents',
      'Unlimited tickets',
      'Real-time tracking',
      'Priority support',
      'Custom reports',
      'Inventory management',
      'Project management',
    ],
    highlighted: ['Unlimited tickets', 'Real-time tracking'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    description: 'For large operations needing full control',
    icon: 'enterprise',
    features: [
      'Unlimited dispatchers',
      'Unlimited field agents',
      'Unlimited tickets',
      'Advanced analytics',
      '24/7 phone support',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    highlighted: ['API access', 'Custom integrations', 'SLA guarantee'],
  },
];

const iconMap = {
  starter: Zap,
  professional: Shield,
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
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">${price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  {isYearly && (
                    <p className="text-xs text-muted-foreground">
                      Billed ${plan.yearlyPrice}/year
                      <span className="text-success ml-1">(Save ${savings})</span>
                    </p>
                  )}
                  {!isYearly && (
                    <p className="text-xs text-muted-foreground">
                      Billed monthly
                    </p>
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
                      {currentPlan ? 'Switch Plan' : 'Get Started'}
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
                    <a href="/register-company">
                      Start Free Trial
                    </a>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Bottom Note */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        All plans include a 14-day free trial. No credit card required to start.
      </p>
    </div>
  );
}

export { defaultPlans as plans };
