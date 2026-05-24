import { NextRequest } from "next/server"

interface Transaction {
  id: string
  amount: number
  time: string
  location: string
  status: "safe" | "fraud"
  fraud_probability: number
  risk_factors: string[]
}

const locations = [
  "Mumbai, MH",
  "Delhi, DL",
  "Bangalore, KA",
  "Chennai, TN",
  "Kolkata, WB",
  "Hyderabad, TS",
  "Pune, MH",
  "Ahmedabad, GJ",
  "Jaipur, RJ",
  "Lucknow, UP",
  "Chandigarh, CH",
  "Kochi, KL",
  "Indore, MP",
  "Bhopal, MP",
  "Nagpur, MH",
]

const merchantCategories = [
  "retail",
  "electronics",
  "groceries",
  "restaurants",
  "travel",
  "entertainment",
  "jewelry",
  "healthcare",
]

function generateId(): string {
  return `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

function generateAmount(): number {
  const random = Math.random()
  if (random < 0.7) {
    return Math.floor(Math.random() * 9900) + 100
  } else if (random < 0.9) {
    return Math.floor(Math.random() * 40000) + 10000
  } else {
    return Math.floor(Math.random() * 150000) + 50000
  }
}

function generateTime(): string {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const seconds = now.getSeconds().toString().padStart(2, "0")
  return `${hours}:${minutes}:${seconds}`
}

function generateTransaction(): Transaction {
  const amount = generateAmount()
  const location = locations[Math.floor(Math.random() * locations.length)]
  const category = merchantCategories[Math.floor(Math.random() * merchantCategories.length)]
  const time = generateTime()
  const hour = parseInt(time.split(":")[0])
  
  // Calculate fraud probability based on features
  let fraudScore = 0
  const riskFactors: string[] = []

  if (amount > 100000) {
    fraudScore += 0.3
    riskFactors.push("High transaction amount")
  } else if (amount > 50000) {
    fraudScore += 0.15
    riskFactors.push("Above average amount")
  }

  if (hour >= 0 && hour < 6) {
    fraudScore += 0.2
    riskFactors.push("Late night transaction")
  }

  const riskyCategories = ["electronics", "jewelry"]
  if (riskyCategories.includes(category)) {
    fraudScore += 0.15
    riskFactors.push("High-risk category")
  }

  // Add randomness
  fraudScore += (Math.random() - 0.5) * 0.3
  const probability = Math.max(0, Math.min(1, fraudScore))
  const isFraud = probability > 0.45

  return {
    id: generateId(),
    amount,
    time,
    location,
    status: isFraud ? "fraud" : "safe",
    fraud_probability: Math.round(probability * 100) / 100,
    risk_factors: riskFactors,
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial batch of transactions
      const initialTransactions = Array.from({ length: 20 }, () => generateTransaction())
      controller.enqueue(
        encoder.encode(`event: init\ndata: ${JSON.stringify(initialTransactions)}\n\n`)
      )

      // Send heartbeat and new transactions periodically
      let isActive = true
      
      const transactionInterval = setInterval(() => {
        if (!isActive) return
        const transaction = generateTransaction()
        controller.enqueue(
          encoder.encode(`event: transaction\ndata: ${JSON.stringify(transaction)}\n\n`)
        )
      }, 2000)

      const heartbeatInterval = setInterval(() => {
        if (!isActive) return
        controller.enqueue(encoder.encode(`:heartbeat\n\n`))
      }, 30000)

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        isActive = false
        clearInterval(transactionInterval)
        clearInterval(heartbeatInterval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
