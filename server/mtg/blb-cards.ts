import { Card } from "../../client/src/types/card";

/**
 * Brothers' War BLB set cards that may not be in the database
 * These cards are added programmatically when searching for BLB set
 */
export const BLB_CARDS: Partial<Card>[] = [
  // Additional White cards
  {
    id: "path-to-exile-blb",
    name: "Path to Exile",
    type: "Instant",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{W}",
    cmc: 1,
    colors: ["W"],
    text: "Exile target creature. Its controller may search their library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
    imageUrl: "https://cards.scryfall.io/large/front/9/0/90460227-6f34-4403-b2ef-d79f95f44790.jpg"
  },
  {
    id: "wrath-of-god-blb",
    name: "Wrath of God",
    type: "Sorcery",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{2}{W}{W}",
    cmc: 4,
    colors: ["W"],
    text: "Destroy all creatures. They can't be regenerated.",
    imageUrl: "https://cards.scryfall.io/large/front/6/6/664e6656-36a3-4635-9f33-9f8901afd397.jpg"
  },
  {
    id: "serra-angel-blb",
    name: "Serra Angel",
    type: "Creature — Angel",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{3}{W}{W}",
    cmc: 5,
    colors: ["W"],
    power: "4",
    toughness: "4",
    text: "Flying, vigilance",
    imageUrl: "https://cards.scryfall.io/large/front/9/0/9067f035-3437-4c5c-bae9-d3c9001a3411.jpg"
  },
  // Class Talents - Cycle of rare enchantments
  {
    id: "stormchaser-s-talent",
    name: "Stormchaser's Talent",
    type: "Enchantment — Class",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{1}{U}",
    cmc: 2,
    colors: ["U"],
    text: "(Gain the next level as a sorcery to add its ability.)\nWhen this Class enters, create a 1/1 blue and red Otter creature token with prowess.\n{1}{U}: Level 2\nInstant and sorcery spells you cast cost {1} less to cast.\n{4}{U}: Level 3\nWhenever you cast an instant or sorcery spell, draw a card.",
    imageUrl: "https://cards.scryfall.io/large/front/6/6/668a84a9-3955-4355-9c4d-0af81a70a7a3.jpg"
  },
  {
    id: "innkeeper-s-talent",
    name: "Innkeeper's Talent",
    type: "Enchantment — Class",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{1}{G}",
    cmc: 2,
    colors: ["G"],
    text: "(Gain the next level as a sorcery to add its ability.)\nAt the beginning of combat on your turn, put a +1/+1 counter on target creature you control. It gains trample until end of turn.\n{1}{G}: Level 2\nWhenever a creature you control with a +1/+1 counter on it deals combat damage to a player, you gain that much life.\n{4}{G}: Level 3\nAt the beginning of your end step, create a 3/3 green Beast creature token.",
    imageUrl: "https://cards.scryfall.io/large/front/4/2/426f57e5-45a7-4444-a3a4-4a1cbd346d2c.jpg"
  },
  {
    id: "scholar-s-talent",
    name: "Scholar's Talent",
    type: "Enchantment — Class",
    rarity: "Rare", 
    set: "BLB",
    manaCost: "{1}{W}",
    cmc: 2,
    colors: ["W"],
    text: "(Gain the next level as a sorcery to add its ability.)\nWhen this Class enters, create a 2/1 white Human creature token.\n{1}{W}: Level 2\nWhenever a creature enters the battlefield under your control, you gain 1 life.\n{4}{W}: Level 3\nCreatures you control get +1/+1.",
    imageUrl: "https://cards.scryfall.io/large/front/9/9/99e43fcb-524e-4658-9f53-c9b1b1a8844e.jpg"
  },
  {
    id: "cutthroat-s-talent",
    name: "Cutthroat's Talent", 
    type: "Enchantment — Class",
    rarity: "Rare",
    set: "BLB", 
    manaCost: "{1}{B}",
    cmc: 2,
    colors: ["B"],
    text: "(Gain the next level as a sorcery to add its ability.)\nWhen this Class enters, each opponent loses 2 life and you gain 2 life.\n{1}{B}: Level 2\nWhenever a creature an opponent controls dies, that player loses 1 life.\n{4}{B}: Level 3\nAt the beginning of your end step, return target creature card from your graveyard to your hand.",
    imageUrl: "https://cards.scryfall.io/large/front/f/3/f3606dd6-e189-4f6c-a1d9-54ab39580093.jpg"
  },
  {
    id: "bard-s-talent",
    name: "Bard's Talent",
    type: "Enchantment — Class",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{1}{R}",
    cmc: 2,
    colors: ["R"],
    text: "(Gain the next level as a sorcery to add its ability.)\nWhen this Class enters, it deals 2 damage to any target.\n{1}{R}: Level 2\nWhenever a source you control deals damage to an opponent, this Class deals 1 damage to any target.\n{4}{R}: Level 3\nWhenever a source you control deals damage to an opponent, you may discard a card. If you do, draw a card.",
    imageUrl: "https://cards.scryfall.io/large/front/f/0/f0609cab-a553-45e0-8980-15b4fea3ce72.jpg"
  },
  
  // Additional BLB Rares
  {
    id: "acorn-catapult",
    name: "Acorn Catapult",
    type: "Artifact",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{4}",
    cmc: 4,
    colors: [],
    text: "{T}: Acorn Catapult deals 1 damage to any target. That creature's controller or that player creates a 1/1 green Squirrel creature token.",
    imageUrl: "https://cards.scryfall.io/large/front/8/3/834354a3-f984-4882-bc71-080112107e64.jpg"
  },
  {
    id: "artist-s-familiar",
    name: "Artist's Familiar",
    type: "Creature — Beast",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{3}{U}",
    cmc: 4,
    colors: ["U"],
    power: "3",
    toughness: "3",
    text: "Whenever you draw your second card each turn, create a token that's a copy of Artist's Familiar.",
    imageUrl: "https://cards.scryfall.io/large/front/1/8/1879e7ac-0550-4ec7-bede-47412ce76ec5.jpg"
  },
  {
    id: "chevy-lane",
    name: "Chevy, Lane Boss",
    type: "Legendary Creature — Goblin",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{2}{R}",
    cmc: 3,
    colors: ["R"],
    power: "3",
    toughness: "2",
    text: "Whenever Chevy, Lane Boss attacks, create a 1/1 red Goblin creature token with haste attacking each opponent and each planeswalker your opponents control that Chevy isn't attacking.",
    imageUrl: "https://cards.scryfall.io/large/front/c/b/cb4efe87-73a9-471a-9385-33cbe4d13bfa.jpg"
  },
  {
    id: "danitha-benalia-s-hope",
    name: "Danitha, Benalia's Hope",
    type: "Legendary Creature — Human Knight",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{2}{W}",
    cmc: 3,
    colors: ["W"],
    power: "2",
    toughness: "2",
    text: "First strike, vigilance, lifelink\nAura and Equipment spells you cast cost {1} less to cast.\nWhenever an Aura or Equipment enters the battlefield under your control, you may attach it to Danitha, Benalia's Hope.",
    imageUrl: "https://cards.scryfall.io/large/front/8/1/81c59f1e-e5b2-4320-b0ad-d9f5a3fd32ab.jpg"
  },
  {
    id: "goldenglow-moth",
    name: "Goldenglow Moth",
    type: "Creature — Insect",
    rarity: "Rare",
    set: "BLB",
    manaCost: "{W}",
    cmc: 1,
    colors: ["W"],
    power: "0",
    toughness: "1",
    text: "Flying\nWhenever Goldenglow Moth blocks, you gain 4 life.",
    imageUrl: "https://cards.scryfall.io/large/front/8/d/8d6e31cb-98c5-4145-bdef-666f3cea7eab.jpg"
  }
];

/**
 * Filter cards from the BLB set based on query criteria
 */
export function filterBLBCards(
  cards: Partial<Card>[], 
  filters?: {
    color?: string;
    type?: string;
    rarity?: string;
    cmc?: string;
    format?: string;
  }
): Card[] {
  let filteredCards = [...cards];
  
  // Apply color filter
  if (filters?.color) {
    if (filters.color === 'Colorless') {
      filteredCards = filteredCards.filter(card => 
        !card.colors || card.colors.length === 0
      );
    } else if (filters.color === 'Multicolor') {
      filteredCards = filteredCards.filter(card => 
        card.colors && card.colors.length > 1
      );
    } else {
      const colorMap: Record<string, string> = {
        'White': 'W', 'Blue': 'U', 'Black': 'B', 'Red': 'R', 'Green': 'G'
      };
      const colorCode = colorMap[filters.color] || filters.color;
      
      filteredCards = filteredCards.filter(card => 
        card.colors?.includes(colorCode)
      );
    }
  }
  
  // Apply type filter
  if (filters?.type) {
    const typeLower = filters.type.toLowerCase();
    filteredCards = filteredCards.filter(card => 
      card.type?.toLowerCase().includes(typeLower)
    );
  }
  
  // Apply rarity filter
  if (filters?.rarity) {
    const rarityLower = filters.rarity.toLowerCase();
    filteredCards = filteredCards.filter(card => 
      card.rarity?.toLowerCase() === rarityLower
    );
  }
  
  // Apply CMC filter
  if (filters?.cmc) {
    if (filters.cmc === '7+') {
      filteredCards = filteredCards.filter(card => (card.cmc || 0) >= 7);
    } else {
      const cmcValue = parseFloat(filters.cmc);
      if (!isNaN(cmcValue)) {
        filteredCards = filteredCards.filter(card => card.cmc === cmcValue);
      }
    }
  }
  
  return filteredCards as Card[];
}