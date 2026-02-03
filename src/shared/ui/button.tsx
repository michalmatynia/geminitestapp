import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/shared/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-transparent text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-transparent hover:bg-foreground/10",
        destructive:
          "bg-destructive/15 text-destructive hover:bg-destructive/25",
        outline:
          "border-foreground/15 bg-transparent hover:bg-foreground/8",
        secondary:
          "bg-muted/30 hover:bg-muted/45",
        ghost: "bg-transparent hover:bg-foreground/8",
        link: "text-foreground/80 underline-offset-4 hover:underline hover:text-foreground",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-lg px-3",
        lg: "h-10 rounded-lg px-4",
        icon: "size-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), loading && "gap-2")}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
