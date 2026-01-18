import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface AuthProps {
  asLink?: boolean; // New prop to toggle "Text Link" mode
  children?: React.ReactNode; // Allows us to pass text like "Log in"
  className?: string;
  style?: React.CSSProperties;
}

export default function GoogleAuthButton({ asLink = false, children, className, style }: AuthProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      handleEmail(data.session?.user.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleEmail(session?.user.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleEmail = async (userEmail: string | null) => {
    if (!userEmail) {
      setEmail(null);
      return;
    }
    // 🔒 UCSC restriction check (Optional: remove if you want open access)
    if (!userEmail.endsWith("@ucsc.edu")) {
      await supabase.auth.signOut();
      setMsg("Please use a UCSC email");
      setEmail(null);
      return;
    }
    setMsg(null);
    setEmail(userEmail);
  };

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setMsg(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // === RENDER LOGIC ===

  // 1. If user is signed in, show their email
  if (email) {
    return (
      <div style={{ textAlign: 'center', ...style }}>
        <div style={{ fontSize: 14, opacity: 0.8, color: asLink ? 'white' : 'inherit' }}>Signed in as</div>
        <div style={{ fontWeight: 700, color: asLink ? 'white' : 'inherit', marginBottom: 5 }}>{email}</div>
        <button 
          onClick={signOut} 
          style={{ 
            padding: "4px 12px", fontSize: "12px", borderRadius: "4px", 
            border: "none", background: "#f44336", color: "white", cursor: "pointer" 
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  // 2. Link Mode (Just the clickable text)
  if (asLink) {
    return (
      <span 
        onClick={signIn}
        className={className}
        style={{ cursor: 'pointer', textDecoration: 'underline', color: '#4CAF50', fontWeight: 'bold', ...style }}
      >
        {children || "Log in"}
      </span>
    );
  }

  // 3. Default Button Mode
  return (
    <div style={{ display: "grid", gap: 8, ...style }}>
      <button 
        onClick={signIn} 
        style={{ padding: "10px 20px", cursor: "pointer", fontSize: "16px" }}
      >
        Sign in with Google
      </button>
      {msg && <div style={{ color: "red" }}>{msg}</div>}
    </div>
  );
}