import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search } from 'lucide-react';

interface Rule {
  id: number;
  chapter?: string;
  section?: string;
  subsection?: string;
  rule_number: string;
  text: string;
  examples?: string[];
  keywords?: string[];
  related_rules?: string[];
}

interface SemanticSearchResult {
  relatedRules: Rule[];
  explanation: string;
}

interface RulesFAQPanelProps {
  initialTab?: 'keyword' | 'semantic' | 'ai-expert';
}

export default function RulesFAQPanel({ initialTab = 'keyword' }: RulesFAQPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticQuery, setSemanticQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'keyword' | 'semantic'>(initialTab === 'ai-expert' ? 'keyword' : initialTab as 'keyword' | 'semantic');

  // For basic keyword search
  const rulesQuery = useQuery({
    queryKey: ['/api/rules', searchQuery],
    queryFn: async () => {
      const response = await apiRequest(
        'GET', 
        `/api/rules${searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : ''}`
      );
      return response.json();
    },
    enabled: activeTab === 'keyword',
  });

  // For semantic AI-powered search
  const semanticSearchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest(
        'POST',
        '/api/rules/semantic-search',
        { query }
      );
      return response.json();
    },
    onSuccess: () => {
      // No need to invalidate cache here since we're not changing data
    },
  });
  
  const handleSearch = () => {
    if (activeTab === 'keyword') {
      queryClient.invalidateQueries({ queryKey: ['/api/rules', searchQuery] });
    } else if (activeTab === 'semantic' && semanticQuery.trim()) {
      semanticSearchMutation.mutate(semanticQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, tabType: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const renderRuleItem = (rule: Rule) => (
    <AccordionItem value={rule.rule_number} key={rule.id}>
      <AccordionTrigger className="hover:bg-muted/50 px-4 py-2">
        <div className="flex justify-between w-full pr-4">
          <span className="font-semibold">{rule.rule_number}</span>
          <span className="text-sm truncate text-left flex-1 ml-4">{rule.text.substring(0, 100)}{rule.text.length > 100 ? '...' : ''}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 py-2 bg-muted/20">
        <div className="space-y-2">
          {rule.chapter && <div><span className="font-semibold">Chapter:</span> {rule.chapter}</div>}
          {rule.section && <div><span className="font-semibold">Section:</span> {rule.section}</div>}
          <div className="mt-2">{rule.text}</div>
          
          {rule.examples && rule.examples.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold">Examples:</p>
              <ul className="list-disc list-inside">
                {rule.examples.map((example, idx) => (
                  <li key={idx}>{example}</li>
                ))}
              </ul>
            </div>
          )}
          
          {rule.keywords && rule.keywords.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold">Keywords:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {rule.keywords.map((keyword, idx) => (
                  <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>Magic: The Gathering Rules FAQ</CardTitle>
        <CardDescription>
          Search the comprehensive rules or ask questions in natural language
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="keyword" value={activeTab} onValueChange={(value) => setActiveTab(value as 'keyword' | 'semantic')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="keyword">Keyword Search</TabsTrigger>
            <TabsTrigger value="semantic">Rules Finder</TabsTrigger>
          </TabsList>
          
          <TabsContent value="keyword" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search rules by keyword or rule number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, 'keyword')}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                variant="outline"
                className="border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                disabled={rulesQuery.isFetching}>
                {rulesQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="overflow-y-auto h-[calc(100vh-320px)]">
              {rulesQuery.isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : rulesQuery.isError ? (
                <div className="text-center text-destructive py-8">
                  Error loading rules. Please try again.
                </div>
              ) : rulesQuery.data && Array.isArray(rulesQuery.data) && rulesQuery.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No rules found matching your search. Try different keywords.
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {rulesQuery.data && Array.isArray(rulesQuery.data) ? 
                    rulesQuery.data.map(renderRuleItem) : 
                    <div>No rules to display</div>}
                </Accordion>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="semantic" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question about MTG rules in natural language..."
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, 'semantic')}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                variant="outline"
                className="border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                disabled={semanticSearchMutation.isPending || !semanticQuery.trim()}>
                {semanticSearchMutation.isPending ? 
                  <Loader2 className="h-4 w-4 animate-spin" /> : 
                  <Search className="h-4 w-4" />
                }
              </Button>
            </div>
            
            <div className="overflow-y-auto h-[calc(100vh-320px)]">
              {semanticSearchMutation.isPending ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : semanticSearchMutation.isError ? (
                <div className="text-center text-destructive py-8">
                  Error processing your question. Please try again.
                </div>
              ) : semanticSearchMutation.data ? (
                <div className="space-y-4">
                  <div className="bg-[#f9fafb] dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                    <h3 className="text-md font-medium mb-2">Answer:</h3>
                    <p className="text-sm">
                      {semanticSearchMutation.data && 
                       typeof semanticSearchMutation.data === 'object' && 
                       'explanation' in semanticSearchMutation.data ? 
                        semanticSearchMutation.data.explanation : 
                        'No answer available'}
                    </p>
                  </div>
                  
                  {semanticSearchMutation.data && 
                   typeof semanticSearchMutation.data === 'object' && 
                   'relatedRules' in semanticSearchMutation.data && 
                   Array.isArray(semanticSearchMutation.data.relatedRules) && 
                   semanticSearchMutation.data.relatedRules.length > 0 && (
                    <>
                      <Separator />
                      <h3 className="text-md font-medium">Relevant Rules:</h3>
                      <Accordion type="single" collapsible className="w-full">
                        {semanticSearchMutation.data.relatedRules.map(renderRuleItem)}
                      </Accordion>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}