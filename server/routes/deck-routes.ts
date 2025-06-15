
import type { Express, Request, Response } from "express";
import { DeckService } from "../decks/deck-service";
import { requireAuth, optionalAuth } from "./auth-routes";
import { db } from "../db";
import { cards } from "../../shared/schema";
import { eq } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export function registerDeckRoutes(app: Express): void {
  // Save a new deck (requires authentication)
  app.post("/api/decks", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const deckData = req.body;

      const result = await DeckService.saveDeck(userId, deckData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Save deck error:', error);
      res.status(500).json({ success: false, error: 'Failed to save deck' });
    }
  });

  // Update an existing deck (requires authentication)
  app.put("/api/decks/:deckId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const deckId = req.params.deckId;
      const deckData = req.body;

      const result = await DeckService.updateDeck(userId, deckId, deckData);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update deck error:', error);
      res.status(500).json({ success: false, error: 'Failed to update deck' });
    }
  });

  // Delete a deck (requires authentication)
  app.delete("/api/decks/:deckId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const deckId = req.params.deckId;

      const result = await DeckService.deleteDeck(userId, deckId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Delete deck error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete deck' });
    }
  });

  // Get user's saved decks (requires authentication)
  app.get("/api/decks/my-decks", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const decks = await DeckService.getUserDecks(userId, limit);
      res.json(decks);
    } catch (error) {
      console.error('Get user decks error:', error);
      res.status(500).json({ success: false, error: 'Failed to get decks' });
    }
  });

  // Search public decks (no authentication required) - must come before :deckId route
  app.get("/api/decks/search/public", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || '';
      const format = req.query.format as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const decks = await DeckService.searchPublicDecks(query, format, limit);
      res.json({ success: true, decks });
    } catch (error) {
      console.error('Search public decks error:', error);
      res.status(500).json({ success: false, error: 'Failed to search decks' });
    }
  });

  // Get public decks grouped by format (no authentication required) - must come before :deckId route
  app.get("/api/decks/public-by-format", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const formatDecks = await DeckService.getPublicDecksByFormat(limit);
      res.json(formatDecks);
    } catch (error) {
      console.error('Get public decks by format error:', error);
      res.status(500).json({ success: false, error: 'Failed to get public decks' });
    }
  });

  // Get a specific deck (public decks or user's own decks) - must come after specific routes
  app.get("/api/decks/:deckId", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deckId = req.params.deckId;
      const userId = req.user?.id;

      const deck = await DeckService.getDeck(deckId, userId);

      if (deck) {
        res.json({ success: true, deck });
      } else {
        res.status(404).json({ success: false, error: 'Deck not found or access denied' });
      }
    } catch (error) {
      console.error('Get deck error:', error);
      res.status(500).json({ success: false, error: 'Failed to get deck' });
    }
  });

  // Export deck as text file
  app.get("/api/decks/:deckId/export", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deckId = req.params.deckId;
      const userId = req.user?.id;
      const format = req.query.format as string || 'txt';

      const deck = await DeckService.getDeck(deckId, userId);

      if (!deck) {
        return res.status(404).json({ success: false, error: 'Deck not found or access denied' });
      }

      // Generate deck list text in the exact format requested
      let deckText = 'Deck\n';

      // Resolve card names from IDs for maindeck
      if (Array.isArray(deck.deckData)) {
        for (const cardData of deck.deckData) {
          try {
            // Query the database to get the actual card name
            const [card] = await db.select({ name: cards.name })
              .from(cards)
              .where(eq(cards.id, cardData.cardId))
              .limit(1);
            
            const cardName = card?.name || cardData.cardId.replace(/-/g, ' ');
            deckText += `${cardData.quantity} ${cardName}\n`;
          } catch (error) {
            // Fallback to ID with spaces if database lookup fails
            const cardName = cardData.cardId.replace(/-/g, ' ');
            deckText += `${cardData.quantity} ${cardName}\n`;
          }
        }
      }

      // Resolve card names from IDs for sideboard
      if (Array.isArray(deck.sideboardData) && deck.sideboardData.length > 0) {
        deckText += '\nSideboard\n';
        for (const cardData of deck.sideboardData) {
          try {
            // Query the database to get the actual card name
            const [card] = await db.select({ name: cards.name })
              .from(cards)
              .where(eq(cards.id, cardData.cardId))
              .limit(1);
            
            const cardName = card?.name || cardData.cardId.replace(/-/g, ' ');
            deckText += `${cardData.quantity} ${cardName}\n`;
          } catch (error) {
            // Fallback to ID with spaces if database lookup fails
            const cardName = cardData.cardId.replace(/-/g, ' ');
            deckText += `${cardData.quantity} ${cardName}\n`;
          }
        }
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${deck.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt"`);
      res.send(deckText);
    } catch (error) {
      console.error('Export deck error:', error);
      res.status(500).json({ success: false, error: 'Failed to export deck' });
    }
  });
}
