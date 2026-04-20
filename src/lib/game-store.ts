import { createClient } from "redis";

export type GamePhase = "lobby" | "write" | "guess" | "summary";

export type Story = {
  id: string;
  title: string;
  summary: string;
};

export type Player = {
  id: string;
  name: string;
  joinedAt: number;
};

type WriteAssignment = {
  lineId: string;
  storyId: string;
};

type WriteSubmission = {
  writerId: string;
  words: [string, string, string];
  submittedAt: number;
};

type GuessAssignment = {
  lineId: string;
  words: [string, string, string];
  writerId: string;
};

type GuessSubmission = {
  guesserId: string;
  guessedStoryId: string;
  submittedAt: number;
};

type HistoryStep = {
  round: number;
  promptStoryId: string;
  writerId: string;
  words: [string, string, string];
  guesserId?: string;
  guessedStoryId?: string;
};

type StoryLine = {
  id: string;
  currentStoryId: string;
  history: HistoryStep[];
};

export type GameState = {
  code: string;
  phase: GamePhase;
  round: number;
  maxRounds: number;
  roundSeconds: number;
  phaseEndsAt: number | null;
  players: Player[];
  stories: Story[];
  lines: StoryLine[];
  writeAssignments: Record<string, WriteAssignment>;
  writeSubmissions: Record<string, WriteSubmission>;
  guessAssignments: Record<string, GuessAssignment>;
  guessSubmissions: Record<string, GuessSubmission>;
  createdAt: number;
};

const DEFAULT_STORIES: Story[] = [
  {
    id: "s1",
    title: "A dragon opens a bakery",
    summary:
      "A retired dragon starts a small-town bakery and accidentally becomes famous.",
  },
  {
    id: "s2",
    title: "The haunted vending machine",
    summary:
      "A school vending machine dispenses cryptic messages instead of snacks.",
  },
  {
    id: "s3",
    title: "Lost on Mars with a ukulele",
    summary: "An astronaut stranded on Mars uses music to signal Earth.",
  },
];

// Local fallback for development
let localGame: GameState | null = null;

const REDIS_KEY = "game:state";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Redis client setup
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!IS_PRODUCTION) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (err) => console.error("Redis Client Error", err));
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  }

  return redisClient;
}

function randomId(prefix: string): string {
  const token = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${token}`;
}

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function now(): number {
  return Date.now();
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sanitizeWord(input: string): string {
  return input.trim().replaceAll(/\s+/g, " ").slice(0, 30);
}

function createFreshGame(): GameState {
  return {
    code: randomCode(),
    phase: "lobby",
    round: 0,
    maxRounds: 3,
    roundSeconds: 60,
    phaseEndsAt: null,
    players: [],
    stories: DEFAULT_STORIES,
    lines: [],
    writeAssignments: {},
    writeSubmissions: {},
    guessAssignments: {},
    guessSubmissions: {},
    createdAt: now(),
  };
}

async function getGame(): Promise<GameState> {
  if (!IS_PRODUCTION) {
    if (!localGame) {
      localGame = createFreshGame();
    }
    return localGame;
  }

  try {
    const client = await getRedisClient();
    if (client) {
      const stored = await client.get(REDIS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error("Failed to fetch game from Redis:", error);
  }

  return createFreshGame();
}

async function saveGame(game: GameState): Promise<void> {
  if (!IS_PRODUCTION) {
    localGame = game;
    return;
  }

  try {
    const client = await getRedisClient();
    if (client) {
      await client.set(REDIS_KEY, JSON.stringify(game));
    }
  } catch (error) {
    console.error("Failed to save game to Redis:", error);
  }
}

function findPlayer(game: GameState, playerId: string): Player | undefined {
  return game.players.find((player) => player.id === playerId);
}

function allWriteSubmitted(game: GameState): boolean {
  const assignmentCount = Object.keys(game.writeAssignments).length;
  const submissionCount = Object.keys(game.writeSubmissions).length;
  return assignmentCount > 0 && assignmentCount === submissionCount;
}

function allGuessSubmitted(game: GameState): boolean {
  const assignmentCount = Object.keys(game.guessAssignments).length;
  const submissionCount = Object.keys(game.guessSubmissions).length;
  return assignmentCount > 0 && assignmentCount === submissionCount;
}

function getStoryById(game: GameState, storyId: string): Story | undefined {
  return game.stories.find((story) => story.id === storyId);
}

function assignWritePhase(game: GameState): void {
  const playerIds = shuffle(game.players.map((player) => player.id));
  const lineIds = shuffle(game.lines.map((line) => line.id));

  game.writeAssignments = {};
  game.writeSubmissions = {};
  game.guessAssignments = {};
  game.guessSubmissions = {};

  for (let i = 0; i < playerIds.length; i += 1) {
    const playerId = playerIds[i];
    const lineId = lineIds[i % lineIds.length];
    const line = game.lines.find((entry) => entry.id === lineId);
    if (!line) {
      continue;
    }

    game.writeAssignments[playerId] = {
      lineId,
      storyId: line.currentStoryId,
    };
  }

  game.phase = "write";
  game.phaseEndsAt = now() + game.roundSeconds * 1000;
}

function assignGuessPhase(game: GameState): void {
  const submissions = Object.entries(game.writeSubmissions);
  if (submissions.length === 0) {
    finalizeRound(game);
    return;
  }

  const playerIds = shuffle(game.players.map((player) => player.id));
  const lines = shuffle(submissions).map(([lineId, submission]) => ({
    lineId,
    writerId: submission.writerId,
    words: submission.words,
  }));

  let guessers = [...playerIds];
  if (lines.length > 1) {
    let solved = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      guessers = shuffle(playerIds);
      const valid = lines.every(
        (line, index) => guessers[index] !== line.writerId,
      );
      if (valid) {
        solved = true;
        break;
      }
    }
    if (!solved) {
      guessers = [...playerIds.slice(1), playerIds[0]];
    }
  }

  game.guessAssignments = {};
  game.guessSubmissions = {};

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const guesserId = guessers[i % guessers.length];
    game.guessAssignments[guesserId] = {
      lineId: line.lineId,
      words: line.words,
      writerId: line.writerId,
    };
  }

  game.phase = "guess";
  game.phaseEndsAt = now() + game.roundSeconds * 1000;
}

function finalizeRound(game: GameState): void {
  for (const [lineId, writeSubmission] of Object.entries(
    game.writeSubmissions,
  )) {
    const guessSubmission = game.guessSubmissions[lineId];
    const assignment = Object.values(game.guessAssignments).find(
      (entry) => entry.lineId === lineId,
    );

    const line = game.lines.find((entry) => entry.id === lineId);
    if (!line) {
      continue;
    }

    const writeAssignment = Object.values(game.writeAssignments).find(
      (entry) => entry.lineId === lineId,
    );
    if (!writeAssignment) {
      continue;
    }

    line.history.push({
      round: game.round,
      promptStoryId: writeAssignment.storyId,
      writerId: writeSubmission.writerId,
      words: writeSubmission.words,
      guesserId: guessSubmission?.guesserId,
      guessedStoryId: guessSubmission?.guessedStoryId,
    });

    if (
      guessSubmission?.guessedStoryId &&
      getStoryById(game, guessSubmission.guessedStoryId)
    ) {
      line.currentStoryId = guessSubmission.guessedStoryId;
    }

    if (!guessSubmission?.guessedStoryId && assignment) {
      line.currentStoryId = writeAssignment.storyId;
    }
  }

  if (game.round >= game.maxRounds) {
    game.phase = "summary";
    game.phaseEndsAt = null;
    game.writeAssignments = {};
    game.writeSubmissions = {};
    game.guessAssignments = {};
    game.guessSubmissions = {};
    return;
  }

  game.round += 1;
  assignWritePhase(game);
}

function tickTimeouts(game: GameState): void {
  if (!game.phaseEndsAt || game.phase === "lobby" || game.phase === "summary") {
    return;
  }

  if (now() < game.phaseEndsAt) {
    return;
  }

  if (game.phase === "write") {
    assignGuessPhase(game);
    return;
  }

  if (game.phase === "guess") {
    finalizeRound(game);
  }
}

function playerDisplay(
  game: GameState,
  playerId: string,
): { id: string; name: string } {
  const player = findPlayer(game, playerId);
  return {
    id: playerId,
    name: player?.name ?? "Unknown",
  };
}

export async function resetGame(): Promise<GameState> {
  const newGame = createFreshGame();
  await saveGame(newGame);
  return newGame;
}

export async function joinGame(code: string, name: string): Promise<Player> {
  let game = await getGame();
  tickTimeouts(game);

  if (game.code !== code) {
    throw new Error("Invalid game code.");
  }

  if (game.phase !== "lobby") {
    throw new Error("Game already started.");
  }

  const trimmed = name.trim().slice(0, 24);
  if (!trimmed) {
    throw new Error("Name is required.");
  }

  if (
    game.players.some(
      (player) => player.name.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new Error("Name already taken.");
  }

  if (game.players.length >= 30) {
    throw new Error("Player limit reached (30).");
  }

  const player: Player = {
    id: randomId("p"),
    name: trimmed,
    joinedAt: now(),
  };

  game.players.push(player);
  await saveGame(game);
  return player;
}

export async function startGame(options: {
  stories: Story[];
  maxRounds: number;
  roundSeconds: number;
}): Promise<void> {
  let game = await getGame();
  tickTimeouts(game);

  if (game.players.length < 2) {
    throw new Error("At least 2 players are required.");
  }

  if (game.phase !== "lobby") {
    throw new Error("Game has already started.");
  }

  if (options.stories.length < 2) {
    throw new Error("At least 2 stories are required.");
  }

  game.stories = options.stories;
  game.round = 1;
  game.maxRounds = Math.max(1, Math.min(options.maxRounds, 10));
  game.roundSeconds = Math.max(15, Math.min(options.roundSeconds, 180));

  const storyPool = shuffle(game.stories);
  game.lines = game.players.map((player, index) => {
    const story = storyPool[index % storyPool.length];
    return {
      id: `line_${player.id}`,
      currentStoryId: story.id,
      history: [],
    };
  });

  assignWritePhase(game);
  await saveGame(game);
}

export async function submitWords(
  playerId: string,
  wordsInput: string[],
): Promise<void> {
  let game = await getGame();
  tickTimeouts(game);

  if (game.phase !== "write") {
    throw new Error("Not in writing phase.");
  }

  const assignment = game.writeAssignments[playerId];
  if (!assignment) {
    throw new Error("No writing assignment found.");
  }

  const words = wordsInput.map(sanitizeWord).filter(Boolean);
  if (words.length !== 3) {
    throw new Error("Exactly three words are required.");
  }

  game.writeSubmissions[assignment.lineId] = {
    writerId: playerId,
    words: [words[0], words[1], words[2]],
    submittedAt: now(),
  };

  if (allWriteSubmitted(game)) {
    assignGuessPhase(game);
  }

  await saveGame(game);
}

export async function submitGuess(
  playerId: string,
  guessedStoryId: string,
): Promise<void> {
  let game = await getGame();
  tickTimeouts(game);

  if (game.phase !== "guess") {
    throw new Error("Not in guessing phase.");
  }

  const assignment = game.guessAssignments[playerId];
  if (!assignment) {
    throw new Error("No guessing assignment found.");
  }

  if (!getStoryById(game, guessedStoryId)) {
    throw new Error("Invalid story selection.");
  }

  game.guessSubmissions[assignment.lineId] = {
    guesserId: playerId,
    guessedStoryId,
    submittedAt: now(),
  };

  if (allGuessSubmitted(game)) {
    finalizeRound(game);
  }

  await saveGame(game);
}

export async function getPublicState(playerId?: string): Promise<{
  code: string;
  phase: GamePhase;
  round: number;
  maxRounds: number;
  roundSeconds: number;
  phaseEndsAt: number | null;
  players: Player[];
  stories: Story[];
  writeSubmittedCount: number;
  writeTotalCount: number;
  guessSubmittedCount: number;
  guessTotalCount: number;
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
}> {
  const game = await getGame();
  tickTimeouts(game);
  await saveGame(game);

  const writeAssignment = playerId
    ? game.writeAssignments[playerId]
    : undefined;
  const guessAssignment = playerId
    ? game.guessAssignments[playerId]
    : undefined;

  return {
    code: game.code,
    phase: game.phase,
    round: game.round,
    maxRounds: game.maxRounds,
    roundSeconds: game.roundSeconds,
    phaseEndsAt: game.phaseEndsAt,
    players: game.players,
    stories: game.stories,
    writeSubmittedCount: Object.keys(game.writeSubmissions).length,
    writeTotalCount: Object.keys(game.writeAssignments).length,
    guessSubmittedCount: Object.keys(game.guessSubmissions).length,
    guessTotalCount: Object.keys(game.guessAssignments).length,
    yourWriteAssignment: writeAssignment
      ? {
          storyId: writeAssignment.storyId,
          storyTitle:
            getStoryById(game, writeAssignment.storyId)?.title ??
            "Unknown Story",
          storySummary:
            getStoryById(game, writeAssignment.storyId)?.summary ?? "",
          submitted: Boolean(game.writeSubmissions[writeAssignment.lineId]),
        }
      : null,
    yourGuessAssignment: guessAssignment
      ? {
          words: guessAssignment.words,
          submitted: Boolean(game.guessSubmissions[guessAssignment.lineId]),
        }
      : null,
    summary: game.lines.map((line) => {
      const starter = line.id.replace("line_", "");
      const finalStory = getStoryById(game, line.currentStoryId);
      return {
        lineId: line.id,
        starterPlayer: playerDisplay(game, starter),
        finalStoryTitle: finalStory?.title ?? "Unknown Story",
        steps: line.history.map((step) => ({
          round: step.round,
          promptStoryTitle:
            getStoryById(game, step.promptStoryId)?.title ?? "Unknown Story",
          writer: playerDisplay(game, step.writerId),
          words: step.words,
          guesser: step.guesserId
            ? playerDisplay(game, step.guesserId)
            : undefined,
          guessedStoryTitle: step.guessedStoryId
            ? (getStoryById(game, step.guessedStoryId)?.title ??
              "Unknown Story")
            : undefined,
        })),
      };
    }),
  };
}

export async function getHostGameCode(): Promise<string> {
  const game = await getGame();
  tickTimeouts(game);
  await saveGame(game);
  return game.code;
}

export async function pausePhase(): Promise<void> {
  let game = await getGame();
  game.phaseEndsAt = null;
  await saveGame(game);
}

export async function resumePhase(): Promise<void> {
  let game = await getGame();
  if (game.phase !== "summary") {
    game.phaseEndsAt = Date.now() + game.roundSeconds * 1000;
  }
  await saveGame(game);
}

export async function advancePhase(): Promise<void> {
  let game = await getGame();
  tickTimeouts(game);
  if (game.phase === "lobby") {
    game.phase = "write";
    game.round = 1;
    game.phaseEndsAt = Date.now() + game.roundSeconds * 1000;
    assignWritePhase(game);
  } else if (game.phase === "write") {
    game.phase = "guess";
    game.phaseEndsAt = Date.now() + game.roundSeconds * 1000;
    assignGuessPhase(game);
  } else if (game.phase === "guess") {
    game.round += 1;
    if (game.round > game.maxRounds) {
      game.phase = "summary";
      game.phaseEndsAt = null;
    } else {
      game.phase = "write";
      game.phaseEndsAt = Date.now() + game.roundSeconds * 1000;
      assignWritePhase(game);
    }
  }
  await saveGame(game);
}
