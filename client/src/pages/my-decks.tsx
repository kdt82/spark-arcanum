import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download, 
  Eye,
  MoreVertical,
  Calendar,
  Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';

interface SavedDeck {
  id: string;
  name: string;
  description?: string;
  format: string;
  commander?: string;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  sideboardCount: number;
  user: {
    username: string;
  };
}

export default function MyDecks() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<SavedDeck | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Access Denied",
        description: "Please log in to view your decks.",
        variant: "destructive",
      });
      window.location.href = '/';
    }
  }, [isAuthenticated, toast]);

  // Fetch user's decks
  const { data: decks = [], isLoading, error } = useQuery<SavedDeck[]>({
    queryKey: ['/api/decks/my-decks'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Delete deck mutation
  const deleteMutation = useMutation({
    mutationFn: async (deckId: string) => {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete deck');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/decks/my-decks'] });
      toast({
        title: "Deck Deleted",
        description: "Your deck has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setDeckToDelete(null);
    },
    onError: () => {
      toast({
        title: "Delete Error",
        description: "Failed to delete deck. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Edit deck - navigate to deck builder with deck data
  const editDeck = (deck: SavedDeck) => {
    // Store deck data in sessionStorage for the deck builder to pick up
    const deckBuilderData = {
      name: deck.name,
      description: deck.description || '',
      format: deck.format,
      commander: deck.commander || '',
      deckCards: (deck as any).deckData || [],
      sideboardCards: (deck as any).sideboardData || [],
      isPublic: deck.isPublic || false,
      tags: deck.tags || [],
      editingDeckId: deck.id, // Include the deck ID for updating
    };
    
    sessionStorage.setItem('deckBuilderData', JSON.stringify(deckBuilderData));
    setLocation('/deck-builder');
  };

  // Export deck as text
  const exportDeck = async (deck: SavedDeck) => {
    try {
      const response = await fetch(`/api/decks/${deck.id}/export`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export deck');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deck.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Deck Exported",
        description: `${deck.name} has been exported successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to export deck. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle delete deck
  const handleDeleteDeck = (deck: SavedDeck) => {
    setDeckToDelete(deck);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDeck = () => {
    if (deckToDelete) {
      deleteMutation.mutate(deckToDelete.id);
    }
  };

  // Filter decks based on search query
  const filteredDecks = decks.filter((deck: SavedDeck) =>
    deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deck.format.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (deck.commander && deck.commander.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isAuthenticated) {
    return null; // Redirect handled in useEffect
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your decks...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">Failed to load your decks</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
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
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#4777e6] to-[#9c4dff] text-transparent bg-clip-text">
            My Decks
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your deck collection
          </p>
        </div>
        <Link href="/deck-builder">
          <Button className="bg-gradient-to-r from-[#4777e6] to-[#9c4dff]">
            <Plus className="h-4 w-4 mr-2" />
            Create New Deck
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search decks by name, format, or commander..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No decks found' : 'No decks yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Create your first deck to get started'
                }
              </p>
              {!searchQuery && (
                <Link href="/deck-builder">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Deck
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck: SavedDeck) => (
            <Card key={deck.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{deck.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {deck.format}
                      </Badge>
                      {deck.commander && (
                        <Badge variant="outline" className="text-xs">
                          Commander
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => editDeck(deck)} className="flex items-center">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportDeck(deck)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteDeck(deck)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {deck.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {deck.description}
                  </p>
                )}
                
                {deck.commander && (
                  <div className="mb-3">
                    <p className="text-sm font-medium">Commander:</p>
                    <p className="text-sm text-muted-foreground">{deck.commander}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      <span>{deck.cardCount}</span>
                    </div>
                    {deck.sideboardCount > 0 && (
                      <div className="flex items-center gap-1">
                        <span>SB: {deck.sideboardCount}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(deck.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                {deck.tags && deck.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {deck.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {deck.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{deck.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete "{deckToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteDeck}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}