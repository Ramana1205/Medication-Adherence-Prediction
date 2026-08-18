import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]",
    secondary: "border-transparent bg-slate-100 text-[var(--text-primary)] hover:bg-slate-200",
    destructive: "border-transparent bg-[var(--high-risk)] text-white hover:opacity-90",
    outline: "text-[var(--text-primary)] border-[var(--border)] bg-[var(--surface)]",
    success: "border-transparent bg-[var(--low-risk)] text-white",
    warning: "border-transparent bg-[var(--medium-risk)] text-white",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
