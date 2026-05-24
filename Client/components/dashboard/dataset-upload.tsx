"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle,
  Loader2, X, BarChart3, ShieldCheck, ShieldAlert, ChevronRight, RefreshCw
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadState = "idle" | "uploading" | "validated" | "analyzing" | "complete" | "error"

interface UploadMeta {
  upload_id: string
  filename: string
  total_rows: number
}

interface ProgressState {
  processed: number
  total: number
  percent: number
  fraud_so_far: number
  safe_so_far: number
}

interface FinalResult {
  total: number
  fraud_count: number
  safe_count: number
  fraud_rate: number
}

interface Props {
  /** Called after analysis completes so dashboard can refresh */
  onAnalysisComplete?: () => void
}

const BACKEND = "http://localhost:8000"
const WS_URL  = "ws://localhost:8000/ws/upload-progress"

// ── Component ─────────────────────────────────────────────────────────────────

export function DatasetUpload({ onAnalysisComplete }: Props) {
  const [state, setState]         = useState<UploadState>("idle")
  const [file, setFile]           = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null)
  const [progress, setProgress]   = useState<ProgressState | null>(null)
  const [result, setResult]       = useState<FinalResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const wsRef        = useRef<WebSocket | null>(null)

  // ── WebSocket for progress ─────────────────────────────────────────────────
  const connectProgressWS = useCallback(() => {
    if (wsRef.current) wsRef.current.close()
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === "progress") {
          setProgress({
            processed:    msg.processed,
            total:        msg.total,
            percent:      msg.percent,
            fraud_so_far: msg.fraud_so_far,
            safe_so_far:  msg.safe_so_far,
          })
        } else if (msg.type === "complete") {
          setResult({
            total:       msg.total,
            fraud_count: msg.fraud_count,
            safe_count:  msg.safe_count,
            fraud_rate:  msg.fraud_rate,
          })
          setState("complete")
          onAnalysisComplete?.()
        }
      } catch { /* ignore malformed */ }
    }
  }, [onAnalysisComplete])

  useEffect(() => {
    return () => { wsRef.current?.close() }
  }, [])

  // ── File validation (client-side) ─────────────────────────────────────────
  const validateFile = (f: File): string | null => {
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".csv"))
      return "Only .xlsx and .csv files are accepted."
    if (f.size > 20 * 1024 * 1024)
      return "File too large. Maximum size is 20 MB."
    return null
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFileSelect = (f: File) => {
    const err = validateFile(f)
    if (err) { setErrorMsg(err); setState("error"); return }
    setFile(f)
    setErrorMsg(null)
    setState("idle")
    setUploadMeta(null)
    setProgress(null)
    setResult(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const handleUpload = async () => {
    if (!file) return
    setState("uploading")
    setErrorMsg(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res  = await fetch(`${BACKEND}/upload-transactions`, { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Upload failed")
      setUploadMeta({ upload_id: data.upload_id, filename: data.filename, total_rows: data.total_rows })
      setState("validated")
    } catch (e: any) {
      setErrorMsg(e.message || "Upload failed. Check backend is running.")
      setState("error")
    }
  }

  const handleAnalyze = async () => {
    if (!uploadMeta) return
    setState("analyzing")
    connectProgressWS()

    try {
      const res  = await fetch(`${BACKEND}/analyze-dataset?upload_id=${uploadMeta.upload_id}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Analysis failed")
      // result is set via WebSocket "complete" message; this is fallback
      if (data.status === "complete" && !result) {
        setResult({ total: data.total, fraud_count: data.fraud_count, safe_count: data.safe_count, fraud_rate: data.fraud_rate })
        setState("complete")
        onAnalysisComplete?.()
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Analysis failed.")
      setState("error")
    }
  }

  const handleReset = () => {
    setState("idle"); setFile(null); setErrorMsg(null)
    setUploadMeta(null); setProgress(null); setResult(null)
    wsRef.current?.close()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card className="w-full overflow-hidden">
      {/* Header */}
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Upload Transaction Dataset</CardTitle>
              <CardDescription>Analyze an Excel or CSV file with bulk fraud detection</CardDescription>
            </div>
          </div>
          {state !== "idle" && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-5">

        {/* ── Drop Zone ──────────────────────────────────────────────── */}
        {(state === "idle" || state === "error") && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center gap-3
              rounded-xl border-2 border-dashed p-10 text-center
              cursor-pointer transition-all duration-200
              ${isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : file
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
            />

            {file ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                  <FileSpreadsheet className="h-7 w-7 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                  Ready to upload
                </Badge>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Drag & drop your file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <p className="text-xs text-muted-foreground">Accepts .xlsx and .csv — max 20 MB</p>
              </>
            )}
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-500">Upload Error</p>
              <p className="text-sm text-red-400">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)}>
              <X className="h-4 w-4 text-red-400 hover:text-red-500" />
            </button>
          </div>
        )}

        {/* ── Required Format Info ───────────────────────────────────── */}
        {state === "idle" && !file && (
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Required columns
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["transaction_id","amount","timestamp","merchant_category",
                "location","device_type","transaction_type","international","previous_fraud_flag"
              ].map((col) => (
                <code key={col} className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                  {col}
                </code>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Download sample files from <code className="text-primary">/sample_datasets/</code> in the project folder.
            </p>
          </div>
        )}

        {/* ── Upload Button ──────────────────────────────────────────── */}
        {file && state === "idle" && (
          <Button className="w-full gap-2" onClick={handleUpload}>
            <Upload className="h-4 w-4" />
            Upload & Validate File
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* ── Uploading spinner ──────────────────────────────────────── */}
        {state === "uploading" && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-border p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading and validating file…</p>
          </div>
        )}

        {/* ── Validated — show summary + analyze button ─────────────── */}
        {state === "validated" && uploadMeta && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="font-medium text-foreground">File validated successfully</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{uploadMeta.total_rows.toLocaleString()}</span> transactions
                  ready — <span className="font-mono text-xs">{uploadMeta.filename}</span>
                </p>
              </div>
            </div>
            <Button className="w-full gap-2" onClick={handleAnalyze}>
              <BarChart3 className="h-4 w-4" />
              Analyze Dataset — Run Fraud Detection
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── Analyzing — progress bar ───────────────────────────────── */}
        {state === "analyzing" && progress && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processing transactions…</span>
                <span className="font-semibold text-foreground">{progress.percent}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {progress.processed.toLocaleString()} / {progress.total.toLocaleString()} rows
              </p>
            </div>

            {/* Live mini-stats during analysis */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
                <p className="text-2xl font-bold text-emerald-500">{progress.safe_so_far.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Safe</p>
              </div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
                <ShieldAlert className="mx-auto mb-1 h-5 w-5 text-red-500" />
                <p className="text-2xl font-bold text-red-500">{progress.fraud_so_far.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Fraud</p>
              </div>
            </div>
          </div>
        )}

        {state === "analyzing" && !progress && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-border p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Starting analysis…</p>
          </div>
        )}

        {/* ── Complete ────────────────────────────────────────────────── */}
        {state === "complete" && result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Analysis complete</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Processed", value: result.total.toLocaleString(),        color: "text-blue-500",    bg: "bg-blue-500/5",    border: "border-blue-500/20" },
                { label: "Fraud Detected",  value: result.fraud_count.toLocaleString(),  color: "text-red-500",     bg: "bg-red-500/5",     border: "border-red-500/20" },
                { label: "Safe",            value: result.safe_count.toLocaleString(),   color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
                { label: "Fraud Rate",      value: `${result.fraud_rate}%`,              color: result.fraud_rate > 20 ? "text-red-500" : "text-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/20" },
              ].map((s) => (
                <div key={s.label} className={`rounded-lg border ${s.border} ${s.bg} p-3 text-center`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Dashboard has been updated with results from this dataset.
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
