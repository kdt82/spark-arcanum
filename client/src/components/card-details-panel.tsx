import React, { useState } from "react";
import { Card } from "@/types/card";
import { CardImageDisplay } from "./ui/card-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManaCost } from "./ui/mana-symbol";
import { CardText } from "./ui/card-text";
import { RarityBadge } from "./ui/rarity-badge";
import { calculateManaCostInfo, formatManaCostDisplay } from "@/utils/mana-cost";

interface CardDetailsPanelProps {
  card: Card | null;
}

export default function CardDetailsPanel({ card }: CardDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState("rulings");

  if (!card) {
    return (
      <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">
            No card selected. Search and select a card to see details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm p-4 mb-4 border border-gray-200 dark:border-gray-800">
      <div className="flex flex-col md:flex-row">
        {/* Card Image */}
        <div className="w-full md:w-1/3 flex justify-center mb-4 md:mb-0">
          <CardImageDisplay card={card} />
        </div>
        
        {/* Card Details */}
        <div className="md:ml-6 md:w-2/3">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-medium">{card.name}</h2>
            <div className="flex items-center">
              {card.manaCost && (
                <ManaCost cost={card.manaCost} size="md" />
              )}
            </div>
          </div>
          
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center">
              <span className="text-[#666666] dark:text-[#AAAAAA] w-24">Type:</span>
              <span className="flex items-center">
                {card.type}
                <span className="mx-2">—</span>
                <RarityBadge rarity={card.rarity} className="ml-1" />
              </span>
            </div>
            {card.set && (
              <div className="flex items-center">
                <span className="text-[#666666] dark:text-[#AAAAAA] w-24">Set:</span>
                <span>{card.set}</span>
              </div>
            )}
            <div className="flex items-center">
              <span className="text-[#666666] dark:text-[#AAAAAA] w-24">CMC:</span>
              <span>{calculateManaCostInfo(card.manaCost, card.cmc).displayCmc}</span>
              {calculateManaCostInfo(card.manaCost, card.cmc).hasVariableCost && (
                <span className="ml-2 text-xs text-[#666666] dark:text-[#AAAAAA]">
                  (variable cost)
                </span>
              )}
            </div>
            <div className="flex">
              <span className="text-[#666666] dark:text-[#AAAAAA] w-24">Oracle Text:</span>
              <div className="flex-1">
                <CardText text={card.text || ""} />
              </div>
            </div>
            {card.legalities && (
              <div className="flex">
                <span className="text-[#666666] dark:text-[#AAAAAA] w-24">Legality:</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(card.legalities)
                    .filter(([_, legality]) => legality === 'Legal')
                    .map(([format]) => (
                      <span 
                        key={format} 
                        className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs"
                      >
                        {format}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <div className="mt-6">
            <Tabs defaultValue="rulings" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="border-b border-gray-200 dark:border-gray-700 w-full justify-start">
                <TabsTrigger value="rulings">Official Rulings</TabsTrigger>
                <TabsTrigger value="printings">Printings</TabsTrigger>
                <TabsTrigger value="legality">Legality</TabsTrigger>
              </TabsList>
              
              <TabsContent value="rulings" className="mt-4 space-y-3 max-h-48 overflow-y-auto scrollbar-thin">
                {card.rulings && card.rulings.length > 0 ? (
                  card.rulings.map((ruling, index) => (
                    <div key={index} className="p-3 bg-[#f9fafb] dark:bg-gray-800 rounded-lg">
                      <div className="text-xs text-[#666666] dark:text-[#AAAAAA] mb-1">{ruling.date}</div>
                      <div className="text-sm">
                        <CardText text={ruling.text} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-[#f9fafb] dark:bg-gray-800 rounded-lg">
                    <p className="text-sm">No official rulings found for this card.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="printings" className="mt-4">
                {card.printings && card.printings.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {card.printings.map((printing, index) => (
                      <div key={index} className="p-2 bg-[#f9fafb] dark:bg-gray-800 rounded-lg text-sm">
                        {printing}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#f9fafb] dark:bg-gray-800 rounded-lg">
                    <p className="text-sm">No printing information available.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="legality" className="mt-4">
                {card.legalities ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(card.legalities).map(([format, status]) => (
                      <div key={format} className="p-2 bg-[#f9fafb] dark:bg-gray-800 rounded-lg flex justify-between">
                        <span className="text-sm">{format}</span>
                        <span className={`text-sm ${status === 'Legal' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#f9fafb] dark:bg-gray-800 rounded-lg">
                    <p className="text-sm">No legality information available.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
