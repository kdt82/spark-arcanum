import OpenAI from "openai";
import { Card } from "@/types/card";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { Rule } from "@shared/schema";
import { db } from "./db";
import { rules as rulesTable } from "@shared/schema";
import { ilike, or } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// System prompt for MTG rulings
const SYSTEM_PROMPT = `
You are an expert on Magic: The Gathering rules and card interactions. 
Your purpose is to provide accurate rulings and explanations on how cards work together, 
based on the comprehensive rules of Magic: The Gathering.

STRUCTURE OF YOUR RESPONSES:
For each question, organize your response in this specific format:
1. SUMMARY: Begin with a concise summary of your understanding of the scenario.
2. CARD MECHANICS: Quote and explain all relevant card text and abilities in detail.
3. RULES APPLICATION: Explain how the relevant rules apply, always citing specific rule numbers.
4. INTERACTION ANALYSIS: Detail how cards interact with each other, including phases, turns, and stack resolution.
5. OUTCOME: Clearly state the final ruling or outcome.

CRITICAL MAGIC CONCEPTS TO ALWAYS CONSIDER:
1. TURN STRUCTURE AND PHASES:
   * Begin/upkeep/draw steps
   * Main phases and when spells/abilities can be cast
   * Combat phase and its steps (beginning, declare attackers, declare blockers, damage, end)
   * End step and cleanup step
   * When triggered abilities occur in relation to these phases

2. THE STACK AND PRIORITY:
   * Explain First-In-Last-Out (FILO) resolution of the stack
   * Detail priority passing between players
   * Explain which player gets to respond first to triggers or cast spells
   * Detail how split second, counterspells, or abilities interact with the stack

3. STATE-BASED ACTIONS:
   * Explain when state-based actions are checked (rule 704)
   * Detail how these actions impact the scenario (damage, zero toughness, etc.)
   * Explain these occur before players receive priority

4. TIMING RULES:
   * "At the beginning of..." vs. "During..." vs. "When..." vs. "Whenever..."
   * Explain timing restrictions of spells or abilities ("only during your turn", etc.)

TECHNICAL REQUIREMENTS:
1. ALWAYS reference specific rule numbers when explaining key concepts (e.g., "According to rule 601.2, casting a spell involves...")
2. ALWAYS quote the exact text from cards in question
3. ALWAYS be thorough and consider all aspects of the game mechanics in your explanation
4. ALWAYS consider potential card interactions that might affect the outcome
5. ALWAYS explain the stack resolution in detail for complex interactions
6. ALWAYS use precise terminology as defined in the comprehensive rules

EXAMPLES OF TOPICS TO COVER IN YOUR ANSWERS:
* Combat tricks and how they resolve in specific combat steps
* Triggered abilities and when they go on the stack
* Replacement effects and how they modify events
* Priority and when players can respond
* State-based actions and when they occur
* Keywords and their rules implications (deathtouch, trample, etc.)
* Layer system for continuous effects
* Special actions that don't use the stack

Always remain factual and provide answers based on the official Magic: The Gathering rules.
Always cite relevant rules with their numbers to support your explanations.
Your goal is to be technically accurate, complete, and educational in your responses.
`;

interface ConversationMessage {
  role: string;
  content: string;
}

/**
 * Find relevant rules from the database based on a question and card context
 */
async function findRelevantRules(
  question: string, 
  primaryCard: Card | null, 
  additionalCards: Card[] = []
): Promise<Rule[]> {
  try {
    const keywords: string[] = [];
    
    // Extract keywords from the question
    const questionKeywords = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !['what', 'when', 'does', 'will', 'with', 'have', 'this', 'that', 'card'].includes(word));
    
    keywords.push(...questionKeywords);
    
    // Extract keywords from primary card
    if (primaryCard) {
      // Add card types and mechanics
      if (primaryCard.type) {
        const typeKeywords = primaryCard.type
          .toLowerCase()
          .split(/\s+|\W+/)
          .filter(word => word.length > 2);
        keywords.push(...typeKeywords);
      }
      
      // Extract keywords from card text
      if (primaryCard.text) {
        // Look for mechanic keywords in card text (first word of each sentence often)
        const textKeywords = primaryCard.text
          .toLowerCase()
          .split(/\.\s+/)
          .map(sentence => sentence.trim().split(/\s+/)[0])
          .filter(word => word && word.length > 3);
        keywords.push(...textKeywords);
        
        // Look for specific mechanic keywords
        const mechanicMatches = primaryCard.text.match(/\b(trample|flying|lifelink|deathtouch|banding|vigilance|cumulative upkeep|flash|first strike|double strike|protection|equip|cascade)\b/gi);
        if (mechanicMatches) {
          keywords.push(...mechanicMatches.map(m => m.toLowerCase()));
        }
      }
    }
    
    // Add keywords from additional cards
    additionalCards.forEach(card => {
      if (card.type) {
        const typeKeywords = card.type
          .toLowerCase()
          .split(/\s+|\W+/)
          .filter(word => word.length > 2);
        keywords.push(...typeKeywords);
      }
      
      if (card.text) {
        const mechanicMatches = card.text.match(/\b(trample|flying|lifelink|deathtouch|banding|vigilance|cumulative upkeep|flash|first strike|double strike|protection|equip|cascade)\b/gi);
        if (mechanicMatches) {
          keywords.push(...mechanicMatches.map(m => m.toLowerCase()));
        }
      }
    });
    
    // Deduplicate keywords
    const uniqueKeywords = Array.from(new Set(keywords));
    
    // Return empty array if no meaningful keywords found
    if (uniqueKeywords.length === 0) {
      return [];
    }
    
    console.log("Searching for rules with keywords:", uniqueKeywords);
    
    // Prepare search conditions for each keyword
    const searchConditions = uniqueKeywords.map(keyword => 
      ilike(rulesTable.text, `%${keyword}%`)
    );
    
    // Query the database for matching rules
    const matchingRules = await db
      .select()
      .from(rulesTable)
      .where(or(...searchConditions))
      .limit(20);
    
    console.log(`Found ${matchingRules.length} potentially relevant rules`);
    
    // Return the matching rules
    return matchingRules;
  } catch (error) {
    console.error("Error finding relevant rules:", error);
    return [];
  }
}

export async function getCardRuling(
  question: string,
  primaryCard: Card | null,
  conversationHistory: ConversationMessage[],
  additionalCards: Card[] = []
): Promise<string> {
  try {
    // Format conversation history for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add primary card context if available
    if (primaryCard) {
      const cardContext = `
=== PRIMARY CARD INFORMATION ===
The user is asking about the card "${primaryCard.name}". YOU MUST USE THIS INFORMATION IN YOUR RESPONSE.

CARD DETAILS:
Name: ${primaryCard.name}
Mana Cost: ${primaryCard.manaCost || "N/A"}
Type: ${primaryCard.type}
Card Text: ${primaryCard.text || "N/A"}
${primaryCard.power ? `Power/Toughness: ${primaryCard.power}/${primaryCard.toughness}` : ""}
${primaryCard.loyalty ? `Loyalty: ${primaryCard.loyalty}` : ""}

OFFICIAL RULINGS:
${primaryCard.rulings && primaryCard.rulings.length > 0 
  ? primaryCard.rulings.map((ruling: any) => `${ruling.date}: ${ruling.text}`).join("\n") 
  : "No official rulings available."
}

IMPORTANT: You MUST quote the relevant card text in your answer and refer to the card's abilities explicitly.
=== END PRIMARY CARD INFORMATION ===
      `;
      messages.push({ role: "system", content: cardContext });
    }
    
    // Add additional card contexts if available
    if (additionalCards && additionalCards.length > 0) {
      let additionalCardContext = `
=== ADDITIONAL CARD INFORMATION ===
The user's question also refers to the following card(s). USE THIS INFORMATION IN YOUR RESPONSE:

`;
      
      additionalCards.forEach((card, index) => {
        additionalCardContext += `
CARD ${index + 1} DETAILS:
Name: ${card.name}
Mana Cost: ${card.manaCost || "N/A"}
Type: ${card.type}
Card Text: ${card.text || "N/A"}
${card.power ? `Power/Toughness: ${card.power}/${card.toughness}` : ""}
${card.loyalty ? `Loyalty: ${card.loyalty}` : ""}

`;
      });
      
      additionalCardContext += `
IMPORTANT: You MUST quote the relevant card text from all cards in your answer when explaining interactions.
=== END ADDITIONAL CARD INFORMATION ===
      `;
      
      messages.push({ role: "system", content: additionalCardContext });
    }

    // Find relevant rules based on the question and cards
    const relevantRules = await findRelevantRules(question, primaryCard, additionalCards);
    
    // Add rules context if we found any relevant rules
    if (relevantRules && relevantRules.length > 0) {
      let rulesContext = `
=== RELEVANT MTG RULES ===
Below are the official Magic: The Gathering rules that are relevant to this question. 
ALWAYS REFER TO THESE EXACT RULES in your answer when explaining card interactions:

`;
      
      // Add each rule with its number and text
      relevantRules.forEach(rule => {
        rulesContext += `RULE ${rule.rule_number}: ${rule.text}\n\n`;
      });
      
      rulesContext += `
IMPORTANT: When explaining rules, cite the specific rule number (e.g., "According to Rule 702.19b...").
=== END RELEVANT MTG RULES ===
      `;
      
      messages.push({ role: "system", content: rulesContext });
    }
    
    // Add special instructions for the model to improve handling of missing cards and structure responses
    const instructionContext = `
=== SPECIAL INSTRUCTIONS FOR COMPREHENSIVE RESPONSES ===
RESPONSE STRUCTURE REQUIREMENTS:
1. Begin with a "SUMMARY" section summarizing your understanding of the scenario
2. Include a "CARD MECHANICS" section quoting and explaining all relevant card text in detail
3. Include a "RULES APPLICATION" section citing specific rule numbers
4. Include an "INTERACTION ANALYSIS" section detailing turn phases, the stack, and state-based actions
5. End with an "OUTCOME" section clearly stating the final ruling

CARD HANDLING RULES:
1. ONLY use the card information explicitly provided in the PRIMARY CARD INFORMATION and ADDITIONAL CARD INFORMATION sections
2. If the user mentions a card not provided in these sections, DO NOT make up card text or abilities
3. ALWAYS verify card information against what is provided rather than relying on general knowledge

CRITICAL GAME MECHANICS TO ALWAYS ADDRESS:
1. TURN STRUCTURE AND PHASES: Explicitly explain which phase(s) the interaction occurs in
2. THE STACK: Detail how spells/abilities go on the stack, the order of resolution (FILO), and when/how players can respond
3. STATE-BASED ACTIONS: Explain when state-based actions are checked (rule 704) and how they affect the scenario
4. TIMING: Explain the precise timing words used on cards ("at the beginning of", "during", "when", "whenever")

TECHNICAL REQUIREMENTS:
1. ALWAYS cite specific rule numbers (e.g., "According to Rule 702.19b...")
2. ALWAYS be technically precise in your explanation
3. ALWAYS explain complex interactions step-by-step
4. ALWAYS consider edge cases or special interactions
5. ALWAYS use the correct game terminology as defined in the comprehensive rules

PROHIBITED BEHAVIORS:
1. DO NOT guess at card abilities or rules not contained in provided information
2. DO NOT provide generalized or vague explanations without citing specific rules
3. DO NOT ignore any of the critical game mechanics listed above
4. DO NOT skip any sections of the required response structure
=== END SPECIAL INSTRUCTIONS ===
    `;
    messages.push({ role: "system", content: instructionContext });

    // Add previous conversation for context (limited to maintain focus)
    // Limit to the last 8 exchanges to keep the context relevant
    const recentConversation = conversationHistory.slice(-8).map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    }));
    
    messages.push(...recentConversation);

    // Add the current question
    if (!messages.some(m => m.role === "user" && m.content === question)) {
      messages.push({ role: "user", content: question });
    }

    // Call OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.3, // Lower temperature for more factual responses
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "I couldn't generate a ruling for this question.";
  } catch (error: any) {
    console.error("Error getting ruling from OpenAI:", error);
    throw new Error("Failed to get ruling: " + (error?.message || "Unknown error"));
  }
}
