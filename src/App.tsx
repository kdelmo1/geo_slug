import { useState } from "react";
import Home from "./components/Home";
import Game from "./game/Game";

export default function App() {
  const [playing, setPlaying] = useState(false);

  return (
    <>
      {playing ? (
        <Game onExit={() => setPlaying(false)} />
      ) : (
        <Home onPlay={() => setPlaying(true)} />
      )}
    </>
  );
}
