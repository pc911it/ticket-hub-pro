import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Mail, Phone, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VerificationStepProps {
  email: string;
  phone?: string;
  onVerified: () => void;
  onBack?: () => void;
}

export function VerificationStep({ email, phone, onVerified, onBack }: VerificationStepProps) {
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState(phone || '');
  const [step, setStep] = useState<'select' | 'verify'>('select');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const getE164Phone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `+1${digits}`; // Assuming US numbers
  };

  const sendCode = async () => {
    setIsSending(true);
    
    try {
      const identifier = verificationMethod === 'email' ? email : getE164Phone(phoneNumber);
      
      if (verificationMethod === 'phone' && phoneNumber.replace(/\D/g, '').length !== 10) {
        toast({
          variant: 'destructive',
          title: 'Invalid phone number',
          description: 'Please enter a valid 10-digit phone number.',
        });
        setIsSending(false);
        return;
      }

      const response = await supabase.functions.invoke('send-verification-code', {
        body: {
          type: verificationMethod,
          email: verificationMethod === 'email' ? email : undefined,
          phone: verificationMethod === 'phone' ? getE164Phone(phoneNumber) : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send verification code');
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      toast({
        title: 'Code sent!',
        description: data.message,
      });

      setStep('verify');
      setCountdown(60);
    } catch (err: any) {
      console.error('Send code error:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to send code',
        description: err.message || 'Please try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: 'Please enter the 6-digit verification code.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const identifier = verificationMethod === 'email' ? email : getE164Phone(phoneNumber);

      const response = await supabase.functions.invoke('verify-code', {
        body: {
          identifier,
          code,
          type: verificationMethod,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Verification failed');
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }

      toast({
        title: 'Verified!',
        description: `Your ${verificationMethod} has been verified successfully.`,
      });

      onVerified();
    } catch (err: any) {
      console.error('Verify code error:', err);
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: err.message || 'Please check the code and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    if (countdown > 0) return;
    await sendCode();
  };

  if (step === 'verify') {
    return (
      <Card className="animate-scale-in shadow-xl border-0 max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2">
            <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">Enter Verification Code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to{' '}
            <span className="font-medium text-foreground">
              {verificationMethod === 'email' ? email : phoneNumber}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={resendCode}
              disabled={countdown > 0 || isSending}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed"
            >
              {isSending ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending...
                </span>
              ) : countdown > 0 ? (
                `Resend code in ${countdown}s`
              ) : (
                "Didn't receive the code? Resend"
              )}
            </button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            onClick={verifyCode}
            className="w-full"
            size="lg"
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify & Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep('select');
              setCode('');
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Change verification method
          </button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="animate-scale-in shadow-xl border-0 max-w-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2">
          <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl font-display">Verify Your Identity</CardTitle>
        <CardDescription>
          Choose how you'd like to verify your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={verificationMethod}
          onValueChange={(value) => setVerificationMethod(value as 'email' | 'phone')}
          className="space-y-3"
        >
          <div 
            className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
              verificationMethod === 'email' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
            }`}
            onClick={() => setVerificationMethod('email')}
          >
            <RadioGroupItem value="email" id="email-verification" />
            <Label htmlFor="email-verification" className="flex items-center gap-3 cursor-pointer flex-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Email Verification</p>
                <p className="text-sm text-muted-foreground">Send code to {email}</p>
              </div>
            </Label>
          </div>

          <div 
            className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
              verificationMethod === 'phone' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
            }`}
            onClick={() => setVerificationMethod('phone')}
          >
            <RadioGroupItem value="phone" id="phone-verification" />
            <Label htmlFor="phone-verification" className="flex items-center gap-3 cursor-pointer flex-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Phone Verification</p>
                <p className="text-sm text-muted-foreground">Receive SMS code</p>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {verificationMethod === 'phone' && (
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="(555) 555-5555"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="pl-10"
                maxLength={14}
              />
            </div>
            <p className="text-xs text-muted-foreground">US phone numbers only</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          onClick={sendCode}
          className="w-full"
          size="lg"
          disabled={isSending || (verificationMethod === 'phone' && phoneNumber.replace(/\D/g, '').length !== 10)}
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending code...
            </>
          ) : (
            <>
              Send Verification Code
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Back to account details
          </button>
        )}
      </CardFooter>
    </Card>
  );
}
