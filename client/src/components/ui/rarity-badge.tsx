import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

interface RarityBadgeProps {
  rarity: string | undefined | null;
  className?: string;
}

export function RarityBadge({ rarity, className }: RarityBadgeProps) {
  // Default to "Missing" when rarity is missing
  const effectiveRarity = rarity || "Missing";
  
  // Normalize the rarity value for style lookup
  const normalizedRarity = effectiveRarity.toLowerCase();
  
  // Define styles based on rarity
  const styles: Record<string, string> = {
    common: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    uncommon: "bg-blue-200 text-blue-800 hover:bg-blue-300",
    rare: "bg-yellow-200 text-yellow-800 hover:bg-yellow-300",
    mythic: "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600",
    "mythic rare": "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600",
    special: "bg-purple-200 text-purple-800 hover:bg-purple-300",
    bonus: "bg-green-200 text-green-800 hover:bg-green-300",
    legendary: "bg-purple-200 text-purple-800 hover:bg-purple-300",
    timeshifted: "bg-purple-300 text-purple-900 hover:bg-purple-400",
    masterpiece: "bg-gradient-to-r from-yellow-400 to-amber-600 text-white hover:from-yellow-500 hover:to-amber-700",
    missing: "bg-red-100 text-red-800 hover:bg-red-200", // Special style for missing rarity
  };
  
  // Get style based on normalized rarity
  let badgeStyle = "bg-gray-200 text-gray-800 hover:bg-gray-300"; // Default style
  
  // Special handling for mythic rare which could be written either way
  if (normalizedRarity === "mythic rare" || normalizedRarity === "mythicrare") {
    badgeStyle = styles["mythic rare"];
  } 
  // Check if we have a style defined for this rarity
  else if (styles[normalizedRarity]) {
    badgeStyle = styles[normalizedRarity];
  }
  
  // Format the rarity for display (capitalize first letter)
  const formattedRarity = effectiveRarity.charAt(0).toUpperCase() + effectiveRarity.slice(1).toLowerCase();
  
  return (
    <Badge
      className={cn(
        badgeStyle, 
        "font-medium px-2 py-0.5 rounded-md shadow-sm text-xs", 
        className
      )}
      variant="outline"
    >
      {formattedRarity}
    </Badge>
  );
}

export default RarityBadge;