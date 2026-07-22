"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StandardNav } from "@/components/organisms/StandardNav";
import { TextField } from "@/components/atoms/TextField";
import { VoteControl } from "@/components/atoms/VoteControl";
import { ReportButton } from "@/components/molecules/ReportButton";
import { Icon } from "@/components/atoms/Icon";
import { iconButtonClass } from "@/components/atoms/IconButton";
import { submitCaption, toggleVote } from "@/app/captions/actions";
import { CAPTION_MAX_LENGTH } from "@/lib/config";
import type { CaptionRow, PhotoHeader } from "@/lib/data/captions";

type Props = {
  photo: PhotoHeader;
  weekId: string;
  initialCaptions: CaptionRow[];
  isSignedIn: boolean;
  isActiveWeek: boolean;
};

export function CaptionFlowTemplate({
  photo,
  weekId,
  initialCaptions,
  isSignedIn,
  isActiveWeek,
}: Props) {
  const router = useRouter();
  const [captions, setCaptions] = useState(initialCaptions);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function rerank(list: CaptionRow[]): CaptionRow[] {
    return [...list]
      .sort((a, b) => b.vote_count - a.vote_count || a.created_at.localeCompare(b.created_at))
      .map((c, i) => ({ ...c, rank: i + 1 }));
  }

  function onVote(caption: CaptionRow) {
    if (!isSignedIn) {
      router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (caption.is_author) {
      setError("You can't vote on your own caption.");
      return;
    }
    setError(null);
    // Optimistic update. A user backs at most one caption per photo, so voting
    // a new caption moves the vote off whichever one they were backing.
    const removing = caption.has_voted;
    setCaptions((prev) =>
      rerank(
        prev.map((c) => {
          if (c.id === caption.id) {
            return {
              ...c,
              has_voted: !removing,
              vote_count: c.vote_count + (removing ? -1 : 1),
            };
          }
          // Clear any other caption this user was backing.
          if (!removing && c.has_voted) {
            return { ...c, has_voted: false, vote_count: Math.max(0, c.vote_count - 1) };
          }
          return c;
        }),
      ),
    );
    startTransition(async () => {
      const res = await toggleVote(caption.id);
      if (!res.ok) {
        setError(res.error);
        router.refresh();
      }
    });
  }

  function onSubmitCaption(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignedIn) {
      router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const body = draft.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const res = await submitCaption(photo.id, body);
      if (res.ok) {
        setDraft("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StandardNav title="Captions" onBack={() => router.push(`/week/${weekId}/photo/${photo.id}`)} />

      <div className="flex items-center justify-center border-b border-hairline py-4">
        <div className="relative size-[100px] overflow-hidden bg-black">
          <Image src={photo.image_url} alt="" fill className="object-cover" sizes="100px" unoptimized />
        </div>
      </div>

      {/* Only the list scrolls — the photo header and composer stay pinned. */}
      <ul className="page-scroll flex min-h-0 flex-1 flex-col">
        {captions.length === 0 ? (
          <li className="px-6 py-10 text-center text-sm text-muted">
            No captions yet. Be the first to write one!
          </li>
        ) : (
          captions.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 border-b border-hairline px-6 py-4"
            >
              <span className="w-4 shrink-0 text-base font-medium tabular-nums text-white">
                {c.rank}
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-sm text-white">
                  {c.rank === 1 ? c.body : `“${c.body}”`}
                </p>
                {!c.is_author ? (
                  <ReportButton
                    targetType="caption"
                    targetId={c.id}
                    isSignedIn={isSignedIn}
                    className="self-start"
                  />
                ) : null}
              </div>
              <VoteControl
                count={c.vote_count}
                hasVoted={c.has_voted}
                disabled={c.is_author || !isActiveWeek}
                pending={isPending}
                onClick={() => onVote(c)}
              />
            </li>
          ))
        )}
      </ul>

      {error ? <p className="px-6 pt-3 text-sm text-danger">{error}</p> : null}

      {isActiveWeek ? (
        <form onSubmit={onSubmitCaption} className="flex items-center gap-3 p-4">
          <TextField
            label={isSignedIn ? "Write a caption!" : "Sign in to add a caption"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={CAPTION_MAX_LENGTH}
            showCount
            className="flex-1"
          />
          <button
            type="submit"
            aria-label="Post caption"
            disabled={isPending || !draft.trim()}
            className={iconButtonClass("accent", "disabled:opacity-40")}
          >
            {/* up arrow = send, matching the home tool bar */}
            <Icon name="arrow" size={18} className="-rotate-90" />
          </button>
        </form>
      ) : (
        <p className="p-4 text-center text-sm text-muted">
          This contest has ended — captions are locked.
        </p>
      )}
    </div>
  );
}
