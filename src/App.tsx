import React, { useMemo, useState } from "react";
import Home from "./components/Home";
import Game from "./game/Game";
import type { LeaderboardEntry, UserSession } from "./types";

export default function App() {
  // Single-page "routing"
  const [screen, setScreen] = useState<"HOME" | "GAME">("HOME");

  // MOCK auth for now (replace with Supabase session later)
  const [session, setSession] = useState<UserSession | null>(null);

  // MOCK leaderboard data (chronological newest first)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { id: "1", name: "SlugMaster", score: 4920, createdAt: Date.now() - 1000 * 60 * 5 },
    { id: "2", name: "BananaPro", score: 4100, createdAt: Date.now() - 1000 * 60 * 20 },
    { id: "3", name: "UCSClocal", score: 3200, createdAt: Date.now() - 1000 * 60 * 40 },
  ]);

  const bestScore = useMemo(() => {
    if (!session) return null;
    const mine = leaderboard.filter((x) => x.userId === session.userId);
    if (mine.length === 0) return null;
    return Math.max(...mine.map((x) => x.score));
  }, [leaderboard, session]);

  // called by Game when a round ends (distance -> score)
  const onRoundSaved = (score: number) => {
    // If not logged in, you can still show result but don't save
    if (!session) return;

    const entry: LeaderboardEntry = {
      id: crypto.randomUUID(),
      userId: session.userId,
      name: session.displayName,
      score,
      createdAt: Date.now(),
    };

    // Chronological: newest first
    setLeaderboard((prev) => [entry, ...prev].sort((a, b) => b.createdAt - a.createdAt));
  };

  if (screen === "GAME") {
    return (
      <Game
        session={session}
        onExit={() => setScreen("HOME")}
        onRoundSaved={onRoundSaved}
      />
    );
  }

  return (
    <Home
      session={session}
      bestScore={bestScore}
      leaderboard={leaderboard}
      onPlay={() => setScreen("GAME")}
      onLogin={(email) => {
        // MOCK login: treat any email as logged in (you’ll enforce @ucsc.edu later)
        setSession({
          userId: crypto.randomUUID(),
          email,
          displayName: email.split("@")[0],
        });
      }}
      onLogout={() => setSession(null)}
      onSignup={(email) => {
        // MOCK signup
        setSession({
          userId: crypto.randomUUID(),
          email,
          displayName: email.split("@")[0],
        });
      }}
    />
  );
}
