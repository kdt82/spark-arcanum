import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/types/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIRulingPanelProps {
  selectedCard: Card | null;
}

export default function AIRulingPanel({ selectedCard }: AIRulingPanelProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [mentionedCards, setMentionedCards] = useState<Card[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  
  // References for scroll functionality
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Function to scroll to the bottom of messages
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // Add selected card to mentioned cards when it changes
  useEffect(() => {
    if (selectedCard && !mentionedCards.some(card => card.id === selectedCard.id)) {
      setMentionedCards(prev => [...prev, selectedCard]);
    }
  }, [selectedCard]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages, scrollToBottom]);

  // Card search query
  const { isLoading: isSearchLoading } = useQuery<Card[]>({
    queryKey: ['/api/cards/search', cardSearchQuery],
    queryFn: async () => {
      if (!cardSearchQuery.trim() || cardSearchQuery.length < 3) return [];
      setIsSearching(true);
      try {
        const response = await apiRequest('GET', `/api/cards/search?q=${encodeURIComponent(cardSearchQuery)}`);
        const data = await response.json();
        setSearchResults(data);
        return data;
      } catch (error) {
        console.error("Error searching cards:", error);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    enabled: cardSearchQuery.length >= 3,
  });

  const { isLoading: isConversationLoading } = useQuery<Message[]>({
    queryKey: ['/api/rulings/conversation'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rulings/conversation');
      const data = await response.json();
      
      // Process data before returning it
      if (data && data.length > 0) {
        setMessages(data);
      }
      
      return data || [];
    },
  });

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      // Get primary card and mentioned card IDs
      const primaryCardId = selectedCard?.id;
      const mentionedCardIds = mentionedCards.map(card => card.id);
      
      // Send request with all card context
      const response = await apiRequest("POST", "/api/rulings/ask", {
        question,
        cardId: primaryCardId,
        cardIds: mentionedCardIds,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data]);
      queryClient.invalidateQueries({ queryKey: ['/api/rulings/conversation'] });
      setQuestion("");
    },
  });

  const newConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rulings/new-conversation", {});
      return response.json();
    },
    onSuccess: () => {
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['/api/rulings/conversation'] });
    },
  });

  const handleSearchCard = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is triggered by the useQuery hook when the query changes
  };

  const addCardToMentioned = (card: Card) => {
    if (!mentionedCards.some(c => c.id === card.id)) {
      setMentionedCards(prev => [...prev, card]);
    }
    setCardSearchQuery("");
    setSearchResults([]);
  };

  const removeCardFromMentioned = (cardId: string) => {
    setMentionedCards(prev => prev.filter(card => card.id !== cardId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    // Add user message immediately for better UX
    const questionWithCards = mentionedCards.length > 0 
      ? `${question}\n\nCards mentioned: ${mentionedCards.map(c => c.name).join(', ')}`
      : question;
    
    setMessages((prev) => [...prev, { role: "user", content: questionWithCards }]);
    
    // Send to API with primary card ID (first mentioned card)
    const primaryCardId = mentionedCards.length > 0 ? mentionedCards[0].id : selectedCard?.id;
    askMutation.mutate(questionWithCards);
  };

  const startNewConversation = () => {
    newConversationMutation.mutate();
    setMentionedCards([]);
    if (selectedCard) {
      // Keep the main selected card
      setMentionedCards([selectedCard]);
    }
  };

  return (
    <div className="flex-grow bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm p-4 flex flex-col border border-gray-200 dark:border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-medium flex items-center">
          <div className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M16.5 7.5h-9v9h9v-9Z" />
              <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
            </svg>
          </div>
          AI Rules Assistant
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs" 
          onClick={startNewConversation}
          disabled={newConversationMutation.isPending}
        >
          New Conversation
        </Button>
      </div>
      
      {/* Card search and verification */}
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <h3 className="text-sm font-medium">Select Cards for Ruling:</h3>
        </div>
        
        <form onSubmit={handleSearchCard} className="flex gap-2 mb-2">
          <div className="flex-grow relative">
            <Input
              type="text"
              placeholder="Search for cards by name"
              value={cardSearchQuery}
              onChange={(e) => setCardSearchQuery(e.target.value)}
              className="w-full"
            />
            {isSearchLoading && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            )}
          </div>
          <Button 
            type="submit" 
            size="sm" 
            variant="outline"
            className="border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
            <SearchIcon className="h-4 w-4 mr-1" />
            Search
          </Button>
        </form>
        
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="border border-gray-100 dark:border-gray-800 rounded-md p-2 mb-3 bg-[#f9fafb] dark:bg-gray-800">
            <h4 className="text-sm font-medium mb-2">Search Results</h4>
            <div className="max-h-32 overflow-y-auto">
              <ul className="space-y-1">
                {searchResults.map(card => (
                  <li key={card.id} className="flex items-center justify-between text-sm p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                    <div className="flex items-center">
                      <span className="font-medium">{card.name}</span>
                      <span className="text-xs text-gray-500 ml-2">ID: {card.id}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => addCardToMentioned(card)}
                      className="h-6 px-2"
                    >
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Currently mentioned cards */}
        {mentionedCards.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-1">Cards in this question:</h4>
            <div className="flex flex-wrap gap-2">
              {mentionedCards.map(card => (
                <Badge 
                  key={card.id} 
                  variant="outline"
                  className="flex items-center gap-1 py-1.5 px-3 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                >
                  <span>{card.name}</span>
                  <XIcon 
                    className="h-3.5 w-3.5 cursor-pointer ml-1.5" 
                    onClick={() => removeCardFromMentioned(card.id)} 
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Check if card was not found */}
        {cardSearchQuery.length >= 3 && !isSearchLoading && searchResults.length === 0 && (
          <Alert variant="destructive" className="mb-3">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Card not found</AlertTitle>
            <AlertDescription>
              No card matching "{cardSearchQuery}" was found in our database. Please check the spelling or try a different card.
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* Chat History */}
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-grow mb-4 max-h-[500px] overflow-y-auto" 
        type="always"
      >
        <div className="pr-4" ref={messagesEndRef}> {/* Add right padding to prevent content from being hidden under scrollbar */}
          {isConversationLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-800 dark:text-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M16.5 7.5h-9v9h9v-9Z" />
                  <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-center text-gray-500 dark:text-gray-400 max-w-md text-xs">
                Ask me about Magic: The Gathering rules, card interactions, or specific rulings. I'll use official resources to help you understand how cards work together. Please be patient I am an AI and can make mistakes but try to learn from them. You can submit feedback at <a href="mailto:feedback@sparkarcanum.xyz" className="text-blue-500 hover:underline">feedback@sparkarcanum.xyz</a> if you wish to contribute to the development of me.
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-2"> {/* Increased vertical spacing between messages */}
              {messages.map((message, index) => (
                <div key={index} className="flex items-start">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                    message.role === "user" 
                      ? "bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100" 
                      : "bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100"
                  }`}>
                    {message.role === "user" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path d="M16.5 7.5h-9v9h9v-9Z" />
                        <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className={`ml-3 p-3 rounded-lg max-w-[85%] ${
                    message.role === "user"
                      ? "bg-[#f2f5f9] dark:bg-gray-800"
                      : "bg-[#f5f7fa] dark:bg-gray-900"
                  }`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-auto"
                         dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }} />
                  </div>
                </div>
              ))}
              {askMutation.isPending && (
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex-shrink-0 flex items-center justify-center text-blue-800 dark:text-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M16.5 7.5h-9v9h9v-9Z" />
                      <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 bg-[#f5f7fa] dark:bg-gray-900 p-3 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce mr-1"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce mr-1" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="relative">
          <Textarea 
            placeholder="Ask a rules question about cards or interactions..." 
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-[#4A94EA] dark:bg-gray-800"
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={askMutation.isPending}
          />
          <Button 
            className="absolute right-2 bottom-2 p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 rounded-full text-blue-800 dark:text-blue-100"
            size="icon"
            type="submit"
            disabled={askMutation.isPending || !question.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </Button>
        </div>
        <div className="mt-2 text-xs text-[#666666] dark:text-[#AAAAAA]">
          <span>Tip: Mention specific cards by name for more accurate rulings</span>
        </div>
      </form>
    </div>
  );
}
