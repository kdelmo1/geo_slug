import { useState } from "react";
import Home from "./components/Home";
import Game from "./game/Game";

export default function App() {
  const [playing, setPlaying] = useState(false);

  return (
    // We remove the layout styling here because Game.tsx handles its own layout
    <>
      {playing ? (
        <Game onExit={() => setPlaying(false)} />
      ) : (
        <Home onPlay={() => setPlaying(true)} />
      )}
    </>
  );
}