import { redirect } from "next/navigation";
import { getAppProfile, getUser } from "@/lib/auth";
import { StandardNav } from "@/components/organisms/StandardNav";
import { AccountForm } from "@/components/organisms/AccountForm";
import { InviteLink } from "@/components/organisms/InviteLink";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const [profile, user] = await Promise.all([getAppProfile(), getUser()]);
  if (!profile || !user) redirect("/signin?next=/account");

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
      <StandardNav title="Account" />
      <div className="page-scroll flex flex-1 flex-col gap-8 px-6 py-6">
        <AccountForm
          initialFirstName={profile.firstName ?? ""}
          initialInitial={profile.initial ?? ""}
        />

        <section className="flex flex-col gap-3 border-t border-hairline pt-6">
          <h2 className="text-base font-medium text-muted">Friends</h2>
          <p className="text-xs text-muted-2">
            Share your link so friends can add you — then switch the feed to Friends.
          </p>
          <InviteLink userId={user.id} />
        </section>
      </div>
    </main>
  );
}
