"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, AlertCircle, Inbox } from "lucide-react";

// -- Premium Loading Spinner --
export function KairoLoader({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-6 h-6", md: "w-10 h-10", lg: "w-16 h-16" };
  const textSizes = { sm: "text-[6px]", md: "text-[8px]", lg: "text-xs" };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className={cn("relative", sizes[size])}>
        <motion.div
          className="absolute inset-0 rounded-lg border border-accent/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-[3px] rounded-md border border-accent/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-accent font-bold tracking-wider", textSizes[size])}>K</span>
        </div>
        <div className="absolute inset-0 rounded-lg bg-accent/5 blur-xl" />
      </div>
    </div>
  );
}

// -- Full page loader --
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--background)] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <KairoLoader size="lg" />
        <motion.p
          className="text-text-muted text-sm font-mono"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Initializing KAIRO...
        </motion.p>
      </motion.div>
    </div>
  );
}

// -- Skeleton --
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border)]">
        <Skeleton className="h-4 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-[var(--border)] last:border-0 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/5 ml-auto" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
      <Skeleton className="h-4 w-1/4 mb-6" />
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// -- Success State --
export function SuccessState({
  title = "Success!",
  message = "Your action was completed successfully.",
  className,
}: {
  title?: string;
  message?: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center gap-4 py-12", className)}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
      </motion.div>
      <h3 className="text-text-primary font-medium text-lg">{title}</h3>
      <p className="text-text-muted text-sm text-center max-w-sm">{message}</p>
    </motion.div>
  );
}

// -- Error State --
export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex flex-col items-center gap-4 py-12", className)}
    >
      <motion.div
        animate={{ rotate: [0, -5, 5, -5, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="w-16 h-16 rounded-full bg-error/10 border border-error/20 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-error" />
        </div>
      </motion.div>
      <h3 className="text-text-primary font-medium text-lg">{title}</h3>
      <p className="text-text-muted text-sm text-center max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-text-primary text-sm hover:bg-[var(--card-hover)] transition-all"
        >
          Try Again
        </button>
      )}
    </motion.div>
  );
}

// -- Empty State --
export function EmptyState({
  title = "Nothing here yet",
  message = "Start using KAIRO to see your data here.",
  icon: Icon = Inbox,
  action,
  className,
}: {
  title?: string;
  message?: string;
  icon?: React.ElementType;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center gap-4 py-16", className)}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-16 h-16 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
          <Icon className="w-7 h-7 text-text-muted" />
        </div>
      </motion.div>
      <h3 className="text-text-primary font-medium">{title}</h3>
      <p className="text-text-muted text-sm text-center max-w-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm border border-accent/20 hover:bg-accent/15 transition-all"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

// -- Inline loading --
export function InlineLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-text-muted text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{text}</span>
    </div>
  );
}
