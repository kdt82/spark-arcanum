import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Brain, 
  BookOpen, 
  Layers, 
  Zap, 
  Users,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function IntroSection() {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-indigo-950/20 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-700 dark:text-blue-300">
            <Zap className="w-3 h-3 mr-1" />
            AI-Powered Magic: The Gathering Rules Engine
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold font-heading bg-gradient-to-r from-[#4777e6] to-[#9c4dff] bg-clip-text text-transparent mb-6">
            Spark Arcanum
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            The most comprehensive Magic: The Gathering rules platform powered by artificial intelligence. 
            Get instant, accurate rulings for any card interaction with expert-level analysis.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => {
                const searchSection = document.querySelector('section[aria-label="Card Search and Results"]');
                if (searchSection) {
                  searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              <Search className="w-5 h-5 mr-2" />
              Search Cards Now
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/20"
              onClick={() => window.location.href = '/deck-builder'}
            >
              <Layers className="w-5 h-5 mr-2" />
              Build Decks
            </Button>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center border-blue-200 dark:border-blue-800 h-full flex flex-col">
            <CardHeader className="flex-1">
              <Brain className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
              <CardTitle className="text-blue-700 dark:text-blue-300">AI-Powered Analysis</CardTitle>
              <CardDescription className="flex-1">
                Advanced AI interprets complex card interactions and provides contextual rulings with comprehensive explanations
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-purple-200 dark:border-purple-800 h-full flex flex-col">
            <CardHeader className="flex-1">
              <Layers className="w-12 h-12 mx-auto text-purple-600 dark:text-purple-400 mb-4" />
              <CardTitle className="text-purple-700 dark:text-purple-300">Complete Database</CardTitle>
              <CardDescription className="flex-1">
                Access over 114,000 Magic cards with up-to-date information, including the latest sets and comprehensive rules
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-indigo-200 dark:border-indigo-800 h-full flex flex-col">
            <CardHeader className="flex-1">
              <Users className="w-12 h-12 mx-auto text-indigo-600 dark:text-indigo-400 mb-4" />
              <CardTitle className="text-indigo-700 dark:text-indigo-300">Expert Guidance</CardTitle>
              <CardDescription className="flex-1">
                Get judge-level rulings and strategic insights for competitive play, casual games, and deck building
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How to Use Section */}
        <Card className="mb-8 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-2xl text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">How to Use Spark Arcanum</CardTitle>
            <CardDescription className="text-center text-lg">
              Master Magic: The Gathering rules in three simple steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center h-full flex flex-col">
                <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">Search for Cards</h3>
                <p className="text-muted-foreground flex-1">
                  Type any card name, ability, or keyword to instantly find cards from Magic's entire history. 
                  Use advanced filters for specific formats, colors, or card types.
                </p>
              </div>

              <div className="text-center h-full flex flex-col">
                <div className="bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-purple-700 dark:text-purple-300">Get AI Rulings</h3>
                <p className="text-muted-foreground flex-1">
                  Select any card to receive detailed rulings, interaction explanations, and strategic insights 
                  powered by advanced AI trained on official Magic rules.
                </p>
              </div>

              <div className="text-center h-full flex flex-col">
                <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-indigo-700 dark:text-indigo-300">Ask Questions</h3>
                <p className="text-muted-foreground flex-1">
                  Use the AI Rules Expert to ask specific questions about card interactions, timing, 
                  or complex scenarios. Get answers backed by official comprehensive rules.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What You Can Do */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">What You Can Do</CardTitle>
            <CardDescription className="text-center text-lg">
              Comprehensive tools for players, judges, and deck builders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Card Interaction Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Understand how cards work together with detailed explanations of timing, priority, and stack interactions
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Rules Reference Search</h4>
                    <p className="text-sm text-muted-foreground">
                      Search through comprehensive rules, keywords, and FAQ entries with semantic understanding
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Format Legality Check</h4>
                    <p className="text-sm text-muted-foreground">
                      Instantly verify card legality across all Magic formats including Standard, Modern, Legacy, and Commander
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Deck Building Support</h4>
                    <p className="text-sm text-muted-foreground">
                      Get AI-powered deck suggestions and card recommendations based on your strategy and format preferences
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Strategic Insights</h4>
                    <p className="text-sm text-muted-foreground">
                      Learn optimal play patterns, combo potential, and competitive applications for any card
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Educational Resources</h4>
                    <p className="text-sm text-muted-foreground">
                      Access curated rules explanations, keyword definitions, and learning materials for all skill levels
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}