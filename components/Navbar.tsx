import LoginButton from "@/components/LoginButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-950 text-lg text-white shadow-sm">
            ✈️
          </div>

          <div>
            <p className="text-base font-bold tracking-tight text-gray-950">
              TripMuse
            </p>
            <p className="hidden text-[11px] text-gray-400 sm:block">
              AI Travel Planner
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium text-gray-500 md:flex">
          <a href="#planner" className="transition hover:text-gray-950">
            Plan a trip
          </a>

          <a href="/dashboard" className="transition hover:text-gray-950">
            My trips
          </a>

          <a href="#features" className="transition hover:text-gray-950">
            Features
          </a>
        </nav>

        <div className="flex items-center">
          <LoginButton />
        </div>
      </div>
    </header>
  );
}