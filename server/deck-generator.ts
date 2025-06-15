import OpenAI from "openai";
import { storage } from "./storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface DeckGenerationRequest {
  format: string;
  prompt: string;
  commander?: string;
  deckSize: number;
  maxCopies: number;
}

interface CardSuggestion {
  id: string;
  name: string;
  quantity: number;
  type?: string;
  manaCost?: string;
  imageUrl?: string;
}

interface DeckSuggestion {
  deckName: string;
  deckDescription: string;
  cards: CardSuggestion[];
}

// Helper function to count total cards in a deck
function countTotalCards(cards: CardSuggestion[]): number {
  return cards.reduce((total, card) => total + card.quantity, 0);
}

// Helper function to extract color identity from a prompt
function extractColorsFromPrompt(prompt: string): string[] {
  const colorMap: {[key: string]: string[]} = {
    'white': ['W', 'white'],
    'blue': ['U', 'blue'],
    'black': ['B', 'black'],
    'red': ['R', 'red'],
    'green': ['G', 'green'],
    'azorius': ['W', 'U', 'white', 'blue'],
    'dimir': ['U', 'B', 'blue', 'black'],
    'rakdos': ['B', 'R', 'black', 'red'],
    'gruul': ['R', 'G', 'red', 'green'],
    'selesnya': ['G', 'W', 'green', 'white'],
    'orzhov': ['W', 'B', 'white', 'black'],
    'izzet': ['U', 'R', 'blue', 'red'],
    'golgari': ['B', 'G', 'black', 'green'],
    'boros': ['R', 'W', 'red', 'white'],
    'simic': ['G', 'U', 'green', 'blue'],
    'esper': ['W', 'U', 'B', 'white', 'blue', 'black'],
    'grixis': ['U', 'B', 'R', 'blue', 'black', 'red'],
    'jund': ['B', 'R', 'G', 'black', 'red', 'green'],
    'naya': ['R', 'G', 'W', 'red', 'green', 'white'],
    'bant': ['G', 'W', 'U', 'green', 'white', 'blue'],
    'abzan': ['W', 'B', 'G', 'white', 'black', 'green'],
    'jeskai': ['U', 'R', 'W', 'blue', 'red', 'white'],
    'sultai': ['B', 'G', 'U', 'black', 'green', 'blue'],
    'mardu': ['R', 'W', 'B', 'red', 'white', 'black'],
    'temur': ['G', 'U', 'R', 'green', 'blue', 'red'],
  };
  
  // Extract all colors mentioned in the prompt
  const promptLower = prompt.toLowerCase();
  let colors: string[] = [];
  
  for (const [colorName, colorCodes] of Object.entries(colorMap)) {
    if (promptLower.includes(colorName)) {
      colors = [...colors, ...colorCodes];
    }
  }
  
  // Remove duplicates and return unique colors
  return Array.from(new Set(colors));
}

export async function generateDeckSuggestion(request: DeckGenerationRequest): Promise<DeckSuggestion> {
  try {
    // Extract colors from the prompt to ensure color identity consistency
    const requestedColors = extractColorsFromPrompt(request.prompt);
    
    console.log("Detected colors for deck generation:", requestedColors);
    
    // Build the prompt for the AI
    let prompt = `Create a Magic: The Gathering deck for the ${request.format} format based on the following description: "${request.prompt}".
    
    VERY IMPORTANT FORMAT REQUIREMENTS:
    - The deck MUST use ONLY cards that are legal in the ${request.format} format
    - The deck MUST be EXACTLY ${request.deckSize} cards total, no more and no less
    - Maximum copies of any card (except basic lands): ${request.maxCopies}
    - CRITICAL: You MUST strictly follow these colors: ${requestedColors.join(', ')}
    - CRITICAL: Always prioritize specific cards mentioned in the prompt like "${request.prompt.match(/\b\w+(?:\s+\w+){0,3}\b/g)?.[0] || ''}"
    - DO NOT include any cards that are banned or not legal in ${request.format}
    `;
    
    if (request.commander) {
      prompt += `- Commander: ${request.commander}\n`;
      prompt += `- All cards must match the commander's color identity\n`;
    }
    
    prompt += `
    Please provide a detailed deck list with the following:
    1. A creative deck name
    2. A brief description of the deck's strategy and playstyle
    3. A list of cards with quantities, organized by type (creatures, spells, artifacts, enchantments, planeswalkers, lands)
    
    Format the response as a valid JSON object with the following structure:
    {
      "deckName": "Name of the deck",
      "deckDescription": "Brief description of the deck strategy",
      "cards": [
        {"name": "Card Name", "quantity": 2, "type": "Creature"},
        {"name": "Another Card", "quantity": 4, "type": "Instant"}
      ]
    }
    
    Only include cards that exist in the official Magic: The Gathering card pool. Ensure the deck follows all format restrictions.`;
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert Magic: The Gathering deck builder with deep knowledge of all cards and formats." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error("Empty response from AI");
    }
    
    const deckSuggestion = JSON.parse(responseContent) as DeckSuggestion;
    
    // Validate card names against our database
    const validatedCards: CardSuggestion[] = [];
    
    for (const card of deckSuggestion.cards) {
      try {
        // Search for each card in our database with format filtering
        const searchResults = await storage.findCards(card.name, { format: request.format });
        
        if (searchResults && searchResults.length > 0) {
          // Find the exact match or closest match that's legal in the format
          const exactMatch = searchResults.find(result => 
            result.name.toLowerCase() === card.name.toLowerCase()
          );
          
          // Find a format-legal card from the results that matches the color identity
          const formatLegalCard = searchResults.find(card => {
            if (!card.legalities) return false;
            
            // Parse legalities if needed
            const legalities = typeof card.legalities === 'string' 
              ? JSON.parse(card.legalities) 
              : card.legalities;
              
            // Check if the card is legal in the requested format
            const formatKey = request.format.toLowerCase();
            const isLegal = legalities && (legalities[formatKey] === 'legal' || legalities[formatKey] === 'restricted');
            
            // Skip if not legal in format
            if (!isLegal) return false;
            
            // Check color identity compatibility
            if (requestedColors.length > 0) {
              // Get card's colors
              const cardColors = card.colorIdentity || card.colors || [];
              const cardColorsArray = Array.isArray(cardColors) ? cardColors : [cardColors];
              
              // For colorless cards, always allow
              if (cardColorsArray.length === 0) return true;
              
              // Check if all card colors are within requested colors
              // Convert both to uppercase single-letter format (W,U,B,R,G)
              const requestedColorCodes = requestedColors
                .filter(c => c.length === 1)
                .map(c => c.toUpperCase());
                
              return cardColorsArray.every(color => 
                requestedColorCodes.includes(color) || 
                // Allow basic lands always
                (card.type && card.type.toLowerCase().includes('basic land'))
              );
            }
            
            return true;
          });
          
          const matchedCard = formatLegalCard || exactMatch || searchResults[0];
          
          // Add to validated cards with database info
          validatedCards.push({
            id: matchedCard.id,
            name: matchedCard.name,
            quantity: card.quantity,
            type: matchedCard.type,
            manaCost: matchedCard.manaCost || undefined,
            imageUrl: matchedCard.imageUrl || undefined
          });
        }
      } catch (err) {
        console.error(`Error validating card ${card.name}:`, err);
        // Include the card anyway to preserve the AI's intent, but without extra info
      }
    }
    
    // Ensure the deck has exactly the requested number of cards
    const totalCards = countTotalCards(validatedCards);
    if (totalCards !== request.deckSize) {
      console.log(`Fixing deck size: Expected ${request.deckSize}, got ${totalCards}`);
      
      // Find basic lands in the deck
      const basicLands = validatedCards.filter(card => 
        card.type && card.type.toLowerCase().includes('basic land'));
      
      if (basicLands.length > 0) {
        if (totalCards < request.deckSize) {
          // Add more basic lands to reach the required size
          const landToAdjust = basicLands[0];
          const cardsToAdd = request.deckSize - totalCards;
          landToAdjust.quantity += cardsToAdd;
          console.log(`Added ${cardsToAdd} ${landToAdjust.name} to match deck size`);
        } else if (totalCards > request.deckSize) {
          // Remove excess basic lands
          const landToAdjust = basicLands[0];
          const cardsToRemove = Math.min(landToAdjust.quantity - 1, totalCards - request.deckSize);
          landToAdjust.quantity -= cardsToRemove;
          console.log(`Removed ${cardsToRemove} ${landToAdjust.name} to match deck size`);
        }
      }
    }
    
    return {
      deckName: deckSuggestion.deckName,
      deckDescription: deckSuggestion.deckDescription,
      cards: validatedCards.length > 0 ? validatedCards : deckSuggestion.cards
    };
  } catch (error) {
    console.error("Error generating deck suggestion:", error);
    throw new Error("Failed to generate deck suggestion");
  }
}