import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { Calculator, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BidEstimatorProps {
  projectName?: string;
  projectDescription?: string;
  onEstimateGenerated?: (estimate: string) => void;
}

export function AIBidEstimator({
  projectName,
  projectDescription,
  onEstimateGenerated,
}: BidEstimatorProps) {
  const [description, setDescription] = useState(projectDescription || '');
  const [estimate, setEstimate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { isLoading, generateOnce } = useAIAssistant({ type: 'bid' });

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Please provide project details');
      return;
    }

    const prompt = `Generate a detailed bid estimate for the following construction project:

Project Name: ${projectName || 'Construction Project'}
Description: ${description}

Please provide:
1. Itemized line items with quantities and unit prices
2. Labor costs breakdown
3. Material costs breakdown
4. Equipment costs if applicable
5. Overhead and profit margin (typically 10-15%)
6. Contingency recommendation (typically 5-10%)
7. Total estimated cost

Format the response clearly with categories and subtotals.`;

    const result = await generateOnce(prompt);
    if (result) {
      setEstimate(result);
      onEstimateGenerated?.(result);
    }
  };

  const handleCopy = async () => {
    if (estimate) {
      await navigator.clipboard.writeText(estimate);
      setCopied(true);
      toast.success('Estimate copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          AI Bid Estimator
        </CardTitle>
        <CardDescription>
          Describe your project and let AI generate a detailed cost estimate
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Project Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the project scope, size, materials needed, location, timeline, and any special requirements..."
            rows={4}
            disabled={isLoading}
          />
        </div>
        
        <Button 
          onClick={handleGenerate} 
          disabled={!description.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Estimate...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Generate Estimate
            </>
          )}
        </Button>
        
        {estimate && (
          <div className="relative">
            <div className="absolute top-2 right-2">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="bg-muted rounded-lg p-4 mt-4">
              <h4 className="font-semibold mb-2">Generated Estimate</h4>
              <pre className="text-sm whitespace-pre-wrap font-mono">{estimate}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
