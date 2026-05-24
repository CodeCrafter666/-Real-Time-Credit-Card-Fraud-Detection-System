"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Navbar }           from "./navbar"
import { StatsCards }       from "./stats-cards"
import { LiveTransactions } from "./live-transactions"
import { FraudChart }       from "./fraud-chart"
import { FraudAlert }       from "./fraud-alert"
import { ActivityTable }    from "./activity-table"
import { ManualFraudCheck } from "./manual-fraud-check"
import { DatasetUpload }    from "./dataset-upload"
import { EmptyState }       from "./empty-state"
import { useBackend }       from "@/hooks/use-backend"
import type { Transaction } from "@/hooks/use-backend"

export function Dashboard() {
  const { transactions, isAnalyzing, progress, error, refresh } = useBackend()

  const [showAlert, setShowAlert]       = useState(false)
  const [latestFraud, setLatestFraud]   = useState<Transaction | undefined>()
  const lastSeenId                      = useRef<string | null>(null)

  // Ref for scrolling to the upload section from the empty state
  const uploadSectionRef = useRef<HTMLDivElement>(null)

  // ── Fraud alert — fires when a new fraud transaction arrives ───────────────
  useEffect(() => {
    const latest = transactions[0]
    if (!latest || latest.id === lastSeenId.current) return
    lastSeenId.current = latest.id

    if (latest.status === "fraud") {
      setLatestFraud(latest)
      setShowAlert(true)
      const t = setTimeout(() => setShowAlert(false), 5000)
      return () => clearTimeout(t)
    }
  }, [transactions])

  const handleDismissAlert     = useCallback(() => setShowAlert(false), [])
  const handleAnalysisComplete = useCallback(() => refresh(), [refresh])
  const scrollToUpload         = useCallback(() => {
    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalTransactions = transactions.length
  const fraudCount        = transactions.filter((t) => t.status === "fraud").length
  const normalCount       = transactions.filter((t) => t.status === "safe").length
  const fraudPercentage   = totalTransactions > 0
    ? parseFloat(((fraudCount / totalTransactions) * 100).toFixed(2))
    : 0

  // ── Connection error banner (backend unreachable) ──────────────────────────
  if (error && transactions.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="font-semibold text-foreground">Backend unreachable</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">{error}</p>
        <code className="rounded bg-muted px-3 py-1.5 text-xs text-foreground">
          uvicorn main:app --reload --port 8000
        </code>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">

          {/* ── Analysis progress bar (shown during dataset processing) ───── */}
          {isAnalyzing && (
            <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Analyzing dataset…</span>
                <span className="font-semibold text-primary">{progress.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Fraud alert banner ─────────────────────────────────────────── */}
          <FraudAlert
            show={showAlert}
            onDismiss={handleDismissAlert}
            latestFraud={latestFraud}
          />

          {/* ── Empty state — shown when no transactions exist yet ─────────── */}
          {transactions.length === 0 && !isAnalyzing ? (
            <>
              <EmptyState onScrollToUpload={scrollToUpload} />

              {/* Upload + Manual check always visible even in empty state */}
              <div ref={uploadSectionRef} className="space-y-6 pt-4">
                <DatasetUpload onAnalysisComplete={handleAnalysisComplete} />
                <ManualFraudCheck />
              </div>
            </>
          ) : (
            <>
              {/* ── Stats cards ───────────────────────────────────────────── */}
              <StatsCards
                totalTransactions={totalTransactions}
                fraudCount={fraudCount}
                normalCount={normalCount}
                fraudPercentage={fraudPercentage}
              />

              {/* ── Live feed + Chart ──────────────────────────────────────── */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <LiveTransactions transactions={transactions} />
                <FraudChart fraudCount={fraudCount} normalCount={normalCount} />
              </div>

              {/* ── Dataset upload ─────────────────────────────────────────── */}
              <div ref={uploadSectionRef}>
                <DatasetUpload onAnalysisComplete={handleAnalysisComplete} />
              </div>

              {/* ── Manual fraud check ─────────────────────────────────────── */}
              <ManualFraudCheck />

              {/* ── Activity table ─────────────────────────────────────────── */}
              <ActivityTable transactions={transactions} />
            </>
          )}

        </div>
      </main>
    </div>
  )
}
