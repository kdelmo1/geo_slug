import { useEffect, useState } from "react";
import GoogleAuthButton from "./Auth";
import { supabase } from "../lib/supabaseClient";

interface HomeProps {
  onPlay: () => void;
}

interface ScoreEntry {
  id: number;
  score: number;
  played_at: string;
}

export default function Home({ onPlay }: HomeProps) {
  const [user, setUser] = useState<any>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchScores(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchScores(session.user.id);
      } else {
        setScores([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchScores = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', userId)
      .order('score', { ascending: false });

    if (error) {
      console.error("Error fetching scores:", error);
    } else {
      setScores(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Helper to get badge color based on rank
  const getRankStyle = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return { bg: "#FFD700", color: "#fff", shadow: "0 2px 4px rgba(218,165,32,0.5)" }; // Gold
    if (rank === 2) return { bg: "#C0C0C0", color: "#fff", shadow: "0 2px 4px rgba(169,169,169,0.5)" }; // Silver
    if (rank === 3) return { bg: "#CD7F32", color: "#fff", shadow: "0 2px 4px rgba(205,127,50,0.5)" }; // Bronze
    return { bg: "#eee", color: "#555", shadow: "none" }; // Default Grey
  };

  return (
    <div style={{ 
      display: 'flex', 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundImage: "url('/home_background.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      
      {/* === LEFT SIDE === */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '30px',
        paddingLeft: '50px',
        marginBottom: '60px'
      }}>
        <img 
          src="/pintheslug.png" 
          alt="PinTheSlug Icon" 
          style={{ 
            width: '550px', 
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))',
            marginLeft: '120px', /* <--- SHIFTED RIGHT TO CENTER */
            marginBottom: '-40px'
          }} 
        />
        
        <h1 style={{ 
          fontFamily: 'miamiwriting, sans-serif', 
          fontSize: '90px', 
          color: '#333',
          margin: 0,
          textShadow: '3px 3px 0px rgba(255,255,255,0.6)',
          textAlign: 'center',
          lineHeight: '1.0'
        }}>
          PinTheSlug
        </h1>

        <button 
          className="play-button-wrapper"
          onClick={onPlay}
        >
          <img src="/play_button.png" alt="Play" className="play-btn-img" />
          <div className="play-btn-glow" />
          <span className="play-btn-text">PLAY</span>
        </button>
      </div>

      {/* === RIGHT SIDE === */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <div style={{
          width: '480px',
          height: '600px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '20px',
          border: '4px solid #333',
          boxShadow: '10px 10px 0px rgba(0,0,0,0.2)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateX(-50px)' 
        }}>

          {user ? (
            /* === LOGGED IN VIEW === */
            <>
              {/* Header */}
              <div style={{
                height: '60px', 
                backgroundColor: '#eee',
                borderBottom: '2px solid #ccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                flexShrink: 0
              }}>
                <span style={{ fontWeight: 'bold', color: '#333', fontSize: '24px' }}>
                  {user.email?.split('@')[0]}'s Top Scores
                </span>

                <button 
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#ff4d4d', 
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontFamily: 'miamiwriting, sans-serif',
                    fontSize: '24px',
                    letterSpacing: '1px'
                  }}
                >
                  Log Out
                </button>
              </div>

              {/* Score List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
                ) : scores.length === 0 ? (
                  <div style={{ 
                    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', color: '#888', gap: '10px'
                  }}>
                    <span style={{ fontSize: '40px' }}>📉</span>
                    <span style={{ fontFamily: 'miamiwriting, sans-serif', fontSize: '24px' }}>
                      No scores yet!
                    </span>
                  </div>
                ) : (
                  scores.map((s, index) => {
                    const rankStyle = getRankStyle(index);

                    return (
                      <div key={s.id} style={{
                        padding: '10px 15px',
                        borderBottom: '1px solid #ddd',
                        display: 'flex',
                        alignItems: 'center',
                        background: 'white',
                        marginBottom: '8px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          backgroundColor: rankStyle.bg, color: rankStyle.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', fontSize: '16px', marginRight: '15px',
                          boxShadow: rankStyle.shadow, flexShrink: 0
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                           <span style={{ fontWeight: 'bold', fontSize: '24px', color: '#4CAF50', display: 'block' }}>
                              {s.score} pts
                           </span>
                        </div>
                        <span style={{ fontSize: '16px', color: '#999', textAlign: 'right' }}>
                          {new Date(s.played_at).toLocaleDateString()} <br/>
                          {new Date(s.played_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            
            /* === LOGGED OUT VIEW (Updated Dummies) === */
            <>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '200%', zIndex: 0 }}>
                <div className="scrolling-leaderboard">
                  {/* Create 40 dummy items (20 original + 20 clone for looping) */}
                  {Array.from({ length: 40 }).map((_, i) => {
                    // Use modulo to make ranks 1-20 then repeat 1-20
                    const rankIndex = i % 20; 
                    const rankStyle = getRankStyle(rankIndex);
                    // Fake descending score
                    const dummyScore = 25000 - (rankIndex * 850); 
                    
                    return (
                      <div key={i} style={{
                        padding: '10px 15px',
                        borderBottom: '1px solid #ddd', // Lighter border for background feel
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.5)', // Semi-transparent white
                        marginBottom: '8px',
                        borderRadius: '8px',
                        margin: '10px 15px' // Add horizontal margin to match the real look
                      }}>
                        {/* 1. DUMMY RANK CIRCLE */}
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          backgroundColor: rankStyle.bg, color: rankStyle.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', fontSize: '16px', marginRight: '15px',
                          boxShadow: rankStyle.shadow, flexShrink: 0,
                          opacity: 0.8 // Slightly faded
                        }}>
                          {rankIndex + 1}
                        </div>

                        {/* 2. DUMMY SCORE */}
                        <div style={{ flex: 1 }}>
                           <span style={{ fontWeight: 'bold', fontSize: '24px', color: '#555', display: 'block' }}>
                              {dummyScore} pts
                           </span>
                        </div>
                        
                        {/* 3. DUMMY DATE */}
                        <span style={{ fontSize: '16px', color: '#888', textAlign: 'right' }}>
                          1/18/2026 <br/>
                          12:00 PM
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* The Black Overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 1, backdropFilter: 'blur(3px)'
              }} />

              {/* Login Prompt */}
              <div style={{
                position: 'relative', zIndex: 2, height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'white', textAlign: 'center', padding: '40px'
              }}>
                <h2 style={{ marginBottom: '20px', fontSize: '32px', textShadow: '0 2px 4px rgba(0,0,0,0.5)', lineHeight: '1.5' }}>
                  <GoogleAuthButton asLink={true} style={{ color: '#66bb6a', textDecoration: 'underline' }}>
                    Log in
                  </GoogleAuthButton> 
                  {' '}to see and save scores
                </h2>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}