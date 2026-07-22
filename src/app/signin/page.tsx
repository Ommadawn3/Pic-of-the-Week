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
    <main className="page-scroll mx-auto flex w-full max-w-md flex-col justify-center px-6 py-16">
      <Suspense>
        <SignInForm next={next} initialError={error} />
      </Suspense>
    </main>
  );
}
