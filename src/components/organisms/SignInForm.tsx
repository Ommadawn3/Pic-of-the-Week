"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextField } from "@/components/atoms/TextField";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function SignInForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(initialError ? "error" : "idle");
  const [message, setMessage] = useState(
    initialError ? "That sign-in link didn't work. Try again." : "",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
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

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-marker text-3xl">Check your email</h1>
        <p className="text-muted">
          We sent a sign-in link to <span className="text-white">{email}</span>. Open it on this
          device to finish signing in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-marker text-3xl">Sign in</h1>
        <p className="text-muted">
          Enter your email and we&apos;ll send you a one-tap sign-in link. No password needed.
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

      {status === "error" && message ? (
        <p className="text-sm text-danger">{message}</p>
      ) : null}

      <Button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send me a link"}
      </Button>
    </form>
  );
}
