import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getPublicUser, isFriendOf } from "@/lib/data/friends";
import { StandardNav } from "@/components/organisms/StandardNav";
import { AddFriendCard } from "@/components/organisms/AddFriendCard";

export const dynamic = "force-dynamic";

export default async function AddFriendPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/add/${userId}`)}`);

  const target = await getPublicUser(userId);
  const name = target?.firstName
    ? `${target.firstName}${target.initial ? ` ${target.initial}` : ""}`
    : null;

  const isSelf = userId === user.id;
  const already = !isSelf && (await isFriendOf(userId));

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
      <StandardNav title="Add friend" />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        {!target ? (
          <p className="text-muted">That link doesn&apos;t point to anyone.</p>
        ) : isSelf ? (
          <>
            <p className="font-marker text-2xl text-white">This is your invite link</p>
            <p className="text-sm text-muted">Share it so friends can add you.</p>
            <Link href="/account" className="text-sm text-accent">
              Copy it on your account page
            </Link>
          </>
        ) : already ? (
          <>
            <p className="font-marker text-2xl text-white">
              You&apos;re already friends with {name}
            </p>
            <Link href="/?feed=friends" className="text-sm text-accent">
              See your friends feed
            </Link>
          </>
        ) : (
          <AddFriendCard targetId={userId} name={name ?? "this person"} initial={name?.[0] ?? "?"} />
        )}
      </div>
    </main>
  );
}
