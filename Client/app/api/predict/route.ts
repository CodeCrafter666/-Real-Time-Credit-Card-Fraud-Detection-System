import { NextRequest, NextResponse } from "next/server"

export interface PredictRequest {
  amount: number
  location: string
  merchant_category?: string
  time_of_day?: string
  card_present?: boolean
  previous_fraud_count?: number
}

export interface PredictResponse {
  transaction_id: string
  is_fraud: boolean
  fraud_probability: number
  risk_factors: string[]
  timestamp: string
}

// Simple fraud detection logic based on transaction features
function predictFraud(data: PredictRequest): { isFraud: boolean; probability: number; riskFactors: string[] } {
  let fraudScore = 0
  const riskFactors: string[] = []

  // High amount transactions are suspicious
  if (data.amount > 100000) {
    fraudScore += 0.3
    riskFactors.push("High transaction amount")
  } else if (data.amount > 50000) {
    fraudScore += 0.15
    riskFactors.push("Above average transaction amount")
  }

  // Late night transactions
  if (data.time_of_day) {
    const hour = parseInt(data.time_of_day.split(":")[0])
    if (hour >= 0 && hour < 6) {
      fraudScore += 0.2
      riskFactors.push("Late night transaction")
    }
  }

  // Card not present transactions
  if (data.card_present === false) {
    fraudScore += 0.15
    riskFactors.push("Card not present")
  }

  // Previous fraud history
  if (data.previous_fraud_count && data.previous_fraud_count > 0) {
    fraudScore += Math.min(0.3, data.previous_fraud_count * 0.1)
    riskFactors.push("Previous fraud history")
  }

  // Certain merchant categories
  const riskyCategories = ["electronics", "jewelry", "cash_advance", "crypto"]
  if (data.merchant_category && riskyCategories.includes(data.merchant_category.toLowerCase())) {
    fraudScore += 0.15
    riskFactors.push("High-risk merchant category")
  }

  // Add some randomness to simulate ML model uncertainty
  fraudScore += (Math.random() - 0.5) * 0.2

  // Clamp between 0 and 1
  const probability = Math.max(0, Math.min(1, fraudScore))
  const isFraud = probability > 0.5

  return { isFraud, probability, riskFactors }
}

function generateTransactionId(): string {
  return `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PredictRequest

    // Validate required fields
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number." },
        { status: 400 }
      )
    }

    if (!body.location || typeof body.location !== "string") {
      return NextResponse.json(
        { error: "Invalid location. Must be a non-empty string." },
        { status: 400 }
      )
    }

    // Run fraud prediction
    const prediction = predictFraud(body)

    const response: PredictResponse = {
      transaction_id: generateTransactionId(),
      is_fraud: prediction.isFraud,
      fraud_probability: Math.round(prediction.probability * 100) / 100,
      risk_factors: prediction.riskFactors,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/predict",
    method: "POST",
    description: "Predict if a transaction is fraudulent",
    request_body: {
      amount: "number (required) - Transaction amount in INR",
      location: "string (required) - Transaction location",
      merchant_category: "string (optional) - Category of merchant",
      time_of_day: "string (optional) - Time in HH:MM format",
      card_present: "boolean (optional) - Whether physical card was used",
      previous_fraud_count: "number (optional) - Number of previous fraud incidents",
    },
    example_request: {
      amount: 50000,
      location: "Mumbai, MH",
      merchant_category: "electronics",
      time_of_day: "02:30",
      card_present: false,
    },
  })
}
