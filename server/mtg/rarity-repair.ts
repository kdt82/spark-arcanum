import { db } from "../db";
import { sql } from "drizzle-orm";
import axios from "axios";
import fs from "fs";
import path from "path";
import { createWriteStream } from "fs";
import * as https from "https";

const RARITY_CACHE_FILE = path.join(process.cwd(), 'data', 'rarity-cache.json');
const ATOMIC_CARDS_FILE = path.join(process.cwd(), 'data', 'AtomicCards.json');
// We'll use AllPrintings instead, as recommended for rarity data
const ALL_PRINTINGS_FILE = path.join(process.cwd(), 'data', 'AllPrintings.json');
const MTGJSON_DOWNLOAD_URL = 'https://mtgjson.com/api/v5/AllPrintings.json';

interface RarityData {
  [cardId: string]: string; // card id -> correct rarity
}

/**
 * Class to repair rarity data across the entire card database
 */
export class RarityRepairService {
  private static instance: RarityRepairService;
  private rarityCache: RarityData = {};
  private initializing: boolean = false;
  private atomicCardData: Record<string, any[]> | null = null;
  private allPrintingsData: Record<string, any> | null = null;
  
  private constructor() {}
  
  /**
   * Download AllPrintings.json from MTGJSON if not already present
   */
  public async downloadAllPrintings(): Promise<boolean> {
    if (fs.existsSync(ALL_PRINTINGS_FILE)) {
      console.log("AllPrintings.json already exists.");
      return true;
    }
    
    console.log("Downloading AllPrintings.json from MTGJSON...");
    try {
      // Create a write stream to save the file
      const file = createWriteStream(ALL_PRINTINGS_FILE);
      
      return new Promise<boolean>((resolve, reject) => {
        // Make HTTP request to download the file
        const request = https.get(MTGJSON_DOWNLOAD_URL, response => {
          // Check if the request was successful
          if (response.statusCode !== 200) {
            fs.unlinkSync(ALL_PRINTINGS_FILE); // Clean up the file
            reject(new Error(`Failed to download, status code: ${response.statusCode}`));
            return;
          }
          
          // Pipe the response to the file
          response.pipe(file);
          
          // Handle errors during download
          file.on('error', err => {
            fs.unlinkSync(ALL_PRINTINGS_FILE); // Clean up the file
            reject(err);
          });
          
          // Handle completion of the download
          file.on('finish', () => {
            file.close();
            console.log("Download completed successfully.");
            resolve(true);
          });
        });
        
        // Handle errors with the request
        request.on('error', err => {
          fs.unlinkSync(ALL_PRINTINGS_FILE); // Clean up the file
          reject(err);
        });
        
        // Set a timeout
        request.setTimeout(60000, () => {
          request.destroy();
          fs.unlinkSync(ALL_PRINTINGS_FILE); // Clean up the file
          reject(new Error('Request timed out'));
        });
      });
    } catch (error) {
      console.error("Error downloading AllPrintings.json:", error);
      return false;
    }
  }
  
  /**
   * Load AllPrintings.json data
   */
  private async loadAllPrintingsData(): Promise<boolean> {
    try {
      if (this.allPrintingsData) {
        return true; // Already loaded
      }
      
      // Check if AllPrintings.json exists
      if (!fs.existsSync(ALL_PRINTINGS_FILE)) {
        console.log("AllPrintings.json not found. Attempting to download...");
        const downloadSuccess = await this.downloadAllPrintings();
        if (!downloadSuccess) {
          return false;
        }
      }
      
      console.log("Loading data from AllPrintings.json...");
      // Note: This file can be very large. We'll use a streaming approach for production.
      // For this implementation, we'll assume the file is manageable.
      const rawData = JSON.parse(fs.readFileSync(ALL_PRINTINGS_FILE, 'utf8'));
      
      if (rawData && rawData.data) {
        this.allPrintingsData = rawData.data;
        console.log(`Loaded data for ${Object.keys(rawData.data).length} sets from AllPrintings.json`);
        return true;
      } else {
        console.error("Invalid AllPrintings.json format");
        return false;
      }
    } catch (error) {
      console.error("Error loading AllPrintings.json:", error);
      return false;
    }
  }
  
  public static getInstance(): RarityRepairService {
    if (!RarityRepairService.instance) {
      RarityRepairService.instance = new RarityRepairService();
    }
    return RarityRepairService.instance;
  }
  
  /**
   * Load or initialize the rarity cache
   */
  public async initialize(): Promise<void> {
    if (this.initializing) return;
    this.initializing = true;
    
    try {
      // Try to load cache from file
      if (fs.existsSync(RARITY_CACHE_FILE)) {
        this.rarityCache = JSON.parse(fs.readFileSync(RARITY_CACHE_FILE, 'utf8'));
        console.log(`Loaded ${Object.keys(this.rarityCache).length} rarity records from cache`);
      } else {
        // Initialize empty cache
        this.rarityCache = {};
        fs.mkdirSync(path.dirname(RARITY_CACHE_FILE), { recursive: true });
        fs.writeFileSync(RARITY_CACHE_FILE, JSON.stringify(this.rarityCache, null, 2));
        console.log("Created new rarity cache file");
      }
    } catch (error) {
      console.error("Error initializing rarity repair service:", error);
      this.rarityCache = {};
    } finally {
      this.initializing = false;
    }
  }
  
  /**
   * Get the correct rarity for a card, prioritizing set-specific rarities
   * and handling cases where a card has different rarities across sets
   */
  private async getCorrectRarity(cardName: string, setCode?: string, cardNumber?: string): Promise<string | null> {
    try {
      // First try to use AllPrintings.json for this specific set if provided
      if (setCode && this.allPrintingsData) {
        const upperSetCode = setCode.toUpperCase();
        if (this.allPrintingsData[upperSetCode] && this.allPrintingsData[upperSetCode].cards) {
          // Try to match by collector number first if available
          if (cardNumber) {
            const cardByNumber = this.allPrintingsData[upperSetCode].cards.find(
              (c: any) => c.number === cardNumber && c.name === cardName
            );
            if (cardByNumber && cardByNumber.rarity) {
              return cardByNumber.rarity.toLowerCase();
            }
          }
          
          // If not found by number, try by name in this set
          const cardByName = this.allPrintingsData[upperSetCode].cards.find(
            (c: any) => c.name === cardName
          );
          if (cardByName && cardByName.rarity) {
            return cardByName.rarity.toLowerCase();
          }
        }
      }
      
      // Look across all sets for the card, identifying all rarities
      if (this.allPrintingsData) {
        const allRarities: Record<string, number> = {};
        let total = 0;
        
        // Collect rarities across all sets
        for (const setData of Object.values(this.allPrintingsData)) {
          if (setData.cards) {
            const matches = setData.cards.filter((c: any) => c.name === cardName);
            for (const match of matches) {
              if (match.rarity) {
                const rarity = match.rarity.toLowerCase();
                allRarities[rarity] = (allRarities[rarity] || 0) + 1;
                total++;
              }
            }
          }
        }
        
        if (total > 0) {
          // If we found at least one rarity, use the most common one
          // With a bias toward the highest rarity if there's a tie
          const rarityPriority = ['mythic', 'rare', 'uncommon', 'common', 'special', 'basic'];
          let mostCommonRarity = '';
          let highestCount = 0;
          
          for (const [rarity, count] of Object.entries(allRarities)) {
            if (count > highestCount) {
              mostCommonRarity = rarity;
              highestCount = count;
            } else if (count === highestCount) {
              // If tied, prefer the higher rarity
              const currentPriority = rarityPriority.indexOf(mostCommonRarity);
              const newPriority = rarityPriority.indexOf(rarity);
              if (newPriority < currentPriority) { // Lower index = higher priority
                mostCommonRarity = rarity;
              }
            }
          }
          
          if (mostCommonRarity) {
            return mostCommonRarity;
          }
        }
      }
      
      // If AllPrintings data didn't yield results, try AtomicCards
      if (this.atomicCardData && this.atomicCardData[cardName]) {
        const rarities = this.atomicCardData[cardName]
          .map((c: any) => c.rarity?.toLowerCase())
          .filter(Boolean);
          
        if (rarities.length > 0) {
          // Use the first non-null rarity as a fallback
          return rarities[0];
        }
      }
      
      // As a last resort, use Scryfall API
      try {
        const encodedName = encodeURIComponent(cardName);
        const response = await axios.get(`https://api.scryfall.com/cards/named?exact=${encodedName}`);
        
        if (response.data && response.data.rarity) {
          return response.data.rarity.toLowerCase();
        }
      } catch (apiError) {
        // Silently handle API errors - we'll fall back to other methods
      }
      
      return null;
    } catch (error) {
      console.error(`Error determining rarity for ${cardName}:`, error);
      return null;
    }
  }
  
  /**
   * Verify and fix rarity for a specific card
   */
  public async fixCardRarity(cardId: string, cardName: string, currentRarity: string | null, setCode?: string, cardNumber?: string): Promise<boolean> {
    try {
      // Use cache if available
      if (this.rarityCache[cardId]) {
        const correctRarity = this.rarityCache[cardId];
        
        // Only update if different
        if (currentRarity !== correctRarity) {
          await db.execute(sql`
            UPDATE cards 
            SET rarity = ${correctRarity} 
            WHERE id = ${cardId}
          `);
          console.log(`Fixed rarity for ${cardName} from ${currentRarity || 'NULL'} to ${correctRarity}`);
          return true;
        }
        return false;
      }
      
      // Get the set-specific rarity for this card
      const correctRarity = await this.getCorrectRarity(cardName, setCode, cardNumber);
      
      if (correctRarity) {
        // Store in cache
        this.rarityCache[cardId] = correctRarity;
        
        // Save cache periodically
        this.saveCache();
        
        // Update database if different
        if (currentRarity !== correctRarity) {
          await db.execute(sql`
            UPDATE cards 
            SET rarity = ${correctRarity} 
            WHERE id = ${cardId}
          `);
          console.log(`Fixed rarity for ${cardName} from ${currentRarity || 'NULL'} to ${correctRarity}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error fixing rarity for ${cardName}:`, error);
      return false;
    }
  }
  
  /**
   * Fix rarity for cards that match a specific search query
   */
  public async fixRarityForQuery(query: string = ''): Promise<number> {
    try {
      let sqlQuery = `
        SELECT id, name, rarity, set, number
        FROM cards
        WHERE 1=1
      `;
      
      if (query) {
        sqlQuery += ` AND (LOWER(name) LIKE '%${query.toLowerCase()}%' OR LOWER(id) LIKE '%${query.toLowerCase()}%')`;
      }
      
      // Limit to prevent API overload
      sqlQuery += ' LIMIT 100';
      
      const results = await db.execute(sql.raw(sqlQuery));
      const cards = results.rows;
      
      console.log(`Checking rarity for ${cards.length} cards...`);
      
      let fixCount = 0;
      for (const card of cards) {
        const wasFixed = await this.fixCardRarity(
          card.id as string, 
          card.name as string, 
          card.rarity as string | null,
          card.set as string, 
          card.number as string
        );
        if (wasFixed) {
          fixCount++;
        }
      }
      
      return fixCount;
    } catch (error) {
      console.error("Error running rarity fix:", error);
      return 0;
    }
  }
  
  /**
   * Fix specific card by ID
   */
  public async fixCardById(cardId: string): Promise<boolean> {
    try {
      const results = await db.execute(sql.raw(`
        SELECT id, name, rarity, set, number
        FROM cards
        WHERE id = '${cardId}'
      `));
      
      if (results.rows && results.rows.length > 0) {
        const card = results.rows[0];
        return await this.fixCardRarity(
          card.id as string, 
          card.name as string, 
          card.rarity as string | null,
          card.set as string,
          card.number as string
        );
      }
      
      return false;
    } catch (error) {
      console.error(`Error fixing card ${cardId}:`, error);
      return false;
    }
  }
  
  /**
   * Save the current rarity cache to file
   */
  private saveCache(): void {
    try {
      fs.writeFileSync(RARITY_CACHE_FILE, JSON.stringify(this.rarityCache, null, 2));
    } catch (error) {
      console.error("Error saving rarity cache:", error);
    }
  }
  
  /**
   * Load atomic card data from file
   */
  private async loadAtomicCardData(): Promise<boolean> {
    try {
      if (this.atomicCardData) {
        return true; // Already loaded
      }
      
      if (!fs.existsSync(ATOMIC_CARDS_FILE)) {
        console.error("AtomicCards.json not found at:", ATOMIC_CARDS_FILE);
        return false;
      }
      
      console.log("Loading card data from AtomicCards.json...");
      const rawData = JSON.parse(fs.readFileSync(ATOMIC_CARDS_FILE, 'utf8'));
      
      if (rawData && rawData.data) {
        this.atomicCardData = rawData.data;
        console.log(`Loaded data for ${Object.keys(this.atomicCardData!).length} cards from AtomicCards.json`);
        return true;
      } else {
        console.error("Invalid AtomicCards.json format");
        return false;
      }
    } catch (error) {
      console.error("Error loading AtomicCards.json:", error);
      return false;
    }
  }
  
  /**
   * Fix rarities for all cards using a combination of sources
   * First try AllPrintings.json, then fall back to standard rarities based on card properties
   */
  public async fixAllRaritiesFromAtomicCards(batchSize: number = 500): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    try {
      // Load the AllPrintings data if not already loaded
      const allPrintingsLoaded = await this.loadAllPrintingsData();
      if (!allPrintingsLoaded) {
        console.log("AllPrintings.json not available. Falling back to AtomicCards.json...");
        // Fall back to AtomicCards.json
        const atomicDataLoaded = await this.loadAtomicCardData();
        if (!atomicDataLoaded || !this.atomicCardData) {
          throw new Error("Failed to load any card data source");
        }
      }
      
      // Get all cards with missing or empty rarity
      const cardsWithMissingRarityResult = await db.execute(sql.raw(`
        SELECT id, name, rarity, type, set, "mana_cost" as "manaCost", number
        FROM cards 
        WHERE rarity IS NULL OR rarity = ''
      `));
      
      const cardsWithMissingRarity = cardsWithMissingRarityResult.rows;
      console.log(`Found ${cardsWithMissingRarity.length} cards with missing rarity`);
      
      let updatedCount = 0;
      let errorCount = 0;
      
      // Process cards in batches to avoid memory issues
      for (let i = 0; i < cardsWithMissingRarity.length; i += batchSize) {
        const batch = cardsWithMissingRarity.slice(i, i + batchSize);
        console.log(`Processing batch ${i/batchSize + 1} (${batch.length} cards)...`);
        
        // Build a batch update query
        const updateValues: Array<{id: string, name: string, rarity: string}> = [];
        
        for (const card of batch) {
          const cardName = card.name as string;
          const cardId = card.id as string;
          const cardType = (card.type as string || '').toLowerCase();
          const cardManaCost = card.manaCost as string || '';
          const cardSet = card.set as string || '';
          const cardNumber = card.number as string || '';
          
          // Try to determine rarity from multiple sources
          let rarity: string | null = null;
          
          // 1. First check our cache
          if (this.rarityCache[cardId]) {
            rarity = this.rarityCache[cardId];
          }
          // 2. Then try AllPrintings.json (preferred source)
          else if (this.allPrintingsData) {
            // AllPrintings.json has data organized by set code
            if (cardSet && this.allPrintingsData[cardSet.toUpperCase()]) {
              const setData = this.allPrintingsData[cardSet.toUpperCase()];
              if (setData && setData.cards) {
                // First try to find by card number if available
                if (cardNumber) {
                  const cardByNumber = setData.cards.find((c: any) => 
                    c.number === cardNumber && c.name === cardName);
                    
                  if (cardByNumber && cardByNumber.rarity) {
                    rarity = cardByNumber.rarity.toLowerCase();
                  }
                }
                
                // If not found by number, try by name
                if (!rarity) {
                  const cardByName = setData.cards.find((c: any) => c.name === cardName);
                  if (cardByName && cardByName.rarity) {
                    rarity = cardByName.rarity.toLowerCase();
                  }
                }
              }
            }
          }
          // 3. Then try AtomicCards.json
          else if (this.atomicCardData && this.atomicCardData[cardName] && 
                   this.atomicCardData[cardName][0] && 
                   this.atomicCardData[cardName][0].rarity) {
            rarity = this.atomicCardData[cardName][0].rarity;
          }
          // 4. Apply heuristics based on card type and characteristics
          if (!rarity) {
            // Land cards
            if (cardType.includes('land')) {
              if (cardType.includes('basic')) {
                rarity = 'common';
              } else {
                // Non-basic lands are often uncommon or rare
                rarity = 'uncommon';
              }
            }
            // Legendary cards tend to be rare or mythic
            else if (cardType.includes('legendary')) {
              rarity = 'rare';
            }
            // Planeswalkers are typically mythic rare
            else if (cardType.includes('planeswalker')) {
              rarity = 'mythic';
            }
            // Most common cards don't have complex mana costs
            else if (cardManaCost && cardManaCost.length <= 3) {
              rarity = 'common';
            }
            // Default to uncommon if we can't determine
            else {
              rarity = 'uncommon';
            }
          }
          
          if (rarity) {
            // Add to batch update
            updateValues.push({
              id: cardId,
              name: cardName,
              rarity: rarity
            });
            
            // Update cache
            this.rarityCache[cardId] = rarity;
            updatedCount++;
          } else {
            console.warn(`Could not determine rarity for ${cardName}`);
            errorCount++;
          }
        }
        
        // Perform batch update if we have values
        if (updateValues.length > 0) {
          // Build dynamic SQL for batch update
          const updateSQL = `
            UPDATE cards AS c SET
              rarity = v.rarity
            FROM (VALUES
              ${updateValues.map(v => `('${v.id}', '${v.name.replace(/'/g, "''")}', '${v.rarity}')`).join(',\n')}
            ) AS v(id, name, rarity)
            WHERE c.id = v.id
          `;
          
          await db.execute(sql.raw(updateSQL));
          console.log(`Updated ${updateValues.length} cards in batch ${i/batchSize + 1}`);
        }
      }
      
      // Save the updated cache
      this.saveCache();
      
      return {
        processed: cardsWithMissingRarity.length,
        updated: updatedCount,
        errors: errorCount
      };
    } catch (error) {
      console.error("Error fixing all rarities:", error);
      return {
        processed: 0,
        updated: 0,
        errors: 1
      };
    }
  }
  
  /**
   * Scan for rarity issues in database
   */
  public async scanForRarityIssues(): Promise<{
    missingRarity: number;
    commonCardIds: string[];
    uncommonCardIds: string[];
    rareCardIds: string[];
    mythicCardIds: string[];
  }> {
    try {
      // Check for cards with missing rarity
      const missingRarityResults = await db.execute(sql.raw(`
        SELECT COUNT(*) AS count
        FROM cards
        WHERE rarity IS NULL OR rarity = ''
      `));
      
      const missingRarityCount = parseInt(missingRarityResults.rows[0].count as string, 10);
      
      // Get sample cards from each rarity to validate
      const commonResults = await db.execute(sql.raw(`
        SELECT id, name, rarity
        FROM cards
        WHERE LOWER(rarity) = 'common'
        LIMIT 5
      `));
      
      const uncommonResults = await db.execute(sql.raw(`
        SELECT id, name, rarity
        FROM cards
        WHERE LOWER(rarity) = 'uncommon'
        LIMIT 5
      `));
      
      const rareResults = await db.execute(sql.raw(`
        SELECT id, name, rarity
        FROM cards
        WHERE LOWER(rarity) = 'rare'
        LIMIT 5
      `));
      
      const mythicResults = await db.execute(sql.raw(`
        SELECT id, name, rarity
        FROM cards
        WHERE LOWER(rarity) = 'mythic'
        LIMIT 5
      `));
      
      return {
        missingRarity: missingRarityCount,
        commonCardIds: commonResults.rows.map(row => row.id as string),
        uncommonCardIds: uncommonResults.rows.map(row => row.id as string),
        rareCardIds: rareResults.rows.map(row => row.id as string),
        mythicCardIds: mythicResults.rows.map(row => row.id as string)
      };
    } catch (error) {
      console.error("Error scanning for rarity issues:", error);
      return {
        missingRarity: 0,
        commonCardIds: [],
        uncommonCardIds: [],
        rareCardIds: [],
        mythicCardIds: []
      };
    }
  }
}

export const rarityRepairService = RarityRepairService.getInstance();