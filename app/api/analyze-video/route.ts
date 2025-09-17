import { type NextRequest, NextResponse } from "next/server"
import { put } from '@vercel/blob'
import { VertexAI } from '@google-cloud/vertexai'

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

    // Use Vertex AI Node.js library
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    const model = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash'
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS ?
      JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS) : null

    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required')
    }

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
      ...(credentials && { keyFilename: undefined, credentials: credentials })
    })

    // Get the generative model
    const generativeModel = vertexAI.getGenerativeModel({
      model: model,
    })

    // Create the prompt with video URL
    const prompt = `${aiPrompt}\n\nPlease analyze this video: ${videoUrl}`

    // Generate content
    const result = await generativeModel.generateContent({
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

    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated'

    console.log("AI Analysis Result:", text);
    return NextResponse.json({ analysis: text })
  } catch (error) {
    console.error("Video analysis error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to analyze video" 
    }, { status: 500 })
  }
}
