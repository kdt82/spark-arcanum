import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FAQSection() {
  return (
    <section className="py-12 px-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20">
      <div className="container mx-auto max-w-4xl">
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Frequently Asked Questions</CardTitle>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about using Spark Arcanum for Magic: The Gathering
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is-spark-arcanum">
                <AccordionTrigger className="text-left">
                  What is Spark Arcanum and how does it work?
                </AccordionTrigger>
                <AccordionContent>
                  Spark Arcanum is an AI-powered platform that provides comprehensive Magic: The Gathering card rulings and rules interpretations. 
                  It uses advanced artificial intelligence trained on official MTG comprehensive rules to analyze card interactions, 
                  provide detailed explanations, and help players understand complex game scenarios. Simply search for any card and get instant, 
                  expert-level analysis of how it works with other cards.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="card-database-size">
                <AccordionTrigger className="text-left">
                  How many Magic cards are in your database?
                </AccordionTrigger>
                <AccordionContent>
                  Our database contains over 114,000 Magic: The Gathering cards from all sets, including the latest releases. 
                  We regularly update our database to include new cards as they're released, ensuring you have access to the most 
                  comprehensive MTG card collection available. This includes cards from Standard, Modern, Legacy, Vintage, Commander, 
                  and all other formats.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ai-accuracy">
                <AccordionTrigger className="text-left">
                  How accurate are the AI-generated rulings?
                </AccordionTrigger>
                <AccordionContent>
                  Our AI is trained on the official Magic: The Gathering Comprehensive Rules and provides highly accurate interpretations. 
                  However, for official tournament play, we always recommend consulting with a certified judge or referring to the 
                  official comprehensive rules. The AI excels at explaining complex interactions and providing educational insights 
                  that help players understand the reasoning behind rulings.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="formats-supported">
                <AccordionTrigger className="text-left">
                  What Magic formats does Spark Arcanum support?
                </AccordionTrigger>
                <AccordionContent>
                  Spark Arcanum supports all major Magic: The Gathering formats including Standard, Modern, Legacy, Vintage, Commander/EDH, 
                  Pioneer, Historic, Pauper, and limited formats like Draft and Sealed. You can filter card searches by format legality 
                  and get format-specific insights for deck building and gameplay.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="deck-building">
                <AccordionTrigger className="text-left">
                  Can I use Spark Arcanum for deck building?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! Spark Arcanum includes AI-powered deck building features that can suggest cards based on your strategy, format, 
                  and preferences. You can describe what kind of deck you want to build, and our AI will recommend cards that work 
                  well together, explain synergies, and help you create competitive and fun decks for any format.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rules-questions">
                <AccordionTrigger className="text-left">
                  Can I ask specific rules questions?
                </AccordionTrigger>
                <AccordionContent>
                  Absolutely! Use the AI Rules Expert feature to ask specific questions about card interactions, timing, priority, 
                  stack resolution, and any other Magic rules scenarios. The AI can handle complex multi-card interactions and 
                  provide step-by-step explanations of how different game situations resolve.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="mobile-support">
                <AccordionTrigger className="text-left">
                  Is Spark Arcanum available on mobile devices?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! Spark Arcanum is fully responsive and works great on all devices including smartphones and tablets. 
                  The interface adapts to your screen size, making it easy to look up card rulings during games or while 
                  deck building on the go.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cost">
                <AccordionTrigger className="text-left">
                  Is Spark Arcanum free to use?
                </AccordionTrigger>
                <AccordionContent>
                  Yes, Spark Arcanum is completely free to use! You can search our entire database of 114,000+ cards, 
                  get AI-powered rulings, ask rules questions, and use the deck building features without any cost or registration required.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data-source">
                <AccordionTrigger className="text-left">
                  Where does your card data come from?
                </AccordionTrigger>
                <AccordionContent>
                  Our card data comes from official sources including MTGJSON and MTGGraphQL, ensuring accuracy and completeness. 
                  We regularly sync with these sources to keep our database up-to-date with the latest card releases, errata, 
                  and format legality changes. All rulings and rules interpretations are based on the official Magic: The Gathering 
                  Comprehensive Rules.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="competitive-play">
                <AccordionTrigger className="text-left">
                  Can I use this for competitive Magic play?
                </AccordionTrigger>
                <AccordionContent>
                  Spark Arcanum is an excellent tool for learning and understanding Magic rules, which definitely helps in competitive play. 
                  However, for official tournament rulings, always defer to certified judges and official tournament rules. 
                  Use our platform to study interactions, understand complex scenarios, and improve your rules knowledge for better competitive performance.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}