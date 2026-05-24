export interface Transaction {
  id: string
  amount: number
  time: string
  location: string
  status: "safe" | "fraud"
  fraud_probability?: number
  risk_factors?: string[]
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

function generateId(): string {
  return `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

function generateAmount(): number {
  // Generate amounts with higher probability for normal ranges
  const random = Math.random()
  if (random < 0.7) {
    // Normal range: 100 - 10,000
    return Math.floor(Math.random() * 9900) + 100
  } else if (random < 0.9) {
    // Medium range: 10,000 - 50,000
    return Math.floor(Math.random() * 40000) + 10000
  } else {
    // High range: 50,000 - 200,000
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

function generateLocation(): string {
  return locations[Math.floor(Math.random() * locations.length)]
}

function generateStatus(): "safe" | "fraud" {
  // 15% fraud rate for demo purposes
  return Math.random() < 0.15 ? "fraud" : "safe"
}

export function generateTransaction(): Transaction {
  return {
    id: generateId(),
    amount: generateAmount(),
    time: generateTime(),
    location: generateLocation(),
    status: generateStatus(),
  }
}

export function generateInitialTransactions(count: number = 20): Transaction[] {
  return Array.from({ length: count }, () => generateTransaction())
}
