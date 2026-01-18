import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ChevronLeft, ChevronRight, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeTourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  spotlight?: boolean;
}

const welcomeSteps: WelcomeTourStep[] = [
  {
    target: 'body',
    title: '🎉 Welcome to TicketPro!',
    content: "We're excited to have you here! Let us give you a quick tour of the platform to help you get started.",
    position: 'bottom',
    spotlight: false,
  },
  {
    target: '[data-tour="sidebar-logo"]',
    title: 'Your Dashboard',
    content: 'Click the logo anytime to return to your main dashboard where you can see an overview of all activities.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-operations"]',
    title: 'Operations Hub',
    content: 'This is your operations center. Access your dashboard, dispatcher, calendar, and set up new calls from here.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-team"]',
    title: 'Team Management',
    content: 'Manage your employees and track their time reports. Keep your team organized and productive.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-sales"]',
    title: 'Sales & CRM',
    content: 'Track leads, manage clients, create bids and contracts. Everything you need to grow your business.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-projects"]',
    title: 'Project Management',
    content: 'Full project control: manage projects, change orders, RFIs, submittals, permits, daily logs, and more.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-financial"]',
    title: 'Financial Tools',
    content: 'Handle client billing, budgeting, and cost calculations. Keep your finances organized.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-resources"]',
    title: 'Resources',
    content: 'Manage inventory, equipment, subcontractors, and your product library all in one place.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-support"]',
    title: 'Support Center',
    content: 'Handle support tickets, live chats, and warranty claims. Keep your customers happy!',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-settings"]',
    title: 'Settings',
    content: 'Configure service types, manage users, billing, payment settings, and more.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-collapse"]',
    title: 'Collapse Sidebar',
    content: 'Click here to collapse the sidebar for more workspace. Hover over icons to see navigation options.',
    position: 'right',
  },
  {
    target: '[data-tour="header-notifications"]',
    title: 'Notifications',
    content: 'Enable push notifications to stay updated on important activities and never miss an update.',
    position: 'bottom',
  },
  {
    target: '[data-tour="header-view-site"]',
    title: 'View Your Site',
    content: 'Click here to see how your public-facing site looks to clients and visitors.',
    position: 'bottom',
  },
  {
    target: 'body',
    title: "You're All Set! 🚀",
    content: "That's the basics! Explore each section to discover all the powerful features. You can restart this tour anytime from the help button.",
    position: 'bottom',
    spotlight: false,
  },
];

interface WelcomeTourProps {
  onComplete?: () => void;
}

export function WelcomeTour({ onComplete }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showRestartButton, setShowRestartButton] = useState(false);

  const storageKey = 'welcome-tour-completed';

  useEffect(() => {
    const hasCompleted = localStorage.getItem(storageKey);
    if (!hasCompleted) {
      // Delay start to allow page to render fully
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowRestartButton(true);
    }
  }, []);

  const updateTooltipPosition = useCallback(() => {
    if (!isVisible || currentStep >= welcomeSteps.length) return;

    const step = welcomeSteps[currentStep];
    const targetElement = document.querySelector(step.target);

    if (targetElement && step.spotlight !== false) {
      const rect = targetElement.getBoundingClientRect();
      const position = step.position || 'bottom';

      // Add highlight to target element
      targetElement.classList.add('welcome-tour-highlight');

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - 200;
          left = rect.left + rect.width / 2 - 180;
          break;
        case 'bottom':
          top = rect.bottom + 16;
          left = rect.left + rect.width / 2 - 180;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - 100;
          left = rect.left - 380;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - 100;
          left = rect.right + 16;
          break;
      }

      // Keep tooltip within viewport
      const padding = 16;
      top = Math.max(padding, Math.min(top, window.innerHeight - 280));
      left = Math.max(padding, Math.min(left, window.innerWidth - 380));

      setTooltipPosition({ top, left });

      // Scroll element into view if needed
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Center the tooltip for welcome/finish steps
      setTooltipPosition({
        top: window.innerHeight / 2 - 140,
        left: window.innerWidth / 2 - 180,
      });
    }

    return () => {
      if (targetElement) {
        targetElement.classList.remove('welcome-tour-highlight');
      }
    };
  }, [currentStep, isVisible]);

  useEffect(() => {
    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition);
      // Clean up highlights
      document.querySelectorAll('.welcome-tour-highlight').forEach(el => {
        el.classList.remove('welcome-tour-highlight');
      });
    };
  }, [updateTooltipPosition]);

  const handleNext = () => {
    // Remove highlight from current element
    const currentElement = document.querySelector(welcomeSteps[currentStep].target);
    currentElement?.classList.remove('welcome-tour-highlight');

    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    // Remove highlight from current element
    const currentElement = document.querySelector(welcomeSteps[currentStep].target);
    currentElement?.classList.remove('welcome-tour-highlight');

    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    document.querySelectorAll('.welcome-tour-highlight').forEach(el => {
      el.classList.remove('welcome-tour-highlight');
    });
    setIsVisible(false);
    setShowRestartButton(true);
    onComplete?.();
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    // Clean up highlights
    document.querySelectorAll('.welcome-tour-highlight').forEach(el => {
      el.classList.remove('welcome-tour-highlight');
    });
    setIsVisible(false);
    setShowRestartButton(true);
  };

  const handleRestart = () => {
    localStorage.removeItem(storageKey);
    setCurrentStep(0);
    setDontShowAgain(false);
    setIsVisible(true);
    setShowRestartButton(false);
  };

  // Show help button when tour is not active
  if (!isVisible && showRestartButton) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestart}
        className="fixed bottom-4 right-4 z-40 shadow-lg bg-background hover:bg-muted"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Need Help?
      </Button>
    );
  }

  if (!isVisible) return null;

  const step = welcomeSteps[currentStep];
  const isWelcomeOrFinish = currentStep === 0 || currentStep === welcomeSteps.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[100] transition-opacity duration-300"
        onClick={handleSkip}
      />

      {/* Tooltip */}
      <Card
        className={cn(
          "fixed z-[101] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300",
          "border-2 border-primary/30 bg-card",
          isWelcomeOrFinish ? "w-96" : "w-80"
        )}
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {isWelcomeOrFinish && <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
              <div>
                <span className="text-xs font-medium text-primary">
                  Step {currentStep + 1} of {welcomeSteps.length}
                </span>
                <h4 className="font-semibold text-base mt-1">{step.title}</h4>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2 -mt-1"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {step.content}
          </p>

          {/* Progress bar */}
          <div className="flex gap-1 mb-4">
            {welcomeSteps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  index <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Don't show again checkbox */}
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="welcome-dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="welcome-dont-show"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Don't show this tour again
            </label>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tour
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleNext} className="min-w-[80px]">
                {currentStep === welcomeSteps.length - 1 ? 'Get Started' : 'Next'}
                {currentStep < welcomeSteps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Styles for highlighted elements */}
      <style>{`
        .welcome-tour-highlight {
          position: relative;
          z-index: 100;
          box-shadow: 0 0 0 4px hsl(var(--primary) / 0.4), 0 0 30px hsl(var(--primary) / 0.3);
          border-radius: 8px;
          background: hsl(var(--background));
          transition: box-shadow 0.3s ease;
        }
      `}</style>
    </>
  );
}
