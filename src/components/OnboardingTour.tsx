import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  target: string; // CSS selector for the target element
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  steps: TourStep[];
  tourId: string; // Unique ID for localStorage
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTour({ steps, tourId, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showRestartButton, setShowRestartButton] = useState(false);

  const storageKey = `tour-completed-${tourId}`;

  useEffect(() => {
    const hasCompleted = localStorage.getItem(storageKey);
    if (!hasCompleted) {
      // Delay start to allow page to render
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowRestartButton(true);
    }
  }, [storageKey]);

  const updateTooltipPosition = useCallback(() => {
    if (!isVisible || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const targetElement = document.querySelector(step.target);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const position = step.position || 'bottom';

      // Add highlight to target element
      targetElement.classList.add('tour-highlight');

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - 160;
          left = rect.left + rect.width / 2 - 160;
          break;
        case 'bottom':
          top = rect.bottom + 16;
          left = rect.left + rect.width / 2 - 160;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - 80;
          left = rect.left - 340;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - 80;
          left = rect.right + 16;
          break;
      }

      // Keep tooltip within viewport
      const padding = 16;
      top = Math.max(padding, Math.min(top, window.innerHeight - 200));
      left = Math.max(padding, Math.min(left, window.innerWidth - 340));

      setTooltipPosition({ top, left });

      // Scroll element into view if needed
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
      const element = document.querySelector(step.target);
      element?.classList.remove('tour-highlight');
    };
  }, [currentStep, steps, isVisible]);

  useEffect(() => {
    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition);
      // Clean up highlights
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [updateTooltipPosition]);

  const handleNext = () => {
    // Remove highlight from current element
    const currentElement = document.querySelector(steps[currentStep].target);
    currentElement?.classList.remove('tour-highlight');

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    // Remove highlight from current element
    const currentElement = document.querySelector(steps[currentStep].target);
    currentElement?.classList.remove('tour-highlight');

    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    setIsVisible(false);
    setShowRestartButton(true);
    onComplete?.();
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    // Clean up highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
    setIsVisible(false);
    setShowRestartButton(true);
    onSkip?.();
  };

  const handleRestart = () => {
    localStorage.removeItem(storageKey);
    setCurrentStep(0);
    setDontShowAgain(false);
    setIsVisible(true);
    setShowRestartButton(false);
  };

  if (!isVisible && showRestartButton) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestart}
        className="fixed bottom-4 right-4 z-40 shadow-lg"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Show Guide
      </Button>
    );
  }

  if (!isVisible || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={handleSkip}
      />

      {/* Tooltip */}
      <Card
        className={cn(
          "fixed z-50 w-80 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300",
          "border-primary/20"
        )}
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-xs font-medium text-primary">
                Step {currentStep + 1} of {steps.length}
              </span>
              <h4 className="font-semibold text-sm mt-1">{step.title}</h4>
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
          <p className="text-sm text-muted-foreground mb-4">
            {step.content}
          </p>

          {/* Progress bar */}
          <div className="flex gap-1 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  index <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Don't show again checkbox */}
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="dont-show"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Don't show this again
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
              <Button size="sm" onClick={handleNext}>
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Styles for highlighted elements */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px hsl(var(--primary) / 0.3), 0 0 20px hsl(var(--primary) / 0.2);
          border-radius: 8px;
          background: hsl(var(--background));
        }
      `}</style>
    </>
  );
}
