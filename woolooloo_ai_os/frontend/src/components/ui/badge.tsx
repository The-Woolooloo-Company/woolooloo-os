"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full transition-colors duration-200",
  {
    variants: {
      variant: {
        primary: "bg-md-primary text-md-on-primary px-3 py-1 text-label-small",
        secondary: "bg-md-secondary text-md-on-secondary px-3 py-1 text-label-small",
        tertiary: "bg-md-tertiary text-md-on-tertiary px-3 py-1 text-label-small",
        error: "bg-md-error text-md-on-error px-3 py-1 text-label-small",
        success: "bg-success text-on-success px-3 py-1 text-label-small",
        info: "bg-info text-on-info px-3 py-1 text-label-small",
        warning: "bg-warning text-on-warning px-3 py-1 text-label-small",
        "primary-tonal": "bg-md-primary-container text-md-on-primary-container px-3 py-1 text-label-small",
        "secondary-tonal": "bg-md-secondary-container text-md-on-secondary-container px-3 py-1 text-label-small",
        "tertiary-tonal": "bg-md-tertiary-container text-md-on-tertiary-container px-3 py-1 text-label-small",
        "error-tonal": "bg-md-error-container text-md-on-error-container px-3 py-1 text-label-small",
        "success-tonal": "bg-success-container text-on-success px-3 py-1 text-label-small",
        "info-tonal": "bg-info-container text-on-info px-3 py-1 text-label-small",
        "warning-tonal": "bg-warning-container text-on-warning px-3 py-1 text-label-small",
        "primary-outlined": "border border-md-primary text-md-primary px-3 py-1 text-label-small",
        "secondary-outlined": "border border-md-secondary text-md-secondary px-3 py-1 text-label-small",
        "tertiary-outlined": "border border-md-tertiary text-md-tertiary px-3 py-1 text-label-small",
        dot: "h-2.5 w-2.5 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, startIcon, endIcon, children, ...props }, ref) => {
    if (variant === "dot") {
      return (
        <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
      );
    }
    return (
      <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
        {startIcon && <span className="mr-1">{startIcon}</span>}
        {children}
        {endIcon && <span className="ml-1">{endIcon}</span>}
      </span>
    );
  }
);
Badge.displayName = "Badge";

const chipVariants = cva(
  "inline-flex items-center h-8 px-3 rounded-lg transition-all duration-200 ease-in-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
  {
    variants: {
      variant: {
        assist: "bg-md-secondary-container text-md-on-secondary-container hover:bg-opacity-90",
        filter: "bg-transparent border border-md-outline text-md-on-surface",
        "filter-selected": "bg-md-secondary-container text-md-on-secondary-container border border-transparent",
        input: "bg-transparent border border-md-outline text-md-on-surface",
        suggestion: "bg-transparent text-md-on-surface",
      },
    },
    defaultVariants: {
      variant: "assist",
    },
  }
);

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  label: string;
  icon?: string;
  onDismiss?: () => void;
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant, label, icon, onDismiss, ...props }, ref) => (
    <button ref={ref} className={cn(chipVariants({ variant }), className)} {...props}>
      {icon && <span className="material-symbols-rounded text-18 mr-1.5">{icon}</span>}
      <span className="text-label-medium">{label}</span>
      {onDismiss && (
        <span className="material-symbols-rounded text-18 ml-1.5" onClick={onDismiss}>close</span>
      )}
    </button>
  )
);
Chip.displayName = "Chip";

export { Badge, Chip, badgeVariants, chipVariants };
