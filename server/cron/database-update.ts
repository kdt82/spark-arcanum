import { mtgJsonService } from "../mtg/mtgjson-service";
import { db } from "../db";
import { dbMetadata } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Database update cron job
 * This function is designed to be run on a schedule to keep both the card database and rules updated
 */
export async function updateCardDatabase() {
  try {
    console.log("Starting scheduled database update...");
    
    // Check when the database was last updated
    const [lastUpdate] = await db.select().from(dbMetadata).where(eq(dbMetadata.id, "card_database"));
    
    // If it's been less than 24 hours since the last update, skip
    if (lastUpdate && lastUpdate.last_updated) {
      const lastUpdateTime = new Date(lastUpdate.last_updated);
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.getTime();
      const hoursSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60);
      
      // Skip if updated in the last 24 hours
      if (hoursSinceLastUpdate < 24) {
        console.log(`Database was updated ${hoursSinceLastUpdate.toFixed(1)} hours ago. Skipping update.`);
        return {
          success: true,
          message: "Database is up to date",
          last_updated: lastUpdate.last_updated
        };
      }
    }
    
    // Run the card database update
    console.log("Starting card database update...");
    const cardResult = await mtgJsonService.completeCardDatabaseUpdate();
    
    // Run the comprehensive rules update
    console.log("Starting comprehensive rules update...");
    let rulesResult = { success: true, message: "Rules update skipped - no update needed" };
    
    try {
      // Check if we need to update rules (only download latest rules if needed)
      const { updateRulesFromWotc } = await import('../rules-updater');
      rulesResult = await updateRulesFromWotc();
      console.log("Rules update result:", rulesResult.message);
    } catch (rulesError: any) {
      console.error("Error updating rules:", rulesError);
      rulesResult = {
        success: false,
        message: `Rules update failed: ${rulesError.message}`
      };
    }
    
    // Update the metadata with the current time
    if (cardResult.success) {
      const now = new Date();
      const description = `${cardResult.message}. ${rulesResult.message}`;
      
      await db
        .insert(dbMetadata)
        .values({
          id: "card_database",
          last_updated: now,
          description,
          total_cards: await getCardCount()
        })
        .onConflictDoUpdate({
          target: dbMetadata.id,
          set: {
            last_updated: now,
            description,
            total_cards: await getCardCount()
          }
        });
      
      console.log("Database and rules update completed successfully");
    } else {
      console.error("Card database update failed:", cardResult.message);
    }
    
    return {
      success: cardResult.success && rulesResult.success,
      message: `Cards: ${cardResult.message}. Rules: ${rulesResult.message}`,
      cardResult,
      rulesResult
    };
  } catch (error: any) {
    console.error("Error updating card database:", error);
    return {
      success: false,
      message: `Error updating database: ${error.message}`
    };
  }
}

/**
 * Get the total number of cards in the database
 */
async function getCardCount(): Promise<number> {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM cards`);
    if (result && Array.isArray(result) && result.length > 0) {
      return parseInt(result[0].count as string);
    }
    return 0;
  } catch (error) {
    console.error("Error counting cards:", error);
    return 0;
  }
}