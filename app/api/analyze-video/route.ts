import { type NextRequest, NextResponse } from "next/server"
import { VertexAI } from '@google-cloud/vertexai'
import { promises as fs } from 'fs'
import path from 'path'
import { uploadVideoToGCS, deleteVideoFromGCS } from '@/lib/gcs-utils'

// Helper function to convert time format "m:ss" to seconds
function parseTimeToSeconds(timeStr: string): number {
  const [minutes, seconds] = timeStr.split(':').map(Number)
  return minutes * 60 + seconds
}

// Helper function to extract all time ranges from AI response
function extractTimeRanges(text: string): Array<{start: number, end: number, originalText: string}> {
  const timeRangeRegex = /(\d+:\d+)-(\d+:\d+)/g
  const ranges = []
  let match

  while ((match = timeRangeRegex.exec(text)) !== null) {
    const [fullMatch, start, end] = match
    ranges.push({
      start: parseTimeToSeconds(start),
      end: parseTimeToSeconds(end),
      originalText: fullMatch
    })
  }

  return ranges
}

export async function POST(request: NextRequest) {
  let gcsUri: string | null = null

  try {
    const formData = await request.formData()
    const videoFile = formData.get("video") as File

    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 })
    }

    // Load configuration file with prompts
    const configPath = path.join(process.cwd(), 'video-analysis-config.json')
    const configData = await fs.readFile(configPath, 'utf8')
    const config = JSON.parse(configData)

    // Load translations for UI texts based on locale from environment
    const locale = process.env.DEFAULT_LOCALE || 'en'
    const messagesPath = path.join(process.cwd(), `messages/${locale}.json`)
    const messagesData = await fs.readFile(messagesPath, 'utf8')
    const messages = JSON.parse(messagesData)

    console.log("Processing video file:", videoFile.name);
    console.log("Configuration loaded:", config.analyzes.length, "analysis tasks");

    // Use Vertex AI Node.js library
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    const model = process.env.VERTEX_AI_MODEL || 'gemini-2.5-pro'
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

    // Upload video to Google Cloud Storage
    const videoBuffer = await videoFile.arrayBuffer()
    const videoBufferNode = Buffer.from(videoBuffer)
    gcsUri = await uploadVideoToGCS(videoBufferNode, videoFile.name, videoFile.type)

    // Process all analysis tasks
    const analysisResults = []

    for (let i = 0; i < config.analyzes.length; i++) {
      const configTask = config.analyzes[i]
      const messageTask = messages.analyzes[i]

      const aiPromptStart = config["prompt-start"]
      const aiPromptMiddle = configTask["prompt-middle"]
      const aiPromptEnd = config["prompt-end"]

      if (!aiPromptStart || aiPromptStart.trim() === "") {
        throw new Error('Configuration error: "prompt-start" is required and cannot be empty')
      }
      if (!aiPromptMiddle || aiPromptMiddle.trim() === "") {
        throw new Error(`Configuration error: "prompt-middle" is required and cannot be empty for task index ${i}`)
      }
      if (!aiPromptEnd || aiPromptEnd.trim() === "") {
        throw new Error('Configuration error: "prompt-end" is required and cannot be empty')
      }

      const aiPrompt = `${aiPromptStart} ${aiPromptMiddle} ${aiPromptEnd}`

      console.log(`Processing task: ${messageTask.label}`)
      console.log(`Using prompt: ${aiPrompt}`)

      try {
        // Generate content with video from GCS
        const result = await generativeModel.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                { text: aiPrompt },
                {
                  fileData: {
                    mimeType: videoFile.type,
                    fileUri: gcsUri
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
        const timeRanges = extractTimeRanges(text)

        console.log(`AI Result for ${messageTask.label}:`, text)
        console.log(`Extracted ${timeRanges.length} time ranges:`, timeRanges)

        analysisResults.push({
          label: messageTask.label,
          description: messageTask.description || "",
          prompt: configTask["prompt-middle"],
          analysis: text,
          timeRanges: timeRanges
        })
      } catch (error) {
        console.error(`Error processing task ${messageTask.label}:`, error)
        analysisResults.push({
          label: messageTask.label,
          description: messageTask.description || "",
          prompt: configTask["prompt-middle"],
          analysis: `Error: ${error instanceof Error ? error.message : 'Failed to analyze'}`,
          timeRanges: []
        })
      }
    }

    // Clean up: delete video from GCS after analysis
    if (gcsUri) {
      await deleteVideoFromGCS(gcsUri)
    }

    return NextResponse.json({
      results: analysisResults
    })
  } catch (error) {
    console.error("Video analysis error:", error)

    // Clean up: delete video from GCS even if analysis failed
    if (gcsUri) {
      await deleteVideoFromGCS(gcsUri)
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to analyze video"
    }, { status: 500 })
  }
}
