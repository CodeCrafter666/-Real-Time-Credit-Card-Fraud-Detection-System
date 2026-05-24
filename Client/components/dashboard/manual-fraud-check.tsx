"use client"

import { useState } from "react"
import {
  Shield, AlertTriangle, CheckCircle, Loader2,
  Zap, MapPin, Clock, CreditCard, Monitor, Globe, ChevronRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ── Types ──────────────────────────────────────────────────────────────────

interface AnalysisResult {
  status: "fraud" | "safe"
  fraud_probability: number
  risk_level: "Low" | "Medium" | "High" | "Critical"
  risk_factors: string[]
  recommendation: string
  model_used: string
}

// ── Constants ─────────────────────────────────────────────────────────────

const MERCHANT_CATEGORIES = [
  "Electronics", "Food & Dining", "Travel", "Healthcare",
  "Entertainment", "Online Shopping", "Grocery", "Gaming",
  "Fuel", "Jewelry", "Cryptocurrency", "Wire Transfer", "Other"
]

const LOCATIONS = [
  "Mumbai, MH", "Delhi, DL", "Bangalore, KA", "Chennai, TN",
  "Kolkata, WB", "Hyderabad, TS", "Pune, MH", "Ahmedabad, GJ",
  "Jaipur, RJ", "Lucknow, UP", "Chandigarh, CH", "Kochi, KL",
  "Indore, MP", "Bhopal, MP", "Nagpur, MH"
]

const DEVICE_TYPES = ["Mobile", "Desktop", "POS Terminal", "ATM", "Virtual Card", "Unknown"]

const RISK_CONFIG = {
  Low:      { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", bar: "bg-emerald-500" },
  Medium:   { color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   bar: "bg-amber-500" },
  High:     { color: "text-orange-500",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  bar: "bg-orange-500" },
  Critical: { color: "text-red-500",     bg: "bg-red-500/10",     border: "border-red-500/30",     bar: "bg-red-500" },
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ManualFraudCheck() {
  const [form, setForm] = useState({
    amount: "",
    time: "",
    merchant_category: "",
    location: "",
    device_type: "",
    is_international: "false",
  })
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<AnalysisResult | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (submitted) setResult(null)  // clear result when form changes
  }

  const isFormValid = () =>
    form.amount && parseFloat(form.amount) > 0 &&
    form.time && form.merchant_category &&
    form.location && form.device_type

  const handleSubmit = async () => {
    if (!isFormValid()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setSubmitted(true)

    try {
      const res = await fetch("http://localhost:8000/analyze-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:            parseFloat(form.amount),
          time:              form.time + ":00",   // HH:MM → HH:MM:SS
          merchant_category: form.merchant_category,
          location:          form.location,
          device_type:       form.device_type,
          is_international:  form.is_international === "true",
        }),
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: AnalysisResult = await res.json()
      setResult(data)
    } catch (err) {
      setError("Could not reach the backend. Make sure it's running on port 8000.")
    } finally {
      setLoading(false)
    }
  }

  const cfg = result ? RISK_CONFIG[result.risk_level] : null

  return (
    <Card className="w-full overflow-hidden">
      {/* Header */}
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Manual Fraud Check</CardTitle>
            <CardDescription>Enter transaction details for instant ML-powered analysis</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── Left: Form ───────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Transaction Amount (₹)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 85000"
                value={form.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                className="font-mono"
              />
            </div>

            {/* Time */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Transaction Time
              </Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => handleChange("time", e.target.value)}
              />
            </div>

            {/* Merchant Category */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                Merchant Category
              </Label>
              <Select onValueChange={(v) => handleChange("merchant_category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {MERCHANT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Transaction Location
              </Label>
              <Select onValueChange={(v) => handleChange("location", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Device Type */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                Device Type
              </Label>
              <Select onValueChange={(v) => handleChange("device_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* International */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                International Transaction
              </Label>
              <Select
                defaultValue="false"
                onValueChange={(v) => handleChange("is_international", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No — Domestic</SelectItem>
                  <SelectItem value="true">Yes — International</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              className="mt-2 w-full gap-2"
              onClick={handleSubmit}
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Analyze Transaction
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* ── Right: Result Panel ───────────────────────────────────────── */}
          <div className="flex flex-col">

            {/* Empty state */}
            {!result && !loading && !error && (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Shield className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">No analysis yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fill in the form and click Analyze Transaction
                </p>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-border p-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Running ML analysis…</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center">
                <AlertTriangle className="mb-2 h-8 w-8 text-red-500" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && cfg && (
              <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400`}>

                {/* Status header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.status === "fraud" ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {result.status === "fraud" ? "Fraud Detected" : "Transaction Safe"}
                      </p>
                      <p className="text-xs text-muted-foreground">{result.model_used}</p>
                    </div>
                  </div>
                  <Badge className={`${cfg.bg} ${cfg.color} border-0 font-semibold`}>
                    {result.risk_level} Risk
                  </Badge>
                </div>

                {/* Probability meter */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fraud Probability</span>
                    <span className={`font-bold ${cfg.color}`}>
                      {(result.fraud_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                      style={{ width: `${result.fraud_probability * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Safe</span>
                    <span>Fraud</span>
                  </div>
                </div>

                {/* Risk Factors */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Risk Factors
                  </p>
                  <ul className="space-y-1.5">
                    {result.risk_factors.map((factor, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.bar}`} />
                        <span className="text-foreground">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendation */}
                <div className={`rounded-lg border ${cfg.border} bg-background/60 p-3`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Recommendation
                  </p>
                  <p className="text-sm text-foreground">{result.recommendation}</p>
                </div>

              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
