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

    // Construct credentials from environment variables
    let privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY
    if (privateKey) {
      // Handle different formats of newlines in the private key
      privateKey = privateKey.replace(/\\n/g, '\n')
      // Ensure proper formatting
      if (!privateKey.includes('\n')) {
        // If still no newlines, it might be base64 encoded or malformed
        // Try to format it properly
        privateKey = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
          .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
          .replace(/(.{64})/g, '$1\n')
          .replace(/\n\n/g, '\n')
      }
    }

    const credentials = {
      type: "service_account",
      project_id: projectId,
      private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLOUD_CLIENT_EMAIL}`,
      universe_domain: "googleapis.com"
    }

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
      googleAuthOptions: {
        credentials: credentials
      }
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
