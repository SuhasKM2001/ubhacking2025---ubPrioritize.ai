import {
  GoogleGenAI,
  createUserContent,
} from "@google/genai";
import 'dotenv/config';

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  // apiKey: "AIzaSyB5yuTzz-36TsJA40NU8tId-SCzJvnckt4"
});

/**
 * Call Gemini with a plain text prompt. Returns raw text.
 * @param {string} prompt
 * @param {string} model default "gemini-2.5-flash"
 * @returns {Promise<string>}
 */
export async function callGemini(prompt, model = "gemini-2.5-flash") {
  const contents = createUserContent([prompt]);

  const resp = await genAI.models.generateContent({
    model,
    contents,
  });

  // SDK may expose either .text or .response.text()
  const text =
    resp?.text ??
    resp?.response?.text?.() ??
    "";

  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
}

/**
 * Safely extract a JSON object from a model response string.
 * If the model returns prose + JSON, this finds the outermost {...}.
 * @param {string} text
 * @returns {any}
 */
export function extractJson(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Gemini did not return valid JSON. Response was: " + text);
  }
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}
