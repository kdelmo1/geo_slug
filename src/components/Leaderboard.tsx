import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface LeaderboardEntry {
  id: number;
  score: number;
  played_at: string;
  users: {
    name: string;
    student_email: string;
  };
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("scores")
        .select(
          `
          id,
          score,
          played_at,
          users (
            name,
            student_email
          )
        `,
        )
        .order("score", { ascending: false })
        .limit(10);

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#f44336" }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "40px" }}>
      <h3 style={{ fontSize: "24px", marginBottom: "20px", color: "#333" }}>
        🏆 Leaderboard
      </h3>

      {entries.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No scores yet. Be the first to play!</p>
      ) : (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "15px 20px",
                borderBottom:
                  index < entries.length - 1 ? "1px solid #eee" : "none",
                background:
                  index < 3
                    ? `rgba(255, 215, 0, ${0.1 - index * 0.03})`
                    : "transparent",
              }}
            >
              <div
                style={{
                  width: "40px",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color:
                    index === 0
                      ? "#FFD700"
                      : index === 1
                        ? "#C0C0C0"
                        : index === 2
                          ? "#CD7F32"
                          : "#666",
                }}
              >
                {index === 0
                  ? "🥇"
                  : index === 1
                    ? "🥈"
                    : index === 2
                      ? "🥉"
                      : `${index + 1}.`}
              </div>

              <div style={{ flex: 1, marginLeft: "15px" }}>
                <div style={{ fontWeight: "bold", color: "#333" }}>
                  {entry.users?.name || "Unknown Player"}
                </div>
                <div style={{ fontSize: "12px", color: "#888" }}>
                  {new Date(entry.played_at).toLocaleDateString()}
                </div>
              </div>

              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#4CAF50",
                }}
              >
                {entry.score.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchLeaderboard}
        style={{
          marginTop: "15px",
          padding: "8px 16px",
          background: "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        🔄 Refresh
      </button>
    </div>
  );
}
