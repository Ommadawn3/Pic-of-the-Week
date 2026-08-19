"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/atoms/Button";
import { TextField } from "@/components/atoms/TextField";
import { saveName } from "@/app/welcome/actions";

/** One-time name capture shown on a user's first sign-in. */
export function WelcomeForm({ next }: { next: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [initial, setInitial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = firstName.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const res = await saveName(name, initial);
      if (res.ok) {
        router.replace(next);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-marker text-2xl text-white">What should we call you?</h1>
        <p className="text-sm text-muted">
          This name shows on your photos and the leaderboard. You only set it once.
        </p>
      </div>

      <div className="flex gap-3">
        <TextField
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          className="flex-1"
          maxLength={40}
        />
        <TextField
          label="Initial"
          value={initial}
          onChange={(e) => setInitial(e.target.value)}
          maxLength={1}
          className="w-[108px]"
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button
        type="submit"
        disabled={isPending || !firstName.trim()}
        className="w-full border border-accent-border bg-accent-bg text-white hover:bg-accent-bg/80"
      >
        {isPending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
