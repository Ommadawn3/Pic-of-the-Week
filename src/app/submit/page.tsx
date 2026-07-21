import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { SubmitFlowTemplate } from "@/components/templates/SubmitFlowTemplate";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const user = await getUser();
  if (!user) redirect("/signin?next=/submit");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <SubmitFlowTemplate />
    </main>
  );
}
