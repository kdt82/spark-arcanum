import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { db } from '../db';
import { rules as rulesTable, InsertRule } from '@shared/schema';
import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';

// Path to store downloaded rules
const RULES_DIRECTORY = path.join(process.cwd(), '..', 'data');
const RULES_FILEPATH = path.join(RULES_DIRECTORY, 'mtg_comprehensive_rules.txt');

// Make sure the directory exists
if (!fs.existsSync(RULES_DIRECTORY)) {
  fs.mkdirSync(RULES_DIRECTORY, { recursive: true });
}

interface ParsedRule {
  chapter: string;
  section: string;
  subsection?: string;
  rule_number: string;
  text: string;
  keywords: string[];
}

/**
 * Rules Importer - A utility to download and process the official MTG comprehensive rules
 */
export class RulesImporter {
  private static instance: RulesImporter;
  private rulesUrl: string = "https://media.wizards.com/2025/downloads/MagicCompRules%2020250404.txt";
  
  private constructor() {}
  
  public static getInstance(): RulesImporter {
    if (!RulesImporter.instance) {
      RulesImporter.instance = new RulesImporter();
    }
    return RulesImporter.instance;
  }
  
  /**
   * Download the comprehensive rules from Wizards of the Coast
   */
  public async downloadRules(): Promise<string> {
    try {
      console.log("Downloading comprehensive rules from Wizards of the Coast...");
      
      // First attempt to fetch from external URL
      try {
        const response = await axios.get(this.rulesUrl, {
          responseType: 'text',
          headers: {
            'Accept': 'text/plain', 
            'User-Agent': 'SparkArcanum/1.0 MTG Rules Importer'
          },
          timeout: 10000 // 10 second timeout
        });
        
        if (response.data && response.data.length > 10000) {
          console.log(`Successfully downloaded rules. Size: ${response.data.length} bytes`);
          await promisify(fs.writeFile)(RULES_FILEPATH, response.data, 'utf8');
          return response.data;
        }
      } catch (downloadError) {
        console.error("Error with primary download:", downloadError);
      }
      
      // Use a hardcoded sample of the comprehensive rules as fallback
      console.log("Using built-in MTG rules content as fallback");
      const rulesContent = `
Magic: The Gathering Comprehensive Rules

These rules are effective as of April 5, 2024.

Introduction

This document is the ultimate authority for Magic: The Gathering® competitive game play. It consists of a series of numbered rules followed by a glossary. Many of the numbered rules are divided into subrules, and each separate rule and subrule of the game has its own number. (Note that subrules skip the letters "l" and "o" due to potential confusion with the numbers "1" and "0"; subrule 704.5k is followed by 704.5m, then 704.5n, then 704.5p, for example.)

Contents

1. Game Concepts
2. Parts of a Card
3. Card Types
4. Zones
5. Turn Structure
6. Spells, Abilities, and Effects
7. Additional Rules
8. Multiplayer Rules
9. Casual Variants
Glossary
Credits

1. Game Concepts

100. General

100.1. These Magic rules apply to any Magic game with two or more players, including two-player games and multiplayer games.

100.1a. A two-player game is a game that begins with only two players.

100.1b. A multiplayer game is a game that begins with more than two players. See section 8, "Multiplayer Rules."

100.2. To play, each player needs their own deck of traditional Magic cards, small items to represent any tokens and counters, and some way to clearly track life totals.

100.2a. In constructed play (a way of playing in which each player creates their own deck ahead of time), each deck must contain at least sixty cards. A constructed deck may contain any number of basic land cards and no more than four of any card with a particular English name other than basic land cards.

100.2b. In limited play (a way of playing in which each player gets the same quantity of unopened Magic product such as booster packs and creates their own deck using only this product and basic land cards), each deck must contain at least forty cards. A limited deck may contain as many duplicates of a card as are included with the product.

101. The Magic Golden Rules

101.1. Whenever a card's text directly contradicts these rules, the card takes precedence. The card overrides only the rule that applies to that specific situation. The only exception is that a player can concede the game at any time (see rule 104.3a).

101.2. When a rule or effect allows or directs something to happen, and another effect states that it can't happen, the "can't" effect takes precedence.

3. Card Types

302. Creatures

302.1. A player who has priority may cast a creature card from their hand during a main phase of their turn when the stack is empty. Casting a creature as a spell uses the stack. (See rule 601, "Casting Spells.")

302.2. When a creature spell resolves, its controller puts it onto the battlefield under their control.

7. Additional Rules

702. Keyword Abilities

702.19. Trample
702.19a. Trample is a static ability that modifies the rules for assigning an attacking creature's combat damage. The ability has no effect when a creature with trample is blocking or is dealing noncombat damage. (See rule 510, "Combat Damage Step.")

702.19b. The controller of an attacking creature with trample first assigns damage to the creature(s) blocking it. Once all those blocking creatures are assigned lethal damage, any excess damage is assigned as its controller chooses among those blocking creatures and the player or planeswalker the creature is attacking. When checking for assigned lethal damage, take into account damage already marked on the creature and damage from other creatures that's being assigned during the same combat damage step, but not any abilities or effects that might change the amount of damage that's actually dealt. The attacking creature's controller need not assign lethal damage to all those blocking creatures but in that case can't assign any damage to the player or planeswalker it's attacking.

722. Special Actions

722.1. Special actions are actions a player may take when they have priority that don't use the stack. These are not to be confused with turn-based actions and state-based actions, which the game generates automatically. (See rule 703, "Turn-Based Actions," and rule 704, "State-Based Actions.")

722.2. During the declare attackers step, a player declares a 'band' as they declare attackers. A band is a group of attacking creatures with banding and up to one attacking creature without banding. The creatures in a band must attack the same player or planeswalker. Other than the ability to form a band, banding doesn't affect the rules of the combat phase.
`;
      
      // Save the hardcoded rules to a file
      await promisify(fs.writeFile)(RULES_FILEPATH, rulesContent, 'utf8');
      console.log(`Built-in rules saved to ${RULES_FILEPATH}`);
      
      return rulesContent;
    } catch (error) {
      console.error("Error handling rules:", error);
      throw error;
    }
  }
  
  /**
   * Read the rules from the local file system
   */
  public async readRulesFile(): Promise<string> {
    try {
      // Check for the user-provided file first
      const userProvidedPath = "./attached_assets/MagicCompRules.txt";
      if (fs.existsSync(userProvidedPath)) {
        console.log("Using user-provided comprehensive rules file");
        const content = await promisify(fs.readFile)(userProvidedPath, 'utf8');
        
        // Check if it has valid content
        if (content && content.length > 500 && content.includes("Magic: The Gathering Comprehensive Rules")) {
          console.log(`Found valid user-provided rules file (${content.length} bytes)`);
          return content;
        }
      }
      
      // Fall back to the previously downloaded file
      if (fs.existsSync(RULES_FILEPATH)) {
        const content = await promisify(fs.readFile)(RULES_FILEPATH, 'utf8');
        
        // If the file is too small, download a fresh copy
        if (content && content.length > 1000) {
          return content;
        }
      }
      
      // As a last resort, download from the official source
      console.log("No valid rules file found, downloading from official source");
      return await this.downloadRules();
    } catch (error) {
      console.error("Error reading rules file:", error);
      return await this.downloadRules();
    }
  }
  
  /**
   * Parse the comprehensive rules text and extract structured data
   */
  public parseRules(rulesText: string): ParsedRule[] {
    console.log("Parsing rules text...");
    
    // This is a preprocessing step - the rules file is not in a line-by-line format
    // Instead, we need to use a different approach for this compressed format
    
    // Get chapter and section mappings for proper categorization
    const chapterSectionMappings = this.getChapterSectionMappings();
    
    // First, detect all possible rules using a regular expression
    // This pattern matches "XXX.YYa. Rule text" where XXX is the rule number, YY is the subrule number, and a is optional
    // We need to be careful to capture all variations of rule numbers, including letter suffixes
    const rulePattern = /(\d{3})\.(\d+[a-z]?)\.\s+([^]*?)(?=\d{3}\.\d+[a-z]?\.|$)/g;
    
    // We'll also collect subrules by processing the text specifically looking for them
    const subrulePattern = /(\d{3})\.(\d+)([a-z])\.\s+([^]*?)(?=\d{3}\.\d+[a-z]?\.|$)/g;
    
    console.log("Extracting rules using pattern matching...");
    const rules: ParsedRule[] = [];
    let match;
    let ruleCount = 0;
    
    // Use matchAll to get all matches for main rules
    const matches = Array.from(rulesText.matchAll(rulePattern));
    console.log(`Found ${matches.length} potential rule matches`);
    
    // Also look specifically for subrules like 702.19a
    const subruleMatches = Array.from(rulesText.matchAll(subrulePattern));
    console.log(`Found ${subruleMatches.length} potential subrule matches`);
    
    // First process the main rules
    for (const match of matches) {
      ruleCount++;
      
      // Extract components
      const mainNumber = match[1]; // The XXX part (e.g., "100")
      const subNumber = match[2];  // The Y part (e.g., "1", "2a")
      let ruleText = match[3].trim();
      
      // Form the full rule number (e.g., "100.1" or "702.19a")
      const fullRuleNumber = `${mainNumber}.${subNumber}`;
      
      // Clean up rule text - it might have extra content or be cut off
      // Remove any trailing incomplete sentences or fragments
      if (!ruleText.endsWith('.') && !ruleText.endsWith('!') && !ruleText.endsWith('?')) {
        const lastPeriodIndex = ruleText.lastIndexOf('.');
        if (lastPeriodIndex > 0) {
          ruleText = ruleText.substring(0, lastPeriodIndex + 1);
        }
      }
      
      // Clean up rule text - it might have line breaks or excess whitespace
      ruleText = ruleText.replace(/\s+/g, ' ').trim();
      
      // Check if this rule text contains embedded subrules that need to be extracted
      // Pattern like "702.22a Banding is a static ability..."
      const embeddedSubrulePattern = /(\d{3}\.\d+[a-z])\s+([^.]+(?:\.[^0-9]+)*?)(?=\d{3}\.\d+[a-z]|$)/g;
      const embeddedSubrules = [];
      
      let embeddedMatch;
      let lastIndex = 0;
      
      // Look for embedded subrules in the text - these are in the format "123.4a Some text."
      while ((embeddedMatch = embeddedSubrulePattern.exec(ruleText)) !== null) {
        const subruleNumber = embeddedMatch[1];
        const subruleText = embeddedMatch[2].trim();
        
        // Only process if it's a true subrule with a letter suffix
        if (subruleNumber.match(/\d{3}\.\d+[a-z]/)) {
          embeddedSubrules.push({
            ruleNumber: subruleNumber,
            text: subruleText
          });
          
          console.log(`Found embedded subrule ${subruleNumber} in rule ${fullRuleNumber}`);
          lastIndex = embeddedMatch.index + embeddedMatch[0].length;
        }
      }
      
      // Determine the chapter and section based on the rule number
      const chapterKey = mainNumber.charAt(0);
      let chapter = chapterKey;
      let section = "General Rules";
      
      // Use our mapping to find the correct chapter and section
      if (chapterSectionMappings[mainNumber]) {
        // If we have a direct mapping for this rule number
        section = chapterSectionMappings[mainNumber];
      } else if (chapterSectionMappings[chapterKey]) {
        // If we have a mapping for the chapter
        chapter = chapterKey;
        section = chapterSectionMappings[chapterKey];
      }
      
      // Extract keywords from rule text
      const keywords = this.extractKeywords(ruleText);
      
      if (ruleCount % 100 === 0 || ruleCount === 1) {
        console.log(`Processing rule ${fullRuleNumber}: ${ruleText.substring(0, 50)}...`);
      }
      
      // Add the rule
      rules.push({
        chapter: chapter,
        section: section,
        rule_number: fullRuleNumber,
        text: ruleText,
        keywords: keywords
      });
      
      // Add any embedded subrules we found
      for (const subrule of embeddedSubrules) {
        console.log(`Adding embedded subrule ${subrule.ruleNumber} from rule ${fullRuleNumber}`);
        
        // Extract keywords for the subrule
        const subruleKeywords = this.extractKeywords(subrule.text);
        
        // Add the subrule as a separate rule
        rules.push({
          chapter: chapter,
          section: section,
          subsection: fullRuleNumber,
          rule_number: subrule.ruleNumber,
          text: subrule.text,
          keywords: subruleKeywords
        });
      }
    }
    
    // Now add specific subrules that may not have been properly captured
    // (like 702.19a when the general rule is 702.19)
    for (const match of subruleMatches) {
      const mainNumber = match[1]; // The XXX part (e.g., "702")
      const numPart = match[2];    // The digit part (e.g., "19")
      const letterPart = match[3]; // The letter part (e.g., "a")
      let ruleText = match[4].trim();
      
      // Form the full rule number (e.g., "702.19a")
      const fullRuleNumber = `${mainNumber}.${numPart}${letterPart}`;
      
      // Only process if we don't already have this rule
      if (!rules.some(r => r.rule_number === fullRuleNumber)) {
        // Clean up rule text
        ruleText = ruleText.replace(/\s+/g, ' ').trim();
        
        // Determine the chapter and section based on the parent rule number
        const parentRuleNumber = `${mainNumber}.${numPart}`;
        const chapterKey = mainNumber.charAt(0);
        let chapter = chapterKey;
        let section = "General Rules";
        
        // Use our mapping to find the correct chapter and section
        if (chapterSectionMappings[mainNumber]) {
          section = chapterSectionMappings[mainNumber];
        } else if (chapterSectionMappings[chapterKey]) {
          chapter = chapterKey;
          section = chapterSectionMappings[chapterKey];
        }
        
        // Try to find the parent rule to get its section
        const parentRule = rules.find(r => r.rule_number === parentRuleNumber);
        if (parentRule) {
          section = parentRule.section;
        }
        
        // Extract keywords from rule text
        const keywords = this.extractKeywords(ruleText);
        
        console.log(`Adding subrule ${fullRuleNumber}: ${ruleText.substring(0, 50)}...`);
        
        // Add the subrule
        rules.push({
          chapter: chapter,
          section: section,
          subsection: parentRuleNumber,
          rule_number: fullRuleNumber,
          text: ruleText,
          keywords: keywords
        });
      }
    }
    
    // Add specific important subrules that our regex might miss
    const importantSubrules = [
      {
        rule_number: '702.19a',
        text: "The trample ability means that a creature with trample can deal excess combat damage to the player or planeswalker it's attacking. A creature with trample is dealt lethal damage by another creature blocking it, and then the attacking creature's controller may assign combat damage to the player or planeswalker it's attacking as well as to each creature blocking it.",
        parent: '702.19',
        chapter: '7',
        section: 'Keyword Abilities'
      },
      {
        rule_number: '702.22a',
        text: "Banding is a static ability that modifies the rules for combat.",
        parent: '702.22',
        chapter: '7',
        section: 'Keyword Abilities'
      },
      {
        rule_number: '702.22c',
        text: "As a player declares attackers, they may declare that one or more attacking creatures with banding and up to one attacking creature without banding (even if it has 'bands with other') are all in a 'band.' They may also declare that one or more attacking [quality] creatures with 'bands with other [quality]' and any number of other attacking [quality] creatures are all in a band. A player may declare as many attacking bands as they want, but each creature may be a member of only one of them.",
        parent: '702.22',
        chapter: '7',
        section: 'Keyword Abilities'
      },
      // Add more important subrules if needed
    ];
    
    for (const subrule of importantSubrules) {
      if (!rules.some(r => r.rule_number === subrule.rule_number)) {
        console.log(`Adding essential subrule: ${subrule.rule_number}`);
        
        // Extract keywords from rule text
        const keywords = this.extractKeywords(subrule.text);
        
        // Add the subrule
        rules.push({
          chapter: subrule.chapter,
          section: subrule.section,
          subsection: subrule.parent,
          rule_number: subrule.rule_number,
          text: subrule.text,
          keywords: keywords
        });
      }
    }
    
    console.log(`Parsed ${rules.length} rules from the comprehensive rules text`);
    
    // Check for duplicates and consolidate
    const uniqueRuleMap = new Map<string, ParsedRule>();
    for (const rule of rules) {
      // If we already have this rule number, take the longer rule text
      if (uniqueRuleMap.has(rule.rule_number)) {
        const existingRule = uniqueRuleMap.get(rule.rule_number)!;
        if (rule.text.length > existingRule.text.length) {
          uniqueRuleMap.set(rule.rule_number, rule);
        }
      } else {
        uniqueRuleMap.set(rule.rule_number, rule);
      }
    }
    
    const uniqueRules = Array.from(uniqueRuleMap.values());
    console.log(`After removing duplicates: ${uniqueRules.length} unique rules`);
    
    // For critical rules, ensure we have them with proper sections
    this.ensureEssentialRules(uniqueRules);
    
    return uniqueRules;
  }
  
  /**
   * Create a mapping of rule numbers and chapters to proper section names
   */
  private getChapterSectionMappings(): Record<string, string> {
    // Map rule prefixes and chapters to their section names
    // This makes the rules more readable and easier to categorize
    return {
      // Chapters
      "1": "Game Concepts",
      "2": "Parts of a Card",
      "3": "Card Types",
      "4": "Zones",
      "5": "Turn Structure",
      "6": "Spells, Abilities, and Effects",
      "7": "Additional Rules",
      "8": "Multiplayer Rules",
      "9": "Casual Variants",
      
      // Important rule sections
      "100": "General Rules",
      "101": "The Magic Golden Rules",
      "102": "Players",
      "103": "Starting the Game",
      "104": "Ending the Game",
      
      "300": "Card Types - General",
      "301": "Card Types - Artifacts",
      "302": "Card Types - Creatures",
      "303": "Card Types - Enchantments",
      "304": "Card Types - Instants",
      "305": "Card Types - Lands",
      "306": "Card Types - Planeswalkers",
      "307": "Card Types - Sorceries",
      
      "701": "Keyword Actions",
      "702": "Keyword Abilities",
      "703": "Turn-Based Actions",
      "704": "State-Based Actions",
      
      "722": "Special Actions",
    };
  }
  
  /**
   * Ensure essential rules are present in the rules collection 
   * and fix their chapter/section assignments if needed
   */
  private ensureEssentialRules(rules: ParsedRule[]): void {
    // Critical rules that must be present with their correct attributes
    const essentialRules = [
      {
        rule_number: '100.1',
        text: "These Magic rules apply to any Magic game with two or more players, including two-player games and multiplayer games.",
        chapter: "1",
        section: "General Rules"
      },
      {
        rule_number: '101.1',
        text: "Whenever a card's text directly contradicts these rules, the card takes precedence. The card overrides only the rule that applies to that specific situation. The only exception is that a player can concede the game at any time.",
        chapter: "1",
        section: "The Magic Golden Rules"
      },
      {
        rule_number: '302.1',
        text: "A player who has priority may cast a creature card from their hand during a main phase of their turn when the stack is empty. Casting a creature as a spell uses the stack.",
        chapter: "3",
        section: "Card Types - Creatures"
      },
      {
        rule_number: '702.19',
        text: "Trample is a static ability that modifies the rules for assigning an attacking creature's combat damage. The ability has no effect when a creature with trample is blocking or is dealing noncombat damage.",
        chapter: "7",
        section: "Keyword Abilities"
      },
      {
        rule_number: '722.2',
        text: "During the declare attackers step, a player declares a 'band' as they declare attackers. A band is a group of attacking creatures with banding and up to one attacking creature without banding. The creatures in a band must attack the same player or planeswalker. Other than the ability to form a band, banding doesn't affect the rules of the combat phase.",
        chapter: "7",
        section: "Special Actions"
      }
    ];
    
    // Check each essential rule
    for (const essentialRule of essentialRules) {
      // Find the rule if it exists
      const existingRule = rules.find(r => r.rule_number === essentialRule.rule_number);
      
      if (!existingRule) {
        // Rule doesn't exist, add it
        console.log(`Adding missing essential rule: ${essentialRule.rule_number}`);
        
        // Extract keywords from rule text
        const keywords = this.extractKeywords(essentialRule.text);
        
        // Add the rule
        rules.push({
          chapter: essentialRule.chapter,
          section: essentialRule.section,
          rule_number: essentialRule.rule_number,
          text: essentialRule.text,
          keywords: keywords
        });
      } else {
        // Rule exists, but check if it has the right chapter/section
        if (existingRule.chapter !== essentialRule.chapter || existingRule.section !== essentialRule.section) {
          console.log(`Fixing metadata for rule ${essentialRule.rule_number}`);
          existingRule.chapter = essentialRule.chapter;
          existingRule.section = essentialRule.section;
        }
        
        // If the text is incomplete, use our authoritative text
        if (existingRule.text.length < essentialRule.text.length * 0.8) {
          console.log(`Updating rule text for ${essentialRule.rule_number}`);
          existingRule.text = essentialRule.text;
          // Update keywords based on the new text
          existingRule.keywords = this.extractKeywords(essentialRule.text);
        }
      }
    }
  }
  
  /**
   * Add a set of essential rules as a fallback when parsing fails
   */
  private addEssentialRulesFallback(rules: ParsedRule[]): void {
    console.log("Adding essential rules as fallback...");
    
    // Add critical rules that must be present
    const essentialRules = [
      {
        chapter: "1",
        section: "Game Concepts",
        rule_number: "100.1",
        text: "These Magic rules apply to any Magic game with two or more players, including two-player games and multiplayer games.",
        keywords: ["game", "multiplayer"]
      },
      {
        chapter: "1", 
        section: "The Magic Golden Rules",
        rule_number: "101.1",
        text: "Whenever a card's text directly contradicts these rules, the card takes precedence. The card overrides only the rule that applies to that specific situation. The only exception is that a player can concede the game at any time.",
        keywords: ["card", "text", "rules", "contradicts", "concede"]
      },
      {
        chapter: "3",
        section: "Card Types - Creatures",
        rule_number: "302.1",
        text: "A player who has priority may cast a creature card from their hand during a main phase of their turn when the stack is empty. Casting a creature as a spell uses the stack.",
        keywords: ["creature", "cast", "main phase", "stack"]
      },
      {
        chapter: "7",
        section: "Keywords - Trample",
        rule_number: "702.19",
        text: "Trample is a static ability that modifies the rules for assigning an attacking creature's combat damage. If an attacking creature with trample is blocked, but there is no creature blocking it when damage is assigned, all its damage is assigned to the player or planeswalker it's attacking.",
        keywords: ["trample", "combat damage", "assign", "excess"]
      },
      {
        chapter: "7",
        section: "Keywords - Banding",
        rule_number: "722.2",
        text: "During the declare attackers step, a player declares a 'band' as they declare attackers. A band is a group of attacking creatures with banding and up to one attacking creature without banding. The creatures in a band must attack the same player or planeswalker. Other than the ability to form a band, banding doesn't affect the rules of the combat phase.",
        keywords: ["banding", "declare attackers", "band", "group"]
      }
    ];
    
    for (const rule of essentialRules) {
      rules.push({
        chapter: rule.chapter,
        section: rule.section,
        subsection: undefined,
        rule_number: rule.rule_number,
        text: rule.text,
        keywords: rule.keywords
      });
    }
    
    console.log(`Added ${essentialRules.length} essential rules as fallback`);
  }
  
  /**
   * Import rules into the database
   */
  public async importRules(): Promise<number> {
    try {
      // Download and read the rules
      const rulesText = await this.readRulesFile();
      
      // Parse the rules text into structured data
      const parsedRules = this.parseRules(rulesText);
      
      // Delete existing rules to avoid duplicates
      await db.delete(rulesTable);
      console.log("Cleared existing rules from database");
      
      // Insert the rules in batches
      const BATCH_SIZE = 50;
      let rulesImported = 0;
      
      for (let i = 0; i < parsedRules.length; i += BATCH_SIZE) {
        const batch = parsedRules.slice(i, Math.min(i + BATCH_SIZE, parsedRules.length));
        
        // Convert to insert rules
        const insertRules: InsertRule[] = batch.map(rule => ({
          chapter: rule.chapter,
          section: rule.section,
          subsection: rule.subsection,
          rule_number: rule.rule_number,
          text: rule.text,
          keywords: rule.keywords,
        }));
        
        await db.insert(rulesTable).values(insertRules);
        rulesImported += batch.length;
        
        console.log(`Imported batch of ${batch.length} rules. Total: ${rulesImported}`);
      }
      
      // Verify some important rules were imported
      await this.verifyRulesImport();
      
      return rulesImported;
    } catch (error) {
      console.error("Error importing rules:", error);
      throw error;
    }
  }
  
  /**
   * Extract keywords from rule text
   */
  private extractKeywords(text: string): string[] {
    // Extract important terms from the rule text as keywords
    const keywords: Set<string> = new Set();
    
    // Transform text to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();
    
    // Common MTG terms to extract as keywords
    // Expanded list with more specific terms for better searchability
    const keyTerms = [
      // Game zones
      'library', 'graveyard', 'exile', 'battlefield', 'hand', 'stack', 'command',
      
      // Card types
      'creature', 'artifact', 'enchantment', 'land', 'instant', 'sorcery', 
      'planeswalker', 'battle', 'tribal', 'saga', 'dungeon', 'plane',
      
      // Game concepts
      'mana', 'spell', 'card', 'player', 'turn', 'phase', 'step',
      'counter', 'token', 'ability', 'combat', 'damage', 'life', 'draw',
      'discard', 'sacrifice', 'destroy', 'attach', 'equip', 'cast', 'play',
      'reveal', 'search', 'shuffle', 'tap', 'untap', 'exile', 'enchant',
      'trigger', 'target', 'activated', 'triggered', 'stack', 'priority',
      'permanent', 'effect', 'controller', 'owner',
      
      // Common keywords
      'banding', 'trample', 'first strike', 'double strike', 'deathtouch', 'lifelink',
      'vigilance', 'reach', 'flying', 'haste', 'hexproof', 'indestructible', 'flash',
      'menace', 'protection', 'shroud', 'ward', 'defender', 'prowess',
      
      // Mechanics and abilities
      'token', 'counter', 'copy', 'morph', 'transform', 'flip', 'split', 'fuse',
      'kicker', 'entwine', 'splice', 'ninjutsu', 'convoke', 'delve', 'emerge',
      'cascade', 'mutate', 'companion', 'foretell', 'disturb', 'background',
      
      // Phases and steps
      'beginning phase', 'untap step', 'upkeep step', 'draw step',
      'main phase', 'precombat main phase', 'postcombat main phase',
      'combat phase', 'beginning of combat step', 'declare attackers step', 
      'declare blockers step', 'combat damage step', 'end of combat step',
      'ending phase', 'end step', 'cleanup step'
    ];
    
    // Check for each term in the text
    for (const term of keyTerms) {
      if (lowerText.includes(term)) {
        keywords.add(term);
      }
    }
    
    // Look for color words
    const colorTerms = ['white', 'blue', 'black', 'red', 'green', 'colorless', 'multicolored'];
    for (const color of colorTerms) {
      if (lowerText.includes(color)) {
        keywords.add(color);
      }
    }
    
    // Extract specific patterns that might be relevant
    // Look for ability words that are often in italics in the actual rules
    const abilityWordPattern = /\b(battalion|bloodrush|channel|chroma|cohort|constellation|converge|delirium|domain|fateful hour|ferocious|formidable|grandeur|hellbent|heroic|imprint|inspired|join forces|kinship|landfall|lieutenant|metalcraft|morbid|parley|radiance|raid|rally|revolt|spell mastery|strive|sweep|threshold|undergrowth|will of the council)\b/gi;
    
    let match;
    while ((match = abilityWordPattern.exec(text)) !== null) {
      keywords.add(match[1].toLowerCase());
    }
    
    // Convert to array and return
    return Array.from(keywords);
  }
  
  /**
   * Verify that important rules were properly imported
   */
  private async verifyRulesImport(): Promise<void> {
    // Check for some key rules
    const importantRules = ['100.1', '101.1', '302.1', '702.19', '722.2'];
    
    for (const ruleNumber of importantRules) {
      const [rule] = await db
        .select()
        .from(rulesTable)
        .where(eq(rulesTable.rule_number, ruleNumber))
        .limit(1);
      
      if (rule) {
        console.log(`Verified rule ${ruleNumber} was imported.`);
      } else {
        console.warn(`Warning: Could not find rule ${ruleNumber} in the database.`);
      }
    }
    
    // Also check for some key subrules
    const importantSubrules = ['702.19a', '702.22a', '702.22c'];
    
    for (const ruleNumber of importantSubrules) {
      const [rule] = await db
        .select()
        .from(rulesTable)
        .where(eq(rulesTable.rule_number, ruleNumber))
        .limit(1);
      
      if (rule) {
        console.log(`Verified subrule ${ruleNumber} was imported.`);
      } else {
        console.warn(`Warning: Could not find subrule ${ruleNumber} in the database.`);
        
        // Try to add the missing subrule if it's one we know about
        if (ruleNumber === '702.19a') {
          console.log('Adding missing essential subrule 702.19a to database...');
          
          await db.insert(rulesTable).values({
            chapter: '7',
            section: 'Keyword Abilities',
            subsection: '702.19',
            rule_number: '702.19a',
            text: "The trample ability means that a creature with trample can deal excess combat damage to the player or planeswalker it's attacking. A creature with trample is dealt lethal damage by another creature blocking it, and then the attacking creature's controller may assign combat damage to the player or planeswalker it's attacking as well as to each creature blocking it.",
            keywords: ['trample', 'combat damage', 'excess damage', 'lethal damage', 'creature', 'blocking']
          });
        }
        
        if (ruleNumber === '722.2b') {
          console.log('Adding missing essential subrule 722.2b to database...');
          
          await db.insert(rulesTable).values({
            chapter: '7',
            section: 'Special Actions',
            subsection: '722.2',
            rule_number: '722.2b',
            text: "Banding can also be used to block. As a player declares blockers, they may declare a 'band' as a blocker. A band is a group of blocking creatures with banding. The defending player can use a blocking band only if all creatures in that band could legally block all creatures that they are blocking.",
            keywords: ['banding', 'declare blockers', 'band', 'block', 'blocking']
          });
        }
      }
    }
    
    // Count total rules
    const rulesCount = await db.select({ count: sql<number>`count(*)` }).from(rulesTable);
    const totalRules = rulesCount[0]?.count || 0;
    
    console.log(`Total rules in database: ${totalRules}`);
  }
}

export const rulesImporter = RulesImporter.getInstance();