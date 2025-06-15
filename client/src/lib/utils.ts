import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatManaSymbols(text: string): string {
  // Replace {X}, {R}, {W}, etc. with styled spans
  if (!text) return "";
  
  return text.replace(/\{([^}]+)\}/g, (match, symbol) => {
    return `<span class="mana-symbol mana-${symbol.toLowerCase()}">${symbol}</span>`;
  });
}

export function getCardImageFallback(card: { name: string, set?: string }): string {
  // This function generates a reliable fallback image URL when card image is not available
  const cardBack = "https://c1.scryfall.com/file/scryfall-card-backs/large/59/597b79b3-7d77-4261-871a-60dd17403388.jpg";
  
  if (!card.name) return cardBack;
  
  try {
    // Handle double-faced cards - use only the front face name
    let cardName = card.name.trim();
    if (cardName.includes('//')) {
      cardName = cardName.split('//')[0].trim();
    }
    
    // Create a Scryfall API compatible query
    const encodedName = encodeURIComponent(cardName);
    let scryfallUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodedName}`;
    
    // If set is available, create a more specific query
    if (card.set) {
      scryfallUrl += `&set=${card.set.toLowerCase()}`;
    }
    
    // Return the image URL format - this doesn't actually perform the API request,
    // but gives us a direct format=image URL to use in <img> tags
    return `https://api.scryfall.com/cards/named?format=image&version=large&fuzzy=${encodedName}`;
  } catch (error) {
    console.error("Error generating card image URL:", error);
    return cardBack;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
