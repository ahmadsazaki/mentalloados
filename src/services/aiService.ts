import { extractTasksFromText as extractWithGemini } from './geminiService';
import { extractTasksWithOpenRouter as extractWithOpenRouter } from './openRouterService';

export async function extractTasks(text: string, provider: string, model: string, apiKey: string | null) {
  if (provider === 'gemini') {
    return extractWithGemini(text);
  } else {
    return extractWithOpenRouter(text, model, apiKey);
  }
}
