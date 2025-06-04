/**
 * Utility functions for handling Magic: The Gathering mana costs
 */

export interface ManaCostInfo {
  minCmc: number;
  maxCmc: number;
  hasVariableCost: boolean;
  displayCmc: string;
}

/**
 * Calculate the actual CMC range for cards with hybrid, Phyrexian, or X costs
 */
export function calculateManaCostInfo(manaCost: string | null | undefined, storedCmc: number | null | undefined): ManaCostInfo {
  if (!manaCost) {
    return {
      minCmc: storedCmc || 0,
      maxCmc: storedCmc || 0,
      hasVariableCost: false,
      displayCmc: (storedCmc || 0).toString()
    };
  }

  let minCmc = 0;
  let maxCmc = 0;
  let hasVariableCost = false;

  // Handle X costs
  if (manaCost.includes('{X}')) {
    hasVariableCost = true;
    // For X spells, calculate base cost without X
    const baseManaCost = manaCost.replace(/\{X\}/g, '');
    const baseCmc = calculateBaseCmc(baseManaCost);
    return {
      minCmc: baseCmc,
      maxCmc: baseCmc, // X can be any amount
      hasVariableCost: true,
      displayCmc: baseCmc > 0 ? `X+${baseCmc}` : 'X'
    };
  }

  // Handle hybrid mana costs like {2/G}
  const hybridMatches = manaCost.match(/\{(\d+)\/([WUBRG])\}/g);
  if (hybridMatches) {
    hasVariableCost = true;
    let hybridMin = 0;
    let hybridMax = 0;
    
    hybridMatches.forEach(match => {
      const [, genericCost, colorCost] = match.match(/\{(\d+)\/([WUBRG])\}/) || [];
      hybridMin += 1; // Colored mana cost
      hybridMax += parseInt(genericCost); // Generic mana cost
    });

    // Calculate non-hybrid costs
    const nonHybridCost = manaCost.replace(/\{(\d+)\/([WUBRG])\}/g, '');
    const baseCmc = calculateBaseCmc(nonHybridCost);
    
    minCmc = baseCmc + hybridMin;
    maxCmc = baseCmc + hybridMax;
    
    if (minCmc === maxCmc) {
      return {
        minCmc,
        maxCmc,
        hasVariableCost: false,
        displayCmc: minCmc.toString()
      };
    }
    
    return {
      minCmc,
      maxCmc,
      hasVariableCost: true,
      displayCmc: `${minCmc}-${maxCmc}`
    };
  }

  // Handle Phyrexian mana costs like {W/P}
  const phyrexianMatches = manaCost.match(/\{([WUBRG])\/P\}/g);
  if (phyrexianMatches) {
    hasVariableCost = true;
    const phyrexianCount = phyrexianMatches.length;
    
    // Calculate non-Phyrexian costs
    const nonPhyrexianCost = manaCost.replace(/\{([WUBRG])\/P\}/g, '');
    const baseCmc = calculateBaseCmc(nonPhyrexianCost);
    
    minCmc = baseCmc; // Can pay 2 life instead of mana
    maxCmc = baseCmc + phyrexianCount; // Or pay the mana
    
    return {
      minCmc,
      maxCmc,
      hasVariableCost: true,
      displayCmc: `${minCmc}-${maxCmc}`
    };
  }

  // Handle hybrid color costs like {W/U}
  const colorHybridMatches = manaCost.match(/\{([WUBRG])\/([WUBRG])\}/g);
  if (colorHybridMatches) {
    // Color hybrids don't change CMC, just payment options
    const totalCmc = calculateBaseCmc(manaCost);
    return {
      minCmc: totalCmc,
      maxCmc: totalCmc,
      hasVariableCost: false,
      displayCmc: totalCmc.toString()
    };
  }

  // Standard mana cost
  const totalCmc = calculateBaseCmc(manaCost);
  return {
    minCmc: totalCmc,
    maxCmc: totalCmc,
    hasVariableCost: false,
    displayCmc: totalCmc.toString()
  };
}

/**
 * Calculate base CMC from a mana cost string
 */
function calculateBaseCmc(manaCost: string): number {
  if (!manaCost) return 0;
  
  let cmc = 0;
  
  // Match all mana symbols
  const symbols = manaCost.match(/\{[^}]+\}/g) || [];
  
  symbols.forEach(symbol => {
    const content = symbol.slice(1, -1); // Remove { }
    
    // Generic mana cost
    if (/^\d+$/.test(content)) {
      cmc += parseInt(content);
    }
    // Colored mana (W, U, B, R, G)
    else if (/^[WUBRG]$/.test(content)) {
      cmc += 1;
    }
    // Colorless mana
    else if (content === 'C') {
      cmc += 1;
    }
    // Snow mana
    else if (content === 'S') {
      cmc += 1;
    }
    // Hybrid color/color (already handled above)
    else if (/^[WUBRG]\/[WUBRG]$/.test(content)) {
      cmc += 1;
    }
    // Skip X, hybrid, and Phyrexian as they're handled separately
  });
  
  return cmc;
}

/**
 * Format mana cost for display with proper symbols
 */
export function formatManaCostDisplay(manaCost: string | null | undefined): string {
  if (!manaCost) return '';
  
  // Convert mana symbols to a more readable format
  return manaCost
    .replace(/\{(\d+)\}/g, '($1)')
    .replace(/\{([WUBRG])\}/g, '($1)')
    .replace(/\{([WUBRG])\/([WUBRG])\}/g, '($1/$2)')
    .replace(/\{(\d+)\/([WUBRG])\}/g, '($1/$2)')
    .replace(/\{([WUBRG])\/P\}/g, '($1/P)')
    .replace(/\{X\}/g, '(X)')
    .replace(/\{C\}/g, '(C)')
    .replace(/\{S\}/g, '(S)');
}