"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginButton() {
  const [user, setUser] = useState<any>(null);

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
        redirectTo: "http://localhost:3000",
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (user) {
    return (
      <div className="absolute top-4 right-4 bg-white shadow rounded-xl p-3 border">
        <div className="flex items-center gap-3">
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              className="w-10 h-10 rounded-full"
            />
          )}

          <div>
            <p className="font-semibold">
              {user.user_metadata?.full_name || "TripMuse User"}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="mt-3 w-full bg-red-500 text-white rounded-lg py-2"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={loginWithGoogle}
      className="absolute top-4 right-4 bg-black text-white px-4 py-2 rounded-lg text-sm"
    >
      Continue with Google
    </button>
  );
}