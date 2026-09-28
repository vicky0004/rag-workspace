import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GENERATION_MODELS = [
  'gemini-3.5-flash-lite',   // 500/day, 15 RPM: best primary
  'gemini-3.1-flash-lite',   // 500/day, 15 RPM
  'gemini-3.6-flash',        // 20/day, best quality still unused
  'gemini-3-flash',          // 20/day
  'gemini-2.5-flash',        // 20/day
  'gemini-2.5-flash-lite',   // 20/day
];

/**
 * Embed a single text string using Gemini (768-dim)
 */
export async function embedText(text, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });

      const values = result?.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new Error('Gemini returned empty embedding');
      }
      return values;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Call Gemini with optional tool definitions, retry on 503/429 and fallback models.
 */
export async function callGemini(prompt, tools = [], retries = 2) {
  const config = {};
  if (tools.length > 0) {
    config.tools = [{ functionDeclarations: tools }];
  }

  let lastError;

  for (const model of GENERATION_MODELS) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: prompt,
          config,
        });
        return result;
      } catch (err) {
        lastError = err;
        console.warn(`[callGemini] Attempt ${attempt} on ${model} failed (${err.status || err.message}). Retrying...`);
        // If 503/429/temporary, wait and retry
        if (err.status === 503 || err.status === 429 || err.status === 500) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        } else {
          // Model might not support something or not exist, try next model
          break;
        }
      }
    }
  }

  throw lastError;
}

export { ai };
