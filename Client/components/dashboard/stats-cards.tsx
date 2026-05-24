"use client"

import { Activity, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatsCardsProps {
  totalTransactions: number
  fraudCount: number
  normalCount: number
  fraudPercentage: number
}

export function StatsCards({ totalTransactions, fraudCount, normalCount, fraudPercentage }: StatsCardsProps) {
  const stats = [
    {
      title: "Total Transactions",
      value: totalTransactions.toLocaleString(),
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Fraud Detected",
      value: fraudCount.toLocaleString(),
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Normal Transactions",
      value: normalCount.toLocaleString(),
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Fraud Rate",
      value: `${fraudPercentage.toFixed(2)}%`,
      icon: TrendingUp,
      color: fraudPercentage > 5 ? "text-red-500" : "text-amber-500",
      bgColor: fraudPercentage > 5 ? "bg-red-500/10" : "bg-amber-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground transition-transform duration-300 group-hover:scale-105">
                  {stat.value}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${stat.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
