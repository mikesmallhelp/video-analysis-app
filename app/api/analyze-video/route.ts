import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

// Initialize AI provider - this will be configurable via environment variables
const getAIProvider = () => {
  const provider = process.env.AI_PROVIDER || "openai"
  const model = process.env.AI_MODEL || "gpt-4o"

  switch (provider.toLowerCase()) {
    case "openai":
      return createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL:
          process.env.AI_GATEWAY_URL || "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/openai",
      })(model)
    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get("video") as File

    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 })
    }

    // Convert video file to base64 for AI analysis
    const bytes = await videoFile.arrayBuffer()
    const base64Video = Buffer.from(bytes).toString("base64")
    const mimeType = videoFile.type

    // Get AI prompt from environment variables
    const aiPrompt =
      process.env.AI_PROMPT ||
      `
Analyze this video and provide a detailed description of what you observe. 
Focus on identifying key elements, actions, and any notable features or patterns.
Provide your analysis in a clear, structured format.
    `.trim()

    // Generate analysis using AI
    const model = getAIProvider()

    const { text } = await generateText({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: aiPrompt,
            },
            {
              type: "video",
              video: `data:${mimeType};base64,${base64Video}`,
            },
          ],
        },
      ],
      maxTokens: 2000,
    })

    return NextResponse.json({ analysis: text })
  } catch (error) {
    console.error("Video analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze video" }, { status: 500 })
  }
}
