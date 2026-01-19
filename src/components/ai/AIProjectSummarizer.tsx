import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { ListChecks, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectSummarizerProps {
  projectName?: string;
  existingContent?: string;
  onSummaryGenerated?: (summary: string) => void;
}

export function AIProjectSummarizer({
  projectName,
  existingContent,
  onSummaryGenerated,
}: ProjectSummarizerProps) {
  const [content, setContent] = useState(existingContent || '');
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { isLoading, generateOnce } = useAIAssistant({ type: 'summary' });

  const handleSummarize = async () => {
    if (!content.trim()) {
      toast.error('Please provide content to summarize');
      return;
    }

    const prompt = `Summarize the following project updates/logs for "${projectName || 'Project'}":

${content}

Please provide:
1. Executive Summary (2-3 sentences)
2. Key Progress & Milestones Achieved
3. Current Status
4. Issues & Challenges
5. Decisions Made
6. Action Items & Next Steps
7. Important Dates/Deadlines

Format with bullet points for easy scanning. Prioritize the most important information.`;

    const result = await generateOnce(prompt);
    if (result) {
      setSummary(result);
      onSummaryGenerated?.(result);
    }
  };

  const handleCopy = async () => {
    if (summary) {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success('Summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          AI Project Summarizer
        </CardTitle>
        <CardDescription>
          Paste daily logs, emails, or updates to generate a concise summary
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Content to Summarize
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste daily logs, meeting notes, email threads, or any project communications you want summarized..."
            rows={8}
            disabled={isLoading}
          />
        </div>
        
        <Button 
          onClick={handleSummarize} 
          disabled={!content.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Summary...
            </>
          ) : (
            <>
              <ListChecks className="h-4 w-4 mr-2" />
              Generate Summary
            </>
          )}
        </Button>
        
        {summary && (
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
              <h4 className="font-semibold mb-2">Project Summary</h4>
              <pre className="text-sm whitespace-pre-wrap">{summary}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
