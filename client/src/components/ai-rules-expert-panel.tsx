import React, { useState } from 'react';
import { 
  Card, 
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Search } from 'lucide-react';

export default function AIRulesExpertPanel() {
  const [aiRulesQuery, setAiRulesQuery] = useState('');

  // For AI Rules Expert (trained on rules)
  const aiRulesExpertMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest(
        'POST',
        '/api/rules/ai-interpret',
        { question }
      );
      return response.json();
    }
  });

  const handleSearch = () => {
    if (aiRulesQuery.trim()) {
      aiRulesExpertMutation.mutate(aiRulesQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Card className="w-full h-full">
      <CardContent className="pt-6">
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Ask the AI rules expert about Magic: The Gathering rules..."
            value={aiRulesQuery}
            onChange={(e) => setAiRulesQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch} 
            variant="outline"
            className="border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            disabled={aiRulesExpertMutation.isPending || !aiRulesQuery.trim()}>
            {aiRulesExpertMutation.isPending ? 
              <Loader2 className="h-4 w-4 animate-spin" /> : 
              <Search className="h-4 w-4" />
            }
          </Button>
        </div>
        
        <div className="overflow-y-auto h-[calc(100vh-320px)]">
          {aiRulesExpertMutation.isPending ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : aiRulesExpertMutation.isError ? (
            <div className="text-center text-destructive py-8">
              Error processing your rules question. Please try again.
            </div>
          ) : aiRulesExpertMutation.data ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-6 rounded-lg border border-blue-100 dark:border-blue-900/50 shadow-sm">
                <h3 className="text-lg font-medium mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Rules Expert:</h3>
                <div className="text-sm whitespace-pre-wrap">
                  {aiRulesExpertMutation.data && 
                   typeof aiRulesExpertMutation.data === 'object' && 
                   'answer' in aiRulesExpertMutation.data ? 
                    aiRulesExpertMutation.data.answer : 
                    'No answer available'}
                </div>
                
                {aiRulesExpertMutation.data && 
                 typeof aiRulesExpertMutation.data === 'object' && 
                 'cardUsed' in aiRulesExpertMutation.data && 
                 aiRulesExpertMutation.data.cardUsed && (
                  <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-900/50">
                    <span className="text-xs text-blue-500 dark:text-blue-400">Card Referenced: {aiRulesExpertMutation.data.cardUsed}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-muted/20 rounded-lg p-8 text-center">
              <p className="text-muted-foreground text-xs mb-4">
                Ask any question about Magic: The Gathering rules. Please be patient I am an AI and can make mistakes but try to learn from them. You can submit feedback at <a href="mailto:feedback@sparkarcanum.xyz" className="text-blue-500 hover:underline">feedback@sparkarcanum.xyz</a> if you wish to contribute to the development of me.
              </p>
              <p className="text-xs text-muted-foreground">Examples:</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>"How does trample work with deathtouch?"</li>
                <li>"Can I play a land during my opponent's turn?"</li>
                <li>"What happens when a player has 10 poison counters?"</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}