import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

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

interface CompanySquareCardFormProps {
  companyId: string;
  onCardNonce: (nonce: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  buttonText?: string;
}

interface PaymentSettings {
  square_application_id: string | null;
  square_location_id: string | null;
  square_environment: string | null;
}

export function CompanySquareCardForm({ 
  companyId, 
  onCardNonce, 
  isLoading, 
  disabled, 
  buttonText = 'Save Card' 
}: CompanySquareCardFormProps) {
  const [card, setCard] = useState<SquareCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const initializingRef = useRef(false);

  // Fetch company's Square settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!companyId) {
        setError('Company information not available');
        setIsInitializing(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('company_payment_settings')
          .select('square_application_id, square_location_id, square_environment')
          .eq('company_id', companyId)
          .eq('provider', 'square')
          .eq('is_enabled', true)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching payment settings:', fetchError);
          setError('Unable to load payment settings. Please try again later.');
          setIsInitializing(false);
          return;
        }

        if (!data || !data.square_application_id || !data.square_location_id) {
          setError('Payment method not available. Please contact the company.');
          setIsInitializing(false);
          return;
        }

        setPaymentSettings(data);
      } catch (err) {
        console.error('Error fetching payment settings:', err);
        setError('Failed to load payment settings.');
        setIsInitializing(false);
      }
    };

    fetchSettings();
  }, [companyId]);

  // Initialize Square when settings are loaded
  useEffect(() => {
    if (!paymentSettings || initializingRef.current) return;

    const { square_application_id, square_location_id, square_environment } = paymentSettings;

    if (!square_application_id || !square_location_id) {
      setError('Payment system not configured. Please contact the company.');
      setIsInitializing(false);
      return;
    }

    initializingRef.current = true;

    const loadSquare = async () => {
      try {
        // Check if script is already loaded
        if (!window.Square) {
          const script = document.createElement('script');
          // Use sandbox or production based on environment
          const isSandbox = square_environment !== 'production';
          script.src = isSandbox 
            ? 'https://sandbox.web.squarecdn.com/v1/square.js'
            : 'https://web.squarecdn.com/v1/square.js';
          script.async = true;
          script.onload = () => initializeCard();
          script.onerror = () => {
            setError('Failed to load payment system. Please refresh the page.');
            setIsInitializing(false);
            initializingRef.current = false;
          };
          document.body.appendChild(script);
        } else {
          await initializeCard();
        }
      } catch (err) {
        console.error('Error loading Square:', err);
        setError('Failed to initialize payment form.');
        setIsInitializing(false);
        initializingRef.current = false;
      }
    };

    const initializeCard = async () => {
      try {
        if (!window.Square) {
          setTimeout(initializeCard, 100);
          return;
        }

        const payments = await window.Square.payments(square_application_id, square_location_id);
        const cardInstance = await payments.card();
        await cardInstance.attach('#company-card-container');
        setCard(cardInstance);
        setIsInitializing(false);
      } catch (err) {
        console.error('Error initializing card:', err);
        setError('Failed to initialize payment form.');
        setIsInitializing(false);
        initializingRef.current = false;
      }
    };

    loadSquare();

    return () => {
      if (card) {
        card.destroy();
      }
    };
  }, [paymentSettings]);

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

  if (!companyId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load payment form. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Lock className="h-4 w-4" />
        <span>Your payment info is securely processed</span>
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
          id="company-card-container" 
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
            {buttonText}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your card will be saved securely for future payments.
      </p>
    </div>
  );
}
