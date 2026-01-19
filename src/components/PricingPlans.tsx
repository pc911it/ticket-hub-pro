import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Zap, Shield, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';

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
  const { t } = useTranslation();
  const [isYearly, setIsYearly] = useState(false);
  
  // Fetch plans from database
  const { plans: dbPlans, settings, isLoading } = useSubscriptionPlans();

  // Map database plans to UI plans, using database prices
  const getDbPlanPrice = (planId: string) => {
    const dbPlan = dbPlans.find(p => p.id === planId);
    return dbPlan ? {
      monthly: dbPlan.monthly_price / 100,
      yearly: dbPlan.yearly_price / 100,
      isCustom: dbPlan.is_custom_pricing,
      isPopular: dbPlan.is_popular,
    } : null;
  };

  // Define plans with translation keys and DB prices
  const plans: PricingPlan[] = [
    {
      id: 'professional',
      name: t('pricing.professional.name'),
      monthlyPrice: getDbPlanPrice('professional')?.monthly || 349,
      yearlyPrice: getDbPlanPrice('professional')?.yearly || 2990,
      description: t('pricing.professional.description'),
      icon: 'professional',
      features: [
        t('pricing.professional.features.tickets'),
        t('pricing.professional.features.unlimitedProjects'),
        t('pricing.professional.features.staff'),
        t('pricing.professional.features.leads'),
        t('pricing.professional.features.dailyLogs'),
        t('pricing.professional.features.budgeting'),
        t('pricing.professional.features.warranty'),
        t('pricing.professional.features.followUp'),
        t('pricing.professional.features.inventory'),
        t('pricing.professional.features.clientPortal'),
        t('pricing.professional.features.geolocation'),
        t('pricing.professional.features.approval'),
        t('pricing.professional.features.chat'),
        t('pricing.professional.features.uploads'),
        t('pricing.professional.features.billing'),
        t('pricing.professional.features.support'),
      ],
      highlighted: [
        t('pricing.professional.features.leads'),
        t('pricing.professional.features.dailyLogs'),
        t('pricing.professional.features.budgeting'),
      ],
    },
    {
      id: 'advanced',
      name: t('pricing.advanced.name'),
      monthlyPrice: getDbPlanPrice('advanced')?.monthly || 899,
      yearlyPrice: getDbPlanPrice('advanced')?.yearly || 7490,
      description: t('pricing.advanced.description'),
      icon: 'advanced',
      popular: getDbPlanPrice('advanced')?.isPopular ?? true,
      features: [
        t('pricing.advanced.features.unlimitedTickets'),
        t('pricing.advanced.features.unlimitedProjects'),
        t('pricing.advanced.features.unlimitedStaff'),
        t('pricing.advanced.features.leads'),
        t('pricing.advanced.features.bidding'),
        t('pricing.advanced.features.rfi'),
        t('pricing.advanced.features.permits'),
        t('pricing.advanced.features.changeOrders'),
        t('pricing.advanced.features.floorPlan'),
        t('pricing.advanced.features.dailyLogs'),
        t('pricing.advanced.features.punchLists'),
        t('pricing.advanced.features.budgeting'),
        t('pricing.advanced.features.warranty'),
        t('pricing.advanced.features.selections'),
        t('pricing.advanced.features.subcontractor'),
        t('pricing.advanced.features.costCalculator'),
        t('pricing.advanced.features.moodBoards'),
        t('pricing.advanced.features.aiTakeoffs'),
        t('pricing.advanced.features.offlineMode'),
        t('pricing.advanced.features.siteMapping'),
        t('pricing.advanced.features.aiFollowUp'),
        t('pricing.advanced.features.advancedInventory'),
        t('pricing.advanced.features.whiteLabel'),
        t('pricing.advanced.features.prioritySupport'),
      ],
      highlighted: [
        t('pricing.advanced.features.bidding'),
        t('pricing.advanced.features.changeOrders'),
        t('pricing.advanced.features.subcontractor'),
        t('pricing.advanced.features.offlineMode'),
        t('pricing.advanced.features.moodBoards'),
      ],
    },
    {
      id: 'enterprise',
      name: t('pricing.enterprise.name'),
      monthlyPrice: getDbPlanPrice('enterprise')?.monthly || 0,
      yearlyPrice: getDbPlanPrice('enterprise')?.yearly || 0,
      description: t('pricing.enterprise.description'),
      icon: 'enterprise',
      isCustomPricing: getDbPlanPrice('enterprise')?.isCustom ?? true,
      features: [
        t('pricing.enterprise.features.unlimitedTickets'),
        t('pricing.enterprise.features.multiCompany'),
        t('pricing.enterprise.features.enterpriseUsers'),
        t('pricing.enterprise.features.allAdvanced'),
        t('pricing.enterprise.features.multiLocation'),
        t('pricing.enterprise.features.aiQuantification'),
        t('pricing.enterprise.features.collaboration'),
        t('pricing.enterprise.features.ocr'),
        t('pricing.enterprise.features.versionControl'),
        t('pricing.enterprise.features.portal'),
        t('pricing.enterprise.features.customIntegrations'),
        t('pricing.enterprise.features.accountManager'),
        t('pricing.enterprise.features.training'),
        t('pricing.enterprise.features.dedicatedSupport'),
      ],
      highlighted: [
        t('pricing.enterprise.features.multiCompany'),
        t('pricing.enterprise.features.aiQuantification'),
        t('pricing.enterprise.features.dedicatedSupport'),
      ],
    },
  ];

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
          {t('pricing.monthly')}
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
          {t('pricing.yearly')}
        </span>
        {isYearly && (
          <Badge variant="secondary" className="ml-2 animate-scale-in">
            <Sparkles className="h-3 w-3 mr-1" />
            {t('pricing.saveUpTo')}
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      <div className={cn(
        'grid gap-6',
        variant === 'compact' ? 'md:grid-cols-3' : 'lg:grid-cols-3 md:grid-cols-2'
      )}>
        {plans.map((plan, index) => {
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
                  {t('pricing.advanced.popular')}
                </div>
              )}

              {/* Current Plan Badge */}
              {showCurrentBadge && isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                  {t('pricing.currentPlan')}
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
                        <span className="text-3xl font-bold text-foreground">{t('pricing.contactUs')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('pricing.customPricing')}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold text-foreground">${price}</span>
                        <span className="text-muted-foreground">{t('pricing.perMonth')}</span>
                      </div>
                      {isYearly && (
                        <p className="text-xs text-muted-foreground">
                          {t('pricing.billed')} ${plan.yearlyPrice}/{t('pricing.year')}
                          <span className="text-green-600 ml-1">({t('pricing.save')} ${savings})</span>
                        </p>
                      )}
                      {!isYearly && (
                        <p className="text-xs text-muted-foreground">
                          {t('pricing.billedMonthly')}
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
                      {t('pricing.currentPlan')}
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
                      {plan.isCustomPricing ? t('pricing.contactSales') : (currentPlan ? t('pricing.switchPlan') : t('pricing.getStarted'))}
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
                      {plan.isCustomPricing ? t('pricing.contactSales') : t('pricing.startFreeTrial')}
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
          {t('pricing.allPlansInclude')}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {t('pricing.paymentFees')}
        </p>
      </div>
    </div>
  );
}

// Export plans for use in other components (with English fallback)
export const defaultPlans: PricingPlan[] = [
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 349,
    yearlyPrice: 2990,
    description: 'Perfect for growing teams ready to scale operations',
    icon: 'professional',
    features: [],
    highlighted: [],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    monthlyPrice: 899,
    yearlyPrice: 7490,
    description: 'Complete solution for high-volume organizations',
    icon: 'advanced',
    popular: true,
    features: [],
    highlighted: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Tailored solutions for large-scale operations',
    icon: 'enterprise',
    isCustomPricing: true,
    features: [],
    highlighted: [],
  },
];

export { defaultPlans as plans };
