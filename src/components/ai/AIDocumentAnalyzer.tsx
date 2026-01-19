import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { FileText, Loader2, Upload, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentAnalyzerProps {
  onAnalysisComplete?: (analysis: string) => void;
}

export function AIDocumentAnalyzer({ onAnalysisComplete }: DocumentAnalyzerProps) {
  const [documentText, setDocumentText] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const { isLoading, generateOnce } = useAIAssistant({ type: 'document' });

  const handleFileRead = useCallback(async (file: File) => {
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      setDocumentText(text);
    } else if (file.type === 'application/pdf') {
      toast.info('PDF support coming soon. Please paste the text content for now.');
    } else {
      toast.error('Please upload a text file or paste content directly');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files?.[0]) {
      handleFileRead(e.dataTransfer.files[0]);
    }
  }, [handleFileRead]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleAnalyze = async () => {
    if (!documentText.trim()) {
      toast.error('Please provide document content');
      return;
    }

    const prompt = `Analyze the following construction document and extract key information:

${documentText}

Please provide:
1. Document type and purpose
2. Key parties involved (names, roles, contact info if available)
3. Important dates and deadlines
4. Financial terms (amounts, payment schedules, penalties)
5. Scope of work summary
6. Key obligations and responsibilities
7. Special conditions or requirements
8. Potential issues or missing information
9. Recommended actions

Format the response in clear sections.`;

    const result = await generateOnce(prompt);
    if (result) {
      setAnalysis(result);
      onAnalysisComplete?.(result);
    }
  };

  const handleCopy = async () => {
    if (analysis) {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      toast.success('Analysis copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          AI Document Analyzer
        </CardTitle>
        <CardDescription>
          Upload or paste document content for AI-powered analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag and drop a text file here, or{' '}
            <label className="text-primary cursor-pointer hover:underline">
              browse
              <input
                type="file"
                accept=".txt,.doc,.docx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileRead(e.target.files[0])}
              />
            </label>
          </p>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">
            Or paste document content
          </label>
          <textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Paste your contract, permit, specification, or other document text here..."
            rows={6}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            disabled={isLoading}
          />
        </div>
        
        <Button 
          onClick={handleAnalyze} 
          disabled={!documentText.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing Document...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Analyze Document
            </>
          )}
        </Button>
        
        {analysis && (
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
              <h4 className="font-semibold mb-2">Document Analysis</h4>
              <pre className="text-sm whitespace-pre-wrap">{analysis}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
