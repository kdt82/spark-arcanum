import React, { useState } from "react";
import { Card } from "@/types/card";
import { ManaCost } from "./mana-symbol";
import { CardText } from "./card-text";
import { RarityBadge } from "./rarity-badge";
import { getCardImageFallback } from "@/lib/utils";

interface CardItemProps {
  card: Card;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CardItem({ card, isSelected, onClick }: CardItemProps) {
  // Use Scryfall image directly with the card art
  const [imgError, setImgError] = useState(false);
  const cardBackImage = "https://c1.scryfall.com/file/scryfall-card-backs/small/59/597b79b3-7d77-4261-871a-60dd17403388.jpg";
  
  // Use our improved image fallback system
  const getScryfallImageUrl = () => {
    if (card.imageUrl && !imgError) return card.imageUrl;
    
    // If the original image fails, use the enhanced fallback from utils
    // Just add version=small to make it a smaller image
    const fallbackUrl = getCardImageFallback(card);
    return fallbackUrl.replace('version=normal', 'version=small');
  };

  return (
    <div 
      className={`flex bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-3 card-hover transition-all cursor-pointer border ${isSelected ? 'border-primary' : 'border-transparent hover:border-primary'}`}
      onClick={onClick}
    >
      <div className="w-16 h-22 bg-gray-200 rounded overflow-hidden flex-shrink-0">
        <img 
          src={getScryfallImageUrl()}
          className="w-full h-full object-contain" 
          alt={`${card.name} card`}
          onError={(e) => {
            e.currentTarget.onerror = null; // Prevent infinite loop
            if (!imgError) {
              setImgError(true);
              e.currentTarget.src = cardBackImage;
            }
          }}
        />
      </div>
      <div className="ml-3 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="font-medium">{card.name}</h3>
          <div className="text-right flex items-center">
            {card.manaCost && (
              <ManaCost cost={card.manaCost} size="sm" />
            )}
          </div>
        </div>
        <div className="flex items-center mt-1">
          <p className="text-xs text-[#666666] dark:text-[#AAAAAA]">{card.type}</p>
          <span className="mx-2">—</span>
          <RarityBadge rarity={card.rarity} className="text-xs py-0.5 px-2 h-5" />
        </div>
        <div className="text-xs mt-1 line-clamp-2">
          <CardText text={card.text || ""} />
        </div>
      </div>
    </div>
  );
}

interface CardImageDisplayProps {
  card: Card;
  className?: string;
}

export function CardImageDisplay({ card, className = "w-48 h-64" }: CardImageDisplayProps) {
  const [imgError, setImgError] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const cardBackImage = "https://c1.scryfall.com/file/scryfall-card-backs/large/59/597b79b3-7d77-4261-871a-60dd17403388.jpg";
  
  // Use our improved image fallback system
  const getLargeImageUrl = () => {
    if (card.imageUrl && !imgError) return card.imageUrl;
    
    // If the original image fails, use the enhanced fallback from utils
    return getCardImageFallback(card);
  };

  const toggleEnlarged = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEnlarged(!isEnlarged);
  };

  return (
    <>
      <div className="relative">
        <div 
          className={`${className} rounded-lg overflow-hidden shadow-lg cursor-pointer transition-transform duration-200 hover:scale-105`}
          onClick={toggleEnlarged}
        >
          <img 
            src={getLargeImageUrl()}
            alt={card.name} 
            className="w-full h-full object-contain bg-gray-100 dark:bg-gray-700"
            onError={(e) => {
              e.currentTarget.onerror = null; // Prevent infinite loop
              if (!imgError) {
                setImgError(true);
                e.currentTarget.src = cardBackImage;
              }
            }}
          />
        </div>
      </div>
      
      {/* Enlarged card overlay */}
      {isEnlarged && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={toggleEnlarged}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <div className="w-[192px] h-[256px] sm:w-[288px] sm:h-[384px] md:w-[384px] md:h-[512px] rounded-lg overflow-hidden shadow-2xl">
              <img 
                src={getLargeImageUrl()}
                alt={card.name} 
                className="w-full h-full object-contain bg-gray-100 dark:bg-gray-700"
              />
            </div>
            <button 
              className="absolute -top-4 -right-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2 rounded-full shadow-lg"
              onClick={toggleEnlarged}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
