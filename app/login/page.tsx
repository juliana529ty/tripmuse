import type { Metadata } from "next";
import Link from "next/link";
import LoginButton from "@/components/LoginButton";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to TripMuse to create, save and share your AI travel plans.",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fafafa] px-5 py-16">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-pink-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />

      <main className="relative w-full max-w-md">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-xl text-white shadow-lg">
            ✈️
          </span>

          <span>
            <span className="block text-lg font-bold tracking-tight text-gray-950">
              TripMuse
            </span>

            <span className="block text-xs text-gray-400">
              AI Travel Planner
            </span>
          </span>
        </Link>

        <section className="rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-2xl shadow-gray-200/60 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 text-3xl">
            🧳
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-purple-500">
            Welcome to TripMuse
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
            Your journeys, all in one place.
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-500">
            登录后可以生成 AI 行程、保存旅行灵感、收藏计划并创建公开分享页面。
          </p>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-[#fafafa] p-4">
            <LoginButton />
          </div>

          <p className="mt-6 text-xs leading-6 text-gray-400">
            By continuing, you agree to use TripMuse responsibly.
          </p>
        </section>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-gray-500 transition hover:text-gray-950"
          >
            ← Return to home
          </Link>
        </div>
      </main>
    </div>
  );
}