"use client"

import { MapPin, Clock, IndianRupee } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Transaction } from "@/hooks/use-backend"

interface LiveTransactionsProps {
  transactions: Transaction[]
}

export function LiveTransactions({ transactions }: LiveTransactionsProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Live Transactions</CardTitle>
          <Badge variant="outline" className="gap-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Streaming
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6 pb-6">
          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className={`relative rounded-xl border p-4 transition-all duration-300 hover:shadow-md ${
                  transaction.status === "fraud"
                    ? "border-red-500/50 bg-red-500/5 shadow-red-500/10"
                    : "border-border bg-card hover:border-emerald-500/30"
                } ${index === 0 ? "animate-in slide-in-from-top-2 duration-500" : ""}`}
              >
                {transaction.status === "fraud" && (
                  <div className="absolute -left-px top-0 h-full w-1 rounded-l-xl bg-red-500" />
                )}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg p-1.5 ${transaction.status === "fraud" ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                        <IndianRupee className={`h-4 w-4 ${transaction.status === "fraud" ? "text-red-500" : "text-emerald-500"}`} />
                      </div>
                      <span className="text-lg font-semibold text-foreground">
                        {"\u20B9"}{transaction.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {transaction.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {transaction.time}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={transaction.status === "fraud" ? "destructive" : "default"}
                    className={transaction.status === "fraud" 
                      ? "bg-red-500 text-white" 
                      : "bg-emerald-500 text-white hover:bg-emerald-600"}
                  >
                    {transaction.status === "fraud" ? "Fraud" : "Safe"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
