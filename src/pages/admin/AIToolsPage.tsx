import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AIChatAssistant, 
  AIBidEstimator, 
  AIDocumentAnalyzer, 
  AIProjectSummarizer 
} from '@/components/ai';
import { Bot, Calculator, FileText, ListChecks } from 'lucide-react';

export default function AIToolsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Tools</h1>
        <p className="text-muted-foreground mt-1">
          Powerful AI-powered tools to streamline your construction project management
        </p>
      </div>

      <Tabs defaultValue="assistant" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="assistant" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Assistant</span>
          </TabsTrigger>
          <TabsTrigger value="estimator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Bid Estimator</span>
          </TabsTrigger>
          <TabsTrigger value="analyzer" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Document Analyzer</span>
          </TabsTrigger>
          <TabsTrigger value="summarizer" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Summarizer</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <AIChatAssistant 
              type="support" 
              title="Support Assistant"
              placeholder="Ask about features, get help..."
              className="h-[600px]"
            />
            <AIChatAssistant 
              type="chat" 
              title="Project Assistant"
              placeholder="Ask anything about your projects..."
              className="h-[600px]"
            />
          </div>
        </TabsContent>

        <TabsContent value="estimator" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <AIBidEstimator />
          </div>
        </TabsContent>

        <TabsContent value="analyzer" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <AIDocumentAnalyzer />
          </div>
        </TabsContent>

        <TabsContent value="summarizer" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <AIProjectSummarizer />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
