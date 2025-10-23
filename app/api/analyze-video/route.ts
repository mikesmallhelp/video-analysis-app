import { type NextRequest, NextResponse } from "next/server"
import { VertexAI } from '@google-cloud/vertexai'
import { promises as fs } from 'fs'
import path from 'path'

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
  try {
    const formData = await request.formData()
    const videoFile = formData.get("video") as File

    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 })
    }

    // Read configuration file
    const configPath = path.join(process.cwd(), 'video-analysis-config.json')
    const configData = await fs.readFile(configPath, 'utf8')
    const config = JSON.parse(configData)

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

    // Convert video file to base64
    const videoBuffer = await videoFile.arrayBuffer()
    const videoBase64 = Buffer.from(videoBuffer).toString('base64')

    // Process all analysis tasks
    const analysisResults = []

    for (const task of config.analyzes) {
      const aiPrompt = `${task.prompt} Extract all scenes that match this description from the video. Respond only with the start and end times of each scene in the format: minutes:seconds-minutes:seconds. List multiple time ranges if there are several matching scenes. For example: 0:30-0:33, 1:15-1:18, 2:45-2:50`

      console.log(`Processing task: ${task["ui-label"]}`)
      console.log(`Using prompt: ${aiPrompt}`)

      try {
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
        const timeRanges = extractTimeRanges(text)

        console.log(`AI Result for ${task["ui-label"]}:`, text)
        console.log(`Extracted ${timeRanges.length} time ranges:`, timeRanges)

        analysisResults.push({
          label: task["ui-label"],
          description: task["ui-description"] || "",
          prompt: task.prompt,
          analysis: text,
          timeRanges: timeRanges
        })
      } catch (error) {
        console.error(`Error processing task ${task["ui-label"]}:`, error)
        analysisResults.push({
          label: task["ui-label"],
          description: task["ui-description"] || "",
          prompt: task.prompt,
          analysis: `Error: ${error instanceof Error ? error.message : 'Failed to analyze'}`,
          timeRanges: []
        })
      }
    }

    return NextResponse.json({
      results: analysisResults
    })
  } catch (error) {
    console.error("Video analysis error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to analyze video" 
    }, { status: 500 })
  }
}
