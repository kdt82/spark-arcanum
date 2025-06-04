import type { Express, Request, Response } from "express";
import { searchCardsWithGraphQL, getCardByUuid, getCardsBySet } from "../mtg/mtg-graphql";

/**
 * Register GraphQL-powered card search routes
 */
export function registerGraphQLRoutes(app: Express) {
  // Search cards using MTGGraphQL
  app.get("/api/graphql/cards/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      
      const cards = await searchCardsWithGraphQL(query, limit);
      
      console.log(`GraphQL search for "${query}" found ${cards.length} cards`);
      
      res.json(cards);
    } catch (error) {
      console.error("Error in GraphQL card search:", error);
      res.status(500).json({ error: "Failed to search cards" });
    }
  });
  
  // Get card by UUID using MTGGraphQL
  app.get("/api/graphql/cards/:uuid", async (req: Request, res: Response) => {
    try {
      const { uuid } = req.params;
      
      if (!uuid) {
        return res.status(400).json({ error: "UUID parameter is required" });
      }
      
      const card = await getCardByUuid(uuid);
      
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }
      
      res.json(card);
    } catch (error) {
      console.error("Error getting card by UUID:", error);
      res.status(500).json({ error: "Failed to get card" });
    }
  });
  
  // Get cards from specific set using MTGGraphQL
  app.get("/api/graphql/sets/:setCode/cards", async (req: Request, res: Response) => {
    try {
      const { setCode } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      if (!setCode) {
        return res.status(400).json({ error: "Set code parameter is required" });
      }
      
      const cards = await getCardsBySet(setCode, limit);
      
      console.log(`GraphQL search for set "${setCode}" found ${cards.length} cards`);
      
      res.json(cards);
    } catch (error) {
      console.error(`Error getting cards for set ${req.params.setCode}:`, error);
      res.status(500).json({ error: "Failed to get cards for set" });
    }
  });
}