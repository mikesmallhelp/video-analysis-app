import { type NextRequest, NextResponse } from "next/server"
import { put } from '@vercel/blob'
import { generateText } from 'ai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get("video") as File

    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 })
    }

    // Upload video to Vercel Blob
    const blob = await put(videoFile.name, videoFile, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    })

    const videoUrl = blob.url

    // Get AI prompt from environment variables
    const aiPrompt =
      process.env.AI_PROMPT ||
      `
Analyze this video and provide a detailed description of what you observe. 
Focus on identifying key elements, actions, and any notable features or patterns.
Provide your analysis in a clear, structured format.
    `.trim()

    // Generate analysis using AI
    const result = await generateText({
      model: `${process.env.AI_PROVIDER}/${process.env.AI_MODEL}`,
      apiKey: process.env.AI_GATEWAY_API_KEY,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: aiPrompt,
            },
            {
              type: 'image',
              image: videoUrl,
            },
          ],
        }
      ],
      maxTokens: 2000,
    })

    return NextResponse.json({ analysis: result.text })
  } catch (error) {
    console.error("Video analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze video" }, { status: 500 })
  }
}
