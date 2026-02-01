import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { 
  Building2, 
  ArrowLeft,
  Target,
  Users,
  Shield,
  Zap,
  Globe,
  HeadphonesIcon
} from 'lucide-react';

const AboutPage = () => {
  const { t } = useTranslation();

  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To empower construction professionals with cutting-edge technology that simplifies project management, enhances collaboration, and drives business growth.'
    },
    {
      icon: Users,
      title: 'Built for Builders',
      description: 'Created by construction industry veterans who understand the unique challenges of managing projects, crews, clients, and finances in the field.'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Your data is protected with bank-level encryption, regular security audits, and compliance with industry standards to keep your business information safe.'
    },
    {
      icon: Zap,
      title: 'Innovation First',
      description: 'We continuously evolve our platform with AI-powered features, mobile-first design, and integrations that keep you ahead of the competition.'
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description: 'Serving construction companies worldwide with multi-language support and features designed for diverse markets and regulatory environments.'
    },
    {
      icon: HeadphonesIcon,
      title: '24/7 Support',
      description: 'Our dedicated support team is available around the clock to help you get the most out of BuilderFlow and resolve any issues quickly.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">BuilderFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="compact" />
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('common.back')}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center pt-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-6">
              About BuilderFlow
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80">
              The complete construction management platform trusted by thousands of professionals worldwide.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Story Section */}
            <div className="prose prose-lg max-w-none mb-16">
              <h2 className="text-3xl font-display font-bold mb-6">Our Story</h2>
              <p className="text-muted-foreground mb-4">
                BuilderFlow was founded with a simple vision: to transform how construction companies manage their projects and grow their businesses. We recognized that the construction industry, despite being one of the largest sectors globally, was underserved by modern technology solutions.
              </p>
              <p className="text-muted-foreground mb-4">
                Traditional tools were fragmented, difficult to use in the field, and failed to address the unique workflows of construction professionals. We set out to change that by building an all-in-one platform that brings together project management, financial tracking, client communication, and team collaboration in a single, intuitive interface.
              </p>
              <p className="text-muted-foreground">
                Today, BuilderFlow powers thousands of construction companies—from small contractors to large enterprises—helping them save time, reduce costs, and deliver better results for their clients. Our platform continues to evolve with new features and capabilities, driven by feedback from our community of builders.
              </p>
            </div>

            {/* Values Grid */}
            <h2 className="text-3xl font-display font-bold mb-8 text-center">What We Stand For</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((value) => (
                <Card key={value.title} className="border shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <value.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-bold mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of construction professionals who trust BuilderFlow to manage their business.
          </p>
          <Link to="/register-company">
            <Button size="lg" className="gap-2">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">© 2026 BuilderFlow. {t('footer.copyright')}</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
