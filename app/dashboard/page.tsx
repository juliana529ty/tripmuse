"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState("free");
  const [credits, setCredits] = useState(3);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    load();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("users")
        .select("plan, credits")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) return;

      setPlan(data.plan);
      setCredits(data.credits);
    };

    loadProfile();
  }, [user?.id]);

  const upgrade = async () => {
    const { data } = await supabase.auth.getSession();

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session?.access_token}`,
      },
    });

    const json = await res.json();

    window.location.href = json.url;
  };

  return (
    <div className="p-10 space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="border p-4 rounded">
        <p>Plan: {plan}</p>
        <p>Credits: {credits}</p>
      </div>

      {plan !== "pro" && (
        <button
          onClick={upgrade}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Upgrade to Pro
        </button>
      )}
    </div>
  );
}