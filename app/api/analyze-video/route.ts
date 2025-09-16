import { type NextRequest, NextResponse } from "next/server"
import { put } from '@vercel/blob'

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

    console.log("Video uploaded to:", videoUrl);
    console.log("Using AI prompt:", aiPrompt);

    // Use Vertex AI REST API directly
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    const model = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash'
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS ? 
      JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS) : null

    if (!projectId || !credentials) {
      throw new Error('Google Cloud configuration missing')
    }

    // Get access token (simplified - in production, use proper auth)
    const { GoogleAuth } = await import('google-auth-library')
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })
    
    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()

    // Make direct API call to Vertex AI
    const prompt = `${aiPrompt}\n\nPlease analyze this video: ${videoUrl}`
    
    const response = await fetch(
      `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Vertex AI API error: ${response.status}`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated'

    console.log("AI Analysis Result:", text);
    return NextResponse.json({ analysis: text })
  } catch (error) {
    console.error("Video analysis error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to analyze video" 
    }, { status: 500 })
  }
}
