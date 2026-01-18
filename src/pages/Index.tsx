import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { PricingPlans } from '@/components/PricingPlans';
import { SupportChatWidget } from '@/components/SupportChatWidget';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { 
  Building2,
  Calendar,
  Users,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  FileText,
  DollarSign,
  ClipboardList,
  Truck,
  MessageSquare,
  BarChart3,
  Wrench,
  Camera,
  FileSignature,
  Calculator,
  Package,
  HardHat,
  Map,
  Bell,
  Lock,
  Smartphone,
  Globe,
  HeadphonesIcon,
  TrendingUp,
  FolderOpen,
  Settings,
  Star,
  Play
} from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const heroFeatures = [
    t('features.projectManagement'),
    t('features.clientPortal'),
    t('features.invoicing'),
    t('features.teamScheduling'),
    t('features.documentManagement'),
    t('features.realTimeCommunication')
  ];

  const featureCategories = [
    {
      title: t('features.salesEstimating.title'),
      icon: TrendingUp,
      color: 'bg-blue-500/10 text-blue-600',
      features: [
        { name: t('features.salesEstimating.digitalTakeoffs'), description: t('features.salesEstimating.digitalTakeoffsDesc') },
        { name: t('features.salesEstimating.costCatalogs'), description: t('features.salesEstimating.costCatalogsDesc') },
        { name: t('features.salesEstimating.bidManagement'), description: t('features.salesEstimating.bidManagementDesc') },
        { name: t('features.salesEstimating.contracts'), description: t('features.salesEstimating.contractsDesc') },
        { name: t('features.salesEstimating.proposals'), description: t('features.salesEstimating.proposalsDesc') },
      ]
    },
    {
      title: t('features.projectMgmt.title'),
      icon: ClipboardList,
      color: 'bg-green-500/10 text-green-600',
      features: [
        { name: t('features.projectMgmt.gantt'), description: t('features.projectMgmt.ganttDesc') },
        { name: t('features.projectMgmt.dailyLogs'), description: t('features.projectMgmt.dailyLogsDesc') },
        { name: t('features.projectMgmt.timeTracking'), description: t('features.projectMgmt.timeTrackingDesc') },
        { name: t('features.projectMgmt.milestones'), description: t('features.projectMgmt.milestonesDesc') },
        { name: t('features.projectMgmt.tasks'), description: t('features.projectMgmt.tasksDesc') },
      ]
    },
    {
      title: t('features.financials.title'),
      icon: DollarSign,
      color: 'bg-amber-500/10 text-amber-600',
      features: [
        { name: t('features.financials.jobCosting'), description: t('features.financials.jobCostingDesc') },
        { name: t('features.financials.budgeting'), description: t('features.financials.budgetingDesc') },
        { name: t('features.financials.changeOrders'), description: t('features.financials.changeOrdersDesc') },
        { name: t('features.financials.purchaseOrders'), description: t('features.financials.purchaseOrdersDesc') },
        { name: t('features.financials.invoicing'), description: t('features.financials.invoicingDesc') },
      ]
    },
    {
      title: t('features.fieldTools.title'),
      icon: Wrench,
      color: 'bg-purple-500/10 text-purple-600',
      features: [
        { name: t('features.fieldTools.workOrders'), description: t('features.fieldTools.workOrdersDesc') },
        { name: t('features.fieldTools.inspections'), description: t('features.fieldTools.inspectionsDesc') },
        { name: t('features.fieldTools.punchLists'), description: t('features.fieldTools.punchListsDesc') },
        { name: t('features.fieldTools.permits'), description: t('features.fieldTools.permitsDesc') },
        { name: t('features.fieldTools.rfi'), description: t('features.fieldTools.rfiDesc') },
      ]
    },
    {
      title: t('features.communication.title'),
      icon: MessageSquare,
      color: 'bg-pink-500/10 text-pink-600',
      features: [
        { name: t('features.communication.teamMessaging'), description: t('features.communication.teamMessagingDesc') },
        { name: t('features.communication.clientPortal'), description: t('features.communication.clientPortalDesc') },
        { name: t('features.communication.progressPhotos'), description: t('features.communication.progressPhotosDesc') },
        { name: t('features.communication.notifications'), description: t('features.communication.notificationsDesc') },
        { name: t('features.communication.approvals'), description: t('features.communication.approvalsDesc') },
      ]
    },
    {
      title: t('features.documentation.title'),
      icon: FolderOpen,
      color: 'bg-cyan-500/10 text-cyan-600',
      features: [
        { name: t('features.documentation.fileStorage'), description: t('features.documentation.fileStorageDesc') },
        { name: t('features.documentation.drawingMarkups'), description: t('features.documentation.drawingMarkupsDesc') },
        { name: t('features.documentation.submittals'), description: t('features.documentation.submittalsDesc') },
        { name: t('features.documentation.versionControl'), description: t('features.documentation.versionControlDesc') },
        { name: t('features.documentation.photoManagement'), description: t('features.documentation.photoManagementDesc') },
      ]
    },
  ];

  const additionalFeatures = [
    { icon: HardHat, title: t('additionalFeatures.subcontractorPortal'), description: t('additionalFeatures.subcontractorPortalDesc') },
    { icon: Package, title: t('additionalFeatures.inventoryManagement'), description: t('additionalFeatures.inventoryManagementDesc') },
    { icon: Truck, title: t('additionalFeatures.equipmentTracking'), description: t('additionalFeatures.equipmentTrackingDesc') },
    { icon: Calculator, title: t('additionalFeatures.costCalculator'), description: t('additionalFeatures.costCalculatorDesc') },
    { icon: Map, title: t('additionalFeatures.liveAgentTracking'), description: t('additionalFeatures.liveAgentTrackingDesc') },
    { icon: Shield, title: t('additionalFeatures.warrantyTracking'), description: t('additionalFeatures.warrantyTrackingDesc') },
    { icon: BarChart3, title: t('additionalFeatures.reportsAnalytics'), description: t('additionalFeatures.reportsAnalyticsDesc') },
    { icon: Settings, title: t('additionalFeatures.customWorkflows'), description: t('additionalFeatures.customWorkflowsDesc') },
  ];

  const stats = [
    { value: '10k+', label: t('stats.activeCompanies') },
    { value: '500k+', label: t('stats.projectsManaged') },
    { value: '99.9%', label: t('stats.uptimeGuarantee') },
    { value: '24/7', label: t('stats.supportAvailable') },
  ];

  const testimonials = [
    {
      quote: "BuilderFlow transformed how we manage our construction projects. The client portal alone has saved us countless hours.",
      author: "Michael Chen",
      role: "Construction Manager",
      company: "Chen Construction LLC"
    },
    {
      quote: "From estimates to invoicing, everything is in one place. Our team efficiency has increased by 40% since switching.",
      author: "Sarah Williams",
      role: "Operations Director",
      company: "Premier Builders Inc"
    },
    {
      quote: "The real-time job costing feature has been a game-changer. We now catch budget issues before they become problems.",
      author: "David Rodriguez",
      role: "Project Manager",
      company: "Rodriguez & Sons"
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">BuilderFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('nav.features')}</a>
            <a href="#solutions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('nav.solutions')}</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('nav.pricing')}</a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="compact" />
            {user ? (
              <Link to="/admin">
                <Button>{t('nav.dashboard')}</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">{t('nav.signIn')}</Button>
                </Link>
                <Link to="/register-company">
                  <Button size="sm">{t('nav.startFreeTrial')}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center pt-12">
            <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Star className="h-4 w-4" />
              <span>{t('hero.badge')}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6 animate-slide-up leading-tight">
              {t('hero.title')}
              <span className="block gradient-text">{t('hero.titleHighlight')}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
              {t('hero.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Link to="/register-company">
                <Button variant="hero" size="xl" className="gap-2 shadow-xl">
                  {t('hero.cta')}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="heroOutline" size="xl" className="gap-2">
                <Play className="h-5 w-5" />
                {t('hero.watchDemo')}
              </Button>
            </div>

            {/* Quick Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: '300ms' }}>
              {heroFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  <span className="text-sm text-primary-foreground/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '400ms' }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-2xl bg-primary-foreground/5 backdrop-blur-sm">
                <p className="text-3xl md:text-4xl font-display font-bold text-secondary">{stat.value}</p>
                <p className="text-sm text-primary-foreground/60 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 bg-muted/30 border-y">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-6">{t('trustedBy')}</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
            {['Premier Builders', 'Construct Pro', 'Elite Contractors', 'BuildRight Inc', 'HomeCraft'].map((company) => (
              <span key={company} className="text-lg font-display font-semibold text-muted-foreground">{company}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Categories Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureCategories.map((category, index) => (
              <Card 
                key={category.title} 
                className="border shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-2xl ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <category.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-4">{category.title}</h3>
                  <ul className="space-y-3">
                    {category.features.map((feature) => (
                      <li key={feature.name} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-sm">{feature.name}</span>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section id="solutions" className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t('additionalFeatures.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('additionalFeatures.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {additionalFeatures.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                {t('benefits.title')}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t('benefits.subtitle')}
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Smartphone, title: t('benefits.mobileFirst'), description: t('benefits.mobileFirstDesc') },
                  { icon: Lock, title: t('benefits.security'), description: t('benefits.securityDesc') },
                  { icon: Globe, title: t('benefits.cloudBased'), description: t('benefits.cloudBasedDesc') },
                  { icon: HeadphonesIcon, title: t('benefits.support'), description: t('benefits.supportDesc') },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  {[Building2, Calendar, DollarSign, Users].map((Icon, i) => (
                    <div key={i} className="aspect-square rounded-2xl bg-card shadow-xl flex items-center justify-center animate-float" style={{ animationDelay: `${i * 150}ms` }}>
                      <Icon className="h-12 w-12 text-primary" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t('testimonials.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('testimonials.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{testimonial.author.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('pricing.subtitle')}
            </p>
          </div>

          <PricingPlans variant="landing" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register-company">
              <Button variant="hero" size="xl" className="gap-2 shadow-xl">
                {t('cta.getStarted')}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="heroOutline" size="xl">
              {t('cta.scheduleDemo')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-card border-t">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-display text-xl font-bold">BuilderFlow</span>
              </Link>
              <p className="text-sm text-muted-foreground mb-4">
                {t('footer.description')}
              </p>
              <LanguageSwitcher />
            </div>

            <div>
              <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">{t('footer.features')}</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">{t('footer.pricing')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.integrations')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">{t('footer.company')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.about')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.careers')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.blog')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">{t('footer.support')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.helpCenter')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.contact')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.status')}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2026 BuilderFlow. {t('footer.copyright')}</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">{t('footer.privacy')}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t('footer.terms')}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t('footer.cookies')}</a>
            </div>
          </div>
        </div>
      </footer>

      <SupportChatWidget />
    </div>
  );
};

export default Index;