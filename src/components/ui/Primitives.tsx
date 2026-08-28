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
        <p className="label-caps text-primary">{eyebrow}</p>
        <h1 className="page-title mt-2 text-foreground">{title}</h1>
        <p className="body-copy mt-3 max-w-2xl text-muted-foreground">
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
      <span className="label-caps text-muted-foreground">{label}</span>
      {children}
      {description ? (
        <span className="metadata-copy text-muted-foreground">
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
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="metric-value mt-2 text-[28px] font-semibold text-foreground">
        {value}
      </dd>
      {detail ? (
        <p className="metadata-copy mt-1 text-muted-foreground">
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
      className="inline-flex rounded-xl border border-border bg-muted p-1"
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={joinClasses(
              "inline-flex min-h-11 items-center rounded-xl px-4 text-[13px] font-semibold",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
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
          ? "border-primary bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-foreground"
          : "hover:border-input hover:bg-secondary",
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
        <h3 className="text-[15px] font-semibold text-foreground">
          {title}
        </h3>
        <div className="metadata-copy mt-1 text-muted-foreground">
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
        "skeleton-shimmer block rounded-xl bg-[var(--wash)]",
        className,
      )}
    />
  );
}
