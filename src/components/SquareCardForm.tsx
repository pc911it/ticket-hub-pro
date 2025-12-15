import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

interface SquarePayments {
  card: () => Promise<SquareCard>;
}

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
  destroy: () => void;
}

interface SquareCardFormProps {
  onCardNonce: (nonce: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SquareCardForm({ onCardNonce, isLoading, disabled }: SquareCardFormProps) {
  const [card, setCard] = useState<SquareCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID || '';
  const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID || '';
  
  // Debug logging
  console.log('Square config:', { 
    applicationId: applicationId ? `${applicationId.substring(0, 15)}...` : 'NOT SET',
    locationId: locationId ? `${locationId.substring(0, 10)}...` : 'NOT SET'
  });

  useEffect(() => {
    // Load Square Web SDK
    const loadSquare = async () => {
      if (!applicationId || !locationId) {
        setError('Square payment is not configured. Please contact support.');
        setIsInitializing(false);
        return;
      }

      try {
        // Check if script is already loaded
        if (!window.Square) {
          const script = document.createElement('script');
          // Use sandbox for sandbox app IDs, production otherwise
          const isSandbox = applicationId.startsWith('sandbox-');
          script.src = isSandbox 
            ? 'https://sandbox.web.squarecdn.com/v1/square.js'
            : 'https://web.squarecdn.com/v1/square.js';
          script.async = true;
          script.onload = () => initializeCard();
          script.onerror = () => {
            setError('Failed to load payment system. Please refresh the page.');
            setIsInitializing(false);
          };
          document.body.appendChild(script);
        } else {
          await initializeCard();
        }
      } catch (err) {
        console.error('Error loading Square:', err);
        setError('Failed to initialize payment form.');
        setIsInitializing(false);
      }
    };

    const initializeCard = async () => {
      try {
        if (!window.Square) {
          setTimeout(initializeCard, 100);
          return;
        }

        const payments = await window.Square.payments(applicationId, locationId);
        const cardInstance = await payments.card();
        await cardInstance.attach('#card-container');
        setCard(cardInstance);
        setIsInitializing(false);
      } catch (err) {
        console.error('Error initializing card:', err);
        setError('Failed to initialize payment form.');
        setIsInitializing(false);
      }
    };

    loadSquare();

    return () => {
      if (card) {
        card.destroy();
      }
    };
  }, [applicationId, locationId]);

  const handleTokenize = async () => {
    if (!card) return;

    setError(null);
    
    try {
      const result = await card.tokenize();
      
      if (result.status === 'OK' && result.token) {
        onCardNonce(result.token);
      } else if (result.errors) {
        setError(result.errors.map(e => e.message).join(', '));
      } else {
        setError('Failed to process card. Please try again.');
      }
    } catch (err) {
      console.error('Tokenization error:', err);
      setError('Failed to process card. Please try again.');
    }
  };

  if (!applicationId || !locationId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Payment system is not configured. Registration is temporarily unavailable.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Lock className="h-4 w-4" />
        <span>Your payment info is securely processed by Square</span>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Card Details</Label>
        <div 
          id="card-container" 
          ref={cardContainerRef}
          className="min-h-[50px] border rounded-md p-3 bg-background"
        >
          {isInitializing && (
            <div className="flex items-center justify-center text-muted-foreground">
              <CreditCard className="h-4 w-4 mr-2 animate-pulse" />
              Loading payment form...
            </div>
          )}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleTokenize}
        disabled={!card || isLoading || disabled || isInitializing}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          'Processing...'
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Save Card & Complete Registration
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your card will be charged ${disabled ? '0' : 'your plan price'} after the 14-day trial ends.
        You can cancel anytime before then.
      </p>
    </div>
  );
}
