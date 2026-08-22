"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/atoms/Button";
import { addFriend } from "@/app/friends/actions";

export function AddFriendCard({
  targetId,
  name,
  initial,
}: {
  targetId: string;
  name: string;
  initial: string;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onAdd() {
    setError(null);
    startTransition(async () => {
      const res = await addFriend(targetId);
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-xl font-medium text-white">
        {initial.toUpperCase()}
      </span>
      {done ? (
        <>
          <p className="font-marker text-2xl text-white">You&apos;re friends with {name}!</p>
          <Link
            href="/?feed=friends"
            className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-white"
          >
            See your friends feed
          </Link>
        </>
      ) : (
        <>
          <p className="font-marker text-2xl text-white">Add {name}?</p>
          <p className="text-sm text-muted">
            You&apos;ll see each other&apos;s photos in your Friends feed.
          </p>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            onClick={onAdd}
            disabled={isPending}
            className="border border-accent-border bg-accent-bg text-white hover:bg-accent-bg/80"
          >
            {isPending ? "Adding…" : `Add ${name}`}
          </Button>
        </>
      )}
    </div>
  );
}
