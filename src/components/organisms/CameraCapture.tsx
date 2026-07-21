"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_EDGE = 1080; // cap the captured image's long edge before upload

type CameraCaptureProps = {
  /** Called with a square JPEG blob when the shutter is pressed. */
  onCapture: (blob: Blob) => void;
};

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This device or browser doesn't support camera capture.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 1280 } },
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

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    // Center-crop to a square, then scale down to MAX_EDGE.
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
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9,
    );
  }, [onCapture]);

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
          className="size-full object-cover"
        />
      </div>
      <div className="flex flex-1 items-center justify-center py-10">
        <button
          type="button"
          aria-label="Take photo"
          disabled={!ready}
          onClick={capture}
          className="flex size-20 items-center justify-center rounded-full border-4 border-white/80 disabled:opacity-40"
        >
          <span className="size-16 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
