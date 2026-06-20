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
          messages: [
            {
              role: "system",
              content:
                "你是 TripMuse 的结构化旅行规划引擎。你只能输出严格 JSON，禁止 Markdown，禁止解释，禁止多余文字。",
            },
            {
              role: "user",
              content: `
请根据用户需求生成旅行攻略。

用户需求：
${prompt}

必须严格输出以下 JSON 结构：

{
  "title": "旅行标题",
  "overview": "旅行概览",
  "days": [
    {
      "day": 1,
      "morning": "上午安排",
      "afternoon": "下午安排",
      "evening": "晚上安排",
      "tip": "当天建议"
    }
  ],
  "food": ["美食1", "美食2", "美食3"],
  "spots": ["拍照打卡点1", "拍照打卡点2"],
  "tips": ["避坑提醒1", "避坑提醒2"],
  "budget": {
    "hotel": "住宿预算",
    "food": "餐饮预算",
    "transport": "交通预算",
    "ticket": "门票预算",
    "extra": "其他预算"
  }
}

重要规则：
1. 只输出 JSON。
2. 不要使用 markdown。
3. 不要写解释。
4. 必须严格使用用户输入的目的地。
5. 不允许把目的地换成其他城市。
`,
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