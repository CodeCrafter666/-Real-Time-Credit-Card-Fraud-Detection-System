"use client"

/**
 * hooks/use-backend.ts  v4
 *
 * REMOVED: WebSocket connection to /ws (random live feed) — eliminated entirely.
 *
 * Data now comes from two real sources only:
 *   1. GET /transactions  — fetched on mount and after analysis completes
 *   2. /ws/upload-progress WebSocket — receives:
 *        { type: "progress",    transaction: {...}, ... }  → during dataset analysis
 *        { type: "transaction", transaction: {...} }        → after manual submission
 *        { type: "complete",    ... }                       → analysis finished
 *
 * The hook exposes:
 *   transactions  — full list, newest first
 *   isAnalyzing   — true while a dataset is being processed
 *   progress      — percent complete during analysis (0–100)
 *   error         — any connection error
 *   refresh()     — re-fetch /transactions (called after analysis completes)
 */

import { useState, useEffect, useRef, useCallback } from "react"

export interface Transaction {
  id: string
  amount: number
  time: string
  location: string
  status: "safe" | "fraud"
  fraud_probability?: number
  risk_level?: string
  merchant_category?: string
  device_type?: string
  is_international?: boolean
  source?: "upload" | "manual"
}

interface BackendState {
  transactions:  Transaction[]
  isAnalyzing:   boolean
  progress:      number          // 0–100
  error:         string | null
  refresh:       () => void
}

const REST_URL     = "http://localhost:8000"
const WS_ACTIVITY  = "ws://localhost:8000/ws/upload-progress"
const MAX_HISTORY  = 500
const RECONNECT_MS = 4000

export function useBackend(): BackendState {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isAnalyzing, setIsAnalyzing]   = useState(false)
  const [progress, setProgress]         = useState(0)
  const [error, setError]               = useState<string | null>(null)

  const wsRef          = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted      = useRef(true)

  // ── Fetch transaction history from REST ────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      const res  = await fetch(`${REST_URL}/transactions?limit=${MAX_HISTORY}`)
      if (!res.ok) return
      const data: Transaction[] = await res.json()
      if (isMounted.current) setTransactions(data)
    } catch {
      // Backend not reachable — stay silent, WS error will surface it
    }
  }, [])

  const refresh = useCallback(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // ── WebSocket connection to /ws/upload-progress ────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_ACTIVITY)
    wsRef.current = ws

    ws.onopen = () => {
      if (!isMounted.current) return
      setError(null)
    }

    ws.onmessage = (event) => {
      if (!isMounted.current) return
      try {
        const msg = JSON.parse(event.data)

        if (msg.type === "progress") {
          // A dataset row was just processed — add it to the feed
          setIsAnalyzing(true)
          setProgress(msg.percent ?? 0)
          if (msg.transaction) {
            setTransactions((prev) => [msg.transaction, ...prev.slice(0, MAX_HISTORY - 1)])
          }
        } else if (msg.type === "complete") {
          // Dataset analysis finished — refresh full list from REST
          setIsAnalyzing(false)
          setProgress(100)
          fetchTransactions()
        } else if (msg.type === "transaction") {
          // A manual submission was saved — prepend it
          if (msg.transaction) {
            setTransactions((prev) => [msg.transaction, ...prev.slice(0, MAX_HISTORY - 1)])
          }
        }
      } catch {
        console.error("WS parse error:", event.data)
      }
    }

    ws.onerror = () => {
      if (!isMounted.current) return
      setError("Cannot reach backend. Make sure it is running on port 8000.")
    }

    ws.onclose = () => {
      if (!isMounted.current) return
      // Auto-reconnect after delay
      reconnectTimer.current = setTimeout(() => {
        if (isMounted.current) connect()
      }, RECONNECT_MS)
    }
  }, [fetchTransactions])

  // ── Mount / unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true
    fetchTransactions()   // load any existing history on first render
    connect()             // open activity WebSocket

    return () => {
      isMounted.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null   // prevent reconnect on intentional unmount
        wsRef.current.close()
      }
    }
  }, [connect, fetchTransactions])

  return { transactions, isAnalyzing, progress, error, refresh }
}
