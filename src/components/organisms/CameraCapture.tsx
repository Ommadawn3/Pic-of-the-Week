"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const MAX_EDGE = 1080; // cap a photo's long edge before upload
const CLIP_MS = 2000; // 2-second clips
const CLIP_BITRATE = 900_000; // ~900 kbps keeps a 2s clip well under ~300 KB

// Prefer H.264 MP4 — the codec test showed both iOS and Android record it, so
// clips play everywhere without transcoding. WebM is only a last resort for the
// rare device that can't record MP4 (and may not play cross-device — the known
// limitation we've deferred a transcode step for).
const RECORD_CANDIDATES = [
  "video/mp4;codecs=h264",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export type CaptureMode = "photo" | "clip";
export type CapturedMedia = { blob: Blob; mediaType: CaptureMode; ext: string };

type CameraCaptureProps = {
  onCapture: (media: CapturedMedia) => void;
};

function pickClipMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return RECORD_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);

  const clipMime = pickClipMime();
  const canClip = clipMime !== "";
  // Clip is the default; fall back to photo only if the device can't record.
  const [mode, setMode] = useState<CaptureMode>("clip");
  const effectiveMode: CaptureMode = canClip ? mode : "photo";

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This device or browser doesn't support camera capture.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // audio:false — clips are silent by design (matches the gif-style
          // intent and sidesteps iOS's block on unmuted autoplay).
          video: {
            facingMode: "environment",
            width: { ideal: 1080 },
            height: { ideal: 1080 },
            frameRate: { ideal: 24 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError("Camera access was blocked. Allow camera access and reload to post.");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;
    const target = Math.min(side, MAX_EDGE);

    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, target, target);
    canvas.toBlob(
      (blob) => blob && onCapture({ blob, mediaType: "photo", ext: "jpg" }),
      "image/jpeg",
      0.9,
    );
  }, [onCapture]);

  const recordClip = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recording || !clipMime) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: clipMime, videoBitsPerSecond: CLIP_BITRATE });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: clipMime });
      const ext = clipMime.includes("mp4") ? "mp4" : "webm";
      setRecording(false);
      onCapture({ blob, mediaType: "clip", ext });
    };
    rec.start();
    setRecording(true);
    setTimeout(() => rec.state !== "inactive" && rec.stop(), CLIP_MS);
  }, [recording, clipMime, onCapture]);

  const onShutter = effectiveMode === "clip" ? recordClip : takePhoto;

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="font-marker text-2xl text-white">Camera needed</p>
        <p className="text-sm text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative aspect-square w-full overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="size-full object-cover" />
        {recording ? (
          <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            <span className="size-2 animate-pulse rounded-full bg-danger" /> recording…
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
        {/* Clip / Photo toggle — clip default. */}
        <div className="flex rounded-full bg-white/10 p-1 text-sm font-medium">
          {(["clip", "photo"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={recording || (m === "clip" && !canClip)}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-5 py-1.5 capitalize transition-colors disabled:opacity-40",
                effectiveMode === m ? "bg-white text-black" : "text-white",
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label={effectiveMode === "clip" ? "Record 2 second clip" : "Take photo"}
          disabled={!ready || recording}
          onClick={onShutter}
          className={cn(
            "flex size-20 items-center justify-center rounded-full border-4 disabled:opacity-40",
            effectiveMode === "clip" ? "border-danger/80" : "border-white/80",
          )}
        >
          <span
            className={cn(
              "rounded-full transition-all",
              effectiveMode === "clip"
                ? recording
                  ? "size-7 animate-pulse rounded-lg bg-danger"
                  : "size-16 bg-danger"
                : "size-16 bg-white",
            )}
          />
        </button>

        {!canClip ? (
          <p className="px-8 text-center text-xs text-muted">
            Clips aren&apos;t supported on this device — you can still post a photo.
          </p>
        ) : null}
      </div>
    </div>
  );
}
