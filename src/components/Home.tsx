import GoogleAuthButton from "./Auth";
import ProfilePicture from "./Profile";

interface HomeProps {
  onPlay: () => void;
}

export default function Home({ onPlay }: HomeProps) {
    return (
        <main style={{ maxWidth: 700, margin: "48px auto", padding: 16 }}>
        <h1 style={{ fontSize: 36 }}>Slug Guesser</h1>

        < ProfilePicture size="large" alt="User Profile Picture" />

        {/* Profile + Auth */}
        <div style={{ marginBottom: 24 }}>
            <GoogleAuthButton />
        </div>

        {/* Play Button */}
        <button
            onClick={onPlay}
            style={{
            padding: "16px 32px",
            fontSize: 20,
            fontWeight: "bold",
            borderRadius: 10,
            background: "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
            }}
        >
            ▶ Play Game
        </button>

        {/* Leaderboard placeholder */}
        <div style={{ marginTop: 40, opacity: 0.7 }}>
            <h3>Leaderboard</h3>
            <p>Log in to save your score</p>
        </div>
        </main>
    );
}
