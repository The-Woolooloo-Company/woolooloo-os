"use client";

import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium " +
  "transition-all duration-200 ease-in-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "min-h-[48px] min-w-[48px] " +
  "cursor-pointer",
  {
    variants: {
      variant: {
        // Filled Button — primary action
        filled: "bg-md-primary text-md-on-primary hover:shadow-md-1 active:scale-[0.98] rounded-full",
        // Filled Tonal — secondary action
        "filled-tonal": "bg-md-secondary-container text-md-on-secondary-container hover:bg-opacity-90 active:scale-[0.98] rounded-full",
        // Outlined — tertiary action
        outlined: "border border-md-outline text-md-primary hover:bg-md-primary/8 active:scale-[0.98] rounded-full",
        // Text — least prominent
        text: "text-md-primary hover:bg-md-primary/8 active:scale-[0.98] rounded-full",
        // Elevated — sits above surface
        elevated: "bg-md-surface-container-high text-md-on-surface shadow-md-1 hover:shadow-md-2 active:scale-[0.98] rounded-full",
        // Tonal — elevated with tonal surface
        tonal: "bg-md-secondary-container text-md-on-secondary-container shadow-md-1 hover:shadow-md-2 active:scale-[0.98] rounded-full",
      },
      size: {
        // Small: 36px height, 8px padding
        sm: "h-[36px] px-3 text-label-medium gap-1.5",
        // Medium: 40px height, 16px padding
        md: "h-[40px] px-4 text-body-medium gap-2",
        // Large: 48px height, 24px padding
        lg: "h-[48px] px-6 text-body-large gap-2.5",
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        )}
        {!loading && children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
