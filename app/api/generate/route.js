import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !serviceRoleKey ||
    !deepseekApiKey
  ) {
    console.error("Missing environment variables");

    return Response.json(
      { error: "服务器环境变量配置不完整" },
      { status: 500 }
    );
  }

  // 1. 获取登录 Token
  const authorization = request.headers.get("authorization");

  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!accessToken) {
    return Response.json(
      { error: "请先登录后再生成旅行计划" },
      { status: 401 }
    );
  }

  // 2. 验证当前用户
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
    return Response.json(
      { error: "登录状态已失效，请重新登录" },
      { status: 401 }
    );
  }

  // 3. 读取表单内容
  let body: {
    destination?: string;
    days?: string | number;
    budget?: string | number;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "请求内容格式错误" },
      { status: 400 }
    );
  }

  const destination = String(body.destination ?? "").trim();
  const days = String(body.days ?? "").trim();
  const budget = String(body.budget ?? "").trim();

  if (!destination || !days || !budget) {
    return Response.json(
      { error: "请填写目的地、天数和预算" },
      { status: 400 }
    );
  }

  // 4. 管理端 Supabase
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

  // 5. 获取套餐与剩余次数
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
      { error: "读取用户套餐失败" },
      { status: 500 }
    );
  }

  let plan: "free" | "pro" =
    existingProfile?.plan === "pro" ? "pro" : "free";

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
        "Create profile failed:",
        createProfileError
      );

      return Response.json(
        { error: "创建用户记录失败" },
        { status: 500 }
      );
    }

    plan = "free";
    credits = 3;
  }

  if (plan !== "pro" && credits <= 0) {
    return Response.json(
      {
        error: "免费生成次数已用完，请升级 TripMuse Pro",
        code: "FREE_LIMIT_REACHED",
        plan: "free",
        creditsRemaining: 0,
      },
      { status: 403 }
    );
  }

  try {
    // 6. 调用 DeepSeek
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
你是 TripMuse 的专业旅行规划师。

你的任务是根据用户提供的目的地、旅行天数和预算，
生成清晰、实用、可直接执行的中文旅行计划。

必须严格包含以下部分：

🗺️ 行程概览

📅 Day 1
上午：
下午：
晚上：
交通建议：
餐饮建议：

按照旅行天数继续生成 Day 2、Day 3 等内容。

💰 预算建议

💡 Tips
- 至少生成 5 条实用建议
- 必须包含交通、预约、天气、安全、当地习惯或避坑信息
- Tips 标题下面绝对不能留空
- 每条建议必须以 “- ” 开头

不要输出 JSON。
不要输出 Markdown 代码块。
不要省略 Tips。
              `.trim(),
            },
            {
              role: "user",
              content: `
目的地：${destination}
旅行天数：${days}
旅行预算：${budget}

请生成完整的个性化旅行计划。
              `.trim(),
            },
          ],
        }),
      }
    );

    const deepseekData = await deepseekResponse.json();

    if (!deepseekResponse.ok) {
      console.error("DeepSeek error:", deepseekData);

      throw new Error(
        deepseekData?.error?.message ||
          "DeepSeek 请求失败"
      );
    }

    let result = String(
      deepseekData?.choices?.[0]?.message?.content ?? ""
    ).trim();

    if (!result) {
      throw new Error("AI 没有返回旅行计划");
    }

    // 7. Tips 保底
    const hasTipsTitle =
      /(?:💡\s*)?(?:Tips|旅行贴士|实用提醒|注意事项)/i.test(
        result
      );

    const tipsSectionMatch = result.match(
      /(?:💡\s*)?(?:Tips|旅行贴士|实用提醒|注意事项)[：:\s]*([\s\S]*)$/i
    );

    const tipsContent =
      tipsSectionMatch?.[1]?.trim() ?? "";

    const tipsAreEmpty =
      !hasTipsTitle || tipsContent.length < 10;

    if (tipsAreEmpty) {
      result += `

💡 Tips
- 出发前查看当地天气，并根据天气准备雨具、防晒用品或保暖衣物。
- 热门景点建议提前预约门票，避开周末和节假日高峰时段。
- 使用正规出租车、网约车或公共交通，注意保管手机、证件和现金。
- 餐厅和景点营业时间可能临时调整，出发前请再次确认。
- 行程之间预留足够交通和休息时间，避免安排得过于紧张。
- 对陌生人的低价推荐和强制消费保持警惕，付款前先确认价格。`;
    }

    // 8. AI 成功后再扣除免费次数
    let creditsRemaining = credits;

    if (plan !== "pro") {
      creditsRemaining = Math.max(credits - 1, 0);

      const { error: creditError } = await supabaseAdmin
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

    return Response.json({
      result,
      plan,
      creditsRemaining:
        plan === "pro" ? -1 : creditsRemaining,
    });
  } catch (error) {
    console.error("Generate trip failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "生成旅行计划失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}