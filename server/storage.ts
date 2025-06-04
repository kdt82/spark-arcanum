import { pool } from "./db";
import { cards as cardsTable, type Card } from "@shared/schema";
import { sql, eq, and, ilike, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";
import { rarityRepairService } from "./mtg/rarity-repair";

// Database instance
const db = drizzle(pool, { schema });

interface CardFilters {
  color?: string;
  type?: string;
  rarity?: string;
  cmc?: string;
  format?: string;
  set?: string;
}

export interface IStorage {
  // Card methods
  storeCards(cards: Card[]): Promise<void>;
  findCards(query: string, filters?: CardFilters): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
  
  // Format legality queries
  getCardsByFormat(format: string, page?: number, pageSize?: number): Promise<Card[]>;
  getFormats(): Promise<string[]>;
  
  // Set queries
  getSets(): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeWithSampleCardsIfEmpty(false).catch(error => {
      console.error("Error initializing storage:", error);
    });
  }

  // Helper to normalize card names, fixing malformed double-faced cards
  private normalizeCardName(name: string): string {
    if (!name) return name;
    
    // Handle malformed double-faced cards like "Marang River Regent // Coil and Catch // Marang River Regent"
    if (name.includes('//')) {
      const parts = name.split('//').map(part => part.trim());
      
      // If we have more than 2 parts and the first and last are the same, it's malformed
      if (parts.length > 2 && parts[0] === parts[parts.length - 1]) {
        // Return the correct format: "Front // Back"
        return `${parts[0]} // ${parts[1]}`;
      }
      
      // If we have exactly 2 parts, it's already correct
      if (parts.length === 2) {
        return `${parts[0]} // ${parts[1]}`;
      }
      
      // If we have more than 2 parts but they're different, take first two
      if (parts.length > 2) {
        return `${parts[0]} // ${parts[1]}`;
      }
    }
    
    return name;
  }

  async storeCards(cardsToStore: Card[]): Promise<void> {
    try {
      // Let's handle batch insertion in chunks
      const chunkSize = 100;
      const totalCards = cardsToStore.length;
      
      console.log(`Storing ${totalCards} cards in batches of ${chunkSize}`);
      
      // Process in batches
      for (let i = 0; i < totalCards; i += chunkSize) {
        const batch = cardsToStore.slice(i, i + chunkSize);
        
        // Convert cards to database format and insert
        const dbCards = batch.map(card => ({
          id: card.id,
          name: card.name,
          mana_cost: card.manaCost,
          cmc: card.cmc ? card.cmc.toString() : null,
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
        
        try {
          await db.insert(cardsTable).values(dbCards).onConflictDoUpdate({
            target: cardsTable.id,
            set: {
              name: sql`EXCLUDED.name`,
              mana_cost: sql`EXCLUDED.mana_cost`,
              cmc: sql`EXCLUDED.cmc`,
              colors: sql`EXCLUDED.colors`,
              color_identity: sql`EXCLUDED.color_identity`,
              type: sql`EXCLUDED.type`,
              supertypes: sql`EXCLUDED.supertypes`,
              types: sql`EXCLUDED.types`,
              subtypes: sql`EXCLUDED.subtypes`,
              rarity: sql`EXCLUDED.rarity`,
              set: sql`EXCLUDED.set`,
              set_name: sql`EXCLUDED.set_name`,
              text: sql`EXCLUDED.text`,
              flavor: sql`EXCLUDED.flavor`,
              artist: sql`EXCLUDED.artist`,
              number: sql`EXCLUDED.number`,
              power: sql`EXCLUDED.power`,
              toughness: sql`EXCLUDED.toughness`,
              loyalty: sql`EXCLUDED.loyalty`,
              layout: sql`EXCLUDED.layout`,
              multiverseid: sql`EXCLUDED.multiverseid`,
              image_url: sql`EXCLUDED.image_url`,
              rulings: sql`EXCLUDED.rulings`,
              foreign_names: sql`EXCLUDED.foreign_names`,
              printings: sql`EXCLUDED.printings`,
              original_text: sql`EXCLUDED.original_text`,
              original_type: sql`EXCLUDED.original_type`,
              legalities: sql`EXCLUDED.legalities`,
              variations: sql`EXCLUDED.variations`
            }
          });
          
          console.log(`Stored/updated batch of ${batch.length} cards (${i + batch.length}/${totalCards})`);
        } catch (error) {
          console.error(`Error storing batch ${i}-${i + batch.length}:`, error);
          // Continue with next batch despite error
        }
      }
      
      return;
    } catch (error) {
      console.error(`Error in storeCards:`, error);
      return;
    }
  }

  async findCards(searchQuery: string, filters?: CardFilters): Promise<Card[]> {
    console.log('Search filters:', filters);
    
    try {
      // If no search criteria, return popular cards
      if ((!searchQuery || searchQuery.trim() === '') && 
          (!filters || Object.values(filters).every(value => !value || value === '' || value === ' '))) {
        console.log("No search query or filters, returning popular cards");
        const results = await db.select().from(cardsTable).limit(20);
        return results.map(card => this.dbCardToCard(card));
      }

      // For all cards including BLB rare talent cards, build a direct SQL query with all filters
      const conditions = [];
      
      // Text search
      if (searchQuery && searchQuery.trim() !== '') {
        const searchTerm = searchQuery.toLowerCase().replace(/'/g, "''");
        conditions.push(`(LOWER(name) LIKE '%${searchTerm}%' OR LOWER(COALESCE(text, '')) LIKE '%${searchTerm}%' OR LOWER(type) LIKE '%${searchTerm}%')`);
      }
      
      // Color filter
      if (filters?.color && filters.color.trim() !== '' && filters.color !== ' ') {
        if (filters.color === 'Colorless') {
          conditions.push(`(colors IS NULL OR array_length(colors, 1) IS NULL OR array_length(colors, 1) = 0)`);
        } else if (filters.color === 'Multicolor') {
          conditions.push(`(colors IS NOT NULL AND array_length(colors, 1) > 1)`);
        } else {
          // For specific colors, map to their code
          let colorCode;
          switch (filters.color.trim()) {
            case 'White': colorCode = 'W'; break;
            case 'Blue': colorCode = 'U'; break;
            case 'Black': colorCode = 'B'; break;
            case 'Red': colorCode = 'R'; break;
            case 'Green': colorCode = 'G'; break;
            default: colorCode = filters.color.charAt(0).toUpperCase();
          }

          // Use array contains for text array field - colors is a text[] in the schema
          // This makes sure the card has the exact color, not just a substring
          conditions.push(`'${colorCode}' = ANY(colors)`);
        }
      }
      
      // Type filter
      if (filters?.type && filters.type.trim() !== '' && filters.type !== ' ') {
        const typeValue = filters.type.trim().replace(/'/g, "''");
        conditions.push(`(type ILIKE '%${typeValue}%' OR (types IS NOT NULL AND types::text ILIKE '%${typeValue}%'))`);
      }
      
      // Rarity filter - case-insensitive exact match
      if (filters?.rarity && filters.rarity.trim() !== '' && filters.rarity !== ' ') {
        const rarityValue = filters.rarity.trim().replace(/'/g, "''");
        
        // Handle special case for BRO set which has missing rarity data
        if (filters.set && filters.set.toUpperCase() === 'BRO') {
          console.log("Special case handling for BRO set with missing rarity data");
          // For BRO set, we'll skip rarity filtering since the data is missing
        } else {
          // Use LOWER on both sides for case-insensitive comparison
          conditions.push(`(LOWER(COALESCE(rarity, '')) = LOWER('${rarityValue}'))`);
        }
      }
      
      // CMC filter - ensure proper numeric comparison
      if (filters?.cmc && filters.cmc.trim() !== '' && filters.cmc !== ' ') {
        if (filters.cmc === '7+') {
          // Handle 7+ mana value
          conditions.push(`(CAST(COALESCE(cmc, '0') AS NUMERIC) >= 7)`);
        } else {
          const cmcValue = parseFloat(filters.cmc);
          if (!isNaN(cmcValue)) {
            // CMC must strictly equal the specified value
            conditions.push(`(CAST(COALESCE(cmc, '0') AS NUMERIC) = ${cmcValue})`);
          }
        }
      }
      
      // Format filter
      if (filters?.format && filters.format.trim() !== '' && filters.format !== ' ') {
        const formatName = filters.format.trim().toLowerCase().replace(/'/g, "''");
        conditions.push(`(
          legalities IS NOT NULL AND 
          (
            legalities::text LIKE '%"${formatName}": "Legal"%' OR 
            legalities::text LIKE '%"${formatName}":"Legal"%' OR
            legalities::text LIKE '%"${formatName}": "Restricted"%' OR
            legalities::text LIKE '%"${formatName}":"Restricted"%'
          )
        )`);
      }
      
      // Set filter (various possible values)
      if (filters?.set && filters.set.trim() !== '' && filters.set !== ' ') {
        const setCode = filters.set.trim().toUpperCase();
        
        // Handle set code mappings and aliases
        const setMappings: Record<string, string[]> = {
          'FDN': ['M12', 'M10', 'M11', 'DOM', 'M15', 'AFR', 'MH2'],
          'BLB': ['BLB'], // We'll handle BLB cards separately with our custom list
          'DOM': ['DOM', 'DAR'],
          'STX': ['STA', 'STX'],
          'ZNR': ['ZNR', 'ZEN'],
          'MID': ['MID', 'ISD'],
          'VOW': ['VOW', 'ISD'],
          'NEO': ['NEO', 'NEP']
        };
        
        const setCodesForQuery = setMappings[setCode] || [setCode];
        const setList = setCodesForQuery.map(s => `'${s}'`).join(',');
        
        // For BRO set, use exact match only (to avoid matching substrings like YBRO)
        if (setCode === 'BRO') {
          conditions.push(`(
            (set IS NOT NULL AND UPPER(set) = 'BRO')
            OR
            (printings IS NOT NULL AND printings::text ILIKE '%"BRO"%')
          )`);
        } else {
          conditions.push(`(
            (set IS NOT NULL AND UPPER(set) IN (${setList}))
            OR
            (printings IS NOT NULL AND printings::text ILIKE '%${setCode}%')
          )`);
        }
      }
      
      // Build the complete query with all conditions
      let queryString = "SELECT * FROM cards";
      if (conditions.length > 0) {
        queryString += ` WHERE ${conditions.join(' AND ')}`;
      }
      // Add smart ordering to prioritize exact matches and basic lands
      if (searchQuery && searchQuery.trim() !== '') {
        const searchTerm = searchQuery.toLowerCase().replace(/'/g, "''");
        queryString += ` ORDER BY 
          CASE WHEN LOWER(name) = '${searchTerm}' THEN 0 ELSE 1 END,
          CASE WHEN LOWER(type) LIKE '%basic land%' AND LOWER(name) = '${searchTerm}' THEN 0 ELSE 1 END,
          name ASC LIMIT 100`;
      } else {
        queryString += " ORDER BY name ASC LIMIT 100";
      }

      console.log("Executing card search query:", queryString);
      
      // Execute raw SQL 
      const results = await db.execute(sql.raw(queryString));
      
      // No special handling for BLB cards anymore - let the database handle it
      // All set filtering should use the consistent database query approach
      
      console.log(`Found ${results.rowCount || 0} cards matching criteria`);
      
      // If no results with filters, let's return some cards that match at least one of the filters
      if (!results.rowCount || results.rowCount === 0) {
        
        // If we have a color filter, try to find cards of that color only
        if (filters?.color && filters.color.trim() !== '' && filters.color !== ' ') {
          // For special color cases or map to color code
          let colorCondition;
          const color = filters.color.trim();
          
          if (color === 'Colorless') {
            colorCondition = `(colors IS NULL OR array_length(colors, 1) IS NULL OR array_length(colors, 1) = 0)`;
          } else if (color === 'Multicolor') {
            colorCondition = `(colors IS NOT NULL AND array_length(colors, 1) > 1)`;
          } else {
            // For specific colors, map to their code
            let colorCode;
            switch (color) {
              case 'White': colorCode = 'W'; break;
              case 'Blue': colorCode = 'U'; break;
              case 'Black': colorCode = 'B'; break;
              case 'Red': colorCode = 'R'; break;
              case 'Green': colorCode = 'G'; break;
              default: colorCode = color.charAt(0).toUpperCase();
            }
            
            colorCondition = `'${colorCode}' = ANY(colors)`;
          }
          
          const colorOnlyQuery = `
            SELECT * FROM cards 
            WHERE ${colorCondition}
            ORDER BY name ASC 
            LIMIT 20
          `;
          console.log("No results with all filters. Trying color-only query:", colorOnlyQuery);
          
          try {
            const colorResults = await db.execute(sql.raw(colorOnlyQuery));
            
            if (colorResults.rowCount && colorResults.rowCount > 0) {
              console.log(`Found ${colorResults.rowCount} cards with color filter only`);
              return colorResults.rows.map((row: any) => this.improveCardData(this.dbCardToCard(row)));
            }
          } catch (error) {
            console.error("Error in color-only query:", error);
          }
        }
        
        // If we have a set filter, try to find cards from that set only
        if (filters?.set && filters.set.trim() !== '' && filters.set !== ' ') {
          // Special handling for BRO set due to substring matching issues
          if (filters.set.toUpperCase() === 'BRO') {
            // Use exact match for BRO to avoid matching YBRO, etc.
            let broCondition = `(
              (set IS NOT NULL AND UPPER(set) = 'BRO')
            )`;
            
            let setQueryConditions = [broCondition];
            
            // For BRO, skip the rarity filter since the data is missing
            console.log("Using special BRO exact match query");
            
            const setOnlyQuery = `
              SELECT * FROM cards 
              WHERE ${setQueryConditions.join(' AND ')} 
              ORDER BY name ASC 
              LIMIT 20
            `;
            console.log("Trying BRO-only query:", setOnlyQuery);
            
            try {
              const setResults = await db.execute(sql.raw(setOnlyQuery));
              
              if (setResults.rowCount && setResults.rowCount > 0) {
                console.log(`Found ${setResults.rowCount} cards with BRO set only`);
                return setResults.rows.map((row: any) => this.improveCardData(this.dbCardToCard(row)));
              }
            } catch (error) {
              console.error("Error in BRO-only query:", error);
            }
          } else {
            // Standard handling for other sets
            // Find the index of the set condition
            const setConditionIndex = conditions.findIndex(c => c.includes('set IN') || c.includes('printings::text'));
            
            if (setConditionIndex >= 0) {
              // Apply set filter and if rarity filter exists, apply it too
              let setQueryConditions = [conditions[setConditionIndex]];
            
              // Add rarity filter if it exists (except for BRO set)
              if (filters.rarity && filters.rarity.trim() !== '') {
                // Special case for BRO set which has no rarity data
                if (filters.set && filters.set.toUpperCase() === 'BRO') {
                  console.log("Skipping rarity filter for BRO set in fallback query");
                } else {
                  const rarityValue = filters.rarity.trim().replace(/'/g, "''");
                  setQueryConditions.push(`(LOWER(COALESCE(rarity, '')) = LOWER('${rarityValue}'))`);
                }
              }
              
              const setOnlyQuery = `
                SELECT * FROM cards 
                WHERE ${setQueryConditions.join(' AND ')} 
                ORDER BY name ASC 
                LIMIT 20
              `;
              console.log("Trying set-only query:", setOnlyQuery);
              
              try {
                const setResults = await db.execute(sql.raw(setOnlyQuery));
                
                if (setResults.rowCount && setResults.rowCount > 0) {
                  console.log(`Found ${setResults.rowCount} cards with set filter only`);
                  return setResults.rows.map((row: any) => this.improveCardData(this.dbCardToCard(row)));
                }
              } catch (error) {
                console.error("Error in set-only query:", error);
              }
            }
          }
        }
        
        // If we have a search query and format filter but found no results, return empty array
        // Don't fall back to popular cards when user is specifically searching for something
        if (searchQuery && searchQuery.trim() !== '' && filters?.format) {
          console.log("No results found for search query with format filter, returning empty array");
          return [];
        }
        
        // Fall back to popular cards only when no specific search query is provided
        console.log("No results with any filters, returning popular cards");
        const popularResults = await db.select().from(cardsTable).limit(20);
        return popularResults.map(card => this.improveCardData(this.dbCardToCard(card)));
      }
      
      // Process the results if we found cards matching all filters
      let cards = results.rows.map((row: any) => {
        const card = this.dbCardToCard(row);
        return this.improveCardData(card);
      });
      
      // Deduplicate cards by normalized name to handle malformed double-faced cards
      const cardsByName = new Map<string, Card>();
      
      for (const card of cards) {
        // Normalize card name to handle malformed double-faced cards
        const normalizedName = this.normalizeCardName(card.name);
        const existingCard = cardsByName.get(normalizedName);
        
        if (!existingCard) {
          // First time seeing this normalized card name
          // Use the better formatted version of the name
          const betterCard = { ...card, name: normalizedName };
          cardsByName.set(normalizedName, betterCard);
        } else {
          // Merge with existing card, keeping the most complete information
          const mergedCard = this.mergeCardData(existingCard, card);
          // Ensure we use the normalized name
          mergedCard.name = normalizedName;
          cardsByName.set(normalizedName, mergedCard);
        }
      }
      
      // Convert map back to array
      cards = Array.from(cardsByName.values());
      
      // Check for any rarity issues if we are filtering by rarity
      if (filters?.rarity && cards.length > 0) {
        // Asynchronously start validating rarities (don't wait for it)
        this.validateCardRarities(cards);
      }
      
      // Log if we found exact matches
      if (searchQuery && searchQuery.trim() !== '') {
        const exactMatch = cards.find(card => 
          card.name.toLowerCase() === searchQuery.trim().toLowerCase()
        );
        
        if (exactMatch) {
          console.log(`Found exact match: ${exactMatch.name} (ID: ${exactMatch.id})`);
        }
      }
      
      return cards;
    } catch (error) {
      console.error("Error searching for cards:", error);
      return [];
    }
  }
  
  // Helper to improve card data with missing fields
  private improveCardData(card: Card): Card {
    // Ensure image URL is set, especially fixing double-faced cards
    if (!card.imageUrl || 
        card.imageUrl.includes('gatherer.wizards.com') || 
        card.imageUrl.includes('0000000-0000-0000-0000') ||
        card.imageUrl.includes('card-backs')) {
      
      // Handle double-faced cards - use only the front face name
      let cardName = card.name;
      if (cardName && cardName.includes('//')) {
        cardName = cardName.split('//')[0].trim();
      }
      
      card.imageUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=large`;
    }
    
    // Calculate CMC if it's missing but manaCost is present
    if (!card.cmc && card.manaCost) {
      try {
        const manaCost = card.manaCost;
        const manaCostNoParens = manaCost.replace(/[{}]/g, '');
        const manaSymbols = manaCostNoParens.match(/[WUBRGC0-9X]/g) || [];
        let calculatedCMC = 0;
        
        for (const symbol of manaSymbols) {
          if (/[0-9]/.test(symbol)) {
            calculatedCMC += parseInt(symbol, 10);
          } else if (symbol !== 'X') {
            calculatedCMC += 1;
          }
        }
        
        card.cmc = calculatedCMC;
      } catch (e) {
        console.error("Error calculating CMC from manaCost:", e);
      }
    }
    
    return card;
  }
  
  // Helper to merge two cards, keeping the most complete information
  private mergeCardData(card1: Card, card2: Card): Card {
    // Create a new object to avoid mutating the inputs
    const mergedCard: Card = { ...card1 };
    
    // Prefer the card with the most recent set if available
    // This is a simple heuristic - newer sets generally have more up-to-date card info
    const sets = ['TDM', 'PTDM', 'MOM', 'MKM', 'LTR', 'ONE', 'MUL', 'BRO', 'DMU', 'SNC', 'NEO', 'VOW', 'MID', 'AFR', 'STX', 'KHM', 'ZNR', 'IKO', 'THB', 'ELD', 'MH2', 'MH1'];
    
    const set1Index = card1.set ? sets.indexOf(card1.set) : -1;
    const set2Index = card2.set ? sets.indexOf(card2.set) : -1;
    
    // If card2 is from a newer set (lower index in our array), prefer it as the base
    const newerCard = (set1Index === -1 || (set2Index !== -1 && set2Index < set1Index)) ? card2 : card1;
    const olderCard = newerCard === card1 ? card2 : card1;
    
    // Fields that we always prefer from the newer card
    mergedCard.id = newerCard.id;
    mergedCard.set = newerCard.set;
    mergedCard.setName = newerCard.setName;
    mergedCard.rarity = newerCard.rarity;
    mergedCard.number = newerCard.number;
    
    // For each field, prefer the non-null value
    // Start with text fields
    mergedCard.text = newerCard.text || olderCard.text;
    mergedCard.flavor = newerCard.flavor || olderCard.flavor;
    mergedCard.manaCost = newerCard.manaCost || olderCard.manaCost;
    mergedCard.type = newerCard.type || olderCard.type;
    
    // Prefer better image URLs (avoid placeholder URLs)
    if (newerCard.imageUrl && 
        !newerCard.imageUrl.includes('gatherer.wizards.com') && 
        !newerCard.imageUrl.includes('0000000-0000-0000-0000')) {
      mergedCard.imageUrl = newerCard.imageUrl;
    } else if (olderCard.imageUrl && 
               !olderCard.imageUrl.includes('gatherer.wizards.com') && 
               !olderCard.imageUrl.includes('0000000-0000-0000-0000')) {
      mergedCard.imageUrl = olderCard.imageUrl;
    }
    
    // For arrays, prefer non-empty arrays
    mergedCard.colors = (newerCard.colors && newerCard.colors.length > 0) ? newerCard.colors : 
                         (olderCard.colors && olderCard.colors.length > 0) ? olderCard.colors : [];
                         
    mergedCard.colorIdentity = (newerCard.colorIdentity && newerCard.colorIdentity.length > 0) ? newerCard.colorIdentity : 
                               (olderCard.colorIdentity && olderCard.colorIdentity.length > 0) ? olderCard.colorIdentity : [];
    
    mergedCard.supertypes = (newerCard.supertypes && newerCard.supertypes.length > 0) ? newerCard.supertypes : 
                            (olderCard.supertypes && olderCard.supertypes.length > 0) ? olderCard.supertypes : [];
                            
    mergedCard.types = (newerCard.types && newerCard.types.length > 0) ? newerCard.types : 
                       (olderCard.types && olderCard.types.length > 0) ? olderCard.types : [];
                       
    mergedCard.subtypes = (newerCard.subtypes && newerCard.subtypes.length > 0) ? newerCard.subtypes : 
                          (olderCard.subtypes && olderCard.subtypes.length > 0) ? olderCard.subtypes : [];
    
    // For objects like legalities, combine them
    mergedCard.legalities = { ...olderCard.legalities, ...newerCard.legalities };
    
    // For CMC, use the calculated value or prefer the non-null value
    mergedCard.cmc = newerCard.cmc || olderCard.cmc;
    
    // For card attributes specific to creatures/planeswalkers
    mergedCard.power = newerCard.power || olderCard.power;
    mergedCard.toughness = newerCard.toughness || olderCard.toughness;
    mergedCard.loyalty = newerCard.loyalty || olderCard.loyalty;
    
    // Improve the merged card data
    return this.improveCardData(mergedCard);
  }
  
  async getCard(id: string): Promise<Card | null> {
    try {
      const result = await db
        .select()
        .from(cardsTable)
        .where(eq(cardsTable.id, id));
        
      if (result.length > 0) {
        const card = this.dbCardToCard(result[0]);
        return this.improveCardData(card);
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting card with id ${id}:`, error);
      return null;
    }
  }
  
  // Get cards legal in a specific format
  async getCardsByFormat(format: string, page: number = 1, pageSize: number = 20): Promise<Card[]> {
    try {
      const offset = (page - 1) * pageSize;
      
      // Skip processing if format is empty or just a space
      if (!format || format.trim() === '' || format === ' ') {
        console.log("Empty format parameter, returning popular cards");
        const results = await db.select().from(cardsTable).limit(20);
        return results.map(card => this.improveCardData(this.dbCardToCard(card)));
      }
      
      // Standardize format name (e.g., standard, pioneer, modern)
      const formatName = format.toLowerCase();
      console.log(`Getting cards for format: ${formatName}`);
      
      // Query using the JSONB format of legalities
      // Safe SQL query for format
      const query = `
        SELECT * FROM cards 
        WHERE legalities IS NOT NULL 
        AND (
          legalities::text LIKE '%"${formatName.replace(/'/g, "''")}": "Legal"%' OR 
          legalities::text LIKE '%"${formatName.replace(/'/g, "''")}":"Legal"%' OR
          legalities::text LIKE '%"${formatName.replace(/'/g, "''")}": "Restricted"%' OR
          legalities::text LIKE '%"${formatName.replace(/'/g, "''")}":"Restricted"%'
        )
        ORDER BY name ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      
      const results = await db.execute(sql.raw(query));
      
      // Check if any cards were found
      if (results.rowCount === 0) {
        console.log(`No cards found for format: ${formatName}, returning popular cards`);
        const popularResults = await db.select().from(cardsTable).limit(20);
        return popularResults.map(card => this.improveCardData(this.dbCardToCard(card)));
      }
      
      // Process the cards from the format query with improved handling
      return results.rows.map((row: any) => this.improveCardData(this.dbCardToCard(row)));
    } catch (error) {
      console.error(`Error getting cards for format ${format}:`, error);
      return [];
    }
  }
  
  // Get all available formats from the database
  async getFormats(): Promise<string[]> {
    try {
      // Use a raw SQL query to get cards with legalities
      const query = `
        SELECT * FROM cards 
        WHERE legalities IS NOT NULL 
        AND legalities::text != '{}' 
        AND legalities::text != 'null'
        LIMIT 50
      `;
      
      const result = await db.execute(sql.raw(query));
      const cards = result.rows;
      
      // Extract all format names from the legalities objects
      const formatSet = new Set<string>();
      
      for (const card of cards) {
        // Parse the legalities JSON if it exists
        if (card.legalities) {
          let legalities: Record<string, string> = {};
          
          // Handle both string and object formats
          if (typeof card.legalities === 'string') {
            try {
              legalities = JSON.parse(card.legalities);
            } catch (e) {
              console.warn("Failed to parse legalities JSON:", e);
              continue;
            }
          } else if (card.legalities && typeof card.legalities === 'object') {
            legalities = card.legalities as Record<string, string>;
          }
          
          // Add all format names to the set
          Object.keys(legalities).forEach(format => formatSet.add(format));
        }
      }
      
      // Convert set to sorted array
      return Array.from(formatSet).sort();
    } catch (error) {
      console.error("Error getting formats:", error);
      return [];
    }
  }
  
  // Get all available sets from the database
  async getSets(): Promise<string[]> {
    try {
      // Find all unique set codes
      const query = `SELECT DISTINCT set FROM cards WHERE set IS NOT NULL AND set != ''`;
      const result = await db.execute(sql.raw(query));
      
      console.log(`Found ${result.rowCount} unique sets in the database`);
      
      // Extract and sort set codes
      const sets = result.rows
        .map((row: any) => row.set)
        .filter((set: string) => set && set.trim() !== '')
        .sort();
      
      return sets;
    } catch (error) {
      console.error("Error getting sets:", error);
      return [];
    }
  }
  
  // Convert database card to the Card type
  private dbCardToCard(dbCard: any): Card {
    // Convert cmc to number if possible
    let cmc: number | undefined = undefined;
    if (dbCard.cmc !== undefined && dbCard.cmc !== null) {
      const parsedCmc = parseFloat(dbCard.cmc);
      if (!isNaN(parsedCmc)) {
        cmc = parsedCmc;
      }
    }
    
    // Return the typed card object
    return {
      id: dbCard.id,
      name: dbCard.name,
      manaCost: dbCard.mana_cost,
      cmc,
      colors: dbCard.colors,
      colorIdentity: dbCard.color_identity,
      type: dbCard.type,
      supertypes: dbCard.supertypes,
      types: dbCard.types,
      subtypes: dbCard.subtypes,
      rarity: dbCard.rarity,
      set: dbCard.set,
      setName: dbCard.set_name,
      text: dbCard.text,
      flavor: dbCard.flavor,
      artist: dbCard.artist,
      number: dbCard.number,
      power: dbCard.power,
      toughness: dbCard.toughness,
      loyalty: dbCard.loyalty,
      layout: dbCard.layout,
      multiverseid: dbCard.multiverseid,
      imageUrl: dbCard.image_url,
      rulings: dbCard.rulings,
      foreignNames: dbCard.foreign_names,
      printings: dbCard.printings,
      originalText: dbCard.original_text,
      originalType: dbCard.original_type,
      legalities: dbCard.legalities,
      variations: dbCard.variations
    };
  }
  
  // Initialize database with sample cards if empty
  async initializeWithSampleCardsIfEmpty(forceRefresh: boolean = false): Promise<void> {
    try {
      // Check if the database already has cards
      const count = await db.select({ count: sql`COUNT(*)` }).from(cardsTable);
      const cardCount = parseInt(count[0].count as string, 10);
      
      console.log(`Found ${cardCount} cards already in the database. Continuing the migration from where we left off.`);
      
      // If we already have a significant number of cards, don't re-initialize unless forced
      if (cardCount > 100 && !forceRefresh) {
        console.log("Database already contains cards. Migration is in progress or complete.");
        return;
      }
      
      // You can add code here to load sample cards if needed
    } catch (error) {
      console.error("Error initializing database with sample cards:", error);
    }
  }
  
  /**
   * Validate and fix card rarities using the rarity repair service
   * This is an asynchronous operation that runs in the background
   */
  private async validateCardRarities(cards: Card[]): Promise<void> {
    try {
      // Initialize the rarity repair service if it hasn't been already
      await rarityRepairService.initialize();
      
      // Check a known problem card - Hunter's Talent
      if (cards.some(card => card.id === 'hunter-s-talent')) {
        console.log("Found Hunter's Talent - checking its rarity first");
        await rarityRepairService.fixCardById('hunter-s-talent');
      }
      
      // Process cards with potentially incorrect rarities
      const cardsToCheck = cards.slice(0, 10); // Limit to 10 cards to avoid API rate limits
      
      for (const card of cardsToCheck) {
        if (card.id && card.name) {
          // Check this card's rarity in the background
          rarityRepairService.fixCardRarity(card.id, card.name, card.rarity || null)
            .then(wasFixed => {
              if (wasFixed) {
                console.log(`Fixed incorrect rarity for ${card.name}`);
              }
            })
            .catch(error => {
              console.error(`Error checking rarity for ${card.name}:`, error);
            });
        }
      }
    } catch (error) {
      console.error("Error validating card rarities:", error);
    }
  }
}

// Export an instance of the storage
export const storage = new DatabaseStorage();