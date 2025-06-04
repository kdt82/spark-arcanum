// Import required modules
import { Card } from '@/types/card';
import { db } from '../db';
import { cards as cardsTable, dbMetadata } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, or, like, ilike, desc, sql } from 'drizzle-orm';
import axios from 'axios';

/**
 * Service to interact with the MTGJSON data
 */
export class MTGJsonService {
  private static instance: MTGJsonService;
  private initialized: boolean = false;
  private initializing: boolean = false;
  
  // URL for downloading AllPrintings.json
  private readonly MTGJSON_ALLPRINTINGS_URL = 'https://mtgjson.com/api/v5/AllPrintings.json';

  private constructor() {}

  public static getInstance(): MTGJsonService {
    if (!MTGJsonService.instance) {
      MTGJsonService.instance = new MTGJsonService();
    }
    return MTGJsonService.instance;
  }

  /**
   * Initialize the service by fetching card data from MTGJSON
   */
  public async initialize(forceRefresh: boolean = false): Promise<void> {
    // Prevent multiple initializations at once
    if (this.initializing) {
      console.log('MTGJSON Service initialization already in progress');
      return;
    }

    // Skip if already initialized unless forced
    if (this.initialized && !forceRefresh) {
      console.log('MTGJSON Service already initialized');
      return;
    }

    try {
      this.initializing = true;
      console.log('Initializing MTGJSON Service...');

      // Check if we already have cards in the database
      // First get exact count using SQL directly for accuracy
      const cardCount = await db.select({count: sql`count(*)`}).from(cardsTable);
      const totalCards = cardCount.length > 0 ? Number(cardCount[0].count) : 0;
      
      // If we have more than 100 cards, migration is already in progress - continue from where we left off
      if (totalCards > 100 && !forceRefresh) {
        console.log(`Found ${totalCards} cards already in the database. Continuing the migration from where we left off.`);
        // We don't return here - we'll continue loading cards, but we won't truncate the database
      }
      
      // Let's load the full dataset and continue where we left off
      try {
        // We'll always enter this flow now, whether we have cards or not
        // This ensures we continue the migration in all cases
        if (forceRefresh && totalCards > 0) {
          console.log('Force refreshing card data by explicit request...');
        }
        
        try {
          // Get the directory of the current module
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          
          // Path to the full MTGJSON data files
          const atomicCardsPath = path.join(__dirname, '..', '..', 'data', 'AtomicCards.json');
          const allPrintingsPath = path.join(__dirname, '..', '..', 'data', 'AllPrintings.json');
          const sampleDataPath = path.join(__dirname, '..', '..', 'data', 'mtg-sample.json');
          
          // First try to load from AllPrintings.json (which has all cards with all printings)
          if (fs.existsSync(allPrintingsPath)) {
            console.log(`Found AllPrintings.json data file at ${allPrintingsPath}`);
            
            try {
              // Parse AllPrintings.json to get all cards
              console.log("Processing AllPrintings.json to extract all cards...");
              await this.processAllPrintingsData(allPrintingsPath);
              return; // Exit early after successful processing
            } catch (error) {
              console.error("Error processing AllPrintings.json:", error);
              console.log("Falling back to AtomicCards.json if available...");
            }
          }
          
          // Fall back to AtomicCards.json if AllPrintings.json processing failed
          if (fs.existsSync(atomicCardsPath)) {
            console.log(`Found AtomicCards.json data file at ${atomicCardsPath}`);
            
            // Read and parse the AtomicCards data
            const fileContent = fs.readFileSync(atomicCardsPath, 'utf8');
            const fullData = JSON.parse(fileContent);
            
            if (fullData && fullData.data) {
              // Process popular cards first
              const popularCardNames = [
                'Black Lotus', 'Lightning Bolt', 'Counterspell', 'Swords to Plowshares',
                'Birds of Paradise', 'Wrath of God', 'Dark Ritual', 'Llanowar Elves',
                'Force of Will', 'Path to Exile', 'Thoughtseize', 'Demonic Tutor',
                'Sol Ring', 'Ancestral Recall', 'Brainstorm', 'Cryptic Command',
                'Doom Blade', 'Naturalize', 'Terror', 'Giant Growth'
              ];
              
              console.log(`Processing ${popularCardNames.length} popular cards first...`);
              const popularCards: Card[] = [];
              
              // Extract popular cards
              for (const cardName of popularCardNames) {
                if (fullData.data[cardName] && fullData.data[cardName][0]) {
                  const cardData = fullData.data[cardName][0];
                  const card = this.convertAtomicCardFormat(cardData, cardName);
                  popularCards.push(card);
                }
              }
              
              // Store popular cards
              if (popularCards.length > 0) {
                await this.storeCards(popularCards);
                console.log(`Stored ${popularCards.length} popular cards`);
              }
              
              // Now process all remaining cards from the MTGJSON data
              const allCardNames = Object.keys(fullData.data);
              console.log(`Found ${allCardNames.length} total cards in MTGJSON data`);
              
              // Get list of existing card IDs in the database to avoid duplicates
              const existingCardIds = await this.getExistingCardIds();
              console.log(`Found ${existingCardIds.size} existing card IDs in the database`);
              
              // Process cards not already in the database
              const remainingCards = allCardNames.filter(name => {
                const cardId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                return !popularCardNames.includes(name) && !existingCardIds.has(cardId);
              });
              console.log(`Processing ${remainingCards.length} additional cards that aren't already in the database...`);
              
              // Process cards in batches
              const BATCH_SIZE = 50;
              let totalCardsProcessed = popularCards.length;
              
              for (let i = 0; i < remainingCards.length; i += BATCH_SIZE) {
                const batchNames = remainingCards.slice(i, Math.min(i + BATCH_SIZE, remainingCards.length));
                const batchCards: Card[] = [];
                
                for (const cardName of batchNames) {
                  if (fullData.data[cardName] && fullData.data[cardName][0]) {
                    const cardData = fullData.data[cardName][0];
                    const card = this.convertAtomicCardFormat(cardData, cardName);
                    batchCards.push(card);
                  }
                }
                
                if (batchCards.length > 0) {
                  await this.storeCards(batchCards);
                  totalCardsProcessed += batchCards.length;
                  console.log(`Stored batch of ${batchCards.length} cards (total: ${totalCardsProcessed})`);
                }
              }
              
              console.log(`MTGJSON data initialization completed. Processed ${totalCardsProcessed} cards.`);
              
              // Update database metadata
              try {
                const count = await db.select({ count: sql`COUNT(*)` }).from(cardsTable);
                const cardCount = parseInt(count[0].count as string, 10);
                
                // Update or create database metadata
                await db.insert(dbMetadata)
                  .values({
                    id: "card_database",
                    last_updated: new Date(),
                    total_cards: cardCount,
                    description: "Database updated from MTGJSON AllPrintings.json"
                  })
                  .onConflictDoUpdate({
                    target: dbMetadata.id,
                    set: {
                      last_updated: new Date(),
                      total_cards: cardCount,
                      description: "Database updated from MTGJSON AllPrintings.json"
                    }
                  });
                console.log(`Updated database metadata with ${cardCount} total cards and current timestamp`);
              } catch (error) {
                console.error("Error updating database metadata:", error);
              }
            } else {
              throw new Error('Invalid MTGJSON data format');
            }
          } 
          // Fallback to sample data if full data is not available
          else if (fs.existsSync(sampleDataPath)) {
            console.log(`Full data file not found. Using sample data from ${sampleDataPath}`);
            
            // Read and parse the sample data
            const fileContent = fs.readFileSync(sampleDataPath, 'utf8');
            const cardData = JSON.parse(fileContent);
            
            // Extract cards from the data
            let cards: Card[] = [];
            if (cardData.cards && Array.isArray(cardData.cards)) {
              cards = cardData.cards;
            } else if (Array.isArray(cardData)) {
              cards = cardData;
            } else {
              throw new Error('Invalid card data format in sample file');
            }
            
            console.log(`Found ${cards.length} cards in sample data file`);
            
            // Process cards in batches
            const BATCH_SIZE = 100;
            let totalCardsProcessed = 0;
            
            for (let i = 0; i < cards.length; i += BATCH_SIZE) {
              const batch = cards.slice(i, Math.min(i + BATCH_SIZE, cards.length));
              await this.storeCards(batch);
              totalCardsProcessed += batch.length;
              console.log(`Stored batch of ${batch.length} cards (${i + batch.length}/${cards.length})`);
            }
            
            console.log(`Sample data initialization completed. Processed ${totalCardsProcessed} cards.`);
          } else {
            console.error('Neither full data nor sample data file was found');
            throw new Error('Card data files not found');
          }
        } catch (fileError) {
          console.error('Error loading card data:', fileError);
          throw fileError;
        }
      } catch (error) {
        console.error('Error loading cards:', error);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing MTGJSON Service:', error);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Find cards that match the given query
   */
  public async findCards(query: string): Promise<Card[]> {
    if (!query || query.trim() === '') {
      // Return first 20 cards if no query
      const results = await db.select().from(cardsTable).limit(20);
      return results.map(card => this.dbCardToCard(card));
    }
    
    const normalizedQuery = `%${query.toLowerCase()}%`;
    
    // Search by name, text, and type
    const results = await db
      .select()
      .from(cardsTable)
      .where(
        or(
          ilike(cardsTable.name, normalizedQuery),
          ilike(cardsTable.text || '', normalizedQuery),
          ilike(cardsTable.type, normalizedQuery)
        )
      )
      .limit(100) // Increased from 50 to 100 results
      .orderBy(desc(cardsTable.name));
      
    // Convert DB results to Card type
    return results.map(card => this.dbCardToCard(card));
  }

  /**
   * Get a card by its ID
   */
  public async getCard(id: string): Promise<Card | null> {
    const result = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.id, id));
      
    return result.length > 0 ? this.dbCardToCard(result[0]) : null;
  }

  /**
   * Store multiple cards in the database
   */
  public async storeCards(cardsToStore: Card[]): Promise<void> {
    // Use a transaction to ensure all cards are stored together
    await db.transaction(async (tx) => {
      for (const card of cardsToStore) {
        // Check if card already exists
        const existingCard = await tx.select().from(cardsTable).where(eq(cardsTable.id, card.id));
        
        // If card doesn't exist, insert it
        if (existingCard.length === 0) {
          await tx.insert(cardsTable).values(card);
        } else {
          // Otherwise update it
          await tx
            .update(cardsTable)
            .set(card)
            .where(eq(cardsTable.id, card.id));
        }
      }
    });
  }

  /**
   * Download AllPrintings.json directly from MTGJSON
   * This will provide the complete set of MTG cards (approx 31,000)
   */
  public async downloadAllPrintingsJson(): Promise<boolean> {
    try {
      // Get data directory path
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const allPrintingsPath = path.join(__dirname, '..', '..', 'data', 'AllPrintings.json');
      
      console.log("Starting download of AllPrintings.json from MTGJSON...");
      
      // Create data directory if it doesn't exist
      const dataDir = path.join(__dirname, '..', '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Use axios to download the file
      const response = await axios({
        method: 'GET',
        url: this.MTGJSON_ALLPRINTINGS_URL,
        responseType: 'stream'
      });
      
      // Pipe response to file
      const writer = fs.createWriteStream(allPrintingsPath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log("AllPrintings.json downloaded successfully");
          resolve(true);
        });
        
        writer.on('error', (err) => {
          console.error("Error writing AllPrintings.json:", err);
          reject(err);
        });
      });
    } catch (error) {
      console.error("Error downloading AllPrintings.json:", error);
      return false;
    }
  }
  
  /**
   * Process AllPrintings.json to extract all cards
   * This will load all 31,000+ cards from all sets
   */
  private async processAllPrintingsData(filePath: string): Promise<void> {
    console.log(`Starting to process AllPrintings.json at ${filePath}`);
    try {
      // Read and parse the AllPrintings.json file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const allPrintingsData = JSON.parse(fileContent);
      
      if (!allPrintingsData.data) {
        throw new Error('Invalid AllPrintings.json format: missing data property');
      }
      
      // Get existing card IDs to avoid duplicates
      const existingCardIds = await this.getExistingCardIds();
      console.log(`Found ${existingCardIds.size} existing card IDs in the database`);
      
      // Process sets in batches
      const sets = Object.keys(allPrintingsData.data);
      console.log(`Found ${sets.length} sets in AllPrintings.json`);
      
      let totalCardsProcessed = 0;
      const BATCH_SIZE = 50;
      
      // Iterate through each set to find all cards
      for (const setCode of sets) {
        const setData = allPrintingsData.data[setCode];
        if (!setData || !setData.cards || !Array.isArray(setData.cards)) {
          console.log(`Skipping set ${setCode}: no cards data found or invalid format`);
          continue;
        }
        
        console.log(`Processing ${setData.cards.length} cards from set ${setCode} (${setData.name || 'Unknown'})`);
        
        // Process cards in batches
        for (let i = 0; i < setData.cards.length; i += BATCH_SIZE) {
          const cardBatch = setData.cards.slice(i, i + BATCH_SIZE);
          const batchCards: Card[] = [];
          
          for (const cardData of cardBatch) {
            // Generate a consistent ID for the card based on name and set
            const cardId = `${cardData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${setCode.toLowerCase()}`;
            
            // Skip if this exact card (with set) is already in the database
            if (existingCardIds.has(cardId)) {
              continue;
            }
            
            // Add to existing IDs to avoid duplicates within this processing
            existingCardIds.add(cardId);
            
            // Convert the card data to our format
            try {
              const card: Card = {
                id: cardId,
                name: cardData.name,
                manaCost: cardData.manaCost,
                cmc: cardData.convertedManaCost !== undefined ? parseFloat(cardData.convertedManaCost.toString()) : undefined,
                colors: cardData.colors,
                colorIdentity: cardData.colorIdentity,
                type: cardData.type,
                supertypes: cardData.supertypes,
                types: cardData.types,
                subtypes: cardData.subtypes,
                rarity: cardData.rarity,
                set: setCode,
                setName: setData.name,
                text: cardData.text,
                flavor: cardData.flavorText,
                artist: cardData.artist,
                number: cardData.number,
                power: cardData.power,
                toughness: cardData.toughness,
                loyalty: cardData.loyalty,
                layout: cardData.layout,
                multiverseid: cardData.identifiers?.multiverseId,
                imageUrl: cardData.identifiers?.scryfallId 
                  ? `https://api.scryfall.com/cards/${cardData.identifiers.scryfallId}?format=image` 
                  : undefined,
                rulings: cardData.rulings,
                foreignNames: cardData.foreignData,
                printings: cardData.printings,
                originalText: cardData.originalText,
                originalType: cardData.originalType,
                legalities: cardData.legalities,
                variations: cardData.variations
              };
              
              batchCards.push(card);
            } catch (err) {
              console.error(`Error converting card ${cardData.name} from set ${setCode}:`, err);
            }
          }
          
          // Store batch of cards
          if (batchCards.length > 0) {
            try {
              // Convert cards to database format
              const dbCards = batchCards.map(card => ({
                id: card.id,
                name: card.name,
                mana_cost: card.manaCost,
                cmc: card.cmc !== undefined ? card.cmc.toString() : null,
                colors: card.colors,
                color_identity: card.colorIdentity,
                type: card.type,
                supertypes: card.supertypes,
                types: card.types,
                subtypes: card.subtypes,
                rarity: card.rarity,
                set: card.set,
                set_name: card.setName,
                text: card.text,
                flavor: card.flavor,
                artist: card.artist,
                number: card.number,
                power: card.power,
                toughness: card.toughness,
                loyalty: card.loyalty,
                layout: card.layout,
                multiverseid: card.multiverseid,
                image_url: card.imageUrl,
                rulings: card.rulings,
                foreign_names: card.foreignNames,
                printings: card.printings,
                original_text: card.originalText,
                original_type: card.originalType,
                legalities: card.legalities,
                variations: card.variations
              }));
              
              // Insert cards directly
              await db.insert(cardsTable).values(dbCards).onConflictDoNothing();
              
              totalCardsProcessed += batchCards.length;
              console.log(`Stored batch of ${batchCards.length} cards from set ${setCode} (total: ${totalCardsProcessed})`);
            } catch (err) {
              console.error(`Error storing batch of cards from set ${setCode}:`, err);
            }
          }
        }
      }
      
      console.log(`AllPrintings.json processing completed. Processed ${totalCardsProcessed} cards from all sets.`);
      
      // Update database metadata with total card count
      try {
        const count = await db.select({ count: sql`COUNT(*)` }).from(cardsTable);
        const cardCount = parseInt(count[0].count as string, 10);
        
        // Update or create database metadata
        await db.insert(dbMetadata)
          .values({
            id: "card_database",
            last_updated: new Date(),
            total_cards: cardCount,
            description: "Database updated from MTGJSON AllPrintings.json"
          })
          .onConflictDoUpdate({
            target: dbMetadata.id,
            set: {
              last_updated: new Date(),
              total_cards: cardCount,
              description: "Database updated from MTGJSON AllPrintings.json"
            }
          });
        console.log(`Updated database metadata with ${cardCount} total cards and current timestamp`);
      } catch (error) {
        console.error("Error updating database metadata:", error);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error processing AllPrintings.json:', error);
      throw error;
    }
  }
  
  /**
   * Complete database update from MTGJSON
   * This downloads and processes AllPrintings.json to get all 31,000+ cards
   */
  public async completeCardDatabaseUpdate(): Promise<{success: boolean, message: string}> {
    try {
      // Download AllPrintings.json
      const downloadSuccess = await this.downloadAllPrintingsJson();
      if (!downloadSuccess) {
        return { success: false, message: "Failed to download AllPrintings.json" };
      }
      
      // Get path to the downloaded file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const allPrintingsPath = path.join(__dirname, '..', '..', 'data', 'AllPrintings.json');
      
      // Process the file to update the database
      await this.processAllPrintingsData(allPrintingsPath);
      
      return { 
        success: true, 
        message: "Successfully downloaded and processed AllPrintings.json. Card database has been updated with all 31,000+ cards." 
      };
    } catch (error) {
      console.error("Error in complete card database update:", error);
      return { 
        success: false, 
        message: `Error updating card database: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Get popular and classic cards
   */
  public async getPopularCards(): Promise<Card[]> {
    try {
      // Specific card IDs or names that are popular in Magic
      const popularCardNames = [
        'Black Lotus', 'Counterspell', 'Lightning Bolt', 'Sol Ring',
        'Tarmogoyf', 'Thoughtseize', 'Path to Exile', 'Birds of Paradise',
        'Wrath of God', 'Snapcaster Mage', 'Jace, the Mind Sculptor',
        'Liliana of the Veil', 'Force of Will', 'Cryptic Command'
      ];
      
      const cards: Card[] = [];
      
      // Search for each popular card
      for (const cardName of popularCardNames) {
        const results = await this.findCards(cardName);
        // Add the first matching card for each name (most relevant)
        if (results.length > 0) {
          cards.push(results[0]);
        }
      }
      
      return cards;
    } catch (error) {
      console.error('Error getting popular cards:', error);
      throw error;
    }
  }

  /**
   * Convert MTGJSON AtomicCards format to our Card format
   */
  private convertAtomicCardFormat(cardData: any, cardName: string): Card {
    // Generate a normalized ID from the card name
    const id = cardName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Get first printing if available for set information
    const firstPrinting = cardData.firstPrinting || (cardData.printings && cardData.printings.length > 0 ? cardData.printings[0] : undefined);
    
    // Get a Scryfall ID if available from identifiers
    const scryfallId = cardData.identifiers?.scryfallId || 
                      cardData.identifiers?.scryfallOracleId || 
                      undefined;
    
    // Generate an image URL for the card
    let imageUrl: string | undefined;
    
    // Use Scryfall API if possible, as it's more reliable
    if (scryfallId) {
      imageUrl = `https://api.scryfall.com/cards/${scryfallId}?format=image`;
    } 
    // Fallback: use a set+name based approach for Scryfall
    else if (firstPrinting && cardName) {
      // URL-encode the card name and set code for the Scryfall API
      const encodedName = encodeURIComponent(cardName);
      const encodedSet = encodeURIComponent(firstPrinting);
      imageUrl = `https://api.scryfall.com/cards/named?exact=${encodedName}&set=${encodedSet}&format=image`;
    }
    // Final fallback: use a generic card back image
    else {
      imageUrl = `https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=0&type=card`;
    }
    
    // Direct URL for Scryfall image using card name - more reliable
    const directScryfallUrl = `https://cards.scryfall.io/large/front/${id.charAt(0)}/${id.substring(0, 3)}/${id}.jpg`;
    
    // Set default rarity for cards where it might be missing
    let rarity = cardData.rarity;
    
    // Convert cmc to string (since we store it as text in the database)
    const cmcValue = cardData.manaValue || cardData.convertedManaCost;
    const cmcString = cmcValue !== undefined ? String(cmcValue) : undefined;
    
    // Add rarity for specific missing cards
    if (!rarity) {
      // Map of common cards that might be missing rarity
      const commonCardRarities: Record<string, string> = {
        'lightning bolt': 'Common',
        'counterspell': 'Common',
        'dark ritual': 'Common',
        'giant growth': 'Common',
        'terror': 'Common',
        'llanowar elves': 'Common',
        'birds of paradise': 'Rare',
        'wrath of god': 'Rare',
        'force of will': 'Rare',
        'black lotus': 'Rare',
        'ancestral recall': 'Rare',
        'sol ring': 'Uncommon'
      };
      
      const lowerName = cardName.toLowerCase();
      if (commonCardRarities[lowerName]) {
        rarity = commonCardRarities[lowerName];
        console.log(`Added missing rarity "${rarity}" for card: ${cardName}`);
      }
    }
    
    // Add better direct image URLs for specific missing cards
    let cardImageUrl = imageUrl;
    if (cardName === 'Lightning Bolt') {
      cardImageUrl = "https://cards.scryfall.io/large/front/a/8/a83d5558-a9d1-4c20-9113-bdaeefd30b19.jpg";
    }
    
    return {
      id,
      name: cardName,
      manaCost: cardData.manaCost,
      cmc: cmcString,
      colors: cardData.colors,
      colorIdentity: cardData.colorIdentity,
      type: cardData.type,
      supertypes: cardData.supertypes,
      types: cardData.types,
      subtypes: cardData.subtypes,
      rarity: rarity,
      set: firstPrinting,
      setName: undefined, // Not available in AtomicCards format
      text: cardData.text,
      flavor: cardData.flavorText,
      artist: cardData.artist,
      number: cardData.number,
      power: cardData.power,
      toughness: cardData.toughness,
      loyalty: cardData.loyalty,
      layout: cardData.layout,
      multiverseid: cardData.identifiers?.multiverseId?.toString(),
      imageUrl: cardImageUrl || directScryfallUrl,
      rulings: cardData.rulings,
      foreignNames: cardData.foreignData,
      printings: cardData.printings,
      originalText: cardData.originalText,
      originalType: cardData.originalType,
      legalities: cardData.legalities,
      variations: cardData.variations
    };
  }
  
  /**
   * Get all existing card IDs to avoid duplicate processing
   */
  private async getExistingCardIds(): Promise<Set<string>> {
    // Get all card IDs from the database
    const cardIds = await db.select({ id: cardsTable.id }).from(cardsTable);
    
    // Create a Set for fast lookups
    const idSet = new Set<string>();
    for (const row of cardIds) {
      idSet.add(row.id);
    }
    
    return idSet;
  }
  
  /**
   * Convert MTGJSON card format to our Card format (for older format)
   */
  private convertMtgJsonCards(mtgJsonCards: any[], setCode: string): Card[] {
    return mtgJsonCards.map(card => {
      const id = card.uuid || card.id || `${card.name}-${setCode}`.replace(/[^a-zA-Z0-9]/g, '');
      const normalizedId = card.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      // Direct URL for Scryfall image using card name - more reliable
      const directScryfallUrl = `https://cards.scryfall.io/large/front/${normalizedId.charAt(0)}/${normalizedId.substring(0, 3)}/${normalizedId}.jpg`;
      
      // Convert cmc to string (since we store it as text in the database)
      const cmcValue = card.convertedManaCost || card.cmc;
      const cmcString = cmcValue !== undefined ? String(cmcValue) : undefined;
      
      // Set default rarity for cards where it might be missing
      let rarity = card.rarity;
      
      // Add rarity for specific missing cards
      if (!rarity) {
        // Map of common cards that might be missing rarity
        const commonCardRarities: Record<string, string> = {
          'lightning bolt': 'Common',
          'counterspell': 'Common',
          'dark ritual': 'Common',
          'giant growth': 'Common',
          'terror': 'Common',
          'llanowar elves': 'Common',
          'birds of paradise': 'Rare',
          'wrath of god': 'Rare',
          'force of will': 'Rare',
          'black lotus': 'Rare',
          'ancestral recall': 'Rare',
          'sol ring': 'Uncommon'
        };
        
        const lowerName = card.name.toLowerCase();
        if (commonCardRarities[lowerName]) {
          rarity = commonCardRarities[lowerName];
          console.log(`Added missing rarity "${rarity}" for card: ${card.name}`);
        }
      }
      
      // Add better direct image URLs for specific missing cards
      let cardImageUrl = card.scryfallId ? 
        `https://api.scryfall.com/cards/${card.scryfallId}?format=image` : 
        (card.multiverseId ? 
          `https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${card.multiverseId}&type=card` : 
          directScryfallUrl);
          
      if (card.name === 'Lightning Bolt') {
        cardImageUrl = "https://cards.scryfall.io/large/front/a/8/a83d5558-a9d1-4c20-9113-bdaeefd30b19.jpg";
      }
      
      return {
        id,
        name: card.name,
        manaCost: card.manaCost,
        cmc: card.convertedManaCost || card.cmc,
        colors: card.colors,
        colorIdentity: card.colorIdentity,
        type: card.type,
        supertypes: card.supertypes,
        types: card.types,
        subtypes: card.subtypes,
        rarity: rarity,
        set: card.setCode || setCode,
        setName: card.setName,
        text: card.text,
        flavor: card.flavorText,
        artist: card.artist,
        number: card.number,
        power: card.power,
        toughness: card.toughness,
        loyalty: card.loyalty,
        layout: card.layout,
        multiverseid: card.multiverseId?.toString(),
        imageUrl: cardImageUrl,
        rulings: card.rulings,
        foreignNames: card.foreignData,
        printings: card.printings,
        originalText: card.originalText,
        originalType: card.originalType,
        legalities: card.legalities,
        variations: card.variations
      };
    });
  }

  /**
   * Process the AllPrintings.json file to extract all cards (DEPRECATED - use the other implementation)
   * This file has a different structure than AtomicCards.json
   * AllPrintings.json contains more cards organized by set
   */
  private async _deprecatedProcessAllPrintingsData(filePath: string): Promise<void> {
    console.log(`Starting to process AllPrintings.json at ${filePath}`);
    try {
      // Read and parse the AllPrintings.json file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const allPrintingsData = JSON.parse(fileContent);
      
      if (!allPrintingsData.data) {
        throw new Error('Invalid AllPrintings.json format: missing data property');
      }
      
      // Get existing card IDs to avoid duplicates
      const existingCardIds = await this.getExistingCardIds();
      console.log(`Found ${existingCardIds.size} existing card IDs in the database`);
      
      // Process sets in batches
      const sets = Object.keys(allPrintingsData.data);
      console.log(`Found ${sets.length} sets in AllPrintings.json`);
      
      let totalCardsProcessed = 0;
      const BATCH_SIZE = 50;
      
      // Process popular cards first
      const popularCardNames = [
        'Black Lotus', 'Lightning Bolt', 'Counterspell', 'Swords to Plowshares',
        'Birds of Paradise', 'Wrath of God', 'Dark Ritual', 'Llanowar Elves',
        'Force of Will', 'Path to Exile', 'Thoughtseize', 'Demonic Tutor',
        'Sol Ring', 'Ancestral Recall', 'Brainstorm', 'Cryptic Command',
        'Doom Blade', 'Naturalize', 'Terror', 'Giant Growth'
      ];
      
      // Iterate through each set to find all cards
      for (const setCode of sets) {
        const setData = allPrintingsData.data[setCode];
        if (!setData || !setData.cards || !Array.isArray(setData.cards)) {
          console.log(`Skipping set ${setCode}: no cards data found or invalid format`);
          continue;
        }
        
        console.log(`Processing ${setData.cards.length} cards from set ${setCode} (${setData.name || 'Unknown'})`);
        
        // Convert cards to our format and filter out duplicates
        for (let i = 0; i < setData.cards.length; i += BATCH_SIZE) {
          const cardBatch = setData.cards.slice(i, i + BATCH_SIZE);
          const batchCards: Card[] = [];
          
          for (const cardData of cardBatch) {
            // Generate a consistent ID for the card
            const cardId = cardData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            
            // Skip already processed cards unless it's a popular card
            if (existingCardIds.has(cardId) && !popularCardNames.includes(cardData.name)) {
              continue;
            }
            
            // Add to existing IDs to avoid duplicates within this processing
            existingCardIds.add(cardId);
            
            // Convert the card to our format
            try {
              const card: Card = {
                id: cardId,
                name: cardData.name,
                manaCost: cardData.manaCost,
                cmc: cardData.convertedManaCost !== undefined ? cardData.convertedManaCost : undefined,
                colors: cardData.colors || [],
                colorIdentity: cardData.colorIdentity || [],
                type: cardData.type,
                supertypes: cardData.supertypes || [],
                types: cardData.types || [],
                subtypes: cardData.subtypes || [],
                rarity: cardData.rarity,
                set: setCode,
                setName: setData.name,
                text: cardData.text,
                flavor: cardData.flavorText,
                artist: cardData.artist,
                number: cardData.number,
                power: cardData.power,
                toughness: cardData.toughness,
                loyalty: cardData.loyalty,
                layout: cardData.layout,
                multiverseid: cardData.identifiers?.multiverseId,
                imageUrl: cardData.identifiers?.scryfallId 
                  ? `https://api.scryfall.com/cards/${cardData.identifiers.scryfallId}?format=image` 
                  : undefined,
                rulings: cardData.rulings,
                foreignNames: cardData.foreignData,
                printings: cardData.printings,
                originalText: cardData.originalText,
                originalType: cardData.originalType,
                legalities: cardData.legalities,
                variations: cardData.variations
              };
              batchCards.push(card);
            } catch (error) {
              console.error(`Error converting card ${cardData.name}:`, error);
            }
          }
          
          // Store batch of cards
          if (batchCards.length > 0) {
            await this.storeCards(batchCards);
            totalCardsProcessed += batchCards.length;
            console.log(`Stored batch of ${batchCards.length} cards from set ${setCode} (total: ${totalCardsProcessed})`);
          }
        }
      }
      
      console.log(`AllPrintings.json processing completed. Processed ${totalCardsProcessed} cards from all sets.`);
      
      // Update database metadata with total card count
      try {
        const count = await db.select({ count: sql`COUNT(*)` }).from(cardsTable);
        const cardCount = parseInt(count[0].count as string, 10);
        
        // Update or create database metadata
        await db.insert(dbMetadata)
          .values({
            id: "card_database",
            last_updated: new Date(),
            total_cards: cardCount,
            description: "Database updated from MTGJSON AllPrintings.json"
          })
          .onConflictDoUpdate({
            target: dbMetadata.id,
            set: {
              last_updated: new Date(),
              total_cards: cardCount,
              description: "Database updated from MTGJSON AllPrintings.json"
            }
          });
        console.log(`Updated database metadata with ${cardCount} total cards and current timestamp`);
      } catch (error) {
        console.error("Error updating database metadata:", error);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error processing AllPrintings.json:', error);
      throw error;
    }
  }
  
  private dbCardToCard(dbCard: any): Card {
    // Convert DB fields to Card type (handle null vs undefined)
    return {
      id: dbCard.id,
      name: dbCard.name,
      manaCost: dbCard.manaCost || undefined,
      cmc: dbCard.cmc || undefined,
      colors: dbCard.colors || undefined,
      colorIdentity: dbCard.colorIdentity || undefined,
      type: dbCard.type,
      supertypes: dbCard.supertypes || undefined,
      types: dbCard.types || undefined,
      subtypes: dbCard.subtypes || undefined,
      rarity: dbCard.rarity || undefined,
      set: dbCard.set || undefined,
      setName: dbCard.setName || undefined,
      text: dbCard.text || undefined,
      flavor: dbCard.flavor || undefined,
      artist: dbCard.artist || undefined,
      number: dbCard.number || undefined,
      power: dbCard.power || undefined,
      toughness: dbCard.toughness || undefined,
      loyalty: dbCard.loyalty || undefined,
      layout: dbCard.layout || undefined,
      multiverseid: dbCard.multiverseid || undefined,
      imageUrl: dbCard.imageUrl || undefined,
      rulings: dbCard.rulings || undefined,
      foreignNames: dbCard.foreignNames || undefined,
      printings: dbCard.printings || undefined,
      originalText: dbCard.originalText || undefined,
      originalType: dbCard.originalType || undefined,
      legalities: dbCard.legalities || undefined,
      variations: dbCard.variations || undefined
    };
  }
}

// Export a singleton instance
export const mtgJsonService = MTGJsonService.getInstance();