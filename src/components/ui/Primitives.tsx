import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Surface({
  children,
  className,
  tone = "primary",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "hero" | "overlay" | "primary" | "secondary";
}) {
  return (
    <div
      className={joinClasses(`surface-${tone}`, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  action,
  eyebrow,
  description,
  title,
}: {
  action?: ReactNode;
  eyebrow: string;
  description: string;
  title: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0">
        <p className="label-caps text-[var(--accent-primary)]">{eyebrow}</p>
        <h1 className="page-title mt-2 text-[var(--text-primary)]">{title}</h1>
        <p className="body-copy mt-3 max-w-2xl text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function Button({
  children,
  className,
  tone = "secondary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "danger" | "primary" | "secondary";
}) {
  return (
    <button
      className={joinClasses("ui-button", `ui-button--${tone}`, className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  className,
  href,
  tone = "secondary",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  tone?: "danger" | "primary" | "secondary";
}) {
  return (
    <Link
      className={joinClasses("ui-button", `ui-button--${tone}`, className)}
      href={href}
    >
      {children}
    </Link>
  );
}

export function IconButton({
  children,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={joinClasses("ui-icon-button", className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description?: string;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="label-caps text-[var(--text-secondary)]">{label}</span>
      {children}
      {description ? (
        <span className="metadata-copy text-[var(--text-tertiary)]">
          {description}
        </span>
      ) : null}
    </label>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={joinClasses("field-input", className)} {...props} />;
}

export function Select({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={joinClasses("field-input", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={joinClasses("field-input min-h-24 py-3", className)}
      {...props}
    />
  );
}

export function Metric({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="label-caps text-[var(--text-secondary)]">{label}</dt>
      <dd className="metric-value mt-2 text-[28px] font-semibold text-[var(--text-primary)]">
        {value}
      </dd>
      {detail ? (
        <p className="metadata-copy mt-1 text-[var(--text-tertiary)]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={joinClasses("ui-badge", className)}>{children}</span>;
}

export function SegmentedControl({
  activeHref,
  items,
  label,
}: {
  activeHref: string;
  items: Array<{ href: string; label: string }>;
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="inline-flex rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-1"
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={joinClasses(
              "inline-flex min-h-11 items-center rounded-[10px] px-4 text-[13px] font-semibold",
              active
                ? "bg-[var(--surface-selected)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function FilterChip({
  active = false,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      aria-pressed={active}
      className={joinClasses(
        "ui-badge min-h-11 transition",
        active
          ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] text-[var(--text-primary)]"
          : "hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function ListRow({
  action,
  children,
  className,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <article
      className={joinClasses(
        "surface-secondary flex flex-wrap items-center justify-between gap-4 p-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        <div className="metadata-copy mt-1 text-[var(--text-tertiary)]">
          {children}
        </div>
      </div>
      {action}
    </article>
  );
}

export function TableShell({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      aria-label={label}
      className="ui-table-shell"
      role="region"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export function InlineFeedback({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "error" | "info" | "success";
}) {
  return (
    <p
      className="ui-inline-feedback"
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={joinClasses(
        "skeleton-shimmer block rounded-[var(--radius-control)] bg-white/[0.06]",
        className,
      )}
    />
  );
}
