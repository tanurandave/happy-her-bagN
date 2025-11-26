import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Product } from "../types";

// NOTE: In production, API calls should be proxied through a backend to hide the key.
// For this frontend demo, we access it from env.
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const generateProductRecommendation = async (
  query: string, 
  availableProducts: Product[]
): Promise<string> => {
  if (!ai) {
    return "I'm sorry, my AI brain isn't connected right now (Missing API Key).";
  }

  // Create a context string with available products
  const productContext = availableProducts.map(p => 
    `- ${p.name} ($${p.price}): ${p.description} (Category: ${p.category})`
  ).join('\n');

  const systemInstruction = `
    You are a helpful and enthusiastic shopping assistant for "Lumina E-Commerce". 
    Your goal is to help customers find the best products from our catalog.
    
    Here is our current product catalog:
    ${productContext}

    Rules:
    1. Only recommend products from the catalog above.
    2. If the user asks for something we don't have, politely suggest a related alternative from the catalog or say we don't have it.
    3. Be concise and friendly.
    4. Mention the price when recommending.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    
    return response.text || "I couldn't generate a recommendation at this time.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "I'm having trouble connecting to the server right now.";
  }
};

export const performSemanticSearch = async (
  userQuery: string,
  allProducts: Product[]
): Promise<string[]> => {
  if (!ai) return [];

  // Lightweight representation of products for the LLM to save tokens
  const catalog = allProducts.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User Query: "${userQuery}"\n\nTask: Return a JSON array of strings containing ONLY the product IDs from the catalog below that best match the user's query. Consider synonyms (e.g., 'gown' for 'dress', 'cheap' for low price). If no products match, return an empty array.\n\nCatalog: ${JSON.stringify(catalog)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Semantic Search Error:", error);
    return [];
  }
};

export const getCuratedRecommendations = async (
  allProducts: Product[]
): Promise<string[]> => {
  if (!ai) return [];

  const catalog = allProducts.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Pick 4 distinct product IDs that would make a great 'Trending Now' collection. Mix categories if possible.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Curated Recs Error:", error);
    return [];
  }
};