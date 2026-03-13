import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function extractTasksFromText(text: string, apiKey: string) {
  if (!apiKey) {
    console.error("Gemini API key is missing. Please set it in Settings > Integrations.");
    return [];
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            category: { type: SchemaType.STRING },
            effort_score: { type: SchemaType.NUMBER },
            urgency_score: { type: SchemaType.NUMBER },
            decision_score: { type: SchemaType.NUMBER },
            participants: { type: SchemaType.NUMBER },
            worry_score: { type: SchemaType.NUMBER },
            due_date: { type: SchemaType.STRING },
          },
          required: ["title", "category", "effort_score", "urgency_score", "decision_score", "participants", "worry_score"]
        }
      }
    }
  });

  try {
    const result = await model.generateContent(`Extract tasks from the following brain dump text. For each task, provide:
    - title: short descriptive title
    - description: brief details
    - category: one of (Work, Family, Finance, Health, Admin, Social)
    - effort_score: 1-10 (mental energy)
    - urgency_score: 1-10 (time pressure)
    - decision_score: 1-8 (complexity)
    - participants: number of people involved
    - worry_score: 0-10 (emotional stress)
    - due_date: YYYY-MM-DD format if date mentioned, else null (Today is ${new Date().toISOString().split('T')[0]})
    
    Text: "${text}"`);

    const response = result.response;
    return JSON.parse(response.text() || "[]");
  } catch (e: any) {
    console.error("Gemini AI error:", e.message || e);
    return [];
  }
}
