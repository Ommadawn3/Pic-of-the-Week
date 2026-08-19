import { redirect } from "next/navigation";
import { getAppProfile } from "@/lib/auth";
import { StandardNav } from "@/components/organisms/StandardNav";
import { AccountForm } from "@/components/organisms/AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await getAppProfile();
  if (!profile) redirect("/signin?next=/account");

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
      <StandardNav title="Account" />
      <div className="page-scroll flex flex-1 flex-col gap-8 px-6 py-6">
        <AccountForm
          initialFirstName={profile.firstName ?? ""}
          initialInitial={profile.initial ?? ""}
        />
      </div>
    </main>
  );
}
