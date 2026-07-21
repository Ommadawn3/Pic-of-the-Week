import { Suspense } from "react";
import { SignInForm } from "@/components/organisms/SignInForm";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Suspense>
        <SignInForm next={next} initialError={error} />
      </Suspense>
    </main>
  );
}
