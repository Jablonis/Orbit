"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { getDayDetail } from "@/lib/day-detail";
import type { ProductivityPoint } from "@/lib/productivity-score";

/**
 * A week at a glance, borrowed from the day strips that calendar and journal
 * apps put above the fold: seven days, each one a ring filled by that day's
 * score, with today marked.
 *
 * Each day is a real button, because a ring that carries a whole day's numbers
 * and cannot be asked about them is a picture of a control rather than one.
 * Tapping opens that day underneath the strip; tapping it again closes it. No
 * dialog: on a phone a sheet for four figures is more ceremony than the figures
 * are worth.
 */
export function WeekStrip({
  locale,
  points,
  today,
}: {
  locale: string;
  points: ProductivityPoint[];
  today: string;
}) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const dayName = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
      weekday: "long",
    }).format(new Date(`${date}T12:00:00Z`));
  const open = points.find((point) => point.date === openDate) ?? null;
  const detail = open ? getDayDetail(open, today) : null;

  return (
    <section aria-label="This week" className="settle-in">
      <ol className="flex items-stretch gap-1.5 sm:gap-2">
        {points.map((point, index) => {
          const isToday = point.date === today;
          const score = point.score ?? 0;
          const future = point.future || point.date > today;
          const selected = point.date === openDate;
          const circumference = 2 * Math.PI * 14;
          return (
            <li className="min-w-0 flex-1" key={point.date}>
              <button
                aria-expanded={selected}
                aria-label={`${dayName(point.date)}${
                  future ? ", not yet" : `, scored ${score}`
                }`}
                className={`press-row flex w-full flex-col items-center gap-2 rounded-2xl px-1 py-3 ${
                  isToday ? "bg-plum-tint" : "bg-card"
                } ${
                  selected
                    ? "ring-2 ring-plum ring-offset-2 ring-offset-[var(--background)]"
                    : ""
                }`}
                onClick={() =>
                  setOpenDate((current) =>
                    current === point.date ? null : point.date,
                  )
                }
                type="button"
              >
                <span
                  className={`label-caps ${
                    isToday ? "text-plum-ink" : "text-muted-foreground"
                  }`}
                >
                  {point.label.slice(0, 2)}
                </span>
                <span className="relative grid size-9 place-items-center">
                  <svg className="size-9 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      fill="none"
                      r="14"
                      stroke={future ? "var(--muted)" : "var(--secondary)"}
                      strokeWidth="4"
                    />
                    {future ? null : (
                      <circle
                        className="ring-draw"
                        cx="18"
                        cy="18"
                        fill="none"
                        r="14"
                        stroke={isToday ? "var(--plum)" : "var(--fitness)"}
                        strokeDasharray={circumference}
                        strokeDashoffset={
                          circumference * (1 - Math.min(100, score) / 100)
                        }
                        strokeLinecap="round"
                        strokeWidth="4"
                        style={
                          {
                            "--ring-length": circumference,
                            "--rise-index": index,
                          } as CSSProperties
                        }
                      />
                    )}
                  </svg>
                  <span className="metric-value absolute text-[11px] font-semibold">
                    {future ? "" : score}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {open && detail ? (
        <div className="settle-in mt-2 rounded-2xl bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[14px] font-bold">
              {dayName(open.date)}
            </p>
            <p className="metric-value text-[15px] font-bold">
              {detail.score === null ? "—" : detail.score}
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {detail.figures.map((figure) => (
              <div className="rounded-xl bg-muted p-2.5" key={figure.label}>
                <dt className="label-caps text-muted-foreground">
                  {figure.label}
                </dt>
                <dd className="metric-value mt-1 text-[13px] font-bold">
                  {figure.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] text-muted-foreground">{detail.note}</p>
        </div>
      ) : null}
    </section>
  );
}
