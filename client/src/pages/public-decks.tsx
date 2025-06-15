import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Calendar,
  Eye,
  User,
  Layers
} from 'lucide-react';
import { Link } from 'wouter';

interface PublicDeck {
  id: string;
  name: string;
  description?: string;
  format: string;
  commander?: string;
  cardCount: number;
  sideboardCount: number;
  createdAt: string;
  user: {
    username: string;
  };
}

interface FormatWithDecks {
  format: string;
  decks: PublicDeck[];
}

export default function PublicDecks() {
  // Fetch public decks grouped by format
  const { data: formatDecks, isLoading, error } = useQuery<FormatWithDecks[]>({
    queryKey: ['/api/decks/public-by-format'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p>Loading public decks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-red-500">Failed to load public decks</p>
        </div>
      </div>
    );
  }

  const formatDisplayNames: Record<string, string> = {
    'Standard': 'Standard',
    'Pioneer': 'Pioneer', 
    'Modern': 'Modern',
    'Legacy': 'Legacy',
    'Vintage': 'Vintage',
    'Commander': 'Commander',
    'Pauper': 'Pauper',
    'Limited': 'Limited'
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#4777e6] to-[#9c4dff] bg-clip-text text-transparent">
          Public Deck Library
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore deck lists shared by the community across all Magic: The Gathering formats
        </p>
      </div>

      {/* Format Sections */}
      {formatDecks && formatDecks.length > 0 ? (
        <div className="space-y-8">
          {formatDecks.map((formatSection) => (
            <Card key={formatSection.format} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Layers className="h-6 w-6" />
                  {formatDisplayNames[formatSection.format] || formatSection.format}
                  <Badge variant="secondary" className="ml-auto">
                    {formatSection.decks.length} deck{formatSection.decks.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {formatSection.decks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formatSection.decks.map((deck) => (
                      <Card key={deck.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Deck Name */}
                            <div>
                              <h3 className="font-semibold text-lg line-clamp-1">{deck.name}</h3>
                              {deck.commander && (
                                <p className="text-sm text-muted-foreground">
                                  Commander: {deck.commander}
                                </p>
                              )}
                            </div>

                            {/* Description */}
                            {deck.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {deck.description}
                              </p>
                            )}

                            {/* Stats */}
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{deck.cardCount} cards</span>
                              {deck.sideboardCount > 0 && (
                                <span>{deck.sideboardCount} sideboard</span>
                              )}
                            </div>

                            <Separator />

                            {/* Author and Date */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{deck.user.username}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(deck.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" variant="outline" className="flex-1" asChild>
                                <Link href={`/deck-view/${deck.id}`}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Deck
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No public decks available in this format yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto mb-6 opacity-50" />
          <h2 className="text-2xl font-semibold mb-2">No Public Decks Yet</h2>
          <p className="text-muted-foreground mb-6">
            Be the first to share a deck with the community!
          </p>
          <Button asChild>
            <Link href="/deck-builder">
              <Layers className="h-4 w-4 mr-2" />
              Build a Deck
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}