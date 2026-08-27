/**
 * The starter kit.
 *
 * The hard part of a planner is not the day you set it up, it is the fourteen
 * days after. Most of what fills a week is not a decision — it is the morning,
 * the working block, the training, the ten minutes that close the evening — and
 * asking someone to type those in is asking them to do the boring half of the
 * work before they have seen any of the good half.
 *
 * So the setup offers the shape of an ordinary week and lets it be edited —
 * days, times, names, and rows of your own that were never in this list.
 * Nothing here is compulsory and everything is an ordinary task afterwards.
 */

import type { TaskType } from "@/lib/tasks";

export type RoutineKitItem = {
  category: string;
  days: number[];
  /** When it usually happens. A routine with a time is a routine that gets done. */
  from: string;
  id: string;
  note: string;
  title: string;
  to: string;
  type: TaskType;
};

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export const ROUTINE_KIT: RoutineKitItem[] = [
  {
    category: "Routine",
    days: EVERY_DAY,
    from: "06:30",
    id: "morning",
    note: "The first half hour, before anything else asks for it.",
    title: "Morning routine",
    to: "07:00",
    type: "personal",
  },
  {
    category: "Work",
    days: WEEKDAYS,
    from: "09:00",
    id: "deep-work",
    note: "The block of the day that is actually worth defending.",
    title: "Deep work block",
    to: "12:00",
    type: "deep-work",
  },
  {
    category: "Work",
    days: WEEKDAYS,
    from: "13:00",
    id: "admin",
    note: "Mail, messages and the small things, once, in one place.",
    title: "Inbox and admin",
    to: "14:00",
    type: "admin",
  },
  {
    category: "Health",
    days: [1, 3, 5],
    from: "17:30",
    id: "training",
    note: "Kept next to the training plan rather than instead of it.",
    title: "Training",
    to: "18:30",
    type: "personal",
  },
  {
    category: "Routine",
    days: EVERY_DAY,
    from: "21:00",
    id: "evening",
    note: "Ten minutes to close the day and name tomorrow's first move.",
    title: "Close the day",
    to: "21:15",
    type: "personal",
  },
  {
    category: "Home",
    days: [6],
    from: "10:00",
    id: "reset",
    note: "One pass through the flat, so Monday does not inherit it.",
    title: "Reset the flat",
    to: "11:00",
    type: "personal",
  },
  {
    category: "Planning",
    days: [0],
    from: "18:00",
    id: "week",
    note: "Read the week that happened, then decide the one coming.",
    title: "Plan the week",
    to: "18:30",
    type: "learning",
  },
];

/** What the kit suggests when nothing has been chosen yet. */
export const DEFAULT_ROUTINE_KIT = ["morning", "deep-work", "evening"];
