"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  error?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  size?: "small" | "medium";
  outlined?: boolean;
  filled?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, helperText, error, startIcon, endIcon, size = "medium", outlined = true, filled, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
    const hasFilled = filled || !outlined;
    const height = size === "small" ? "h-10" : "h-12";

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-label-medium text-md-on-surface-variant mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant">
              {startIcon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            ref={ref}
            className={cn(
              "w-full bg-transparent text-md-on-surface placeholder:text-md-on-surface-variant/60 " +
              "transition-all duration-200 ease-in-out " +
              "focus-visible:outline-none " +
              "disabled:opacity-50 disabled:cursor-not-allowed",
              startIcon ? "pl-10" : "pl-4",
              endIcon ? "pr-10" : "pr-4",
              height,
              // Outlined variant (default)
              outlined && !hasFilled && "rounded-lg border border-md-outline-variant focus:border-md-primary focus:border-2",
              // Filled variant
              hasFilled && "rounded-t-lg border-b border-md-on-surface-variant focus:border-2 focus:border-b-md-primary",
              // Error state
              error && "border-md-error focus:border-md-error focus:border-2",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-label-small text-md-error ml-1" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-label-small text-md-on-surface-variant ml-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

/* ── Textarea ── */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2)}`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-label-medium text-md-on-surface-variant mb-1.5 ml-1">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "w-full rounded-lg border border-md-outline-variant bg-transparent px-4 py-2.5 text-md-on-surface placeholder:text-md-on-surface-variant/60 " +
            "transition-all duration-200 ease-in-out resize-y min-h-[80px] " +
            "focus:outline-none focus:border-md-primary focus:border-2 " +
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-md-error focus:border-md-error focus:border-2",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="mt-1 text-label-small text-md-error ml-1" role="alert">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-label-small text-md-on-surface-variant ml-1">{helperText}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
