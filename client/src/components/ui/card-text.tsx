import React from "react";
import { ManaSymbol } from "./mana-symbol";

interface CardTextProps {
  text: string;
  className?: string;
}

export function CardText({ text, className = "" }: CardTextProps) {
  if (!text) return null;
  
  // Process the card text to replace mana symbols with the ManaSymbol component
  const processCardText = (text: string) => {
    // Split text on mana symbols {X}, {R}, {1}, etc.
    const parts = text.split(/(\{[^}]+\})/g);
    
    return parts.map((part, index) => {
      // Check if this part is a mana symbol
      const manaMatch = part.match(/^\{([^}]+)\}$/);
      
      if (manaMatch) {
        // This is a mana symbol, render it using ManaSymbol component
        const symbol = manaMatch[1];
        return <ManaSymbol key={index} symbol={symbol} size="sm" />;
      } else {
        // This is regular text
        // Further split by line breaks and add proper paragraph spacing
        const lines = part.split("\n");
        
        return (
          <span key={index}>
            {lines.map((line, lineIndex) => (
              <span key={`line-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      }
    });
  };
  
  return (
    <div className={`card-text ${className}`}>
      {processCardText(text)}
    </div>
  );
}