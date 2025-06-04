import { storage } from "../storage";
import { Card } from "../../client/src/types/card";

// Process and normalize card data from JSON with batch processing
export async function processCardData(data: any): Promise<Card[]> {
  try {
    let cards: Card[] = [];

    // Add detailed logging to understand the data format
    console.log("Data type:", typeof data);
    if (typeof data === 'object' && data !== null) {
      console.log("Keys in data object:", Object.keys(data));
      
      // Inspect the data to determine its structure
      // Special handling for Scryfall API format which has a data array
      if (data.data && Array.isArray(data.data)) {
        console.log("Found data.data array with", data.data.length, "items");
        // Check if the first item looks like a card
        if (data.data.length > 0 && data.data[0].name && typeof data.data[0].name === 'string') {
          console.log("First item in data.data appears to be a card, using this array");
          cards = data.data;
        }
      } 
      // Common MTG JSON format with cards array
      else if (data.cards && Array.isArray(data.cards)) {
        console.log("Found data.cards array with", data.cards.length, "items");
        cards = data.cards;
      } 
      // Direct array of cards
      else if (Array.isArray(data)) {
        console.log("Found direct array with", data.length, "items");
        cards = data;
      } 
      // Special case: if data is a single card object, wrap it in an array
      else if (data.name && data.type && typeof data.name === 'string') {
        console.log("Data appears to be a single card object, wrapping in array");
        cards = [data];
      }
      // Try to find any array property that contains card-like objects
      else {
        let foundCardArray = false;
        
        // Try to find any array in the object that might contain card data
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key]) && data[key].length > 0) {
            console.log(`Found array in key '${key}' with ${data[key].length} items`);
            
            // Check if the first item looks like a card (has name and type)
            const firstItem = data[key][0];
            if (firstItem && typeof firstItem === 'object' && firstItem.name && firstItem.type) {
              console.log(`Items in '${key}' appear to be cards, using this array`);
              cards = data[key];
              foundCardArray = true;
              break;
            }
          }
        }
        
        // If we didn't find a cards array but there's a 'meta' field and another field,
        // this might be Scryfall JSON with a different structure
        if (!foundCardArray && data.meta && Object.keys(data).length === 2) {
          const otherKey = Object.keys(data).find(key => key !== 'meta');
          if (otherKey && Array.isArray(data[otherKey])) {
            console.log(`Found array in key '${otherKey}' which might be cards, using this array`);
            cards = data[otherKey];
          }
        }
        
        if (cards.length === 0) {
          console.log("Could not find a suitable array of cards in the data");
          console.log("Data structure:", JSON.stringify(data, null, 2).slice(0, 500) + "...");
          throw new Error("Invalid card data format. Could not find card data in the uploaded file.");
        }
      }
    } else {
      console.log("Data is not an object or is null");
      throw new Error("Invalid card data format. Expected JSON object or array.");
    }

    console.log(`Total cards to process: ${cards.length}`);
    
    // Process cards in batches to avoid memory issues
    const BATCH_SIZE = 1000;
    const processedCards: Card[] = [];
    
    // Process and store cards in batches
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(cards.length/BATCH_SIZE)} (${batch.length} cards)`);
      
      // Normalize the batch
      const normalizedBatch = batch.map(normalizeCard);
      processedCards.push(...normalizedBatch);
      
      // Store this batch
      console.log(`Storing batch ${i/BATCH_SIZE + 1}`);
      await storage.storeCards(normalizedBatch);
      
      // Log progress
      console.log(`Processed ${Math.min(i + BATCH_SIZE, cards.length)} of ${cards.length} cards`);
    }

    return processedCards;
  } catch (error) {
    console.error("Error processing card data:", error);
    throw error;
  }
}

// Normalize card data
function normalizeCard(card: any): Card {
  // Generate a unique ID if not present
  const id = card.id || card.multiverseid || `${card.name}-${card.set}`.replace(/[^a-zA-Z0-9]/g, '');

  // Normalize card object
  return {
    id,
    name: card.name,
    manaCost: card.manaCost,
    cmc: card.cmc,
    colors: card.colors,
    colorIdentity: card.colorIdentity,
    type: card.type,
    supertypes: card.supertypes,
    types: card.types,
    subtypes: card.subtypes,
    rarity: card.rarity,
    set: card.set,
    setName: card.setName,
    text: card.text,
    flavor: card.flavor,
    artist: card.artist,
    number: card.number,
    power: card.power,
    toughness: card.toughness,
    loyalty: card.loyalty,
    layout: card.layout,
    multiverseid: card.multiverseid,
    imageUrl: card.imageUrl || getCardImageUrl(card.name, card.set, card.multiverseid),
    rulings: card.rulings,
    foreignNames: card.foreignNames,
    printings: card.printings,
    originalText: card.originalText,
    originalType: card.originalType,
    legalities: card.legalities,
    variations: card.variations,
  };
}

// Try to generate image URL if not present
function getCardImageUrl(name: string, set: string, multiverseid?: string): string | undefined {
  if (!name) {
    return undefined;
  }
  
  // Use Scryfall's official API and image service
  // First try to create a proper URL using Scryfall's naming convention
  try {
    // Handle double-faced cards - use only the front face name
    let cardName = name;
    if (name.includes('//')) {
      cardName = name.split('//')[0].trim();
    }
    
    // Properly encode the card name for use in the URL
    // Replace spaces with hyphens and remove special characters
    const sanitizedName = cardName.toLowerCase()
      .replace(/[,'":.]/g, '')  // Remove punctuation
      .replace(/[æÆ]/g, 'ae')   // Replace æ with ae
      .replace(/[öÖ]/g, 'o')    // Replace ö with o
      .replace(/[üÜ]/g, 'u')    // Replace ü with u
      .replace(/[àáâäãåā]/g, 'a') // Replace accented a
      .replace(/[èéêëēė]/g, 'e')  // Replace accented e
      .replace(/[ìíîïī]/g, 'i')   // Replace accented i
      .replace(/[òóôõöō]/g, 'o')  // Replace accented o
      .replace(/[ùúûüū]/g, 'u')   // Replace accented u
      .replace(/\s+/g, '-')       // Replace spaces with hyphens
      .replace(/-+/g, '-')        // Replace multiple hyphens with single hyphen
      .replace(/[^a-z0-9-]/g, ''); // Remove any remaining non-alphanumeric characters except hyphens
    
    // Get set code in lowercase for URL construction
    const setCode = set ? set.toLowerCase() : '';
    
    // For very specific known cards, use their exact Scryfall URLs
    const knownCards: Record<string, string> = {
      'counterspell': 'https://cards.scryfall.io/large/front/1/b/1b1fc138-efb8-4497-bd93-77ac9b45ce07.jpg',
      'lightning bolt': 'https://cards.scryfall.io/large/front/f/2/f29ba16f-c8fb-42fe-aabf-87089cb214a7.jpg',
      'wrath of god': 'https://cards.scryfall.io/large/front/6/6/664e6656-36a3-4635-9f33-9f8901afd397.jpg',
      'black lotus': 'https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg'
    };
    
    if (knownCards[name.toLowerCase()]) {
      return knownCards[name.toLowerCase()];
    }
    
    // Use the direct Scryfall image API
    // Using the permanent card image URL format which is more reliable than the API endpoint
    return `https://cards.scryfall.io/large/front/via/api-${encodeURIComponent(name.toLowerCase())}.jpg`;
  } catch (error) {
    console.warn(`Error generating image URL for ${name}:`, error);
    
    // In case our URL generation fails, use the multiverseid if available
    if (multiverseid) {
      return `https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${multiverseid}&type=card`;
    }
    
    // Last resort: use a direct Scryfall image URL with a fallback placeholder
    // This is more reliable than API redirects which might be blocked
    return `https://cards.scryfall.io/large/front/via/fallback-${encodeURIComponent(name.toLowerCase())}.jpg`;
  }
}

// Search cards by name, text, and type
export async function searchCards(query: string): Promise<Card[]> {
  try {
    // Delegate to storage
    return await storage.findCards(query);
  } catch (error) {
    console.error("Error searching cards:", error);
    throw error;
  }
}

// Get a single card by ID
export async function getCardById(id: string): Promise<Card | null> {
  try {
    return await storage.getCard(id);
  } catch (error) {
    console.error("Error getting card by ID:", error);
    throw error;
  }
}
