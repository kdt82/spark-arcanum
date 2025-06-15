
import { db } from '../db';
import { savedDecks, users, cards, type SavedDeck, type User } from '@shared/schema';
import { eq, and, desc, ilike, or } from 'drizzle-orm';

interface DeckCardData {
  cardId: string;
  quantity: number;
}

interface SaveDeckData {
  name: string;
  description?: string;
  format: string;
  commander?: string;
  deckCards: DeckCardData[];
  sideboardCards?: DeckCardData[];
  isPublic?: boolean;
  tags?: string[];
}

interface DeckWithDetails extends SavedDeck {
  user: {
    username: string;
  };
  cardCount: number;
  sideboardCount: number;
}

export class DeckService {
  static async saveDeck(userId: string, deckData: SaveDeckData): Promise<{ success: boolean; deckId?: string; error?: string }> {
    try {
      // Validate deck data
      if (!deckData.name || deckData.name.trim().length === 0) {
        return { success: false, error: 'Deck name is required' };
      }

      if (!deckData.format) {
        return { success: false, error: 'Format is required' };
      }

      if (!deckData.deckCards || deckData.deckCards.length === 0) {
        return { success: false, error: 'Deck must contain at least one card' };
      }

      // Validate that all cards exist in our database
      const cardIds = deckData.deckCards.map(c => c.cardId);
      if (deckData.sideboardCards) {
        cardIds.push(...deckData.sideboardCards.map(c => c.cardId));
      }

      const existingCards = await db
        .select({ id: cards.id })
        .from(cards)
        .where(or(...cardIds.map(id => eq(cards.id, id))));

      const existingCardIds = new Set(existingCards.map(c => c.id));
      const missingCards = cardIds.filter(id => !existingCardIds.has(id));

      if (missingCards.length > 0) {
        console.warn('Some cards not found in database:', missingCards);
        // Don't fail - just warn. The cards might be from newer sets.
      }

      // Save deck to database
      const [newDeck] = await db
        .insert(savedDecks)
        .values({
          userId,
          name: deckData.name.trim(),
          description: deckData.description?.trim(),
          format: deckData.format,
          commander: deckData.commander,
          deckData: deckData.deckCards,
          sideboardData: deckData.sideboardCards || [],
          isPublic: deckData.isPublic || false,
          tags: deckData.tags || [],
        })
        .returning();

      return { success: true, deckId: newDeck.id };
    } catch (error) {
      console.error('Save deck error:', error);
      return { success: false, error: 'Failed to save deck' };
    }
  }

  static async updateDeck(userId: string, deckId: string, deckData: Partial<SaveDeckData>): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify deck belongs to user
      const existingDeck = await db
        .select()
        .from(savedDecks)
        .where(and(eq(savedDecks.id, deckId), eq(savedDecks.userId, userId)))
        .limit(1);

      if (existingDeck.length === 0) {
        return { success: false, error: 'Deck not found or access denied' };
      }

      // Build update object with only provided fields
      const updateData: any = { updatedAt: new Date() };
      
      if (deckData.name !== undefined) {
        if (!deckData.name.trim()) {
          return { success: false, error: 'Deck name cannot be empty' };
        }
        updateData.name = deckData.name.trim();
      }
      
      if (deckData.description !== undefined) {
        updateData.description = deckData.description?.trim();
      }
      
      if (deckData.format !== undefined) {
        updateData.format = deckData.format;
      }
      
      if (deckData.commander !== undefined) {
        updateData.commander = deckData.commander;
      }
      
      if (deckData.deckCards !== undefined) {
        updateData.deckData = deckData.deckCards;
      }
      
      if (deckData.sideboardCards !== undefined) {
        updateData.sideboardData = deckData.sideboardCards;
      }
      
      if (deckData.isPublic !== undefined) {
        updateData.isPublic = deckData.isPublic;
      }
      
      if (deckData.tags !== undefined) {
        updateData.tags = deckData.tags;
      }

      await db
        .update(savedDecks)
        .set(updateData)
        .where(eq(savedDecks.id, deckId));

      return { success: true };
    } catch (error) {
      console.error('Update deck error:', error);
      return { success: false, error: 'Failed to update deck' };
    }
  }

  static async deleteDeck(userId: string, deckId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db
        .delete(savedDecks)
        .where(and(eq(savedDecks.id, deckId), eq(savedDecks.userId, userId)))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Deck not found or access denied' };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete deck error:', error);
      return { success: false, error: 'Failed to delete deck' };
    }
  }

  static async getUserDecks(userId: string, limit: number = 50): Promise<DeckWithDetails[]> {
    try {
      const decks = await db
        .select({
          id: savedDecks.id,
          userId: savedDecks.userId,
          name: savedDecks.name,
          description: savedDecks.description,
          format: savedDecks.format,
          commander: savedDecks.commander,
          deckData: savedDecks.deckData,
          sideboardData: savedDecks.sideboardData,
          isPublic: savedDecks.isPublic,
          tags: savedDecks.tags,
          createdAt: savedDecks.createdAt,
          updatedAt: savedDecks.updatedAt,
          username: users.username,
        })
        .from(savedDecks)
        .innerJoin(users, eq(savedDecks.userId, users.id))
        .where(eq(savedDecks.userId, userId))
        .orderBy(desc(savedDecks.updatedAt))
        .limit(limit);

      return decks.map(deck => ({
        ...deck,
        user: { username: deck.username },
        cardCount: Array.isArray(deck.deckData) ? deck.deckData.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0) : 0,
        sideboardCount: Array.isArray(deck.sideboardData) ? deck.sideboardData.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0) : 0,
      }));
    } catch (error) {
      console.error('Get user decks error:', error);
      return [];
    }
  }

  static async getDeck(deckId: string, userId?: string): Promise<DeckWithDetails | null> {
    try {
      const deckQuery = db
        .select({
          id: savedDecks.id,
          userId: savedDecks.userId,
          name: savedDecks.name,
          description: savedDecks.description,
          format: savedDecks.format,
          commander: savedDecks.commander,
          deckData: savedDecks.deckData,
          sideboardData: savedDecks.sideboardData,
          isPublic: savedDecks.isPublic,
          tags: savedDecks.tags,
          createdAt: savedDecks.createdAt,
          updatedAt: savedDecks.updatedAt,
          username: users.username,
        })
        .from(savedDecks)
        .innerJoin(users, eq(savedDecks.userId, users.id))
        .where(eq(savedDecks.id, deckId))
        .limit(1);

      const deck = await deckQuery;

      if (deck.length === 0) {
        return null;
      }

      const deckData = deck[0];

      // Check access rights
      if (!deckData.isPublic && (!userId || deckData.userId !== userId)) {
        return null;
      }

      return {
        ...deckData,
        user: { username: deckData.username },
        cardCount: Array.isArray(deckData.deckData) ? deckData.deckData.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0) : 0,
        sideboardCount: Array.isArray(deckData.sideboardData) ? deckData.sideboardData.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0) : 0,
      };
    } catch (error) {
      console.error('Get deck error:', error);
      return null;
    }
  }

  static async searchPublicDecks(query: string, format?: string, limit: number = 20): Promise<DeckWithDetails[]> {
    try {
      let searchConditions = [eq(savedDecks.isPublic, true)];

      if (query) {
        searchConditions.push(
          or(
            ilike(savedDecks.name, `%${query}%`),
            ilike(savedDecks.description, `%${query}%`)
          )
        );
      }

      if (format) {
        searchConditions.push(eq(savedDecks.format, format));
      }

      const decks = await db
        .select({
          id: savedDecks.id,
          userId: savedDecks.userId,
          name: savedDecks.name,
          description: savedDecks.description,
          format: savedDecks.format,
          commander: savedDecks.commander,
          deckData: savedDecks.deckData,
          sideboardData: savedDecks.sideboardData,
          isPublic: savedDecks.isPublic,
          tags: savedDecks.tags,
          createdAt: savedDecks.createdAt,
          updatedAt: savedDecks.updatedAt,
          username: users.username,
        })
        .from(savedDecks)
        .innerJoin(users, eq(savedDecks.userId, users.id))
        .where(and(...searchConditions))
        .orderBy(desc(savedDecks.updatedAt))
        .limit(limit);

      return decks.map(deck => ({
        ...deck,
        user: { username: deck.username },
        cardCount: Array.isArray(deck.deckData) ? deck.deckData.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0) : 0,
        sideboardCount: Array.isArray(deck.sideboardData) ? deck.sideboardData.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0) : 0,
      }));
    } catch (error) {
      console.error('Search public decks error:', error);
      return [];
    }
  }

  static async getPublicDecksByFormat(limit: number = 10): Promise<{ format: string; decks: DeckWithDetails[] }[]> {
    try {
      // Get all public decks grouped by format
      const decks = await db
        .select({
          id: savedDecks.id,
          userId: savedDecks.userId,
          name: savedDecks.name,
          description: savedDecks.description,
          format: savedDecks.format,
          commander: savedDecks.commander,
          deckData: savedDecks.deckData,
          sideboardData: savedDecks.sideboardData,
          isPublic: savedDecks.isPublic,
          tags: savedDecks.tags,
          createdAt: savedDecks.createdAt,
          updatedAt: savedDecks.updatedAt,
          username: users.username,
        })
        .from(savedDecks)
        .innerJoin(users, eq(savedDecks.userId, users.id))
        .where(eq(savedDecks.isPublic, true))
        .orderBy(desc(savedDecks.createdAt));

      // Transform to DeckWithDetails format
      const deckDetails: DeckWithDetails[] = decks.map(deck => ({
        ...deck,
        user: { username: deck.username },
        cardCount: Array.isArray(deck.deckData) ? deck.deckData.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0) : 0,
        sideboardCount: Array.isArray(deck.sideboardData) ? deck.sideboardData.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0) : 0,
      }));

      // Group by format and limit each format to the specified number of decks
      const formatGroups: Record<string, DeckWithDetails[]> = {};
      
      for (const deck of deckDetails) {
        if (!formatGroups[deck.format]) {
          formatGroups[deck.format] = [];
        }
        
        if (formatGroups[deck.format].length < limit) {
          formatGroups[deck.format].push(deck);
        }
      }

      // Convert to array format with consistent ordering
      const formats = ['Standard', 'Pioneer', 'Modern', 'Legacy', 'Vintage', 'Commander', 'Pauper', 'Limited'];
      const result = formats
        .filter(format => formatGroups[format] && formatGroups[format].length > 0)
        .map(format => ({
          format,
          decks: formatGroups[format]
        }));

      // Add any additional formats not in the standard list
      Object.keys(formatGroups).forEach(format => {
        if (!formats.includes(format) && formatGroups[format].length > 0) {
          result.push({
            format,
            decks: formatGroups[format]
          });
        }
      });

      return result;
    } catch (error) {
      console.error('Get public decks by format error:', error);
      return [];
    }
  }
}
