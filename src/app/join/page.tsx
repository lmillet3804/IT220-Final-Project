"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Story = {
  id: string;
  title: string;
  summary: string;
};

type StatePayload = {
  code: string;
  phase: "lobby" | "write" | "guess" | "summary";
  round: number;
  maxRounds: number;
  phaseEndsAt: number | null;
  stories: Story[];
  yourWriteAssignment: null | {
    storyId: string;
    storyTitle: string;
    storySummary: string;
    submitted: boolean;
  };
  yourGuessAssignment: null | {
    words: [string, string, string];
    submitted: boolean;
  };
};

function JoinClient() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [name, setName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [state, setState] = useState<StatePayload | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [guessStoryId, setGuessStoryId] = useState("");

  const wordList = [
    "Supernatural",
    "Enchantment",
    "Tranformation",
    "Dangerous sea",
    "Anthropomorphism",
    "Impossible quest",
    "Katabasis",
    "Evil stepmother",
    "Three sisters",
    "Prophecy",
    "Betrayal",
    "Allegorical characters",
    "Hero's Journey",
    "Deceit",
    "Misfortune",
    "Tragedy",
    "Aloofness",
    "Affair",
    "Self-preservation",
    "Situational irony",
    "Malmaritata",
    "Monstrous birth",
    "New world",
    "Fertility",
    "Marvel",
    "Good fortune",
    "Foil characters",
    "Creation",
    "Bildungsroman",
    "Harmony",
    "Revenge",
  ];

  async function refreshState(targetPlayerId: string) {
    const query = new URLSearchParams();
    if (targetPlayerId) {
      query.set("playerId", targetPlayerId);
    }
    const response = await fetch(`/api/state?${query.toString()}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as StatePayload;
    setState(data);
  }

  useEffect(() => {
    if (!playerId) {
      return;
    }

    const initial = setTimeout(() => {
      void refreshState(playerId);
    }, 0);
    const timer = setInterval(() => {
      setNowMs(Date.now());
      void refreshState(playerId);
    }, 500);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [playerId]);

  const countdown = useMemo(() => {
    if (!state?.phaseEndsAt) {
      return null;
    }
    return Math.max(0, Math.ceil((state.phaseEndsAt - nowMs) / 1000));
  }, [nowMs, state]);

  async function handleJoin() {
    setError(null);
    if (!name.trim() || !code.trim()) {
      setError("Enter your name and game code.");
      return;
    }

    const response = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        name: name.trim(),
      }),
    });

    const body = (await response.json()) as {
      ok: boolean;
      message?: string;
      player?: { id: string };
    };

    if (!response.ok || !body.ok || !body.player) {
      setError(body.message ?? "Unable to join game.");
      return;
    }

    setPlayerId(body.player.id);
    await refreshState(body.player.id);
  }

  async function handleSubmitWords() {
    setError(null);
    const response = await fetch("/api/player/submit-words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, words: selectedWords }),
    });

    const body = (await response.json()) as { ok: boolean; message?: string };
    if (!response.ok || !body.ok) {
      setError(body.message ?? "Unable to submit words.");
      return;
    }

    setSelectedWords([]);
    await refreshState(playerId);
  }

  function handleWordSelect(word: string) {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else if (selectedWords.length < 3) {
      setSelectedWords([...selectedWords, word]);
    }
  }

  async function handleSubmitGuess() {
    setError(null);
    if (!guessStoryId) {
      setError("Select a story before submitting.");
      return;
    }

    const response = await fetch("/api/player/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, guessedStoryId: guessStoryId }),
    });

    const body = (await response.json()) as { ok: boolean; message?: string };
    if (!response.ok || !body.ok) {
      setError(body.message ?? "Unable to submit guess.");
      return;
    }

    await refreshState(playerId);
  }

  if (!playerId) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lift">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            Join Game
          </p>
          <h1 className="mt-1 text-3xl font-black text-ocean">
            Story Telephone
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your name and the game code from the host screen.
          </p>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-slate-700">
              Game Code
            </span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-lg font-bold tracking-widest text-slate-900 outline-none ring-coral/30 focus:ring"
              placeholder="ABC123"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">
              Your Name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-coral/30 focus:ring"
              placeholder="Taylor"
            />
          </label>

          <button
            onClick={handleJoin}
            className="mt-5 w-full rounded-xl bg-ocean px-4 py-3 text-base font-bold text-white transition hover:bg-slate-900"
          >
            Join Lobby
          </button>

          {error && (
            <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lift">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
          {state?.phase.toUpperCase() ?? "LOADING"}
        </p>
        <h1 className="mt-1 text-3xl font-black text-ocean">
          Round {state?.round ?? "..."}
        </h1>
        {countdown !== null && (
          <p className="mt-1 text-sm text-slate-600">Time left: {countdown}s</p>
        )}

        {state?.phase === "lobby" && (
          <p className="mt-4 text-sm text-slate-700">
            You are in. Waiting for the host to start the game.
          </p>
        )}

        {state?.phase === "write" && state.yourWriteAssignment && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-700">
                Story Prompt
              </p>
              <p className="mt-1 text-base font-bold text-slate-900">
                {state.yourWriteAssignment.storyTitle}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {state.yourWriteAssignment.storySummary}
              </p>
            </div>

            {state.yourWriteAssignment.submitted ? (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                Submitted. Waiting for others.
              </p>
            ) : (
              <>
                {wordList.map((word) =>
                  selectedWords.includes(word) ? (
                    <button
                      key={word}
                      onClick={() => handleWordSelect(word)}
                      className="rounded-xl border-2 border-ocean bg-ocean/10 px-3 py-2 text-slate-900 outline-none ring-coral/30 focus:ring"
                    >
                      {word}
                    </button>
                  ) : (
                    <button
                      key={word}
                      onClick={() => handleWordSelect(word)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-coral/30 focus:ring"
                    >
                      {word}
                    </button>
                  ),
                )}
                <button
                  onClick={handleSubmitWords}
                  className="w-full rounded-xl bg-ocean px-4 py-3 text-base font-bold text-white transition hover:bg-slate-900"
                >
                  Submit 3 Words
                </button>
              </>
            )}
          </div>
        )}

        {state?.phase === "guess" && state.yourGuessAssignment && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-700">Clues</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {state.yourGuessAssignment.words.join(" • ")}
              </p>
            </div>

            {state.yourGuessAssignment.submitted ? (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                Guess submitted. Waiting for others.
              </p>
            ) : (
              <>
                <select
                  value={guessStoryId}
                  onChange={(event) => setGuessStoryId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-coral/30 focus:ring"
                >
                  <option value="">Choose a story</option>
                  {state.stories.map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSubmitGuess}
                  className="w-full rounded-xl bg-ocean px-4 py-3 text-base font-bold text-white transition hover:bg-slate-900"
                >
                  Submit Guess
                </button>
              </>
            )}
          </div>
        )}

        {(state?.phase === "write" && !state.yourWriteAssignment) ||
        (state?.phase === "guess" && !state.yourGuessAssignment) ? (
          <p className="mt-4 text-sm text-slate-600">
            Waiting for your assignment...
          </p>
        ) : null}

        {state?.phase === "summary" && (
          <p className="mt-4 text-sm text-slate-700">
            The host is showing final story paths on the main screen.
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
        )}
      </section>
    </main>
  );
}

function JoinFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lift">
        <p className="text-sm text-slate-600">Loading join screen...</p>
      </section>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinFallback />}>
      <JoinClient />
    </Suspense>
  );
}
