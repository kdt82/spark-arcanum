import { db } from '../db';
import { rules as rulesTable, Rule, InsertRule } from '@shared/schema';
import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';
import OpenAI from 'openai';
import { rulesImporter } from './rules-importer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Service to interact with the MTG Rules
 */
export class RulesService {
  private static instance: RulesService;
  private initialized: boolean = false;
  
  private constructor() {}
  
  public static getInstance(): RulesService {
    if (!RulesService.instance) {
      RulesService.instance = new RulesService();
    }
    return RulesService.instance;
  }
  
  /**
   * Initialize the rules service by loading comprehensive rules
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Check if rules data is already populated
      const existingRules = await db.select().from(rulesTable).limit(1);
      const rulesCount = await db.select({ count: sql<number>`count(*)` }).from(rulesTable);
      const totalRules = rulesCount[0]?.count || 0;
      
      if (existingRules.length === 0 || totalRules < 100) {
        console.log("Not enough rules found in database. Importing comprehensive rules...");
        await this.importComprehensiveRules();
      } else {
        console.log(`Found ${totalRules} rules in the database.`);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing Rules Service:', error);
      throw error;
    }
  }
  
  /**
   * Import the official MTG comprehensive rules
   */
  public async importComprehensiveRules(): Promise<void> {
    try {
      console.log("Importing comprehensive MTG rules from official source...");
      const rulesCount = await rulesImporter.importRules();
      console.log(`Successfully imported ${rulesCount} rules from the official source.`);
      
      // Verify that some important rules were imported
      await this.verifyRulesImport();
    } catch (error) {
      console.error('Error importing comprehensive rules:', error);
      throw error;
    }
  }
  
  /**
   * Verify that important rules were properly imported
   */
  private async verifyRulesImport(): Promise<void> {
    // Check for important rules like 722.2 (banding)
    const importantRules = ['100.1', '101.1', '302.1', '702.19', '722.2'];
    let missingRules = [];
    
    for (const ruleNumber of importantRules) {
      const rule = await this.getRuleByNumber(ruleNumber);
      
      if (rule) {
        console.log(`Verified rule ${ruleNumber} exists in the database.`);
      } else {
        console.warn(`Warning: Could not find rule ${ruleNumber} in the database.`);
        missingRules.push(ruleNumber);
      }
    }
    
    // If we're missing any important rules, try to add them manually
    if (missingRules.length > 0) {
      console.log(`Adding ${missingRules.length} important missing rules manually...`);
      await this.addMissingImportantRules(missingRules);
    }
  }
  
  /**
   * Add missing important rules manually
   */
  private async addMissingImportantRules(missingRules: string[]): Promise<void> {
    // Define important rules that might be missing
    const importantRulesMap: Record<string, InsertRule> = {
      '722.2': {
        chapter: "7",
        section: "Keywords - Banding",
        rule_number: "722.2",
        text: "During the declare attackers step, a player declares a 'band' as they declare attackers. A band is a group of attacking creatures with banding and up to one attacking creature without banding. The creatures in a band must attack the same player or planeswalker. Other than the ability to form a band, banding doesn't affect the rules of the combat phase.",
        keywords: ["banding", "declare attackers", "band", "group"],
      },
      '100.1': {
        chapter: "1",
        section: "Game Concepts",
        rule_number: "100.1",
        text: "These Magic rules apply to any Magic game with two or more players, including two-player games and multiplayer games.",
        keywords: ["game", "multiplayer"],
      },
      '101.1': {
        chapter: "1",
        section: "The Magic Golden Rules",
        rule_number: "101.1",
        text: "Whenever a card's text directly contradicts these rules, the card takes precedence. The card overrides only the rule that applies to that specific situation. The only exception is that a player can concede the game at any time.",
        keywords: ["card text", "rules", "contradicts", "concede"],
      },
      '302.1': {
        chapter: "3",
        section: "Card Types - Creatures",
        rule_number: "302.1",
        text: "A player who has priority may cast a creature card from their hand during a main phase of their turn when the stack is empty. Casting a creature as a spell uses the stack.",
        keywords: ["creature", "cast", "main phase", "stack"],
      },
      '702.19': {
        chapter: "7",
        section: "Keywords - Trample",
        rule_number: "702.19",
        text: "Trample is a static ability that modifies the rules for assigning an attacking creature's combat damage. If an attacking creature with trample is blocked, but there is no creature blocking it when damage is assigned, all its damage is assigned to the player or planeswalker it's attacking.",
        keywords: ["trample", "combat damage", "assign", "excess"],
      }
    };
    
    // Add each missing important rule
    for (const ruleNumber of missingRules) {
      if (importantRulesMap[ruleNumber]) {
        await db.insert(rulesTable).values(importantRulesMap[ruleNumber]);
        console.log(`Added missing rule ${ruleNumber} manually.`);
      }
    }
  }
  
  /**
   * Search for rules using a text query
   */
  public async searchRules(query: string): Promise<Rule[]> {
    if (!query || query.trim() === '') {
      // Return first 20 rules if no query
      const results = await db.select().from(rulesTable).limit(20);
      return results;
    }
    
    const normalizedQuery = `%${query.toLowerCase()}%`;
    
    // Search by rule number, text, and keywords
    const results = await db
      .select()
      .from(rulesTable)
      .where(
        or(
          ilike(rulesTable.rule_number, normalizedQuery),
          ilike(rulesTable.text, normalizedQuery)
        )
      )
      .limit(50)
      .orderBy(rulesTable.rule_number);
      
    return results;
  }
  
  /**
   * Search for rules semantically using AI
   */
  public async semanticRuleSearch(query: string): Promise<{
    relatedRules: Rule[];
    explanation: string;
  }> {
    // First get some basic rules that might be relevant
    const basicSearchResults = await this.searchRules(query);
    
    // Use OpenAI to analyze the query and find the most relevant rules
    const prompt = `
I need help finding the most relevant Magic: The Gathering rules for this question:
"${query}"

Here are some rules that might be relevant based on keyword search:
${basicSearchResults.slice(0, 10).map(rule => 
  `${rule.rule_number}: ${rule.text}`
).join('\n')}

Please analyze the question and:
1. Select the 1-5 most relevant rules from the list above
2. Provide a brief explanation in plain language that answers the question
3. If these rules don't fully address the question, suggest what other rules might be helpful

Respond with JSON in this format:
{
  "relevantRuleNumbers": ["relevant rule numbers here"],
  "explanation": "Your explanation in plain language here"
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: `You are a Magic: The Gathering rules expert AI assistant with deep knowledge of the game mechanics and comprehensive rules.

When analyzing rules questions, always consider these critical Magic concepts:

1. TURN STRUCTURE AND PHASES:
   * The detailed sequence of phases/steps in a turn (untap, upkeep, draw, main phases, combat steps, end step)
   * When spells and abilities can be cast or activated in each phase
   * Combat phase specifics (beginning, declare attackers, declare blockers, damage, end)
   * Triggered abilities that occur during specific phases

2. THE STACK AND PRIORITY:
   * First-In-Last-Out (FILO) resolution of spells and abilities on the stack
   * Priority system and when players can respond
   * How triggered abilities, activated abilities, and spells interact on the stack
   * Special cases like split second or counterspells

3. STATE-BASED ACTIONS:
   * Rule 704 and when state-based actions are checked
   * How state-based actions handle damage, zero toughness, etc.
   * The fact that state-based actions occur before players receive priority

4. TIMING AND SPECIAL RULES:
   * Precise meaning of timing words ("at the beginning of", "during", "when", "whenever")
   * Replacement effects vs. triggered abilities
   * Special actions that don't use the stack

Your analysis should always be technically precise, citing specific rule numbers, and thoroughly explaining the game mechanics at play.` },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Type assertion to handle TypeScript's concern about null content
      const content = response.choices[0].message.content as string;
      const result = JSON.parse(content);
      
      // Get the full rule objects for the relevant rule numbers
      const relevantRules = await Promise.all(
        (result.relevantRuleNumbers || []).map(async (ruleNumber: string) => {
          if (!ruleNumber) return null;
          
          const [rule] = await db
            .select()
            .from(rulesTable)
            .where(eq(rulesTable.rule_number, ruleNumber))
            .limit(1);
          
          return rule;
        })
      );
      
      return {
        relatedRules: relevantRules.filter(Boolean),
        explanation: result.explanation
      };
    } catch (error) {
      console.error('Error with semantic rule search:', error);
      return {
        relatedRules: basicSearchResults.slice(0, 5),
        explanation: "Unable to process semantic search at this time. Here are some keyword-matched rules that might be relevant."
      };
    }
  }
  
  /**
   * Get rule by number
   */
  public async getRuleByNumber(ruleNumber: string): Promise<Rule | null> {
    const [rule] = await db
      .select()
      .from(rulesTable)
      .where(eq(rulesTable.rule_number, ruleNumber))
      .limit(1);
      
    return rule || null;
  }
}

export const rulesService = RulesService.getInstance();