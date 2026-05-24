"use client"

import { FileSpreadsheet, MousePointerClick, Upload, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onScrollToUpload: () => void
}

export function EmptyState({ onScrollToUpload }: EmptyStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">

      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-muted/40">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
      </div>

      {/* Heading */}
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        No Transactions Yet
      </h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        This dashboard displays results from real transaction data only.
        Get started by uploading a dataset or running a manual fraud check below.
      </p>

      {/* Two action cards */}
      <div className="grid w-full max-w-lg gap-4 sm:grid-cols-2">

        {/* Upload card */}
        <button
          onClick={onScrollToUpload}
          className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center
                     transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10
                          transition-colors group-hover:bg-blue-500/20">
            <Upload className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Upload Dataset</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Analyze an Excel or CSV file with bulk transaction records
            </p>
          </div>
        </button>

        {/* Manual check card */}
        <button
          onClick={onScrollToUpload}
          className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center
                     transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10
                          transition-colors group-hover:bg-emerald-500/20">
            <MousePointerClick className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Manual Check</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Enter a single transaction to check it for fraud instantly
            </p>
          </div>
        </button>

      </div>

      {/* Hint */}
      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        <span>
          Need sample data?&nbsp;
          <code className="rounded bg-muted px-1 py-0.5 text-primary">
            /sample_datasets/
          </code>
          &nbsp;has 5 ready-to-use Excel files.
        </span>
      </div>

    </div>
  )
}
