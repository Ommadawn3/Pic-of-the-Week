import { redirect } from "next/navigation";
import { getAppProfile } from "@/lib/auth";
import { SubmitFlowTemplate } from "@/components/templates/SubmitFlowTemplate";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const profile = await getAppProfile();
  if (!profile) redirect("/signin?next=/submit");
  // Signed in but never picked a name (e.g. joined before names were saved) —
  // capture it once, then come back to submit.
  if (!profile.firstName) redirect("/welcome?next=/submit");

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
      <SubmitFlowTemplate
        defaultFirstName={profile.firstName}
        defaultInitial={profile.initial ?? ""}
        nameLocked
      />
    </main>
  );
}
