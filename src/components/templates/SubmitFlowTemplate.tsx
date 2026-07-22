"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/atoms/Button";
import { TextField } from "@/components/atoms/TextField";
import { StandardNav } from "@/components/organisms/StandardNav";
import { CameraCapture } from "@/components/organisms/CameraCapture";
import { submitPhoto } from "@/app/submit/actions";
import { CAPTION_MAX_LENGTH } from "@/lib/config";

type Step = "capture" | "confirm" | "details";

export function SubmitFlowTemplate({ defaultFirstName = "" }: { defaultFirstName?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("capture");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [initial, setInitial] = useState("");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  // Object URLs must be revoked or every retake leaks one for the tab's
  // lifetime. Done in the event handlers rather than an effect: revoking from
  // render or a state updater can free a URL that StrictMode's second pass
  // still needs, blanking the preview in dev.
  const setPhoto = useCallback((next: Blob | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = next ? URL.createObjectURL(next) : null;
    urlRef.current = url;
    setBlob(next);
    setPreviewUrl(url);
  }, []);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const onCapture = useCallback(
    (b: Blob) => {
      setPhoto(b);
      setStep("confirm");
    },
    [setPhoto],
  );

  const retake = useCallback(() => {
    setPhoto(null);
    setStep("capture");
  }, [setPhoto]);

  // Keep the button busy until the destination actually commits, so there's no
  // window where a successful submit looks like nothing happened.
  const busy = submitting || isPending;

  async function onSubmit() {
    if (!blob || busy) return;
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.set("image", new File([blob], "photo.jpg", { type: "image/jpeg" }));
    fd.set("firstName", firstName);
    fd.set("initial", initial);
    fd.set("caption", caption);

    const result = await submitPhoto(fd);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    // Land on the photo they just posted. `replace`, not `push` — Back should
    // not return to a spent form with a dead camera.
    startTransition(() => {
      router.replace(`/week/${result.weekId}/photo/${result.photoId}`);
    });
  }

  const title =
    step === "capture" ? "Take a photo" : step === "confirm" ? "Confirm photo" : "Add details";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StandardNav
        title={title}
        onBack={step === "capture" ? () => router.push("/") : retake}
      />

      {/*
        Kept mounted across capture → confirm → retake and hidden with CSS
        rather than unmounted. Unmounting stops the MediaStream, and starting a
        new one re-triggers the OS permission prompt on every retake — which is
        what made the app feel like it was constantly asking for the camera.
      */}
      <div className={step === "capture" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        <CameraCapture onCapture={onCapture} />
      </div>

      {step === "confirm" && previewUrl && (
        <div className="page-scroll flex flex-1 flex-col">
          <div className="relative aspect-square w-full overflow-hidden bg-black">
            <Image src={previewUrl} alt="Your photo" fill className="object-cover" unoptimized />
          </div>
          <div className="flex flex-1 items-center justify-center gap-4 px-6 py-10">
            <Button variant="secondary" onClick={retake} className="flex-1">
              Retake
            </Button>
            <Button onClick={() => setStep("details")} className="flex-1">
              Next
            </Button>
          </div>
        </div>
      )}

      {step === "details" && previewUrl && (
        <div className="page-scroll flex flex-1 flex-col gap-6 px-6 py-6">
          <div className="flex justify-center">
            <div className="relative size-[100px] overflow-hidden rounded-md bg-black">
              <Image src={previewUrl} alt="Your photo" fill className="object-cover" unoptimized />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-base font-medium text-muted">Author&apos;s Name</p>
            <div className="flex gap-3">
              <TextField
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                className="flex-1"
                maxLength={40}
              />
              <TextField
                label="Initial"
                value={initial}
                onChange={(e) => setInitial(e.target.value)}
                maxLength={1}
                className="w-[108px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-hairline pt-6">
            <p className="text-base font-medium text-muted">Add a caption</p>
            <TextField
              label="Write a caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={CAPTION_MAX_LENGTH}
              showCount
            />
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="mt-auto">
            <Button
              onClick={onSubmit}
              disabled={busy || !firstName.trim()}
              className="w-full border border-accent-border bg-accent-bg text-white hover:bg-accent-bg/80"
            >
              {busy ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
