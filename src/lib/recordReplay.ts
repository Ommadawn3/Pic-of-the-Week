/** Fire-and-forget replay record. keepalive so it survives a fast scroll away. */
export function recordReplay(photoId: string) {
  void fetch("/api/replay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoId }),
    keepalive: true,
  });
}
