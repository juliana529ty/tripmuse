
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  // 1. 检查服务器环境变量
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !serviceRoleKey ||
    !deepseekApiKey
  ) {
    console.error("Missing required environment variables");

    return Response.json(
      {
        error:
          "服务器环境变量配置不完整，请检查 Supabase 和 DeepSeek 配置。",
      },
      { status: 500 }
    );
  }

  // 2. 获取登录 Token
  const authorization =
    request.headers.get("authorization");

  const accessToken =
    authorization &&
    authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

  if (!accessToken) {
    return Response.json(
      {
        error: "请先登录后再生成旅行计划。",
      },
      { status: 401 }
    );
  }

  // 3. 使用用户 Token 验证身份
  const supabaseAuth = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser(accessToken);

  if (userError || !user) {
    console.error("Auth error:", userError);

    return Response.json(
      {
        error: "登录状态已失效，请重新登录。",
      },
      { status: 401 }
    );
  }

  // 4. 读取前端表单
  let body;

  try {
    body = await request.json();
  } catch (error) {
    console.error("Invalid request body:", error);

    return Response.json(
      {
        error: "请求内容格式错误。",
      },
      { status: 400 }
    );
  }

  // 同时兼容 destination 和 city 等字段名称
  const destination = String(
    body?.destination ??
      body?.city ??
      body?.location ??
      ""
  ).trim();

  const days = String(
    body?.days ??
      body?.duration ??
      body?.tripDays ??
      ""
  ).trim();

  const budget = String(
    body?.budget ??
      body?.tripBudget ??
      ""
  ).trim();

  const preferences = String(
    body?.preferences ??
      body?.preference ??
      body?.interests ??
      ""
  ).trim();

  if (!destination || !days || !budget) {
    return Response.json(
      {
        error: "请填写目的地、旅行天数和预算。",
      },
      { status: 400 }
    );
  }

  // 5. 创建 Supabase 管理端客户端
  const supabaseAdmin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 6. 获取用户套餐和剩余次数
  const {
    data: existingProfile,
    error: profileError,
  } = await supabaseAdmin
    .from("users")
    .select("id, email, plan, credits")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Load profile failed:", profileError);

    return Response.json(
      {
        error: "读取用户套餐失败，请稍后重试。",
      },
      { status: 500 }
    );
  }

  let plan =
    existingProfile?.plan === "pro"
      ? "pro"
      : "free";

  let credits =
    plan === "pro"
      ? -1
      : typeof existingProfile?.credits === "number"
        ? existingProfile.credits
        : 3;

  // 用户记录不存在时自动创建
  if (!existingProfile) {
    const { error: createProfileError } =
      await supabaseAdmin.from("users").insert({
        id: user.id,
        email: user.email ?? null,
        plan: "free",
        credits: 3,
      });

    if (createProfileError) {
      console.error(
        "Create user profile failed:",
        createProfileError
      );

      return Response.json(
        {
          error: "创建用户记录失败，请稍后重试。",
        },
        { status: 500 }
      );
    }

    plan = "free";
    credits = 3;
  }

  // 7. 检查免费次数
  if (plan !== "pro" && credits <= 0) {
    return Response.json(
      {
        error:
          "免费生成次数已用完，请升级 TripMuse Pro。",
        code: "FREE_LIMIT_REACHED",
        plan: "free",
        creditsRemaining: 0,
      },
      { status: 403 }
    );
  }

  try {
    // 8. 调用 DeepSeek
    const deepseekResponse = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: `
你是 TripMuse 的专业中文旅行规划师。

请根据用户提供的目的地、天数、预算和偏好，
生成真实、清晰、实用、可以直接执行的旅行计划。

必须严格使用下面的文本格式：

🗺️ 行程

Day 1
🌅 上午行程内容
🌞 下午行程内容
🌙 晚上行程内容
💡 当天的一条实用提示

Day 2
🌅 上午行程内容
🌞 下午行程内容
🌙 晚上行程内容
💡 当天的一条实用提示

按照用户提供的天数继续生成所有 Day。

每一天都必须同时包含以下四行：
🌅 上午
🌞 下午
🌙 晚上
💡 当天提示

绝对不能让 💡 后面为空。
每天的 💡 提示应结合当天安排，包含预约、交通、
开放时间、天气、安全、排队、消费或避坑建议。

行程之后必须继续输出：

💰 预算建议
说明住宿、餐饮、交通、门票和机动费用的大致分配。

💡 旅行 Tips
- 至少提供 5 条额外旅行建议
- 包含交通、预约、天气、安全、当地习惯和消费避坑
- 每条建议都必须以 "- " 开头

要求：
1. 不要输出 JSON。
2. 不要输出 Markdown 代码块。
3. 不要使用表格。
4. 不要省略任何一天。
5. 不要让任何 💡 行为空。
6. 不要添加与行程无关的解释。
              `.trim(),
            },
            {
              role: "user",
              content: `
目的地：${destination}
旅行天数：${days}
旅行预算：${budget}
旅行偏好：${preferences || "无特别要求"}

请严格按照指定格式生成完整旅行计划。
              `.trim(),
            },
          ],
        }),
      }
    );

    let deepseekData;

    try {
      deepseekData = await deepseekResponse.json();
    } catch (error) {
      console.error(
        "DeepSeek response is not JSON:",
        error
      );

      throw new Error("AI 服务返回格式错误");
    }

    if (!deepseekResponse.ok) {
      console.error("DeepSeek API error:", deepseekData);

      throw new Error(
        deepseekData?.error?.message ||
          "DeepSeek 请求失败"
      );
    }

    let result = String(
      deepseekData?.choices?.[0]?.message?.content ??
        ""
    )
      .replace(/^```(?:markdown|text)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (!result) {
      throw new Error("AI 没有返回旅行计划");
    }

    // 9. 每日 Tips 保底
    // 如果某个 Day 区块没有 💡 内容，就自动补充
    const dayPattern =
      /(Day\s*\d+[\s\S]*?)(?=Day\s*\d+|💰\s*预算建议|💡\s*旅行\s*Tips|$)/gi;

    result = result.replace(
      dayPattern,
      (dayBlock) => {
        const tipMatch = dayBlock.match(
          /💡\s*(.+)/i
        );

        const hasValidTip =
          tipMatch &&
          tipMatch[1] &&
          tipMatch[1].trim().length >= 4;

        if (hasValidTip) {
          return dayBlock.trimEnd() + "\n\n";
        }

        return (
          dayBlock.trimEnd() +
          "\n💡 热门景点建议提前预约，并为交通和排队预留时间。\n\n"
        );
      }
    );

    // 10. 全局旅行 Tips 保底
    const globalTipsMatch = result.match(
      /💡\s*(?:旅行\s*)?Tips[：:\s]*([\s\S]*)$/i
    );

    const globalTipsContent =
      globalTipsMatch?.[1]?.trim() ?? "";

    if (
      !globalTipsMatch ||
      globalTipsContent.length < 20
    ) {
      result += `

💡 旅行 Tips
- 出发前查看当地天气，准备雨具、防晒或保暖衣物。
- 热门景点建议提前预约门票，避开周末和节假日高峰。
- 使用正规出租车、网约车或公共交通，注意保管证件和手机。
- 景点和餐厅营业时间可能调整，出发前请再次确认。
- 行程之间预留交通和休息时间，不要安排得过于紧张。
- 对明显低价、强制消费和陌生人的推销保持警惕。`;
    }

    // 11. AI 成功后再扣除免费次数
    let creditsRemaining = credits;

    if (plan !== "pro") {
      creditsRemaining = Math.max(
        credits - 1,
        0
      );

      const { error: creditError } =
        await supabaseAdmin
          .from("users")
          .update({
            credits: creditsRemaining,
          })
          .eq("id", user.id);

      if (creditError) {
        console.error(
          "Update credits failed:",
          creditError
        );
      }
    }

    // 保持前端原有格式：result 是完整文本
    return Response.json({
      result,
      plan,
      creditsRemaining:
        plan === "pro"
          ? -1
          : creditsRemaining,
    });
  } catch (error) {
    console.error("Generate trip failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "生成旅行计划失败，请稍后重试。",
      },
      { status: 500 }
    );
  }
}

