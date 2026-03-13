import { extractTasksFromText as extractWithGemini } from './geminiService';
import { extractTasksWithOpenRouter as extractWithOpenRouter } from './openRouterService';

export async function extractTasks(text: string, provider: string, model: string, openrouterApiKey: string | null, geminiApiKey: string | null) {
  if (provider === 'gemini') {
    if (!geminiApiKey) {
      console.error("Gemini API key is missing. Please set it in Settings > Integrations.");
      return [];
    }
    return extractWithGemini(text, geminiApiKey);
  } else {
    return extractWithOpenRouter(text, model, openrouterApiKey);
  }
}
