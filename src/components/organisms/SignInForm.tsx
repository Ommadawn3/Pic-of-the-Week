"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextField } from "@/components/atoms/TextField";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "verifying" | "error";

function safeNext(next?: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export function SignInForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>(initialError ? "error" : "idle");
  const [message, setMessage] = useState(
    initialError ? "That sign-in link didn't work. Try the code instead." : "",
  );

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    // We still pass a redirect for the link (works on the website/desktop), but
    // the code path below is what works inside an installed PWA, where the link
    // would open in a separate browser with a separate session.
    const redirectTo = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.trim();
    if (token.length < 6) return; // codes are 6 digits; tolerate up to 8
    setStatus("verifying");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      setStatus("sent");
      setMessage("That code didn't work. Check it and try again, or resend.");
    } else {
      // Full navigation so server components pick up the fresh session cookie.
      window.location.assign(safeNext(next));
    }
  }

  if (status === "sent" || status === "verifying") {
    return (
      <form onSubmit={verifyCode} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-marker text-3xl">Check your email</h1>
          <p className="text-muted">
            We sent a 6-digit code to <span className="text-white">{email}</span>. Enter it below.
          </p>
        </div>

        <TextField
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          maxLength={8}
          required
        />

        {message ? <p className="text-sm text-danger">{message}</p> : null}

        <Button type="submit" disabled={status === "verifying" || code.trim().length < 6}>
          {status === "verifying" ? "Verifying…" : "Sign in"}
        </Button>

        <button
          type="button"
          onClick={() => {
            setCode("");
            setStatus("idle");
            setMessage("");
          }}
          className="text-sm text-muted hover:text-white"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-marker text-3xl">Sign in</h1>
        <p className="text-muted">
          Enter your email and we&apos;ll send you a 6-digit code. No password needed.
        </p>
      </div>

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {status === "error" && message ? <p className="text-sm text-danger">{message}</p> : null}

      <Button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send me a code"}
      </Button>
    </form>
  );
}
