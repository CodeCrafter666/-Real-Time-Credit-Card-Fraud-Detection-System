"use client"

import { AlertTriangle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface FraudAlertProps {
  show: boolean
  onDismiss: () => void
  latestFraud?: {
    amount: number
    location: string
    time: string
  }
}

export function FraudAlert({ show, onDismiss, latestFraud }: FraudAlertProps) {
  if (!show || !latestFraud) return null

  return (
    <Alert
      variant="destructive"
      className="animate-in slide-in-from-top-2 border-red-500 bg-red-500/10 duration-300"
    >
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-red-600 dark:text-red-400">
        Suspicious Transaction Detected!
      </AlertTitle>
      <AlertDescription className="mt-1 text-red-600/80 dark:text-red-400/80">
        A potentially fraudulent transaction of {"\u20B9"}{latestFraud.amount.toLocaleString()} was detected from{" "}
        {latestFraud.location} at {latestFraud.time}. Please review immediately.
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6 text-red-600 hover:bg-red-500/20 hover:text-red-700 dark:text-red-400"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  )
}
