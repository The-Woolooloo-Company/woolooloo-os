"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva(
  "rounded-2xl transition-shadow duration-200 ease-in-out",
  {
    variants: {
      elevated: {
        true: "bg-md-surface shadow-md-1 hover:shadow-md-2",
        false: "bg-transparent",
      },
      outlined: {
        true: "border border-md-outline-variant",
        false: "",
      },
      filled: {
        true: "bg-md-surface-container-highest",
        false: "",
      },
    },
    defaultVariants: {
      elevated: true,
      outlined: false,
      filled: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  variant?: "elevated" | "outlined" | "filled" | "tonal";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevated, outlined, filled, variant, ...props }, ref) => {
    // Map variant shorthand to props
    const mapVariant = (v?: string) => {
      if (v === "outlined") return { elevated: false, outlined: true };
      if (v === "filled") return { elevated: false, filled: true };
      if (v === "tonal") return { elevated: false, filled: true };
      return { elevated: true, outlined: false, filled: false };
    };
    const mapped = variant ? mapVariant(variant) : { elevated, outlined, filled };

    return (
      <div
        ref={ref}
        className={cn(cardVariants(mapped), className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 px-6 pt-6 pb-2", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-title-large text-md-on-surface", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-body-medium text-md-on-surface-variant", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 py-2", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-3 px-6 pb-6 pt-2", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
