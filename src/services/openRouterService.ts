

const OPENROUTER_FREE_KEY = "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";

export async function extractTasksWithOpenRouter(text: string, model: string = "openrouter/auto", customApiKey: string | null = null) {
  const isPaidModel = !model.includes("free") && model !== "openrouter/auto";
  const apiKey = customApiKey || OPENROUTER_FREE_KEY;
  
  // If model is paid but no custom key, fallback to auto
  const finalModel = (isPaidModel && !customApiKey) ? "openrouter/auto" : model;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://mentalloados.local", // Optional, for OpenRouter rankings
      "X-Title": "MentalLoadOS", // Optional, for OpenRouter rankings
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": model,
      "messages": [
        {
          "role": "system",
          "content": `Extract tasks from the brain dump text. Respond ONLY with a JSON array of objects.
          Each object must have:
          - title: short descriptive title
          - description: brief details
          - category: one of (Work, Family, Finance, Health, Admin, Social)
          - effort_score: 1-10 (mental energy)
          - urgency_score: 1-10 (time pressure)
          - decision_score: 1-8 (complexity)
          - participants: number of people involved
          - worry_score: 0-10 (emotional stress)
          - due_date: YYYY-MM-DD format if date mentioned, else null (Today is ${new Date().toISOString().split('T')[0]})`
        },
        {
          "role": "user",
          "content": text
        }
      ],
      "response_format": { "type": "json_object" }
    })
  });

  const data = await response.json();
  
  try {
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    // OpenRouter might return { "tasks": [...] } or just [...]
    return Array.isArray(parsed) ? parsed : (parsed.tasks || []);
  } catch (e) {
    console.error("Failed to parse OpenRouter response", e, data);
    return [];
  }
}
