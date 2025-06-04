import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  ArrowLeft, 
  User, 
  Calendar, 
  Eye,
  BarChart3,
  PieChart,
  Heart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatManaCostDisplay } from '@/utils/mana-cost';

interface DeckCard {
  id: string;
  name: string;
  type: string;
  manaCost?: string;
  quantity: number;
  section: 'maindeck' | 'sideboard' | 'commander';
  colors?: string[];
  colorIdentity?: string[];
  cmc?: number;
  rarity?: string;
  set?: string;
  setName?: string;
  imageUrl?: string;
}

interface DeckStats {
  totalCards: number;
  avgCmc: number;
  colorDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  cmcDistribution: Record<number, number>;
}

interface DeckWithDetails {
  id: string;
  name: string;
  description?: string;
  format: string;
  commander?: string;
  isPublic: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    username: string;
  };
  cardCount: number;
  sideboardCount: number;
  deckData?: any;
  sideboardData?: any;
}

export default function DeckView() {
  const [match, params] = useRoute('/deck-view/:id');
  const { toast } = useToast();
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [stats, setStats] = useState<DeckStats>({
    totalCards: 0,
    avgCmc: 0,
    colorDistribution: {},
    typeDistribution: {},
    cmcDistribution: {},
  });

  const deckId = params?.id;

  // Fetch deck data
  const { data: deck, isLoading, error } = useQuery<DeckWithDetails>({
    queryKey: [`/api/deck/${deckId}`],
    enabled: !!deckId,
  });

  // Load deck cards when deck data is available
  useEffect(() => {
    if (!deck) return;

    const loadDeckCards = async () => {
      try {
        // Collect all card IDs from deck and sideboard
        const cardIds = new Set<string>();
        
        if (deck.deckData && Array.isArray(deck.deckData)) {
          deck.deckData.forEach((card: any) => cardIds.add(card.cardId));
        }
        
        if (deck.sideboardData && Array.isArray(deck.sideboardData)) {
          deck.sideboardData.forEach((card: any) => cardIds.add(card.cardId));
        }

        // Fetch card data for all unique card IDs
        const cardDataMap: Record<string, any> = {};
        
        if (cardIds.size > 0) {
          try {
            const response = await fetch('/api/cards/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cardIds: Array.from(cardIds) }),
            });
            
            if (response.ok) {
              const cardData = await response.json();
              cardData.forEach((card: any) => {
                cardDataMap[card.id] = card;
              });
            }
          } catch (error) {
            console.error('Error fetching card data:', error);
          }
        }
        
        // Convert deck cards to the format expected by the viewer
        const convertedCards: DeckCard[] = [];
        
        // Load maindeck cards
        if (deck.deckData && Array.isArray(deck.deckData)) {
          for (const cardData of deck.deckData) {
            const fullCardData = cardDataMap[cardData.cardId];
            convertedCards.push({
              id: cardData.cardId,
              name: fullCardData?.name || cardData.cardId.replace(/-/g, ' '),
              type: fullCardData?.type || 'Unknown',
              manaCost: fullCardData?.manaCost || '',
              quantity: cardData.quantity,
              section: 'maindeck' as const,
              colors: fullCardData?.colors || [],
              colorIdentity: fullCardData?.colorIdentity || [],
              cmc: fullCardData?.cmc || 0,
              rarity: fullCardData?.rarity || '',
              set: fullCardData?.set || '',
              setName: fullCardData?.setName || '',
              imageUrl: fullCardData?.imageUrl || '',
            });
          }
        }
        
        // Load sideboard cards
        if (deck.sideboardData && Array.isArray(deck.sideboardData)) {
          for (const cardData of deck.sideboardData) {
            const fullCardData = cardDataMap[cardData.cardId];
            convertedCards.push({
              id: cardData.cardId,
              name: fullCardData?.name || cardData.cardId.replace(/-/g, ' '),
              type: fullCardData?.type || 'Unknown',
              manaCost: fullCardData?.manaCost || '',
              quantity: cardData.quantity,
              section: 'sideboard' as const,
              colors: fullCardData?.colors || [],
              colorIdentity: fullCardData?.colorIdentity || [],
              cmc: fullCardData?.cmc || 0,
              rarity: fullCardData?.rarity || '',
              set: fullCardData?.set || '',
              setName: fullCardData?.setName || '',
              imageUrl: fullCardData?.imageUrl || '',
            });
          }
        }

        // Add commander if specified
        if (deck.commander) {
          const commanderCard = cardDataMap[deck.commander] || {
            name: deck.commander.replace(/-/g, ' '),
            type: 'Legendary Creature',
          };
          
          convertedCards.push({
            id: deck.commander,
            name: commanderCard.name,
            type: commanderCard.type || 'Legendary Creature',
            manaCost: commanderCard.manaCost || '',
            quantity: 1,
            section: 'commander' as const,
            colors: commanderCard.colors || [],
            colorIdentity: commanderCard.colorIdentity || [],
            cmc: commanderCard.cmc || 0,
            rarity: commanderCard.rarity || '',
            set: commanderCard.set || '',
            setName: commanderCard.setName || '',
            imageUrl: commanderCard.imageUrl || '',
          });
        }

        setDeckCards(convertedCards);
      } catch (error) {
        console.error('Error loading deck cards:', error);
      }
    };

    loadDeckCards();
  }, [deck]);

  // Calculate statistics
  const calculateStats = (): DeckStats => {
    const maindeck = deckCards.filter(card => card.section === 'maindeck');
    const totalCards = maindeck.reduce((sum, card) => sum + card.quantity, 0);
    
    let totalCmc = 0;
    let cardsWithCmc = 0;
    const colorDistribution: Record<string, number> = {};
    const typeDistribution: Record<string, number> = {};
    const cmcDistribution: Record<number, number> = {};

    maindeck.forEach(card => {
      // CMC calculation (excluding lands without mana costs)
      if (card.cmc !== undefined && (card.cmc > 0 || !card.type.toLowerCase().includes('land'))) {
        totalCmc += card.cmc * card.quantity;
        cardsWithCmc += card.quantity;
        cmcDistribution[card.cmc] = (cmcDistribution[card.cmc] || 0) + card.quantity;
      }

      // Color distribution
      if (card.colors && card.colors.length > 0) {
        card.colors.forEach(color => {
          colorDistribution[color] = (colorDistribution[color] || 0) + card.quantity;
        });
      } else {
        colorDistribution['C'] = (colorDistribution['C'] || 0) + card.quantity;
      }

      // Type distribution (combine Basic and Land types)
      const cardType = card.type || '';
      const isBasicLand = cardType.toLowerCase().includes('basic') && cardType.toLowerCase().includes('land');
      const isLand = cardType.toLowerCase().includes('land');
      
      let typeKey = cardType.split(' — ')[0].split(' ')[0];
      
      if (isBasicLand || (isLand && typeKey === 'Basic')) {
        typeKey = 'Land';
      } else if (isLand && !isBasicLand) {
        typeKey = 'Land';
      }
      
      typeDistribution[typeKey] = (typeDistribution[typeKey] || 0) + card.quantity;
    });

    const avgCmc = cardsWithCmc > 0 ? totalCmc / cardsWithCmc : 0;

    return {
      totalCards,
      avgCmc,
      colorDistribution,
      typeDistribution,
      cmcDistribution,
    };
  };

  useEffect(() => {
    setStats(calculateStats());
  }, [deckCards]);

  // Export deck as text
  const exportDeckAsText = () => {
    if (!deck) return;

    let deckText = `${deck.name}\n`;
    if (deck.description) {
      deckText += `${deck.description}\n`;
    }
    deckText += `Format: ${deck.format}\n`;
    deckText += `Created by: ${deck.user.username}\n\n`;

    // Add commander if present
    const commanderCards = deckCards.filter(card => card.section === 'commander');
    if (commanderCards.length > 0) {
      deckText += 'Commander:\n';
      commanderCards.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
      deckText += '\n';
    }

    // Add maindeck
    const maindeckCards = deckCards.filter(card => card.section === 'maindeck');
    if (maindeckCards.length > 0) {
      deckText += 'Maindeck:\n';
      maindeckCards.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
      deckText += '\n';
    }

    // Add sideboard
    const sideboardCards = deckCards.filter(card => card.section === 'sideboard');
    if (sideboardCards.length > 0) {
      deckText += 'Sideboard:\n';
      sideboardCards.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
    }

    // Create and download file
    const blob = new Blob([deckText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name || 'deck'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Deck Exported",
      description: "Deck has been exported as a text file",
    });
  };

  // Sort cards by name, CMC, etc.
  const sortedDeckCards = (section: 'maindeck' | 'sideboard' | 'commander') => {
    return deckCards
      .filter(card => card.section === section)
      .sort((a, b) => {
        // Sort by CMC first, then by name
        if (a.cmc !== b.cmc) {
          return (a.cmc || 0) - (b.cmc || 0);
        }
        return a.name.localeCompare(b.name);
      });
  };

  if (!match) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading deck...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">Failed to load deck</p>
              <Button onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#4777e6] to-[#9c4dff] text-transparent bg-clip-text">
              {deck.name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{deck.user.username}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(deck.createdAt).toLocaleDateString()}</span>
              </div>
              <Badge variant="secondary">{deck.format}</Badge>
              {deck.isPublic && (
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>Public</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Button onClick={exportDeckAsText} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Description */}
      {deck.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{deck.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Card - 1/3 width */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium">Total Cards: {stats.totalCards}</div>
              <div className="text-sm text-muted-foreground">
                Average CMC: {stats.avgCmc.toFixed(1)}
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-sm font-medium mb-2">Color Distribution</div>
              {Object.entries(stats.colorDistribution).map(([color, count]) => (
                count > 0 && (
                  <div key={color} className="flex justify-between text-sm">
                    <span>{color === 'C' ? 'Colorless' : color}</span>
                    <span>{count}</span>
                  </div>
                )
              ))}
            </div>

            <Separator />

            <div>
              <div className="text-sm font-medium mb-2">Type Distribution</div>
              {Object.entries(stats.typeDistribution)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span>{type}</span>
                    <span>{count}</span>
                  </div>
                ))}
            </div>

            <Separator />

            <div>
              <div className="text-sm font-medium mb-2">Mana Curve</div>
              {Object.entries(stats.cmcDistribution)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([cmc, count]) => (
                  count > 0 && (
                    <div key={cmc} className="flex justify-between text-sm">
                      <span>{cmc === '0' ? '0' : cmc}+</span>
                      <span>{count}</span>
                    </div>
                  )
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Visual Deck Display - 2/3 width */}
        <Card className="lg:col-span-2 min-h-0 flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <span>Deck List ({stats.totalCards} cards)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col">
            <Tabs defaultValue="maindeck" className="w-full flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="maindeck">
                  Maindeck ({sortedDeckCards('maindeck').reduce((sum, card) => sum + card.quantity, 0)})
                </TabsTrigger>
                <TabsTrigger value="sideboard">
                  Sideboard ({sortedDeckCards('sideboard').reduce((sum, card) => sum + card.quantity, 0)})
                </TabsTrigger>
                <TabsTrigger value="commander">
                  Commander ({sortedDeckCards('commander').reduce((sum, card) => sum + card.quantity, 0)})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="maindeck" className="flex-1 overflow-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                  {sortedDeckCards('maindeck').map(card => (
                    <div key={card.id} className="relative group">
                      <div className="relative">
                        <img
                          src={`https://gatherer.wizards.com/Handlers/Image.ashx?name=${encodeURIComponent(card.name)}&type=card&.jpg`}
                          alt={card.name}
                          className="w-full h-auto rounded-lg border hover:border-blue-400 transition-colors cursor-pointer shadow-md"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('api.scryfall.com')) {
                              target.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=normal`;
                            }
                          }}
                        />
                        {card.quantity > 1 && (
                          <div className="absolute top-2 left-2 bg-black/75 text-white text-xs rounded px-1.5 py-0.5 font-bold">
                            {card.quantity}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-center truncate font-medium">
                        {card.name}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="sideboard" className="flex-1 overflow-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                  {sortedDeckCards('sideboard').map(card => (
                    <div key={card.id} className="relative group">
                      <div className="relative">
                        <img
                          src={`https://gatherer.wizards.com/Handlers/Image.ashx?name=${encodeURIComponent(card.name)}&type=card&.jpg`}
                          alt={card.name}
                          className="w-full h-auto rounded-lg border hover:border-blue-400 transition-colors cursor-pointer shadow-md"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('api.scryfall.com')) {
                              target.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=normal`;
                            }
                          }}
                        />
                        {card.quantity > 1 && (
                          <div className="absolute top-2 left-2 bg-black/75 text-white text-xs rounded px-1.5 py-0.5 font-bold">
                            {card.quantity}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-center truncate font-medium">
                        {card.name}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="commander" className="flex-1 overflow-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                  {sortedDeckCards('commander').map(card => (
                    <div key={card.id} className="relative group">
                      <div className="relative">
                        <img
                          src={`https://gatherer.wizards.com/Handlers/Image.ashx?name=${encodeURIComponent(card.name)}&type=card&.jpg`}
                          alt={card.name}
                          className="w-full h-auto rounded-lg border-2 border-yellow-500 hover:border-yellow-400 transition-colors cursor-pointer shadow-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('api.scryfall.com')) {
                              target.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=normal`;
                            }
                          }}
                        />
                      </div>
                      <div className="mt-2 text-sm text-center truncate font-medium">
                        {card.name}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}