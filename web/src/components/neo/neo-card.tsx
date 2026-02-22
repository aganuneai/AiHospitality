import { cn } from "@/lib/utils";

interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
    glass?: boolean;
    variant?: 'default' | 'ghost' | 'contrast';
}

export function NeoCard({ className, glass, variant = 'default', children, ...props }: NeoCardProps) {
    return (
        <div
            className={cn(
                "relative transition-all duration-300",
                // Geometry
                "rounded-none border",
                // Variants
                variant === 'default' && "bg-card border-border shadow-sm hover:shadow-md hover:border-border/80",
                variant === 'contrast' && "bg-secondary border-secondary-foreground/10 text-secondary-foreground",
                variant === 'ghost' && "bg-transparent border-transparent",
                // Glass Effect (Pro-Max)
                glass && "glass shadow-2xl border-white/5",
                // Interactive Hover (subtle gold glow)
                "hover:border-primary/20",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function NeoCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-6 flex flex-col space-y-1.5", className)} {...props} />
    );
}

export function NeoCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={cn("text-2xl font-semibold leading-none tracking-tight font-heading", className)} {...props} />
    );
}

export function NeoCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-6 pt-0", className)} {...props} />
    );
}

export function NeoCardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)} {...props} />
    );
}

export function NeoCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
    );
}
