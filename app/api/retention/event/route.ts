import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { userId, event } = await request.json();

  await supabase.from("analytics_events").insert({
    user_id: userId,
    event,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });

  return Response.json({ ok: true });
}