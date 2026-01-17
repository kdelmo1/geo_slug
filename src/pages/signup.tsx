import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith("@ucsc.edu")) {
      return setMsg("Only @ucsc.edu emails are allowed.");
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: normalized,
      password,
    });
    setLoading(false);

    if (error) return setMsg(error.message);

    setMsg("Check your email to verify your account, then log in.");
    // You can also nav("/login") if you prefer
  };

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1>Sign up</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@ucsc.edu" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (min 6 chars)" type="password" />
        <button disabled={loading} type="submit">{loading ? "Creating..." : "Create account"}</button>
      </form>
      {msg && <p>{msg}</p>}
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </main>
  );
}
