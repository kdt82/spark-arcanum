import fs from 'fs';
import { db } from './db';
import { rules } from '@shared/schema';

/**
 * Parse and update the comprehensive rules database
 * This will clear existing rules and load the latest version
 */
export async function updateRulesDatabase(filePath: string): Promise<void> {
  console.log('Starting rules database update...');
  
  try {
    // Read the comprehensive rules file
    const rulesText = fs.readFileSync(filePath, 'utf-8');
    
    // Clear existing rules
    await db.delete(rules);
    console.log('Cleared existing rules');
    
    // Parse the rules text
    const parsedRules = parseComprehensiveRules(rulesText);
    console.log(`Parsed ${parsedRules.length} rules`);
    
    // Insert rules in batches
    const batchSize = 100;
    for (let i = 0; i < parsedRules.length; i += batchSize) {
      const batch = parsedRules.slice(i, i + batchSize);
      await db.insert(rules).values(batch);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(parsedRules.length / batchSize)}`);
    }
    
    console.log('Rules database update completed successfully');
  } catch (error) {
    console.error('Error updating rules database:', error);
    throw error;
  }
}

/**
 * Parse the comprehensive rules text into structured data
 */
function parseComprehensiveRules(rulesText: string): any[] {
  const rules: any[] = [];
  
  // Find where the actual rules content starts (after "1. Game Concepts")
  const startIndex = rulesText.indexOf('1. Game Concepts');
  if (startIndex === -1) {
    console.log('Could not find "1. Game Concepts" in the rules text');
    return rules;
  }
  
  let cleanText = rulesText.substring(startIndex);
  
  // The text is all concatenated, so we need to find rule patterns in the continuous text
  // Match patterns like "100.1. " or "100.1a. " followed by rule text
  const rulePattern = /(\d{3}\.\d+[a-z]*)\.\s+([^0-9]*?)(?=\d{3}\.\d+[a-z]*\.|$)/g;
  
  let currentChapter = 'Game Concepts';
  let currentSection = '';
  
  // Extract chapters and sections
  const chapterPattern = /(\d+)\.\s+([A-Z][^0-9]*?)(?=\d{3}\.)/g;
  let chapterMatch;
  const chapters: {[key: number]: string} = {};
  
  while ((chapterMatch = chapterPattern.exec(cleanText)) !== null) {
    const chapterNum = parseInt(chapterMatch[1]);
    chapters[chapterNum] = chapterMatch[2].trim();
  }
  
  // Extract sections like "100. General"
  const sectionPattern = /(\d{3})\.\s+([A-Z][^0-9]*?)(?=\d{3}\.\d+)/g;
  let sectionMatch;
  const sections: {[key: number]: string} = {};
  
  while ((sectionMatch = sectionPattern.exec(cleanText)) !== null) {
    const sectionNum = parseInt(sectionMatch[1]);
    sections[sectionNum] = sectionMatch[2].trim();
  }
  
  // Now extract individual rules
  let ruleMatch;
  while ((ruleMatch = rulePattern.exec(cleanText)) !== null) {
    const ruleNumber = ruleMatch[1];
    const ruleText = ruleMatch[2].trim();
    
    if (ruleText.length > 10) { // Filter out very short matches
      // Determine chapter and section from rule number
      const rulePrefix = parseInt(ruleNumber.split('.')[0]);
      const chapterNum = Math.floor(rulePrefix / 100);
      
      currentChapter = chapters[chapterNum] || currentChapter;
      currentSection = sections[rulePrefix] || currentSection;
      
      rules.push(createRuleEntry(ruleNumber, ruleText, currentChapter, currentSection));
    }
  }
  
  return rules;
}

/**
 * Create a rule entry for database insertion
 */
function createRuleEntry(ruleNumber: string, text: string, chapter: string, section: string): any {
  // Extract examples from the text
  const examples: string[] = [];
  const exampleRegex = /Example:\s*([^.]*\.)/g;
  let match;
  while ((match = exampleRegex.exec(text)) !== null) {
    examples.push(match[1].trim());
  }
  
  // Extract keywords from the text
  const keywords: string[] = [];
  const keywordMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (keywordMatches) {
    keywords.push(...keywordMatches.slice(0, 10)); // Limit to 10 keywords
  }
  
  // Determine subsection
  const subsection = ruleNumber.includes('.') ? ruleNumber.split('.')[1] : '';
  
  return {
    ruleNumber,
    text: text.replace(/Example:\s*[^.]*\./g, '').trim(), // Remove examples from main text
    examples,
    keywords,
    chapter,
    section,
    subsection,
    relatedRules: [] // Could be enhanced to find related rules
  };
}

/**
 * Update rules from the attached comprehensive rules file
 */
export async function updateRulesFromFile(): Promise<void> {
  const filePath = './attached_assets/MagicCompRules.txt';
  
  if (!fs.existsSync(filePath)) {
    throw new Error('Comprehensive rules file not found');
  }
  
  await updateRulesDatabase(filePath);
}

/**
 * Update rules by downloading the latest version from Wizards of the Coast
 */
export async function updateRulesFromWotc(): Promise<{success: boolean, message: string}> {
  try {
    const https = await import('https');
    const path = await import('path');
    
    // Check if rules were updated recently (within last 7 days)
    const { rules } = await import('@shared/schema');
    const existingRules = await db.select().from(rules).limit(1);
    
    if (existingRules.length > 0) {
      const lastUpdate = existingRules[0].createdAt;
      const daysSinceUpdate = lastUpdate ? (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24) : 30;
      
      if (daysSinceUpdate < 7) {
        return {
          success: true,
          message: `Rules were updated ${Math.round(daysSinceUpdate)} days ago. Skipping update.`
        };
      }
    }
    
    console.log('Downloading latest comprehensive rules from Wizards of the Coast...');
    
    // Download the latest comprehensive rules
    const rulesUrl = 'https://media.wizards.com/2025/downloads/MagicCompRules%2020250404.txt';
    const tempDir = './temp';
    const tempFilePath = path.join(tempDir, 'MagicCompRules_latest.txt');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tempFilePath);
      
      https.get(rulesUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          
          file.on('finish', async () => {
            file.close();
            
            try {
              // Update the rules database with the downloaded file
              await updateRulesDatabase(tempFilePath);
              
              // Clean up temp file
              fs.unlinkSync(tempFilePath);
              
              resolve({
                success: true,
                message: 'Comprehensive rules updated successfully from official source'
              });
            } catch (updateError: any) {
              reject(new Error(`Failed to process downloaded rules: ${updateError.message}`));
            }
          });
          
          file.on('error', (err) => {
            fs.unlinkSync(tempFilePath);
            reject(new Error(`Failed to save rules file: ${err.message}`));
          });
        } else {
          reject(new Error(`Failed to download rules. HTTP status: ${response.statusCode}`));
        }
      }).on('error', (err) => {
        reject(new Error(`Network error downloading rules: ${err.message}`));
      });
    });
    
  } catch (error: any) {
    console.error('Error updating rules from WotC:', error);
    
    // Fallback to local file if available
    try {
      await updateRulesFromFile();
      return {
        success: true,
        message: 'Used local comprehensive rules file as fallback'
      };
    } catch (fallbackError: any) {
      return {
        success: false,
        message: `Failed to update rules: ${error.message}. Fallback also failed: ${fallbackError.message}`
      };
    }
  }
}