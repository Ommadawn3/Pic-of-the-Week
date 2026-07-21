import Link from "next/link";
import { Button } from "@/components/atoms/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-marker text-4xl">Not found</h1>
      <p className="text-muted">That page or photo doesn&apos;t exist.</p>
      <Link href="/">
        <Button>Back to this week</Button>
      </Link>
    </main>
  );
}
