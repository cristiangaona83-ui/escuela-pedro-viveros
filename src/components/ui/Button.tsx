import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

const VARIANTS = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm",
  secondary: "bg-white text-brand-700 border border-brand-200 hover:bg-brand-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  accent: "bg-accent-500 text-white hover:bg-accent-600 shadow-sm",
  outline: "border border-white/70 text-white hover:bg-white/10",
};

const SIZES = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={cn(base, VARIANTS[variant], SIZES[size], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </Link>
  );
}
