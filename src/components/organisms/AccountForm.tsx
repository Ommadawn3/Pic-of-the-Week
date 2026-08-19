"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/atoms/Button";
import { TextField } from "@/components/atoms/TextField";
import { saveName } from "@/app/welcome/actions";

type Props = { initialFirstName: string; initialInitial: string };

export function AccountForm({ initialFirstName, initialInitial }: Props) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [initial, setInitial] = useState(initialInitial);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notifNote, setNotifNote] = useState<string | null>(null);

  const dirty =
    firstName.trim() !== initialFirstName.trim() || initial.trim() !== initialInitial.trim();

  function onSave() {
    const name = firstName.trim();
    if (!name) {
      setError("Please enter your first name.");
      return;
    }
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const res = await saveName(name, initial);
      if (res.ok) setSaved("Saved");
      else setError(res.error);
    });
  }

  async function testNotification() {
    setNotifNote(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifNote("This browser doesn't support notifications.");
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setNotifNote("Notifications are turned off. Enable them for POW in your settings.");
      return;
    }
    const title = "Pic of the Week";
    const options: NotificationOptions = {
      body: "🎉 Notifications work! This is how you'll hear when results are in.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    };
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
      setNotifNote("Sent — check your notifications.");
    } catch {
      setNotifNote("Couldn't show the notification on this device.");
    }
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-muted">Your name</h2>
        <p className="text-xs text-muted-2">
          Shows on your photos and the leaderboard. Change it any time.
        </p>
        <div className="flex gap-3">
          <TextField
            label="First Name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setSaved(null);
            }}
            autoComplete="given-name"
            className="flex-1"
            maxLength={40}
          />
          <TextField
            label="Initial"
            value={initial}
            onChange={(e) => {
              setInitial(e.target.value);
              setSaved(null);
            }}
            maxLength={1}
            className="w-[108px]"
          />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex items-center gap-3">
          <Button
            onClick={onSave}
            disabled={isPending || !dirty || !firstName.trim()}
            className="border border-accent-border bg-accent-bg text-white hover:bg-accent-bg/80"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
          {saved ? <span className="text-sm text-muted">{saved}</span> : null}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-6">
        <h2 className="text-base font-medium text-muted">Notifications</h2>
        <p className="text-xs text-muted-2">
          Send yourself a test to confirm they show up on this device. (On iPhone,
          notifications only work after you install POW to your home screen.)
        </p>
        <Button variant="secondary" onClick={testNotification} className="self-start">
          Send test notification
        </Button>
        {notifNote ? <p className="text-sm text-muted">{notifNote}</p> : null}
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-6">
        <h2 className="text-base font-medium text-muted">Session</h2>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-danger hover:opacity-80"
          >
            Sign out
          </button>
        </form>
      </section>
    </>
  );
}
