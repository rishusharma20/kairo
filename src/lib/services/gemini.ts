import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHealthyKeyForUser, markKeyCooldown, NoHealthyKeyError } from "@/lib/services/keys";
import { buildPrompt, QueryFeature, ResponseFormat } from "@/lib/services/prompts";
import { logSystemEventInBackground } from "@/lib/services/audit";

export async function processGeminiQuery(
  userId: string,
  feature: QueryFeature,
  query: string,
  format: ResponseFormat,
  context?: string
) {
  const prompt = buildPrompt({ feature, query, format, context });
  
  // We will loop to naturally exhaust available healthy keys before giving up
  const MAX_RETRIES = 3; 
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let key;
    try {
      key = await getHealthyKeyForUser(userId);
    } catch (error) {
      if (error instanceof NoHealthyKeyError) {
        throw new Error("No healthy Gemini key available.");
      }
      throw error;
    }

    try {
      // NOTE: For Phase-5 we assume `encrypted_api_key` stores the raw API key.
      // In a fully productionized vault, you would decrypt this string here securely.
      const genAI = new GoogleGenerativeAI(key.encrypted_api_key);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Call API
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();

    } catch (apiError: any) {
      console.error(`Gemini API Error with key ${key.id}:`, apiError);
      
      // If it's a rate limit (429) or temporary server error (500/503)
      const isTemporary = apiError.status === 429 || apiError.status >= 500 || apiError.message?.includes('fetch failed');
      
      if (isTemporary || apiError.status === 400 || apiError.status === 401 || apiError.status === 403) {
        // Punish the key with a 5 minute timeout and proceed to the next iteration
        await markKeyCooldown(key.id);
        console.log(`Key ${key.id} placed in cooldown. Retrying...`);
        
        // Phase-6: Log the failover
        logSystemEventInBackground("GEMINI_FAILOVER", userId, { 
          key_id: key.id, 
          error: apiError.message || apiError.status 
        });
        
        continue;
      }
      
      // For any other unexpected error, we throw
      throw new Error("Gemini API Error");
    }
  }

  throw new Error("No healthy Gemini key available.");
}
