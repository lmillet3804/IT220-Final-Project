"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
      timeoutNote?: string;
    }>;
  }>;
};

const defaultStoryText = [
  "Odysseus and Circe | Odysseus and his men encounter the enchantress Circe who turns his men into pigs, but he outsmarts her with the help of Hermes.",
  "Odysseus and the Sirens | Odysseus and his men encounter the Sirens, but they escape by plugging their ears with wax.",
  "Apollo and Daphne | Cupid tricks Apollo to fall in love with Daphne, who is repulsed and turns into a tree to escape him.",
  "Narcissus and Echo | Narcissus rejects the personification of Echo, who prays that he fall in love and never obtain his desire.",
  "Arachne and Minerva | Arachne defeats Minerva in a spinning competition, who turns her into a spider.",
  "Orpheus and Eurydice | Orpheus travels to the underworld to retrieve Eurydice from Hades, but fails when he looks back at her, breaking the one rule Hermes gave.",
  "Pygmalion | Pygmalion sculpts a statue of a perfect woman, and treats it like a woman until Zeus grants it become a real woman.",
  "Cupid and Psyche | Cupid visits the banished Psyche at night as her husband until he is discovered. Psyche undertakes a series of challenges from Venus to win him back.",
  "Landolfo | Landolfo turns to piracy, is captured, survives a shipwreck and is washed on an island where a woman who helps him return home rich.",
  "Lisabetta | Lisabetta's brothers discover her affair and kill her lover. Lisabetta finds his body in a dream, takes his head, and puts it in a pot of basil, where she cries over it every day.",
  "Calandrino | Calandrino is tricked by his friends into believing he his pregnant so they can extort money from him.",
  "Federigo and the Falcon | Federigo, too poor for the woman he loves, went into the countryside with his beautiful falcon, whom the woman's son wanted to better his spirits. The woman tried to ask Federigo for it, but he killed it as a gift for her. Her son died, and she married Federigo",
  "Gianni and Monna Tessa | A woman cheats on her husband while he is away known by the direction of a skull; when her husband comes home early, she sends off her lover by making her husband think it's a werewolf and performing an 'exorcism'",
  "Griselda | A man puts his wife to the test by pretending he killed their children. When he pretends that he has married someone else, and she doesn't react, he presents to her the two children, now grown up.",
  "King Pig | A young man who is a pig marries two daughters who try to kill him. When he marries the third, he undresses his pig skin at night because she was kind to him.",
  "Crazy Pietro | A young man spares the life of a fish he caught, and the fish rewards him by saving Pietro and the princess after being cast off.",
  "Biancabella | A snake gives Biancabella magical properties and helps restore her to her former state after her stepmother, the queen, tries to have her killed.",
  "Adamantina | A magical doll excretes coins for two poor girls; after being stolen and thrown away, the doll bites the king's butt, and does not let go until it sees the girls.",
  "Cinderella Cat | A girl kills her stepmother under the advice of her teacher, who becomes her new stepmother and forces her to work; some fairies help her to become beautiful for a ball, where she wins the prince's heart.",
  "Peruonto | Peruonto shows compassion to three boys, who allow him everything he wishes; he wishes a woman to become pregnant, but he is the father and the king casts him into a barrel. Through the enchantment, Peruonto and the princess are able to escape",
  "Petrosinella | A woman steals parsley from an ogress's garden, and promises her offspring as punishment. The ogress takes the offspring, locks her in a tower, but a prince comes to save her and together they flee from the ogress with the help of three acorns.",
  "Sun, Moon, and Talia | Talia dies from a piece of flax, as a prophecy foretold, until a king passes by, impregnates her, and the kids suck the flax out. The king's jealous wife ask the cook to kill Talia's children, but the cook saves them and the wife dies instead",
  "The Goose | Sisters buy goose that excretes coins but is taken by jealous neighbors and thrown away. The goose bites a prince's butt and only the sisters can get it to stop",
  "Nennillo and Nennella | Two kids are cast into the forest by their stepmother and get lost; the boy is taken by a prince and the girl is taken by pirates, gets shipwrecked, and is swallowed by a fish. The girl recognizes the boy from inside the fish, and they reunite",
  "The Three Citrons | A man travels far in search of a red and white wife. Three citrons give him a beautiful fairy, who is killed by a slave girl that replaces her for his wife. When the betrayal is discovered, the slave girl is killed and the fairy becomes queen",
  "The Flea | A king raises an overgrown flea and says anyone who can identify the skin gets his daughter. An ogre identifies it and takes the girl, but after several challenges by seven brothers, they rescue the girl from the ogre",
  "The Enchanted Doe | A queen eats a dragon heart to become pregnant, who, along with a virgin cook, give birth to brothers. The queen tries to kill the other brother, who flees until is captured by an ogre in disguise. The other brother knows he is in trouble and goes to free him.",
  "The Old Lady Who Was Skinned | A king longs for two old women when he hears them sing, and after a trick, one gets him to sleep with her. When she is discovered, she is thrown out the window but fairies come and make her beautiful, so the king takes her back. The other sister is jealous and skins herself to become beautiful.",
  "Pinnochio | A young boy has several adventures as he learns right from wrong with the help of a fairy in search of his father",
  "The Dragon with Seven Heads | A fisherman captures a magic fish who makes his wife pregnant with triplets. The oldest leaves and finds a kingdom where he kills a dragon to rescue a princess but is frozen in a cave in the woods by a witch. His brothers come and save him; the youngest kills the witch, all are presented to the king, and enjoy many fortunes",
  "The Love of the Three Pomegranates | A man in search of a red and white wife receives three pomegranates who grant him the wish. A slave girl turns the wife into a dove and replaces her, but the dove follows her. The slave girl notices the dove has it killed, which turns her into a pomegranate tree with healing powers. An old woman takes one and discovers a girl is cleaning her house while she is away. She takes her to Mass, where she is noticed by the king.",
  "Bella Venezia | A mother, jealous by her daughter's beauty, has her killed. But the killer saves her, and the daughter finds herself with seven robbers, who unknowingly tell the mother her daughter is alive. The mother has a witch that successfully kills her daughter, but a king brings her back to life after taking out the pin that killed her.",
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
      <div
        className={
          "grid gap-6 " +
          (state?.phase === "summary"
            ? " max-w-7xl mx-auto"
            : "lg:grid-cols-[1.2fr_1fr]")
        }
      >
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lift">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
                Host Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-black text-ocean md:text-4xl">
                Fairytale Telephone
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
              <div className="max-w-full overflow-x-auto">
                <div
                  className={"grid w-max min-w-full gap-4"}
                  style={{
                    gridTemplateColumns: `repeat(${state.round * 3}, 150px)`,
                  }}
                >
                  {state.summary.map((line) =>
                    line.steps.map((step) => (
                      <Fragment key={`${line.lineId}_${step.round}_group`}>
                        <div
                          key={`${line.lineId}_${step.round}`}
                          className="rounded-xl bg-white p-3 text-sm text-slate-700"
                        >
                          <p>Prompt: {step.promptStoryTitle}</p>
                        </div>
                        <div
                          key={`${line.lineId}_${step.round}_write`}
                          className="rounded-xl bg-white p-3 text-sm text-slate-700"
                        >
                          <p>
                            {step.writer.name} selected:{" "}
                            <span className="font-semibold">
                              {step.words.join(", ")}
                            </span>
                          </p>
                        </div>
                        <div
                          key={`${line.lineId}_${step.round}_guess`}
                          className="rounded-xl bg-white p-3 text-sm text-slate-700"
                        >
                          <p>
                            {step.guesser ? (
                              <>{step.guesser.name} guessed: </>
                            ) : (
                              <>No guesser (story ended here)</>
                            )}
                            <span className="font-semibold">
                              {step.guessedStoryTitle ?? "(no guess)"}
                            </span>
                          </p>
                          {step.timeoutNote && (
                            <p className="mt-2 text-xs font-semibold text-amber-700">
                              Note: {step.timeoutNote}
                            </p>
                          )}
                        </div>
                      </Fragment>
                    )),
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
          )}
        </section>

        {state?.phase !== "summary" && (
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
                <li className="text-sm text-slate-500">
                  No players joined yet.
                </li>
              )}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
