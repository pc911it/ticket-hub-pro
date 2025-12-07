import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { PricingPlans } from '@/components/PricingPlans';
import { 
  Ticket, 
  Calendar, 
  Users, 
  Clock, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Intuitive calendar view with drag-and-drop functionality for effortless appointment management.'
    },
    {
      icon: Users,
      title: 'Client Management',
      description: 'Keep all your client information organized in one place with detailed profiles and history.'
    },
    {
      icon: Clock,
      title: 'Real-time Updates',
      description: 'Instant notifications and status updates keep everyone in sync and informed.'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security ensures your data is always protected and accessible.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized performance means no waiting around—everything loads instantly.'
    },
    {
      icon: Ticket,
      title: 'Ticket Tracking',
      description: 'Track every appointment from booking to completion with detailed status tracking.'
    },
  ];

  const benefits = [
    'Unlimited appointments',
    'Client database',
    'Calendar integration',
    'Status tracking',
    'Mobile responsive',
    'Secure data storage'
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Ticket className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold">TicketPro</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/admin">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register-company">
                  <Button>Register Company</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-6 animate-slide-up">
              Streamline Your
              <span className="block gradient-text">Appointment Scheduling</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
              The all-in-one platform for managing tickets, clients, and appointments. 
              Built for professionals who value their time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Link to="/register-company">
                <Button variant="hero" size="xl">
                  Register Your Company
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="heroOutline" size="xl">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '300ms' }}>
            {[
              { value: '10k+', label: 'Active Users' },
              { value: '500k+', label: 'Tickets Managed' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-display font-bold text-secondary">{stat.value}</p>
                <p className="text-sm text-primary-foreground/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed to make appointment management effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose the plan that fits your business. All plans include a 14-day free trial.
            </p>
          </div>

          <PricingPlans variant="landing" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <Card className="border-0 shadow-xl overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
            <CardContent className="p-12 md:p-16">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
                    Ready to Get Started?
                  </h2>
                  <p className="text-lg text-primary-foreground/80 mb-6">
                    Join thousands of professionals who trust TicketPro for their scheduling needs.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-3 text-primary-foreground/90">
                        <CheckCircle2 className="h-5 w-5 text-secondary" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register-company">
                    <Button variant="hero" size="lg">
                      Start Your Free Trial
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="hidden md:block">
                  <div className="w-full aspect-square rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <Ticket className="h-32 w-32 text-secondary/50" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Ticket className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">TicketPro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} TicketPro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
