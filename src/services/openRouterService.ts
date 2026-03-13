
export async function extractTasksWithOpenRouter(text: string, model: string = "openrouter/auto", customApiKey: string | null = null) {
  // API key must be provided by the user via Settings > Integrations (stored in localStorage)
  // NEVER hardcode keys here — OpenRouter auto-revokes keys found in public repos
  const apiKey = customApiKey?.trim() || null;

  if (!apiKey) {
    console.error("AI: No OpenRouter API key configured. Please add your key in Settings > Integrations.");
    return [];
  }

  console.log(`AI: Using key starting with: ${apiKey.substring(0, 12)}...`);
  console.log(`AI: Using model: ${model}`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://mentalloados.vercel.app",
      "X-Title": "MentalLoadOS",
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
  
  if (!response.ok) {
    const errorMsg = data.error?.message || JSON.stringify(data);
    console.error("OpenRouter API Error:", response.status, errorMsg);
    return [];
  }

  try {
    let content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("OpenRouter returned no content", data);
      return [];
    }

    // Strip markdown code blocks if the AI included them
    const cleanedContent = content.replace(/```json\n?|```/g, '').trim();
    
    const parsed = JSON.parse(cleanedContent);
    return Array.isArray(parsed) ? parsed : (parsed.tasks || []);
  } catch (e) {
    console.error("Failed to parse OpenRouter response", e, data);
    return [];
  }
}
