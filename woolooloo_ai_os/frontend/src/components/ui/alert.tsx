import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 shadow-sm",
  {
    variants: {
      variant: {
        default: "border-gray-200 bg-gray-50 text-foreground",
        success: "border-success/20 bg-success/10 text-success",
        info: "border-info/20 bg-info/10 text-info",
        warning: "border-warning/20 bg-warning/10 text-warning",
        danger: "border-danger/20 bg-danger/10 text-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const alertTitleVariants = cva("font-semibold mb-1", {
  variants: {
    variant: {
      default: "text-foreground",
      success: "text-success",
      info: "text-info",
      warning: "text-warning",
      danger: "text-danger",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const alertDescriptionVariants = cva("text-sm", {
  variants: {
    variant: {
      default: "text-muted-foreground",
      success: "text-success/80",
      info: "text-info/80",
      warning: "text-warning/80",
      danger: "text-danger/80",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, icon, dismissible, onDismiss, children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5">{icon}</span>}
        <div className="flex-1 text-sm">{children}</div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-rounded text-sm">close</span>
          </button>
        )}
      </div>
    </div>
  )
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & VariantProps<typeof alertTitleVariants>
>(({ className, variant, ...props }, ref) => (
  <h5 ref={ref} className={cn(alertTitleVariants({ variant}), className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & VariantProps<typeof alertDescriptionVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(alertDescriptionVariants({ variant}), className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
