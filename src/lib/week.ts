import type { ContestWeek } from "./types";
import type { CalendarWeek } from "@/components/molecules/CalendarController";

// Contest weeks run Wednesday 00:00 -> Wednesday 00:00, anchored to a single
// timezone so the countdown is simultaneous for everyone. See PRD §4.1.
export const CONTEST_TIMEZONE = "America/New_York";

/** Short "Wed 7:00 PM" style label for a photo's capture time. */
export function formatCapturedAt(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: CONTEST_TIMEZONE,
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CONTEST_TIMEZONE,
  });
  return `${weekday} ${time}`;
}

/** "Dec 2 – 9" style label for an archived week's date range. */
export function formatWeekRange(week: ContestWeek): string {
  const start = new Date(week.starts_at);
  const end = new Date(week.ends_at);
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: CONTEST_TIMEZONE,
  });
  const endLabel = end.toLocaleDateString("en-US", {
    day: "numeric",
    timeZone: CONTEST_TIMEZONE,
  });
  return `${startLabel} – ${endLabel}`;
}

/** "36 hrs left" style countdown for the active week; null once elapsed. */
export function formatTimeLeft(week: ContestWeek, now = new Date()): string {
  const end = new Date(week.ends_at).getTime();
  const ms = end - now.getTime();
  if (ms <= 0) return "Ended";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 48) return `${Math.floor(hours / 24)} days left`;
  if (hours >= 1) return `${hours} hrs left`;
  const mins = Math.floor(ms / (1000 * 60));
  return `${mins} min left`;
}

/** Status pill text: countdown for the active week, date range otherwise. */
export function weekStatusLabel(week: ContestWeek): string {
  return week.status === "active" ? formatTimeLeft(week) : formatWeekRange(week);
}

/** ISO week number (1–53) for a date. */
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Labels for the week navigator: the active week is "This Week", the one
 * before it "Last Week", older weeks "Week N" (matches the Figma calendar
 * controller). `weeks` must be newest-first.
 */
export function buildWeekNavItems(weeks: ContestWeek[], selectedWeekId: string): CalendarWeek[] {
  const activeIndex = weeks.findIndex((w) => w.status === "active");
  return weeks
    .map((week, i) => {
      let label: string;
      if (i === activeIndex) label = "This Week";
      else if (activeIndex !== -1 && i === activeIndex + 1) label = "Last Week";
      else label = `Week ${isoWeekNumber(new Date(week.starts_at))}`;
      return { id: week.id, label, isActive: week.id === selectedWeekId };
    })
    .reverse(); // oldest -> newest, so "This Week" sits on the right per the design
}
