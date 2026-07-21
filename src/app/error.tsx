"use client";

import { Button } from "@/components/atoms/Button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-marker text-3xl">Something broke</h1>
      <p className="text-muted">That didn&apos;t work. Try again in a moment.</p>
      <Button onClick={reset}>Retry</Button>
    </main>
  );
}
