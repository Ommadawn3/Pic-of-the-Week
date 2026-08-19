import { redirect } from "next/navigation";
import { getAppProfile } from "@/lib/auth";
import { WelcomeForm } from "@/components/organisms/WelcomeForm";

export const dynamic = "force-dynamic";

function safeNext(next: string | undefined): string {
  // Only allow same-origin app paths, never an external redirect.
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const dest = safeNext(next);

  const profile = await getAppProfile();
  if (!profile) redirect(`/signin?next=${encodeURIComponent(`/welcome?next=${dest}`)}`);
  // Already named — nothing to do here.
  if (profile.firstName) redirect(dest);

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col justify-center px-6 py-16">
      <WelcomeForm next={dest} />
    </main>
  );
}
