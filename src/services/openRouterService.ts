

const OPENROUTER_FREE_KEY = "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";

export async function extractTasksWithOpenRouter(text: string, model: string = "openrouter/free", customApiKey: string | null = null) {
  const isPaidModel = !model.includes("free") && model !== "openrouter/auto";
  
  // Sanitize key: ensure no "null" strings or whitespace
  const cleanCustomKey = (customApiKey && customApiKey.trim() !== "" && customApiKey !== "null" && customApiKey !== "undefined") ? customApiKey.trim() : null;
  const apiKey = cleanCustomKey || OPENROUTER_FREE_KEY;
  
  console.log(`AI: Using key starting with: ${apiKey.substring(0, 8)}...`);

  // If model is paid but no custom key, fallback to a guaranteed free model
  const finalModel = (isPaidModel && !cleanCustomKey) ? "openrouter/free" : model;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://mentalloados.local",
      "X-Title": "MentalLoadOS",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": finalModel,
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
  
  if (!response.ok) {
    const errorMsg = data.error?.message || JSON.stringify(data);
    console.error("OpenRouter API Detailed Error:", response.status, errorMsg);
    
    // Explicitly alert common errors
    if (response.status === 401) {
      if (errorMsg.toLowerCase().includes("user not found")) {
        console.error("AI: CRITICAL - The API key provided is INVALID or the account was deleted. Please generate a NEW key at https://openrouter.ai/keys");
      } else {
        console.error("AI: Authentication failed. Please check your key or credits/limits at OpenRouter.");
      }
    }
    return [];
  }

  try {
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("OpenRouter returned no content", data);
      return [];
    }
    const parsed = JSON.parse(content);
    // OpenRouter might return { "tasks": [...] } or just [...]
    return Array.isArray(parsed) ? parsed : (parsed.tasks || []);
  } catch (e) {
    console.error("Failed to parse OpenRouter response content", e, data);
    return [];
  }
}
