import { useEffect, useState } from "react";
import GoogleAuthButton from "./Auth";
import { supabase } from "../lib/supabaseClient";

interface HomeProps {
  onPlay: () => void;
}

// Interface for your Score table
// NOTE: Ensure your Supabase table is named 'scores' and has these columns.
interface ScoreEntry {
  id: number;
  score: number;
  created_at: string; // or 'timestamp' depending on your DB column name
}

// Dummy data for the background scrolling effect (Logged Out State)
const DUMMY_SCORES = Array(20).fill("User123......5000pts");

export default function Home({ onPlay }: HomeProps) {
  const [user, setUser] = useState<any>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // === 1. AUTH & DATA FETCHING ===
  useEffect(() => {
    // Check active session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchScores(session.user.id);
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchScores(session.user.id);
      } else {
        setScores([]); // Clear scores on logout
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchScores = async (userId: string) => {
    setLoading(true);
    // QUERY: Select scores for this user, ordered by newest first
    // Note: If your column is named 'timestamp' instead of 'created_at', change it below.
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); 

    if (error) {
      console.error("Error fetching scores:", error);
    } else {
      setScores(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener above will handle setting user to null
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
      
      {/* === LEFT SIDE (Icon, Title, Play Button) === */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '30px',
        paddingLeft: '50px' 
      }}>
        <img 
          src="/geoslugger.png" 
          alt="GeoSlugger Icon" 
          style={{ 
            width: '250px', 
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))'
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
          GeoSlugger
        </h1>

        {/* 3. Custom Play Button */}
        <button
            className="play-button-wrapper"
            onClick={onPlay}
        >
            {/* The Image */}
            <img src="/play_button.png" alt="Play" className="play-btn-img" />

            {/* The Glow */}
            <div className="play-btn-glow" />

            {/* The Text */}
            <span className="play-btn-text">PLAY</span>
        </button>
      </div>

      {/* === RIGHT SIDE (Window) === */}
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

          {/* ==================================== */}
          {/* SCENARIO A: LOGGED IN        */}
          {/* ==================================== */}
          {user ? (
            <>
              {/* 1. Header Sliver */}
              <div style={{
                height: '50px',
                backgroundColor: '#eee',
                borderBottom: '2px solid #ccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                flexShrink: 0
              }}>
                {/* User Name/Email */}
                <span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                  {user.email?.split('@')[0]}'s Scores
                </span>

                {/* Log Out Button */}
                <button 
                  onClick={handleLogout}
                  style={{
                    background: '#ff4d4d',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Log Out
                </button>
              </div>

              {/* 2. Real Score List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
                ) : scores.length === 0 ? (
                  <div style={{ 
                    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', color: '#888', gap: '10px'
                  }}>
                    <span style={{ fontFamily: 'miamiwriting, sans-serif', fontSize: '24px' }}>
                      No scores to display!
                    </span>
                  </div>
                ) : (
                  // List of Scores
                  scores.map((s) => (
                    <div key={s.id} style={{
                      padding: '15px',
                      borderBottom: '1px solid #ddd',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'white',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#4CAF50' }}>
                        {s.score} pts
                      </span>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            
          /* ==================================== */
          /* SCENARIO B: LOGGED OUT       */
          /* ==================================== */
            <>
              {/* Background Scrolling Dummy Text */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '200%', zIndex: 0 }}>
                <div className="scrolling-leaderboard">
                  {[...DUMMY_SCORES, ...DUMMY_SCORES].map((text, i) => (
                    <div key={i} style={{
                      padding: '15px', borderBottom: '2px solid white', textAlign: 'center',
                      fontFamily: 'monospace', fontSize: '18px', color: '#666',
                      backgroundColor: 'rgba(230, 230, 230, 0.5)'
                    }}>
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Black Overlay */}
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