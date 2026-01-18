import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function GoogleAuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Load current session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userEmail = data.session?.user.email ?? null;
      handleEmail(userEmail);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleEmail(session?.user.email ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleEmail = async (userEmail: string | null) => {
    if (!userEmail) {
      setEmail(null);
      return;
    }

    // 🔒 UCSC restriction
    if (!userEmail.endsWith("@ucsc.edu")) {
      await supabase.auth.signOut();
      setMsg("Please use a UCSC email (@ucsc.edu)");
      setEmail(null);
      return;
    }

    setMsg(null);
    setEmail(userEmail);
  };

  const signIn = async () => {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) setMsg(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {email ? (
        <>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Signed in as</div>
          <div style={{ fontWeight: 700 }}>{email}</div>
          <button onClick={signOut} style={{ padding: 10 }}>
            Sign out
          </button>
        </>
      ) : (
        <button onClick={signIn} style={{ padding: 10 }}>
          Sign in with Google
        </button>
      )}

      {msg && <div style={{ color: "crimson", fontSize: 12 }}>{msg}</div>}
    </div>
  );
}
