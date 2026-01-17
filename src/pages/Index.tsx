import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { PricingPlans } from '@/components/PricingPlans';
import { SupportChatWidget } from '@/components/SupportChatWidget';
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

  const heroFeatures = [
    'Project Management',
    'Client Portal',
    'Invoicing & Payments',
    'Team Scheduling',
    'Document Management',
    'Real-time Communication'
  ];

  const featureCategories = [
    {
      title: 'Sales & Estimating',
      icon: TrendingUp,
      color: 'bg-blue-500/10 text-blue-600',
      features: [
        { name: 'Digital Takeoffs', description: 'AI-powered measurement tools' },
        { name: 'Cost Catalogs', description: 'Customizable pricing libraries' },
        { name: 'Bid Management', description: 'Track and manage all bids' },
        { name: 'Contracts & eSignatures', description: 'Legally binding digital signatures' },
        { name: 'Proposals', description: 'Professional proposal generation' },
      ]
    },
    {
      title: 'Project Management',
      icon: ClipboardList,
      color: 'bg-green-500/10 text-green-600',
      features: [
        { name: 'Gantt Scheduling', description: 'Visual timeline planning' },
        { name: 'Daily Logs', description: 'Track progress & activities' },
        { name: 'Time Tracking', description: 'Employee hours & reports' },
        { name: 'Milestone Tracking', description: 'Monitor project phases' },
        { name: 'Task Management', description: 'Assign and track tasks' },
      ]
    },
    {
      title: 'Financials',
      icon: DollarSign,
      color: 'bg-amber-500/10 text-amber-600',
      features: [
        { name: 'Real-time Job Costing', description: 'Track costs as they happen' },
        { name: 'Budgeting', description: 'Comprehensive budget tools' },
        { name: 'Change Orders', description: 'Manage scope changes' },
        { name: 'Purchase Orders', description: 'Streamlined procurement' },
        { name: 'Customer Invoicing', description: 'Online payments & billing' },
      ]
    },
    {
      title: 'Field Tools',
      icon: Wrench,
      color: 'bg-purple-500/10 text-purple-600',
      features: [
        { name: 'Work Orders', description: 'Mobile work order management' },
        { name: 'Inspections', description: 'Digital inspection checklists' },
        { name: 'Punch Lists', description: 'Track completion items' },
        { name: 'Permit Manager', description: 'Track all permits & approvals' },
        { name: 'RFI Management', description: 'Request for information tracking' },
      ]
    },
    {
      title: 'Communication',
      icon: MessageSquare,
      color: 'bg-pink-500/10 text-pink-600',
      features: [
        { name: 'Team Messaging', description: 'Real-time team chat' },
        { name: 'Client Portal', description: 'Dedicated customer access' },
        { name: 'Progress Photos', description: 'Visual project updates' },
        { name: 'Notifications', description: 'Smart alerts & reminders' },
        { name: 'Change Order Approvals', description: 'Digital approval workflows' },
      ]
    },
    {
      title: 'Documentation',
      icon: FolderOpen,
      color: 'bg-cyan-500/10 text-cyan-600',
      features: [
        { name: 'File Storage', description: 'Secure cloud storage' },
        { name: 'Drawing Markups', description: 'Annotate plans digitally' },
        { name: 'Submittals', description: 'Track document submissions' },
        { name: 'Version Control', description: 'Document history tracking' },
        { name: 'Photo Management', description: 'Organize project photos' },
      ]
    },
  ];

  const additionalFeatures = [
    { icon: HardHat, title: 'Subcontractor Portal', description: 'Dedicated vendor & sub access' },
    { icon: Package, title: 'Inventory Management', description: 'Track materials & supplies' },
    { icon: Truck, title: 'Equipment Tracking', description: 'Vehicle & equipment logs' },
    { icon: Calculator, title: 'Cost Calculator', description: 'Instant cost estimates' },
    { icon: Map, title: 'Live Agent Tracking', description: 'Real-time field team location' },
    { icon: Shield, title: 'Warranty Tracking', description: 'Manage warranties & claims' },
    { icon: BarChart3, title: 'Reports & Analytics', description: 'Comprehensive reporting' },
    { icon: Settings, title: 'Custom Workflows', description: 'Approval chains & automation' },
  ];

  const stats = [
    { value: '10k+', label: 'Active Companies' },
    { value: '500k+', label: 'Projects Managed' },
    { value: '99.9%', label: 'Uptime Guarantee' },
    { value: '24/7', label: 'Support Available' },
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
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#solutions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Solutions</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/admin">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/register-company">
                  <Button size="sm">Start Free Trial</Button>
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
              <span>Trusted by 10,000+ Construction Professionals</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6 animate-slide-up leading-tight">
              The All-in-One Platform for
              <span className="block gradient-text">Construction Management</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
              From sales to project completion, manage your entire construction business with one powerful platform. 
              Estimates, scheduling, financials, client portals, and more.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Link to="/register-company">
                <Button variant="hero" size="xl" className="gap-2 shadow-xl">
                  Start Your 14-Day Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="heroOutline" size="xl" className="gap-2">
                <Play className="h-5 w-5" />
                Watch Demo
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
          <p className="text-center text-sm text-muted-foreground mb-6">TRUSTED BY LEADING CONSTRUCTION COMPANIES</p>
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
              Everything You Need to Build Better
            </h2>
            <p className="text-lg text-muted-foreground">
              Comprehensive tools designed specifically for construction professionals. 
              Manage every aspect of your business from a single dashboard.
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
              Plus So Much More
            </h2>
            <p className="text-lg text-muted-foreground">
              Advanced features to streamline every aspect of your operations
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
                Built for Modern Construction Teams
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Whether you're a small contractor or a large enterprise, BuilderFlow scales with your business. 
                Our platform is designed by construction professionals, for construction professionals.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Smartphone, title: 'Mobile-First Design', description: 'Access everything from the field with our powerful mobile app' },
                  { icon: Lock, title: 'Enterprise Security', description: 'Bank-level encryption and compliance for your data' },
                  { icon: Globe, title: 'Cloud-Based', description: 'Access your projects from anywhere, anytime' },
                  { icon: HeadphonesIcon, title: '24/7 Support', description: 'Dedicated support team ready to help when you need it' },
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
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Loved by Construction Professionals
            </h2>
            <p className="text-lg text-muted-foreground">
              See what our customers have to say about BuilderFlow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <p className="text-sm text-primary">{testimonial.company}</p>
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
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose the plan that fits your business. All plans include a 14-day free trial with no credit card required.
            </p>
          </div>

          <PricingPlans variant="landing" />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <Card className="border-0 shadow-2xl overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
            <CardContent className="p-12 md:p-16 text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
                Ready to Transform Your Business?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                Join thousands of construction professionals who have streamlined their operations with BuilderFlow. 
                Start your free trial today—credit card required.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
                {['Credit card required', '14-day free trial', 'Cancel anytime', 'Full feature access'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-primary-foreground/90">
                    <CheckCircle2 className="h-5 w-5 text-secondary" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register-company">
                  <Button variant="hero" size="xl" className="gap-2 shadow-xl">
                    Start Your Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="heroOutline" size="xl">
                    Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-secondary-foreground" />
                </div>
                <span className="font-display text-xl font-bold">BuilderFlow</span>
              </div>
              <p className="text-primary-foreground/70 max-w-md">
                The all-in-one construction management platform. From sales to project completion, 
                manage your entire business with one powerful solution.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-primary-foreground/70">
                <li><a href="#features" className="hover:text-secondary transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-secondary transition-colors">Pricing</a></li>
                <li><Link to="/auth" className="hover:text-secondary transition-colors">Sign In</Link></li>
                <li><Link to="/register-company" className="hover:text-secondary transition-colors">Register</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-primary-foreground/70">
                <li><a href="#" className="hover:text-secondary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-primary-foreground/60">
              © {new Date().getFullYear()} BuilderFlow. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-primary-foreground/60">
              <span className="text-sm">Built with ❤️ for construction professionals</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Support Chat Widget */}
      <SupportChatWidget />
    </div>
  );
};

export default Index;
