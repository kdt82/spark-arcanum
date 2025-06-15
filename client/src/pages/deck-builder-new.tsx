import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Helmet } from "react-helmet";
import { AlertCircle, RefreshCw, Save, Plus, Minus, PlusCircle, Layers, Download, SquareStack, MoveHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

// Define format types and their requirements
interface FormatRequirements {
  name: string;
  deckSize: number;
  maxCopies: number;
  requiresCommander: boolean;
  description: string;
}

// Card interface for use in the deck
interface DeckCard {
  id: string;
  name: string;
  manaCost?: string;
  type: string;
  imageUrl?: string;
  quantity: number;
}

// Categorized deck cards
interface DeckCardsByType {
  commander: DeckCard[];
  creatures: DeckCard[];
  spells: DeckCard[];
  artifacts: DeckCard[];
  enchantments: DeckCard[];
  planeswalkers: DeckCard[];
  lands: DeckCard[];
  sideboard: DeckCard[];
}

export default function DeckBuilderPage() {
  // Format selection
  const [formats] = useState<string[]>([
    "Standard", 
    "Modern", 
    "Legacy", 
    "Vintage", 
    "Commander", 
    "Pioneer", 
    "Brawl"
  ]);
  const [selectedFormat, setSelectedFormat] = useState<string>("Standard");
  const [formatReqs, setFormatReqs] = useState<FormatRequirements>({
    name: "Standard",
    deckSize: 60,
    maxCopies: 4,
    requiresCommander: false,
    description: "Standard format requires a minimum of 60 cards, with a maximum of 4 copies of any card except basic lands."
  });
  
  // Deck metadata
  const [deckName, setDeckName] = useState<string>("");
  const [deckDescription, setDeckDescription] = useState<string>("");
  
  // Commander (for Commander/Brawl formats)
  const [commander, setCommander] = useState<DeckCard | null>(null);
  
  // Card search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // Deck cards
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [sideboardCards, setSideboardCards] = useState<DeckCard[]>([]);
  const [isBestOfThree, setIsBestOfThree] = useState<boolean>(false);
  const [groupedCards, setGroupedCards] = useState<DeckCardsByType>({
    commander: [],
    creatures: [],
    spells: [],
    artifacts: [],
    enchantments: [],
    planeswalkers: [],
    lands: [],
    sideboard: []
  });
  
  // Drag and drop refs
  const dragCard = useRef<DeckCard | null>(null);
  const dragNode = useRef<HTMLElement | null>(null);
  const dragArea = useRef<'maindeck' | 'sideboard' | null>(null);
  
  const { toast } = useToast();
  
  // Effects
  useEffect(() => {
    // Update format requirements when format changes
    switch (selectedFormat) {
      case "Standard":
        setFormatReqs({
          name: "Standard",
          deckSize: 60,
          maxCopies: 4,
          requiresCommander: false,
          description: "Standard format requires a minimum of 60 cards, with a maximum of 4 copies of any card except basic lands."
        });
        break;
      case "Modern":
        setFormatReqs({
          name: "Modern",
          deckSize: 60,
          maxCopies: 4,
          requiresCommander: false,
          description: "Modern format requires a minimum of 60 cards, with a maximum of 4 copies of any card except basic lands."
        });
        break;
      case "Legacy":
        setFormatReqs({
          name: "Legacy",
          deckSize: 60,
          maxCopies: 4,
          requiresCommander: false,
          description: "Legacy format requires a minimum of 60 cards, with a maximum of 4 copies of any card except basic lands."
        });
        break;
      case "Vintage":
        setFormatReqs({
          name: "Vintage",
          deckSize: 60,
          maxCopies: 4,
          requiresCommander: false,
          description: "Vintage format requires a minimum of 60 cards, with a maximum of 4 copies of any card except basic lands."
        });
        break;
      case "Commander":
        setFormatReqs({
          name: "Commander",
          deckSize: 100,
          maxCopies: 1,
          requiresCommander: true,
          description: "Commander format requires exactly 100 cards, including your Commander. You can only have 1 copy of each card except for basic lands."
        });
        break;
      case "Pioneer":
        setFormatReqs({
          name: "Pioneer",
          deckSize: 60,
          maxCopies: 4,
          requiresCommander: false,
          description: "Pioneer format requires a minimum of 60 cards, with a maximum of 4 copies of any card except basic lands."
        });
        break;
      case "Brawl":
        setFormatReqs({
          name: "Brawl",
          deckSize: 60,
          maxCopies: 1,
          requiresCommander: true,
          description: "Brawl format requires exactly 60 cards, including your Commander. You can only have 1 copy of each card except for basic lands."
        });
        break;
      default:
        // Default to Standard
        setFormatReqs({
          name: "Standard",
          deckSize: 60,
          maxCopies: 4,
          requiresCommander: false,
          description: "Standard format requires a minimum of 60 cards, with a maximum of 4 copies of any card except basic lands."
        });
    }
  }, [selectedFormat]);
  
  useEffect(() => {
    // Group cards by type for display
    const grouped: DeckCardsByType = {
      commander: commander ? [commander] : [],
      creatures: [],
      spells: [],
      artifacts: [],
      enchantments: [],
      planeswalkers: [],
      lands: [],
      sideboard: []
    };
    
    // Process main deck cards
    deckCards.forEach(card => {
      if (card.type.toLowerCase().includes("creature")) {
        grouped.creatures.push(card);
      } else if (card.type.toLowerCase().includes("artifact")) {
        grouped.artifacts.push(card);
      } else if (card.type.toLowerCase().includes("enchantment")) {
        grouped.enchantments.push(card);
      } else if (card.type.toLowerCase().includes("planeswalker")) {
        grouped.planeswalkers.push(card);
      } else if (card.type.toLowerCase().includes("land")) {
        grouped.lands.push(card);
      } else if (card.type.toLowerCase().includes("instant") || card.type.toLowerCase().includes("sorcery")) {
        grouped.spells.push(card);
      }
    });
    
    // Add sideboard cards
    if (isBestOfThree) {
      grouped.sideboard = sideboardCards;
    }
    
    setGroupedCards(grouped);
  }, [deckCards, sideboardCards, commander, isBestOfThree]);
  
  // Calculate deck stats
  const totalCards = deckCards.reduce((total, card) => total + card.quantity, 0) + (commander ? 1 : 0);
  const remainingCards = formatReqs.deckSize - totalCards;
  const totalSideboardCards = sideboardCards.reduce((total, card) => total + card.quantity, 0);
  
  // Format legality check
  const isLegal = remainingCards <= 0 && (!formatReqs.requiresCommander || commander);
  const sideboardIsLegal = !isBestOfThree || totalSideboardCards <= 15;
  
  // Basic land definitions
  const basicLands = [
    {
      id: "plains",
      name: "Plains",
      type: "Basic Land — Plains",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=540018&type=card",
    },
    {
      id: "island",
      name: "Island",
      type: "Basic Land — Island",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=540020&type=card",
    },
    {
      id: "swamp",
      name: "Swamp",
      type: "Basic Land — Swamp",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=540022&type=card",
    },
    {
      id: "mountain",
      name: "Mountain",
      type: "Basic Land — Mountain",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=540024&type=card",
    },
    {
      id: "forest",
      name: "Forest",
      type: "Basic Land — Forest",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=540026&type=card",
    },
    {
      id: "snow-covered-plains",
      name: "Snow-Covered Plains",
      type: "Basic Snow Land — Plains",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=503627&type=card",
    },
    {
      id: "snow-covered-island",
      name: "Snow-Covered Island",
      type: "Basic Snow Land — Island",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=503625&type=card",
    },
    {
      id: "snow-covered-swamp",
      name: "Snow-Covered Swamp",
      type: "Basic Snow Land — Swamp",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=503629&type=card",
    },
    {
      id: "snow-covered-mountain",
      name: "Snow-Covered Mountain",
      type: "Basic Snow Land — Mountain",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=503626&type=card",
    },
    {
      id: "snow-covered-forest",
      name: "Snow-Covered Forest",
      type: "Basic Snow Land — Forest",
      imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=503624&type=card",
    }
  ];
  
  // Tarkir Dragonstorm (TDM/YTDM) popular cards
  const tarkirDragonstormCards = [
    {
      id: "hamza-might-of-the-yathan-ytdm",
      name: "Hamza, Might of the Yathan",
      type: "Legendary Creature — Dragon Monk",
      manaCost: "{3}{G}{W}",
      imageUrl: "https://cards.scryfall.io/large/front/0/1/01a2d891-6373-4626-a0aa-9a8b5826e994.jpg",
      set: "YTDM"
    },
    {
      id: "ancient-dragonstorm-ytdm",
      name: "Ancient Dragonstorm",
      type: "Sorcery",
      manaCost: "{8}{R}",
      imageUrl: "https://cards.scryfall.io/large/front/b/c/bc2d3412-afc0-4efa-a3a6-24f8536d31f8.jpg",
      set: "YTDM"
    },
    {
      id: "crux-of-fate-dragonstorm-ytdm",
      name: "Crux of Fate, Dragonstorm",
      type: "Sorcery",
      manaCost: "{3}{B}{B}",
      imageUrl: "https://cards.scryfall.io/large/front/1/1/11721b88-2654-482c-b9d4-80e54efdbf63.jpg",
      set: "YTDM"
    },
    {
      id: "dromoka-the-unwavering-ytdm",
      name: "Dromoka, the Unwavering",
      type: "Legendary Creature — Elder Dragon",
      manaCost: "{4}{G}{W}",
      imageUrl: "https://cards.scryfall.io/large/front/f/a/fa6effc7-3a92-40a5-a4aa-4ff61c0b4a30.jpg",
      set: "YTDM"
    },
    {
      id: "ojutai-dragonstorm-ytdm",
      name: "Ojutai, Dragonstorm",
      type: "Legendary Creature — Elder Dragon",
      manaCost: "{3}{W}{U}",
      imageUrl: "https://cards.scryfall.io/large/front/2/4/2431ed8a-531d-4794-972e-7c6d7ca896b7.jpg",
      set: "YTDM"
    }
  ];

  // Check if search query matches any basic land or special Tarkir Dragonstorm cards
  const getMatchingSpecialCards = (query: string) => {
    if (!query) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    
    // Match basic lands
    const matchingLands = basicLands.filter(land => 
      land.name.toLowerCase().includes(lowerQuery) || 
      land.type.toLowerCase().includes(lowerQuery)
    );
    
    // Match Tarkir Dragonstorm cards
    const matchingTarkirCards = tarkirDragonstormCards.filter(card => 
      card.name.toLowerCase().includes(lowerQuery) || 
      card.type.toLowerCase().includes(lowerQuery)
    );
    
    // Combine results
    return [...matchingLands, ...matchingTarkirCards];
  };

  // Search for cards
  const searchCards = async () => {
    if (!searchQuery.trim()) {
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Check if the search matches special cards (basic lands or Tarkir Dragonstorm)
      const matchingSpecialCards = getMatchingSpecialCards(searchQuery);
      
      // Standard search for cards in our database
      const response = await fetch(`/api/cards/search?q=${encodeURIComponent(searchQuery)}&include_all_sets=true`);
      
      if (!response.ok) {
        throw new Error("Failed to search cards");
      }
      
      let data = await response.json();
      
      // Add matching special cards to the results if they're not already included
      if (matchingSpecialCards.length > 0) {
        // Filter out any duplicates that might already be in the results
        const existingCardIds = new Set(data.map((card: any) => card.id));
        const uniqueSpecialCards = matchingSpecialCards.filter(card => !existingCardIds.has(card.id));
        
        // Combine the results - put our special cards at the top for better visibility
        data = [...uniqueSpecialCards, ...data];
        
        // Log for debugging
        if (uniqueSpecialCards.length > 0) {
          console.log(`Added ${uniqueSpecialCards.length} special cards to results: `, 
            uniqueSpecialCards.map(c => c.name).join(", "));
        }
      }
      
      // Direct search handling for "Hamza, Might of the Yathan"
      if (searchQuery.toLowerCase().includes("hamza")) {
        // Check if Hamza is already in the results
        const hamzaExists = data.some((card: any) => 
          card.name.toLowerCase().includes("hamza") && card.name.toLowerCase().includes("yathan")
        );
        
        if (!hamzaExists) {
          // Add Hamza directly to the results
          const hamzaCard = {
            id: "hamza-might-of-the-yathan-ytdm",
            name: "Hamza, Might of the Yathan",
            type: "Legendary Creature — Dragon Monk",
            manaCost: "{3}{G}{W}",
            imageUrl: "https://cards.scryfall.io/large/front/0/1/01a2d891-6373-4626-a0aa-9a8b5826e994.jpg",
            set: "YTDM"
          };
          
          data = [hamzaCard, ...data];
          console.log("Added Hamza, Might of the Yathan directly to search results");
        }
      }
      
      setSearchResults(data);
      
      if (data.length === 0) {
        toast({
          title: "No results found",
          description: "Try a different search query",
        });
      }
    } catch (err) {
      console.error("Error searching cards:", err);
      toast({
        title: "Error",
        description: "Failed to search cards",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Add card to deck
  const addCardToDeck = (cardData: any, toSideboard: boolean = false) => {
    const newCard: DeckCard = {
      id: cardData.id,
      name: cardData.name,
      manaCost: cardData.manaCost,
      type: cardData.type,
      imageUrl: cardData.imageUrl,
      quantity: 1
    };
    
    // Check if we're adding to sideboard or main deck
    if (toSideboard && isBestOfThree) {
      // Check if card already exists in sideboard
      const existingCardIndex = sideboardCards.findIndex(c => c.id === newCard.id);
      
      if (existingCardIndex >= 0) {
        // Card already exists, increase quantity if under copy limit
        const existingCard = sideboardCards[existingCardIndex];
        
        if (existingCard.quantity < formatReqs.maxCopies) {
          const updatedCards = [...sideboardCards];
          updatedCards[existingCardIndex] = {
            ...existingCard,
            quantity: existingCard.quantity + 1
          };
          
          setSideboardCards(updatedCards);
          
          toast({
            title: "Card added to sideboard",
            description: `Added ${newCard.name} to your sideboard (${existingCard.quantity + 1}x)`,
          });
        } else {
          toast({
            title: "Copy limit reached",
            description: `You can only have ${formatReqs.maxCopies} copies of ${newCard.name}`,
            variant: "destructive",
          });
        }
      } else {
        // New card, add to sideboard
        setSideboardCards([...sideboardCards, newCard]);
        
        toast({
          title: "Card added to sideboard",
          description: `Added ${newCard.name} to your sideboard`,
        });
      }
      
      return;
    }
    
    // Check if card already exists in deck
    const existingCardIndex = deckCards.findIndex(c => c.id === newCard.id);
    
    if (existingCardIndex >= 0) {
      // Card already exists, increase quantity if under copy limit
      const existingCard = deckCards[existingCardIndex];
      
      if (existingCard.quantity < formatReqs.maxCopies) {
        const updatedCards = [...deckCards];
        updatedCards[existingCardIndex] = {
          ...existingCard,
          quantity: existingCard.quantity + 1
        };
        
        setDeckCards(updatedCards);
        
        toast({
          title: "Card added",
          description: `Added ${newCard.name} to your deck (${existingCard.quantity + 1}x)`,
        });
      } else {
        toast({
          title: "Copy limit reached",
          description: `You can only have ${formatReqs.maxCopies} copies of ${newCard.name}`,
          variant: "destructive",
        });
      }
    } else {
      // New card, add to deck
      setDeckCards([...deckCards, newCard]);
      
      toast({
        title: "Card added",
        description: `Added ${newCard.name} to your deck`,
      });
    }
  };
  
  // Remove card from deck
  const removeCardFromDeck = (cardId: string, fromSideboard: boolean = false) => {
    if (fromSideboard) {
      const cardIndex = sideboardCards.findIndex(c => c.id === cardId);
      
      if (cardIndex >= 0) {
        const card = sideboardCards[cardIndex];
        
        if (card.quantity > 1) {
          // Reduce quantity
          const updatedCards = [...sideboardCards];
          updatedCards[cardIndex] = {
            ...card,
            quantity: card.quantity - 1
          };
          
          setSideboardCards(updatedCards);
          
          toast({
            title: "Card removed from sideboard",
            description: `Removed one copy of ${card.name} from your sideboard`,
          });
        } else {
          // Remove card completely
          setSideboardCards(sideboardCards.filter(c => c.id !== cardId));
          
          toast({
            title: "Card removed from sideboard",
            description: `Removed ${card.name} from your sideboard`,
          });
        }
      }
      
      return;
    }
    
    const cardIndex = deckCards.findIndex(c => c.id === cardId);
    
    if (cardIndex >= 0) {
      const card = deckCards[cardIndex];
      
      if (card.quantity > 1) {
        // Reduce quantity
        const updatedCards = [...deckCards];
        updatedCards[cardIndex] = {
          ...card,
          quantity: card.quantity - 1
        };
        
        setDeckCards(updatedCards);
        
        toast({
          title: "Card removed",
          description: `Removed one copy of ${card.name} from your deck`,
        });
      } else {
        // Remove card completely
        setDeckCards(deckCards.filter(c => c.id !== cardId));
        
        toast({
          title: "Card removed",
          description: `Removed ${card.name} from your deck`,
        });
      }
    }
  };
  
  // Set a card as commander
  const setCardAsCommander = (cardData: any) => {
    const newCommander: DeckCard = {
      id: cardData.id,
      name: cardData.name,
      manaCost: cardData.manaCost,
      type: cardData.type,
      imageUrl: cardData.imageUrl,
      quantity: 1
    };
    
    setCommander(newCommander);
    
    toast({
      title: "Commander set",
      description: `${cardData.name} is now your commander`,
    });
  };
  
  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, card: DeckCard, fromArea: 'maindeck' | 'sideboard') => {
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.setData('fromArea', fromArea);
    const target = e.target as HTMLElement;
    dragNode.current = target;
    dragCard.current = card;
    dragArea.current = fromArea;
    
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.classList.add('opacity-50');
      }
    }, 0);
  };
  
  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.classList.remove('opacity-50');
    }
    dragNode.current = null;
    dragCard.current = null;
    dragArea.current = null;
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };
  
  const handleDrop = (e: React.DragEvent, toArea: 'maindeck' | 'sideboard') => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const fromArea = e.dataTransfer.getData('fromArea');
    
    // Don't do anything if dropped in the same area
    if (fromArea === toArea) {
      return;
    }
    
    // Move card between maindeck and sideboard
    if (fromArea === 'maindeck' && toArea === 'sideboard') {
      // Find card in main deck
      const cardToMove = deckCards.find(c => c.id === cardId);
      if (cardToMove) {
        // Add to sideboard
        const existingSideboardCard = sideboardCards.find(c => c.id === cardId);
        if (existingSideboardCard) {
          setSideboardCards(sideboardCards.map(c => 
            c.id === cardId 
              ? { ...c, quantity: c.quantity + cardToMove.quantity } 
              : c
          ));
        } else {
          setSideboardCards([...sideboardCards, { ...cardToMove }]);
        }
        
        // Remove from main deck
        setDeckCards(deckCards.filter(c => c.id !== cardId));
        
        toast({
          title: "Card moved",
          description: `Moved ${cardToMove.name} to sideboard`,
        });
      }
    } else if (fromArea === 'sideboard' && toArea === 'maindeck') {
      // Find card in sideboard
      const cardToMove = sideboardCards.find(c => c.id === cardId);
      if (cardToMove) {
        // Add to main deck
        const existingMainDeckCard = deckCards.find(c => c.id === cardId);
        if (existingMainDeckCard) {
          setDeckCards(deckCards.map(c => 
            c.id === cardId 
              ? { ...c, quantity: c.quantity + cardToMove.quantity } 
              : c
          ));
        } else {
          setDeckCards([...deckCards, { ...cardToMove }]);
        }
        
        // Remove from sideboard
        setSideboardCards(sideboardCards.filter(c => c.id !== cardId));
        
        toast({
          title: "Card moved",
          description: `Moved ${cardToMove.name} to main deck`,
        });
      }
    }
  };
  
  // Export deck to text format
  const exportDeck = () => {
    let deckText = `// ${deckName}\n`;
    if (deckDescription) {
      deckText += `// ${deckDescription}\n`;
    }
    deckText += `// Format: ${selectedFormat}\n\n`;
    
    // Add commander if present
    if (commander) {
      deckText += `// Commander\n1 ${commander.name}\n\n`;
    }
    
    // Add main deck cards by type
    if (groupedCards.creatures.length > 0) {
      deckText += "// Creatures\n";
      groupedCards.creatures.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
      deckText += "\n";
    }
    
    if (groupedCards.spells.length > 0) {
      deckText += "// Spells\n";
      groupedCards.spells.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
      deckText += "\n";
    }
    
    if (groupedCards.artifacts.length > 0) {
      deckText += "// Artifacts\n";
      groupedCards.artifacts.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
      deckText += "\n";
    }
    
    if (groupedCards.enchantments.length > 0) {
      deckText += "// Enchantments\n";
      groupedCards.enchantments.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
      deckText += "\n";
    }
    
    if (groupedCards.planeswalkers.length > 0) {
      deckText += "// Planeswalkers\n";
      groupedCards.planeswalkers.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
      deckText += "\n";
    }
    
    if (groupedCards.lands.length > 0) {
      deckText += "// Lands\n";
      groupedCards.lands.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
      deckText += "\n";
    }
    
    // Add sideboard if present
    if (isBestOfThree && groupedCards.sideboard.length > 0) {
      deckText += "// Sideboard\n";
      groupedCards.sideboard.forEach(card => {
        deckText += `SB: ${card.quantity} ${card.name}\n`;
      });
    }
    
    // Create and download file
    const blob = new Blob([deckText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deckName || "deck"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Deck exported",
      description: "Deck list has been exported as a text file",
    });
  };
  
  return (
    <>
      <Helmet>
        <title>Deck Builder - Spark Arcanum</title>
        <meta name="description" content="Build your Magic: The Gathering deck with drag-and-drop functionality" />
      </Helmet>
      
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-2 font-heading text-center bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
          Deck Builder
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Build your Magic: The Gathering deck with drag-and-drop functionality
        </p>
        
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {/* Deck Settings Panel */}
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deck Settings</CardTitle>
                  <CardDescription>Configure your deck parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="deck-name">Deck Name</Label>
                    <Input 
                      id="deck-name" 
                      value={deckName}
                      onChange={(e) => setDeckName(e.target.value)}
                      placeholder="Enter deck name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="deck-description">Deck Description</Label>
                    <Textarea 
                      id="deck-description" 
                      value={deckDescription}
                      onChange={(e) => setDeckDescription(e.target.value)}
                      placeholder="Enter deck description"
                      className="h-20"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="format">Format</Label>
                    <Select
                      value={selectedFormat}
                      onValueChange={setSelectedFormat}
                    >
                      <SelectTrigger id="format">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {formats.map((format) => (
                          <SelectItem key={format} value={format}>
                            {format}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatReqs.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="best-of-three" 
                      checked={isBestOfThree}
                      onCheckedChange={setIsBestOfThree}
                    />
                    <Label htmlFor="best-of-three">Best of 3 (Enable Sideboard)</Label>
                  </div>
                  
                  {isBestOfThree && (
                    <div className="rounded-md border border-border p-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm">Sideboard Cards: <span className={totalSideboardCards > 15 ? "text-red-500 font-bold" : ""}>{totalSideboardCards}/15</span></p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col space-y-2">
                  <div className="rounded-md border border-border p-3 w-full">
                    <div className="flex justify-between items-center">
                      <p className="text-sm">Deck Size: <span className={remainingCards > 0 ? "text-red-500 font-bold" : ""}>{totalCards}/{formatReqs.deckSize}</span></p>
                      <p className="text-sm">Cards needed: <span className={remainingCards > 0 ? "text-red-500 font-bold" : "text-green-500 font-bold"}>{Math.max(0, remainingCards)}</span></p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 w-full">
                    <Button 
                      className="flex-1" 
                      onClick={exportDeck}
                      disabled={!isLegal || !sideboardIsLegal}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Deck
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setDeckCards([]);
                        setSideboardCards([]);
                        setCommander(null);
                        setDeckName("");
                        setDeckDescription("");
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </CardFooter>
              </Card>
              
              {/* Card Search */}
              <Card>
                <CardHeader>
                  <CardTitle>Card Search</CardTitle>
                  <CardDescription>Search for cards to add to your deck</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                    <Input 
                      placeholder="Search cards..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && searchCards()}
                      className="w-full"
                    />
                    <Button onClick={searchCards} disabled={isSearching} className="sm:w-auto w-full">
                      {isSearching ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Search"
                      )}
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[300px] border rounded-md p-2">
                    {searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-muted-foreground">
                          Search for cards to add to your deck
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {searchResults.map((card) => (
                          <div key={card.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-md border">
                            <div className="mb-2 sm:mb-0">
                              <p className="font-medium line-clamp-1">{card.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{card.type}</p>
                            </div>
                            <div className="flex space-x-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addCardToDeck(card)}
                                title="Add to deck"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              
                              {isBestOfThree && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addCardToDeck(card, true)}
                                  title="Add to sideboard"
                                >
                                  <SquareStack className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {formatReqs.requiresCommander && card.type.toLowerCase().includes("legendary") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCardAsCommander(card)}
                                  title="Set as commander"
                                >
                                  <Layers className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            {/* Deck Display Panel */}
            <div className="md:col-span-2 space-y-6">
              {/* Main Deck */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Main Deck ({totalCards} cards)</span>
                    {!isLegal && (
                      <Alert variant="destructive" className="p-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <AlertDescription>
                          {formatReqs.requiresCommander && !commander
                            ? "You need to select a commander"
                            : `You need ${remainingCards} more cards`}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="min-h-[300px] border rounded-md p-4"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'maindeck')}
                  >
                    {/* Commander Section */}
                    {formatReqs.requiresCommander && (
                      <div className="mb-4">
                        <h3 className="text-lg font-bold mb-2">Commander</h3>
                        {commander ? (
                          <div 
                            className="p-2 rounded-md border flex justify-between items-center"
                            draggable={false}
                          >
                            <div className="flex items-center">
                              {commander.imageUrl && (
                                <img 
                                  src={commander.imageUrl} 
                                  alt={commander.name}
                                  className="w-10 h-10 object-cover rounded-md mr-2"
                                />
                              )}
                              <div>
                                <p className="font-medium">{commander.name}</p>
                                <p className="text-xs text-muted-foreground">{commander.type}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCommander(null)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="p-4 rounded-md border border-dashed flex items-center justify-center">
                            <p className="text-muted-foreground">Search for a legendary creature to use as your commander</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Main Deck Cards by Type */}
                    <div className="space-y-4">
                      {/* Creatures */}
                      {groupedCards.creatures.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-2">Creatures ({groupedCards.creatures.reduce((sum, card) => sum + card.quantity, 0)})</h3>
                          <div className="space-y-2">
                            {groupedCards.creatures.map((card) => (
                              <div 
                                key={card.id} 
                                className="p-2 rounded-md border flex justify-between items-center"
                                draggable={isBestOfThree}
                                onDragStart={(e) => handleDragStart(e, card, 'maindeck')}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="flex items-center">
                                  {card.imageUrl && (
                                    <img 
                                      src={card.imageUrl} 
                                      alt={card.name}
                                      className="w-10 h-10 object-cover rounded-md mr-2"
                                    />
                                  )}
                                  <div>
                                    <div className="flex items-center">
                                      <p className="font-medium">{card.name}</p>
                                      <span className="text-xs bg-primary/10 rounded-full px-2 ml-2">{card.quantity}x</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{card.type}</p>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl })}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCardFromDeck(card.id)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  {isBestOfThree && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl }, true);
                                        removeCardFromDeck(card.id);
                                      }}
                                      title="Move to sideboard"
                                    >
                                      <MoveHorizontal className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Spells */}
                      {groupedCards.spells.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-2">Spells ({groupedCards.spells.reduce((sum, card) => sum + card.quantity, 0)})</h3>
                          <div className="space-y-2">
                            {groupedCards.spells.map((card) => (
                              <div 
                                key={card.id} 
                                className="p-2 rounded-md border flex justify-between items-center"
                                draggable={isBestOfThree}
                                onDragStart={(e) => handleDragStart(e, card, 'maindeck')}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="flex items-center">
                                  {card.imageUrl && (
                                    <img 
                                      src={card.imageUrl} 
                                      alt={card.name}
                                      className="w-10 h-10 object-cover rounded-md mr-2"
                                    />
                                  )}
                                  <div>
                                    <div className="flex items-center">
                                      <p className="font-medium">{card.name}</p>
                                      <span className="text-xs bg-primary/10 rounded-full px-2 ml-2">{card.quantity}x</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{card.type}</p>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl })}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCardFromDeck(card.id)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  {isBestOfThree && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl }, true);
                                        removeCardFromDeck(card.id);
                                      }}
                                      title="Move to sideboard"
                                    >
                                      <MoveHorizontal className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Artifacts */}
                      {groupedCards.artifacts.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-2">Artifacts ({groupedCards.artifacts.reduce((sum, card) => sum + card.quantity, 0)})</h3>
                          <div className="space-y-2">
                            {groupedCards.artifacts.map((card) => (
                              <div 
                                key={card.id} 
                                className="p-2 rounded-md border flex justify-between items-center"
                                draggable={isBestOfThree}
                                onDragStart={(e) => handleDragStart(e, card, 'maindeck')}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="flex items-center">
                                  {card.imageUrl && (
                                    <img 
                                      src={card.imageUrl} 
                                      alt={card.name}
                                      className="w-10 h-10 object-cover rounded-md mr-2"
                                    />
                                  )}
                                  <div>
                                    <div className="flex items-center">
                                      <p className="font-medium">{card.name}</p>
                                      <span className="text-xs bg-primary/10 rounded-full px-2 ml-2">{card.quantity}x</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{card.type}</p>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl })}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCardFromDeck(card.id)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  {isBestOfThree && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl }, true);
                                        removeCardFromDeck(card.id);
                                      }}
                                      title="Move to sideboard"
                                    >
                                      <MoveHorizontal className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Enchantments */}
                      {groupedCards.enchantments.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-2">Enchantments ({groupedCards.enchantments.reduce((sum, card) => sum + card.quantity, 0)})</h3>
                          <div className="space-y-2">
                            {groupedCards.enchantments.map((card) => (
                              <div 
                                key={card.id} 
                                className="p-2 rounded-md border flex justify-between items-center"
                                draggable={isBestOfThree}
                                onDragStart={(e) => handleDragStart(e, card, 'maindeck')}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="flex items-center">
                                  {card.imageUrl && (
                                    <img 
                                      src={card.imageUrl} 
                                      alt={card.name}
                                      className="w-10 h-10 object-cover rounded-md mr-2"
                                    />
                                  )}
                                  <div>
                                    <div className="flex items-center">
                                      <p className="font-medium">{card.name}</p>
                                      <span className="text-xs bg-primary/10 rounded-full px-2 ml-2">{card.quantity}x</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{card.type}</p>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl })}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCardFromDeck(card.id)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  {isBestOfThree && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl }, true);
                                        removeCardFromDeck(card.id);
                                      }}
                                      title="Move to sideboard"
                                    >
                                      <MoveHorizontal className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Planeswalkers */}
                      {groupedCards.planeswalkers.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-2">Planeswalkers ({groupedCards.planeswalkers.reduce((sum, card) => sum + card.quantity, 0)})</h3>
                          <div className="space-y-2">
                            {groupedCards.planeswalkers.map((card) => (
                              <div 
                                key={card.id} 
                                className="p-2 rounded-md border flex justify-between items-center"
                                draggable={isBestOfThree}
                                onDragStart={(e) => handleDragStart(e, card, 'maindeck')}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="flex items-center">
                                  {card.imageUrl && (
                                    <img 
                                      src={card.imageUrl} 
                                      alt={card.name}
                                      className="w-10 h-10 object-cover rounded-md mr-2"
                                    />
                                  )}
                                  <div>
                                    <div className="flex items-center">
                                      <p className="font-medium">{card.name}</p>
                                      <span className="text-xs bg-primary/10 rounded-full px-2 ml-2">{card.quantity}x</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{card.type}</p>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl })}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCardFromDeck(card.id)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  {isBestOfThree && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl }, true);
                                        removeCardFromDeck(card.id);
                                      }}
                                      title="Move to sideboard"
                                    >
                                      <MoveHorizontal className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Lands */}
                      {groupedCards.lands.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold mb-2">Lands ({groupedCards.lands.reduce((sum, card) => sum + card.quantity, 0)})</h3>
                          <div className="space-y-2">
                            {groupedCards.lands.map((card) => (
                              <div 
                                key={card.id} 
                                className="p-2 rounded-md border flex justify-between items-center"
                                draggable={isBestOfThree}
                                onDragStart={(e) => handleDragStart(e, card, 'maindeck')}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="flex items-center">
                                  {card.imageUrl && (
                                    <img 
                                      src={card.imageUrl} 
                                      alt={card.name}
                                      className="w-10 h-10 object-cover rounded-md mr-2"
                                    />
                                  )}
                                  <div>
                                    <div className="flex items-center">
                                      <p className="font-medium">{card.name}</p>
                                      <span className="text-xs bg-primary/10 rounded-full px-2 ml-2">{card.quantity}x</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{card.type}</p>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl })}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCardFromDeck(card.id)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  {isBestOfThree && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl }, true);
                                        removeCardFromDeck(card.id);
                                      }}
                                      title="Move to sideboard"
                                    >
                                      <MoveHorizontal className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {totalCards === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                          <p className="text-muted-foreground mb-2">Your deck is empty</p>
                          <p className="text-sm text-muted-foreground">
                            Search for cards and add them to your deck
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Sideboard */}
              {isBestOfThree && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Sideboard ({totalSideboardCards} cards)</span>
                      {!sideboardIsLegal && (
                        <Alert variant="destructive" className="p-2">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          <AlertDescription>
                            Sideboard is limited to 15 cards
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="min-h-[200px] border rounded-md p-4"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, 'sideboard')}
                    >
                      {groupedCards.sideboard.length > 0 ? (
                        <div className="space-y-2">
                          {groupedCards.sideboard.map((card) => (
                            <div 
                              key={card.id} 
                              className="p-2 rounded-md border flex justify-between items-center"
                              draggable
                              onDragStart={(e) => handleDragStart(e, card, 'sideboard')}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="flex items-center">
                                {card.imageUrl && (
                                  <img 
                                    src={card.imageUrl} 
                                    alt={card.name}
                                    className="w-10 h-10 object-cover rounded-md mr-2"
                                  />
                                )}
                                <div>
                                  <div className="flex items-center">
                                    <p className="font-medium">{card.name}</p>
                                    <span className="text-xs bg-primary/10 rounded-full px-2 ml-2">{card.quantity}x</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{card.type}</p>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl }, true)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCardFromDeck(card.id, true)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    addCardToDeck({ id: card.id, name: card.name, type: card.type, imageUrl: card.imageUrl });
                                    removeCardFromDeck(card.id, true);
                                  }}
                                  title="Move to main deck"
                                >
                                  <MoveHorizontal className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                          <p className="text-muted-foreground mb-2">Your sideboard is empty</p>
                          <p className="text-sm text-muted-foreground">
                            Drag cards from your main deck to add them to your sideboard, or use the add button in search results
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>How to use drag and drop</AlertTitle>
                <AlertDescription>
                  With Best of 3 enabled, you can drag cards between your main deck and sideboard to quickly move them.
                  This makes it easy to prepare different configurations for games 2 and 3 of a match.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}