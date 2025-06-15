import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/types/card";
import { CardItem } from "./ui/card-display";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

interface CardSearchPanelProps {
  onSelectCard: (card: Card) => void;
  selectedCard?: Card | null;
}

export default function CardSearchPanel({ onSelectCard, selectedCard }: CardSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Clear search on component mount to ensure fresh sessions
  useEffect(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);
  
  // Debounce search input to prevent excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500); // 500ms delay
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);
  
  // API call for card data
  const { data: cards = [], isLoading } = useQuery<Card[]>({
    queryKey: ['/api/cards', debouncedQuery],
    queryFn: async () => {
      // If no query, return empty array
      if (!debouncedQuery.trim()) {
        return [];
      }
      
      const params = new URLSearchParams();
      params.append('query', debouncedQuery);
      
      const url = `/api/cards?${params.toString()}`;
      const response = await apiRequest('GET', url);
      return response.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <section className="w-full flex flex-col h-full">
      {/* Search Controls */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Input 
            type="text" 
            placeholder="Search cards by name, text, type..."
            className="w-full pl-10 pr-4 py-3 text-lg"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </span>
        </div>
        
        <div className="mt-4 flex justify-end items-center">
          <div>
            <span className="text-sm text-[#666666] dark:text-[#AAAAAA]">
              {isLoading ? 'Loading...' : cards ? `${cards.length} results` : '0 results'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Card Results */}
      <div className="flex-grow bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 min-h-0">
        <div className="p-4 bg-[#f9fafb] dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-medium text-lg">Card Results</h2>
        </div>
        
        <div className="flex-grow overflow-y-auto scrollbar-thin p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mb-2"></div>
                <p>Loading cards...</p>
              </div>
            </div>
          ) : cards && cards.length > 0 ? (
            cards.map((card) => (
              <CardItem 
                key={card.id} 
                card={card} 
                isSelected={selectedCard?.id === card.id}
                onClick={() => onSelectCard(card)}
              />
            ))
          ) : (
            <div className="flex justify-center items-center h-32">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "No cards found. Try a different search term." : "Type in the search box to find cards."}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}