import React from "react";
import { cn } from "@/lib/utils";

type ManaSymbolProps = {
  symbol: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Renders a Magic: The Gathering mana symbol using the Mana font
 * Supports standard mana symbols (WUBRG), colorless (1-20), X, and special symbols
 */
export function ManaSymbol({ symbol, size = "md", className }: ManaSymbolProps) {
  // Process the symbol to match mana-font's requirements
  const processSymbol = (sym: string): string => {
    // Handle special cases
    if (sym === "T") return "tap";
    if (sym === "Q") return "untap";
    if (sym === "W/U" || sym === "WU") return "wu";
    if (sym === "W/B" || sym === "WB") return "wb";
    if (sym === "U/B" || sym === "UB") return "ub";
    if (sym === "U/R" || sym === "UR") return "ur";
    if (sym === "B/R" || sym === "BR") return "br";
    if (sym === "B/G" || sym === "BG") return "bg";
    if (sym === "R/G" || sym === "RG") return "rg";
    if (sym === "R/W" || sym === "RW") return "rw";
    if (sym === "G/W" || sym === "GW") return "gw";
    if (sym === "G/U" || sym === "GU") return "gu";
    
    // Return the symbol as is (the font handles it)
    return sym.toLowerCase();
  };
  
  const processedSymbol = processSymbol(symbol);
  
  // Get size class based on the prop
  const getSizeClass = (): string => {
    switch(size) {
      case "sm": return "text-xs";
      case "md": return "text-base";
      case "lg": return "text-lg";
      default: return "text-base";
    }
  };

  // Render a span with colored background circle for better styling control
  return (
    <span className={cn(
      "inline-flex items-center justify-center",
      "rounded-full",
      getSizeClass(),
      className
    )}>
      <i 
        className={`ms ms-${processedSymbol}`}
        aria-label={`Mana symbol: ${symbol.toUpperCase()}`}
      />
    </span>
  );
}

/**
 * Displays a mana cost string with mana symbols
 * e.g. "{2}{W}{U}" or "2WU" or numeric values
 */
export function ManaCost({ cost, size = "md", className = "" }: { cost: number | string, size?: "sm" | "md" | "lg", className?: string }) {
  if (cost === undefined || cost === null) return null;
  
  // If we have a number, convert it to a string
  const costStr = typeof cost === "number" ? cost.toString() : cost;
  
  // If it's already a formatted string like "{1}{W}{U}", extract the symbols
  if (costStr.includes("{")) {
    const symbols = costStr.match(/\{([^}]+)\}/g)?.map(s => s.replace(/[{}]/g, "")) || [];
    
    return (
      <div className={cn("flex items-center flex-wrap", className)}>
        {symbols.map((symbol, i) => (
          <ManaSymbol key={i} symbol={symbol} size={size} />
        ))}
      </div>
    );
  }
  
  // For a plain number like "3", show it as {3}
  if (/^\d+$/.test(costStr)) {
    return (
      <div className={cn("flex items-center flex-wrap", className)}>
        <ManaSymbol symbol={costStr} size={size} />
      </div>
    );
  }
  
  // For complex costs like "2WU", split into individual symbols
  const colorSymbols = costStr.match(/[WUBRGC]|[0-9]+/g) || [];
  
  return (
    <div className={cn("flex items-center flex-wrap", className)}>
      {colorSymbols.map((symbol, i) => (
        <ManaSymbol key={i} symbol={symbol} size={size} />
      ))}
    </div>
  );
}