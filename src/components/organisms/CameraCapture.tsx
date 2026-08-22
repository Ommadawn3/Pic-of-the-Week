"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlyphIcon } from "@/components/atoms/GlyphIcon";
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
type Facing = "environment" | "user";
type ZoomRange = { min: number; max: number; step: number };

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
  const [facing, setFacing] = useState<Facing>("environment");
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [zoom, setZoom] = useState(1);

  const clipMime = pickClipMime();
  const canClip = clipMime !== "";
  // Clip is the default; fall back to photo only if the device can't record.
  const [mode, setMode] = useState<CaptureMode>("clip");
  const effectiveMode: CaptureMode = canClip ? mode : "photo";

  // (Re)acquire the camera whenever the chosen facing changes. Front/back is a
  // fresh getUserMedia — you can't switch an existing track's facing.
  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This device or browser doesn't support camera capture.");
        return;
      }
      setReady(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // audio:false — clips are silent by design (matches the gif-style
          // intent and sidesteps iOS's block on unmuted autoplay).
          video: {
            facingMode: facing,
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

        // Native (optical/sensor) zoom, where the device exposes it. Digital CSS
        // zoom would only scale the preview, not the captured photo/clip, so we
        // only offer zoom when the track actually supports it.
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as
          | (MediaTrackCapabilities & { zoom?: ZoomRange })
          | undefined;
        if (caps?.zoom && caps.zoom.max > caps.zoom.min) {
          setZoomRange({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 });
          setZoom(caps.zoom.min);
        } else {
          setZoomRange(null);
        }

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
  }, [facing]);

  const applyZoom = useCallback((z: number) => {
    setZoom(z);
    const track = streamRef.current?.getVideoTracks()[0];
    // `zoom` isn't in the standard constraint types yet.
    track
      ?.applyConstraints({ advanced: [{ zoom: z }] } as unknown as MediaTrackConstraints)
      .catch(() => {});
  }, []);

  const flip = useCallback(() => {
    if (recording) return;
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }, [recording]);

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
    // Mirror the capture for the front camera so the saved photo matches the
    // mirrored preview the user framed.
    if (facing === "user") {
      ctx.translate(target, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, side, side, 0, 0, target, target);
    canvas.toBlob(
      (blob) => blob && onCapture({ blob, mediaType: "photo", ext: "jpg" }),
      "image/jpeg",
      0.9,
    );
  }, [onCapture, facing]);

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
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn("size-full object-cover", facing === "user" && "-scale-x-100")}
        />
        {recording ? (
          <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            <span className="size-2 animate-pulse rounded-full bg-danger" /> recording…
          </span>
        ) : null}

        {/* Flip camera */}
        <button
          type="button"
          onClick={flip}
          disabled={recording}
          aria-label="Flip camera"
          className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-40 active:scale-95"
        >
          <GlyphIcon name="refresh" size={20} />
        </button>

        {/* Zoom slider — only when the device offers real zoom */}
        {zoomRange ? (
          <div className="absolute inset-x-6 bottom-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5">
            <span className="text-xs text-white/80">Zoom</span>
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={zoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="flex-1 accent-white"
            />
          </div>
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
