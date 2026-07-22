import { FeedSkeleton } from "@/components/organisms/FeedSkeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
      <FeedSkeleton />
    </main>
  );
}
