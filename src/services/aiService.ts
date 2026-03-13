import { extractTasksWithOpenRouter } from './openRouterService';

export async function extractTasks(text: string, model: string, apiKey: string | null) {
  return extractTasksWithOpenRouter(text, model, apiKey);
}
