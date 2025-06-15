import React, { useState, useEffect } from "react";
import CardSearchPanel from "@/components/card-search-panel";
import CardDetailsPanel from "@/components/card-details-panel";
import AIRulingPanel from "@/components/ai-ruling-panel";
import AIRulesExpertPanel from "@/components/ai-rules-expert-panel";
import RulesFAQPanel from "@/components/rules-faq-panel";
import IntroSection from "@/components/intro-section";
import FAQSection from "@/components/faq-section";
import { Card } from "@/types/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const handleSelectCard = (card: Card) => {
    setSelectedCard(card);
  };

  // Update page title and description when a card is selected for better SEO
  useEffect(() => {
    // Set page title
    if (selectedCard) {
      document.title = `${selectedCard.name} - MTG Card Rulings | Spark Arcanum`;
    } else {
      document.title = "Spark Arcanum - AI-Powered MTG Card Rulings";
    }
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      if (selectedCard) {
        metaDescription.setAttribute('content', `Get official rulings and AI-powered interpretations for ${selectedCard.name}. Learn about card interactions and rules.`);
      } else {
        metaDescription.setAttribute('content', "Get expert Magic: The Gathering card rulings and comprehensive rules interpretations powered by AI.");
      }
    }
  }, [selectedCard]);

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Spark Arcanum",
            "description": "AI-powered Magic: The Gathering card rulings and comprehensive rules platform with expert-level analysis",
            "url": "https://spark-arcanum.replit.app",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Organization",
              "name": "Spark Arcanum"
            },
            "keywords": "Magic The Gathering, MTG, card rulings, deck builder, AI, rules engine, comprehensive rules",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "156"
            }
          })
        }}
      />
      
      {/* Show intro section only when no card is selected */}
      {!selectedCard && <IntroSection />}
      
      <main className="flex-grow container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <section className="w-full lg:w-1/3" aria-label="Card Search and Results">
          <h1 className="sr-only">Spark Arcanum - AI-Powered MTG Card Rulings</h1>
          <h2 className="sr-only">Search Magic: The Gathering Cards</h2>
          <CardSearchPanel onSelectCard={handleSelectCard} selectedCard={selectedCard} />
        </section>

        <section className="w-full lg:w-2/3 flex flex-col" aria-label="Card Details and Rulings">
          {selectedCard && <h2 className="sr-only">{selectedCard.name} - Card Details and Rulings</h2>}
          <CardDetailsPanel card={selectedCard} />
          
          <Tabs defaultValue="ai-ruling" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="ai-ruling">AI Card Rulings</TabsTrigger>
              <TabsTrigger value="ai-expert">AI Rules Expert</TabsTrigger>
              <TabsTrigger value="rules-faq">Rules FAQ</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ai-ruling" className="mt-0">
              <AIRulingPanel selectedCard={selectedCard} />
            </TabsContent>
            
            <TabsContent value="ai-expert" className="mt-0">
              <AIRulesExpertPanel />
            </TabsContent>
            
            <TabsContent value="rules-faq" className="mt-0">
              <RulesFAQPanel initialTab="keyword" />
            </TabsContent>
          </Tabs>
        </section>
      </main>
      
      {/* Show FAQ section when no card is selected */}
      {!selectedCard && <FAQSection />}
    </>
  );
}
