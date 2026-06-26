export async function generateTrip(prompt) {
  try {
    const response = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are TripMuse, a structured travel planning engine. Return strict JSON only. Do not use markdown or explanations.",
            },
            {
              role: "user",
              content: JSON.stringify({
                request: prompt,
                requiredShape: {
                  title: "string",
                  overview: "string",
                  days: [
                    {
                      day: 1,
                      morning: "string",
                      afternoon: "string",
                      evening: "string",
                      tip: "string",
                    },
                  ],
                  food: ["string"],
                  spots: ["string"],
                  tips: ["string"],
                  budget: {
                    hotel: "string",
                    food: "string",
                    transport: "string",
                    ticket: "string",
                    extra: "string",
                  },
                },
              }),
            },
          ],
        }),
      }
    );

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("DeepSeek error:", error);
    return null;
  }
}
