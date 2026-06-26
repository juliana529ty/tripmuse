"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function LoginButton() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState({}, document.title, "/");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.user_metadata?.avatar_url && (
          <Image
            src={user.user_metadata.avatar_url}
            alt="User avatar"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
          />
        )}

        <Link
          href="/profile"
          className="hidden max-w-[180px] truncate text-sm font-semibold text-gray-700 transition hover:text-gray-950 sm:block"
        >
          {user.user_metadata?.full_name || user.email || "TripMuse User"}
        </Link>

        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={loginWithGoogle}
      className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
    >
      Continue with Google
    </button>
  );
}
