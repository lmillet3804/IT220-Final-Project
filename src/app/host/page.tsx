"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

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
  roundSeconds: number;
  phaseEndsAt: number | null;
  players: Array<{ id: string; name: string }>;
  stories: Story[];
  writeSubmittedCount: number;
  writeTotalCount: number;
  guessSubmittedCount: number;
  guessTotalCount: number;
  summary: Array<{
    lineId: string;
    starterPlayer: { id: string; name: string };
    finalStoryTitle: string;
    steps: Array<{
      round: number;
      promptStoryTitle: string;
      writer: { id: string; name: string };
      words: [string, string, string];
      guesser?: { id: string; name: string };
      guessedStoryTitle?: string;
    }>;
  }>;
};

const defaultStoryText = [
  "A dragon opens a bakery | A retired dragon starts a small-town bakery and accidentally becomes famous.",
  "The haunted vending machine | A school vending machine dispenses cryptic messages instead of snacks.",
  "Lost on Mars with a ukulele | An astronaut stranded on Mars uses music to signal Earth.",
].join("\n");

function parseStories(input: string): Story[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [titleRaw, summaryRaw] = line.split("|");
      const title = (titleRaw ?? "").trim();
      const summary = (summaryRaw ?? "").trim();
      return {
        id: `story_${index + 1}`,
        title,
        summary: summary || "No summary provided.",
      };
    })
    .filter((story) => Boolean(story.title));
}

export default function HostPage() {
  const [state, setState] = useState<StatePayload | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [storiesText, setStoriesText] = useState(defaultStoryText);
  const [maxRounds, setMaxRounds] = useState(4);
  const [roundSeconds, setRoundSeconds] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");

  // Set joinUrl on client mount to prevent hydration mismatch
  useEffect(() => {
    if (state) {
      setJoinUrl(`${window.location.origin}/join?code=${state.code}`);
    }
  }, [state]);

  const countdown = useMemo(() => {
    if (!state?.phaseEndsAt) {
      return null;
    }
    const ms = state.phaseEndsAt - nowMs;
    return Math.max(0, Math.ceil(ms / 1000));
  }, [nowMs, state]);

  async function refreshState() {
    const response = await fetch("/api/state", { cache: "no-store" });
    const data = (await response.json()) as StatePayload;
    setState(data);
  }

  useEffect(() => {
    const initial = setTimeout(() => {
      void refreshState();
    }, 0);
    const timer = setInterval(() => {
      setNowMs(Date.now());
      void refreshState();
    }, 500);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);

  async function handleReset() {
    setError(null);
    const response = await fetch("/api/host/reset", { method: "POST" });
    if (!response.ok) {
      setError("Unable to reset game.");
      return;
    }
    await refreshState();
  }

  async function handleStart() {
    setError(null);
    setStarting(true);

    const stories = parseStories(storiesText);
    if (stories.length < 2) {
      setError(
        "Enter at least 2 stories in the format: Title | One sentence summary.",
      );
      setStarting(false);
      return;
    }

    const response = await fetch("/api/host/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stories, maxRounds, roundSeconds }),
    });

    const body = (await response.json()) as { ok: boolean; message?: string };
    if (!response.ok || !body.ok) {
      setError(body.message ?? "Unable to start game.");
      setStarting(false);
      return;
    }

    await refreshState();
    setStarting(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lift">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
                Host Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-black text-ocean md:text-4xl">
                Story Telephone
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Code:{" "}
                <span className="font-bold tracking-wider text-slate-900">
                  {state?.code ?? "..."}
                </span>
              </p>
            </div>
            <button
              onClick={handleReset}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-900"
            >
              New Lobby
            </button>
          </div>

          {state?.phase === "lobby" && (
            <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Scan to join
                </p>
                <div className="mt-3 flex justify-center rounded-xl bg-white p-3">
                  {joinUrl ? (
                    <QRCodeSVG value={joinUrl} size={190} />
                  ) : (
                    <div className="h-[190px] w-[190px]" />
                  )}
                </div>
                {joinUrl && (
                  <p className="mt-3 break-all text-xs text-slate-500">
                    {joinUrl}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Stories (one per line)
                  </span>
                  <textarea
                    value={storiesText}
                    onChange={(event) => setStoriesText(event.target.value)}
                    rows={8}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-coral/30 focus:ring"
                    placeholder="Title | One sentence summary"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Rounds
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxRounds}
                      onChange={(event) =>
                        setMaxRounds(Number(event.target.value))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-coral/30 focus:ring"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Seconds per phase
                    </span>
                    <input
                      type="number"
                      min={15}
                      max={180}
                      value={roundSeconds}
                      onChange={(event) =>
                        setRoundSeconds(Number(event.target.value))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-coral/30 focus:ring"
                    />
                  </label>
                </div>

                <button
                  onClick={handleStart}
                  disabled={starting || (state?.players.length ?? 0) < 2}
                  className="w-full rounded-xl bg-ocean px-4 py-3 text-base font-bold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {starting ? "Starting..." : "Start Game"}
                </button>
              </div>
            </div>
          )}

          {state && state.phase !== "lobby" && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">
                  Round {state.round} / {state.maxRounds}
                </p>
                <p className="text-sm text-slate-600">
                  Phase:{" "}
                  <span className="font-semibold text-slate-900">
                    {state.phase.toUpperCase()}
                  </span>
                  {countdown !== null && (
                    <span className="ml-2">({countdown}s)</span>
                  )}
                </p>
              </div>
              {state.phase === "write" && (
                <p className="mt-2 text-sm text-slate-700">
                  Submitted: {state.writeSubmittedCount} /{" "}
                  {state.writeTotalCount}
                </p>
              )}
              {state.phase === "guess" && (
                <p className="mt-2 text-sm text-slate-700">
                  Guesses: {state.guessSubmittedCount} / {state.guessTotalCount}
                </p>
              )}
            </div>
          )}

          {state?.phase === "summary" && (
            <div className="mt-6 space-y-4">
              <h2 className="text-xl font-black text-ocean">Story Paths</h2>
              {state.summary.map((line) => (
                <article
                  key={line.lineId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm text-slate-700">
                    Started by{" "}
                    <span className="font-semibold text-slate-900">
                      {line.starterPlayer.name}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Final story guess:{" "}
                    <span className="font-semibold text-slate-900">
                      {line.finalStoryTitle}
                    </span>
                  </p>
                  <div className="mt-3 space-y-2">
                    {line.steps.map((step) => (
                      <div
                        key={`${line.lineId}_${step.round}`}
                        className="rounded-xl bg-white p-3 text-sm text-slate-700"
                      >
                        <p>
                          <span className="font-semibold">
                            Round {step.round}
                          </span>
                          : Prompt was {step.promptStoryTitle}
                        </p>
                        <p>
                          Writer {step.writer.name} wrote:{" "}
                          <span className="font-semibold">
                            {step.words.join(", ")}
                          </span>
                        </p>
                        <p>
                          Guesser {step.guesser?.name ?? "(none)"} chose:{" "}
                          {step.guessedStoryTitle ?? "(no guess)"}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lift">
          <h2 className="text-lg font-black text-ocean">
            Players ({state?.players.length ?? 0}/30)
          </h2>
          <ul className="mt-4 space-y-2">
            {state?.players.map((player, index) => (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-slate-800">
                  {player.name}
                </span>
                <span className="text-xs text-slate-500">#{index + 1}</span>
              </li>
            ))}
            {state?.players.length === 0 && (
              <li className="text-sm text-slate-500">No players joined yet.</li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
