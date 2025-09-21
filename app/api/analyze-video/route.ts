import { type NextRequest, NextResponse } from "next/server"
import { VertexAI } from '@google-cloud/vertexai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get("video") as File

    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 })
    }

    // Get AI prompt from environment variables
    const aiPrompt =
      process.env.AI_PROMPT ||
      `
      Analyze this video and provide a detailed description of what you observe. 
      Focus on identifying key elements, actions, and any notable features or patterns.
      Provide your analysis in a clear, structured format.
    `.trim()

    console.log("Processing video file:", videoFile.name);
    console.log("Using AI prompt:", aiPrompt);

    // Use Vertex AI Node.js library
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    const model = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash'
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required')
    }

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    })

    // Get the generative model
    const generativeModel = vertexAI.getGenerativeModel({
      model: model,
    })

    // Convert video file to base64
    const videoBuffer = await videoFile.arrayBuffer()
    const videoBase64 = Buffer.from(videoBuffer).toString('base64')

    // Generate content with video data
    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: aiPrompt },
            {
              inlineData: {
                mimeType: videoFile.type,
                data: videoBase64
              }
            }
          ]
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
