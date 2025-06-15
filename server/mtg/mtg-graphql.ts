import { GraphQLClient } from 'graphql-request';
import { Card } from '@shared/schema';

// MTGJSON GraphQL endpoint
const MTGJSON_GRAPHQL_URL = 'https://mtgjson.com/api/v5/graphql';

// Initialize GraphQL client
const graphqlClient = new GraphQLClient(MTGJSON_GRAPHQL_URL);

/**
 * Search for cards using MTGGraphQL
 * This provides more comprehensive and up-to-date results than our local database
 */
export async function searchCardsWithGraphQL(query: string, limit: number = 20): Promise<Card[]> {
  try {
    // GraphQL query to search for cards by name
    const searchQuery = `
      query SearchCards($name: String!, $limit: Int!) {
        cards(input: { name: $name, limit: $limit }) {
          name
          uuid
          type
          manaCost
          manaValue
          colors
          colorIdentity
          text
          types
          subtypes
          supertypes
          rarity
          setCode
          legalities {
            format
            status
          }
        }
      }
    `;

    // Variables for the query
    const variables = {
      name: query,
      limit
    };

    // Execute the query
    const data: any = await graphqlClient.request(searchQuery, variables);
    
    if (!data.cards || !Array.isArray(data.cards)) {
      console.error('Invalid response from MTGGraphQL:', data);
      return [];
    }

    // Convert GraphQL response to our Card type
    return data.cards.map((card: any) => convertGraphQLCardToCard(card, query));
  } catch (error) {
    console.error('Error searching cards with GraphQL:', error);
    return [];
  }
}

/**
 * Get card details by UUID using MTGGraphQL
 */
export async function getCardByUuid(uuid: string): Promise<Card | null> {
  try {
    // GraphQL query to get card by UUID
    const cardQuery = `
      query GetCard($uuid: String!) {
        card(input: { uuid: $uuid }) {
          name
          uuid
          type
          manaCost
          manaValue
          colors
          colorIdentity
          text
          types
          subtypes
          supertypes
          rarity
          setCode
          identifiers {
            scryfallId
            scryfallIllustrationId
            multiverseId
          }
          legalities {
            format
            status
          }
        }
      }
    `;

    // Variables for the query
    const variables = {
      uuid
    };

    // Execute the query
    const data: any = await graphqlClient.request(cardQuery, variables);
    
    if (!data.card) {
      console.error('Card not found in MTGGraphQL:', uuid);
      return null;
    }

    // Convert GraphQL response to our Card type
    return convertGraphQLCardToCard(data.card);
  } catch (error) {
    console.error('Error getting card with GraphQL:', error);
    return null;
  }
}

/**
 * Get cards from specific set using MTGGraphQL
 */
export async function getCardsBySet(setCode: string, limit: number = 100): Promise<Card[]> {
  try {
    // GraphQL query to get cards from a set
    const setCardsQuery = `
      query GetSetCards($setCode: String!, $limit: Int!) {
        cards(input: { setCode: $setCode, limit: $limit }) {
          name
          uuid
          type
          manaCost
          manaValue
          colors
          colorIdentity
          text
          types
          subtypes
          supertypes
          rarity
          setCode
          identifiers {
            scryfallId
            scryfallIllustrationId
            multiverseId
          }
          legalities {
            format
            status
          }
        }
      }
    `;

    // Variables for the query
    const variables = {
      setCode,
      limit
    };

    // Execute the query
    const data: any = await graphqlClient.request(setCardsQuery, variables);
    
    if (!data.cards || !Array.isArray(data.cards)) {
      console.error('Invalid response from MTGGraphQL for set:', setCode);
      return [];
    }

    // Convert GraphQL response to our Card type
    return data.cards.map((card: any) => convertGraphQLCardToCard(card));
  } catch (error) {
    console.error(`Error getting cards for set ${setCode} with GraphQL:`, error);
    return [];
  }
}

/**
 * Convert a card from MTGGraphQL format to our Card type
 */
function convertGraphQLCardToCard(graphqlCard: any, searchQuery?: string): Card {
  // Generate a unique ID based on card name and set
  const id = `${graphqlCard.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${graphqlCard.setCode.toLowerCase()}`;
  
  // Get the image URL
  const imageUrl = getCardImageUrl(graphqlCard);
  
  // Parse legalities
  const legalities: Record<string, string> = {};
  if (graphqlCard.legalities && Array.isArray(graphqlCard.legalities)) {
    graphqlCard.legalities.forEach((legality: any) => {
      legalities[legality.format.toLowerCase()] = legality.status.toLowerCase();
    });
  }

  // Map GraphQL card to our Card type
  return {
    id,
    name: graphqlCard.name,
    manaCost: graphqlCard.manaCost,
    cmc: graphqlCard.manaValue,
    colors: graphqlCard.colors || [],
    colorIdentity: graphqlCard.colorIdentity || [],
    type: graphqlCard.type,
    supertypes: graphqlCard.supertypes || [],
    types: graphqlCard.types || [],
    subtypes: graphqlCard.subtypes || [],
    rarity: graphqlCard.rarity,
    set: graphqlCard.setCode,
    text: graphqlCard.text,
    flavor: null,
    artist: null,
    number: null,
    power: null,
    toughness: null,
    layout: null,
    multiverseid: graphqlCard.identifiers?.multiverseId || null,
    imageUrl,
    variations: [],
    foreignNames: [],
    printings: [],
    originalText: null,
    originalType: null,
    legalities,
    uuid: graphqlCard.uuid,
    // Match relevance for search results sorting
    matchRelevance: searchQuery ? calculateMatchRelevance(graphqlCard.name, searchQuery) : 100,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Get the image URL for a card
 */
function getCardImageUrl(card: any): string | null {
  // Handle double-faced cards - use only the front face name
  let cardName = card.name;
  if (cardName && cardName.includes('//')) {
    cardName = cardName.split('//')[0].trim();
  }
  
  // Try to get the image from Scryfall if we have a Scryfall ID
  if (card.identifiers?.scryfallId) {
    return `https://cards.scryfall.io/large/front/${card.identifiers.scryfallId.charAt(0)}/${card.identifiers.scryfallId.charAt(1)}/${card.identifiers.scryfallId}.jpg`;
  }
  
  // Try to get the image from Gatherer if we have a multiverse ID
  if (card.identifiers?.multiverseId) {
    return `https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${card.identifiers.multiverseId}&type=card`;
  }
  
  // Fallback to Scryfall search API using front face name only
  const encodedCardName = encodeURIComponent(cardName);
  const setCode = encodeURIComponent(card.setCode);
  return `https://api.scryfall.com/cards/named?format=image&version=large&fuzzy=${encodedCardName}&set=${setCode}`;
}

/**
 * Calculate how relevant a card is to the search query
 * Higher number = more relevant
 */
function calculateMatchRelevance(cardName: string, searchQuery: string): number {
  const normalizedCardName = cardName.toLowerCase();
  const normalizedQuery = searchQuery.toLowerCase();
  
  // Exact match gets highest score
  if (normalizedCardName === normalizedQuery) {
    return 100;
  }
  
  // Starts with query gets high score
  if (normalizedCardName.startsWith(normalizedQuery)) {
    return 90;
  }
  
  // Contains query as a word gets medium score
  if (normalizedCardName.includes(` ${normalizedQuery} `)) {
    return 80;
  }
  
  // Contains query gets lower score
  if (normalizedCardName.includes(normalizedQuery)) {
    return 70;
  }
  
  // Default relevance
  return 50;
}