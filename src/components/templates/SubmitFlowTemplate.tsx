"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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

  const previewUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  const onCapture = useCallback((b: Blob) => {
    setBlob(b);
    setStep("confirm");
  }, []);

  const retake = useCallback(() => {
    setBlob(null);
    setStep("capture");
  }, []);

  async function onSubmit() {
    if (!blob) return;
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.set("image", new File([blob], "photo.jpg", { type: "image/jpeg" }));
    fd.set("firstName", firstName);
    fd.set("initial", initial);
    fd.set("caption", caption);
    const result = await submitPhoto(fd);
    if (result.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  }

  const title =
    step === "capture" ? "Take a photo" : step === "confirm" ? "Confirm photo" : "Add details";

  return (
    <div className="flex min-h-full flex-col">
      <StandardNav
        title={title}
        onBack={step === "capture" ? () => router.push("/") : retake}
      />

      {step === "capture" && <CameraCapture onCapture={onCapture} />}

      {step === "confirm" && previewUrl && (
        <div className="flex flex-1 flex-col">
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
        <div className="flex flex-1 flex-col gap-6 px-6 py-6">
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
              disabled={submitting || !firstName.trim()}
              className="w-full border border-accent-border bg-accent-bg text-white hover:bg-accent-bg/80"
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
