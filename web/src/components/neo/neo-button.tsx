import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const neoButtonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow hover:bg-primary/90 rounded-none",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 rounded-none",
                outline:
                    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground rounded-none",
                secondary:
                    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 rounded-none",
                ghost: "hover:bg-accent hover:text-accent-foreground rounded-none",
                link: "text-primary underline-offset-4 hover:underline rounded-none",
                neo: "bg-foreground text-background border border-transparent hover:bg-background hover:text-foreground hover:border-foreground transition-all duration-300 rounded-none uppercase tracking-wider font-bold",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-10 px-8",
                icon: "h-9 w-9",
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
    VariantProps<typeof neoButtonVariants> {
    asChild?: boolean
    glass?: boolean
}

const NeoButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, glass = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(
                    neoButtonVariants({ variant, size, className }),
                    glass && "bg-background/20 backdrop-blur-md border-border/10 hover:bg-background/30 shadow-2xl"
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
NeoButton.displayName = "NeoButton"

export { NeoButton, neoButtonVariants }
