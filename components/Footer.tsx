import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-xs font-bold text-white">
            TM
          </div>

          <div>
            <p className="font-bold text-gray-950">TripMuse</p>
            <p className="text-xs text-gray-400">
              Plan smarter. Travel happier.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-500">
          <Link href="/" className="transition hover:text-gray-950">
            Home
          </Link>

          <Link href="/dashboard" className="transition hover:text-gray-950">
            My Trips
          </Link>

          <Link href="/#planner" className="transition hover:text-gray-950">
            Planner
          </Link>

          <Link href="/Pricing" className="transition hover:text-gray-950">
            Pricing
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Copyright {new Date().getFullYear()} TripMuse
        </p>
      </div>
    </footer>
  );
}
