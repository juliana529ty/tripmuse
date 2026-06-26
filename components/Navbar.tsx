import Link from "next/link";
import LoginButton from "@/components/LoginButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-sm font-bold text-white shadow-sm">
            TM
          </div>

          <div>
            <p className="text-base font-bold text-gray-950">TripMuse</p>
            <p className="hidden text-[11px] text-gray-400 sm:block">
              AI Travel Planner
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-gray-500 md:flex">
          <Link href="/#planner" className="transition hover:text-gray-950">
            Plan a trip
          </Link>

          <Link href="/dashboard" className="transition hover:text-gray-950">
            My trips
          </Link>

          <Link href="/Pricing" className="transition hover:text-gray-950">
            Pricing
          </Link>
        </nav>

        <LoginButton />
      </div>
    </header>
  );
}
