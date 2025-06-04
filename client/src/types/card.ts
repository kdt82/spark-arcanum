export interface Card {
  id: string;
  name: string;
  manaCost?: string;
  cmc?: number;
  colors?: string[];
  colorIdentity?: string[];
  type: string;
  supertypes?: string[];
  types?: string[];
  subtypes?: string[];
  rarity?: string;
  set?: string;
  setName?: string;
  text?: string;
  flavor?: string;
  artist?: string;
  number?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  layout?: string;
  multiverseid?: string;
  imageUrl?: string;
  rulings?: Array<{
    date: string;
    text: string;
  }>;
  foreignNames?: Array<{
    name: string;
    language: string;
    multiverseid?: string;
  }>;
  printings?: string[];
  originalText?: string;
  originalType?: string;
  legalities?: Record<string, string>;
  variations?: string[];
}

export interface AIRulingRequest {
  question: string;
  cardId?: string;
}

export interface AIRulingResponse {
  answer: string;
  relatedCards?: string[];
  references?: string[];
}
