# Story Telephone (Next.js Full Stack)

A phone-friendly multiplayer party game for up to 30 players.

## How It Works

1. Host opens `/host` on the projector screen.
2. Players join by scanning the QR code (or opening `/join`) and entering a name.
3. Write phase: each player receives a story title + summary and submits exactly 3 words.
4. Guess phase: each player gets another player's 3 words and guesses which story it was.
5. The game repeats for multiple rounds.
6. Host sees final line-by-line story paths in the summary view.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- In-memory server game state + REST APIs

## Run Locally

```bash
npm install
npm run dev
```

Then open:

- Host: `http://localhost:3000/host`
- Player: `http://localhost:3000/join`

## Production Build

```bash
npm run build
npm run start
```

## Story Input Format (Host Screen)

Use one story per line in this format:

```text
Story Title | One sentence summary
```

Example:

```text
A dragon opens a bakery | A retired dragon starts a small-town bakery and accidentally becomes famous.
```

## Notes

- Current implementation uses in-memory game state, so resetting server restarts the lobby.
- Designed to support a single active host/game session at a time.
- Player cap is enforced at 30 players.
