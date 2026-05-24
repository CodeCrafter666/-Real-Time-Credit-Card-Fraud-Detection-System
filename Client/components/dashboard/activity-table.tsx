"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Transaction } from "@/hooks/use-backend"

interface ActivityTableProps {
  transactions: Transaction[]
}

export function ActivityTable({ transactions }: ActivityTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Transaction ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 10).map((transaction) => (
                <TableRow
                  key={transaction.id}
                  className={transaction.status === "fraud" ? "bg-red-500/5" : ""}
                >
                  <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                  <TableCell className="font-semibold">
                    {"\u20B9"}{transaction.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{transaction.location}</TableCell>
                  <TableCell>
                    <Badge
                      variant={transaction.status === "fraud" ? "destructive" : "default"}
                      className={transaction.status === "fraud"
                        ? "bg-red-500 text-white"
                        : "bg-emerald-500 text-white"}
                    >
                      {transaction.status === "fraud" ? "Fraud" : "Safe"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {transaction.time}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
