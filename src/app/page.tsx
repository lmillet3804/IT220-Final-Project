import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-lift backdrop-blur">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-coral">
          Fairytale Telephone
        </p>
        <h1 className="text-4xl font-black leading-tight text-ocean md:text-5xl">
          Multiplayer Fairytale Guessing Game
        </h1>
        <p className="mt-4 max-w-2xl text-slate-700">
          The host runs the game on a projector. Players join on their phones,
          write three words for a fairytale, and then another player guesses
          which fairytale it was.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/host"
            className="rounded-2xl border border-ocean bg-ocean px-6 py-5 text-center text-lg font-bold text-white transition hover:translate-y-[-2px] hover:bg-slate-900"
          >
            Open Host Screen
          </Link>
          <Link
            href="/join"
            className="rounded-2xl border border-slate-300 bg-white px-6 py-5 text-center text-lg font-bold text-ocean transition hover:translate-y-[-2px] hover:border-ocean"
          >
            Join as Player
          </Link>
        </div>
      </div>
    </main>
  );
}
