import { type NextRequest, NextResponse } from "next/server"
import ffmpeg from "fluent-ffmpeg"
import { promises as fs } from "fs"
import { tmpdir } from "os"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get("video") as File
    const startTime = formData.get("startTime") as string
    const endTime = formData.get("endTime") as string

    if (!videoFile || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log("Clipping video:", { startTime, endTime })

    // Create temporary file paths
    const tempDir = tmpdir()
    const inputPath = path.join(tempDir, `input-${Date.now()}.mp4`)
    const outputPath = path.join(tempDir, `output-${Date.now()}.mp4`)

    try {
      // Save uploaded file to temp location
      const buffer = Buffer.from(await videoFile.arrayBuffer())
      await fs.writeFile(inputPath, buffer)

      // Calculate duration
      const start = parseFloat(startTime)
      const end = parseFloat(endTime)
      const duration = end - start

      console.log("Processing with ffmpeg:", { start, duration })

      // Use ffmpeg to clip the video
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .seekInput(start)
          .duration(duration)
          .output(outputPath)
          .videoCodec('copy')
          .audioCodec('copy')
          .on('end', () => {
            console.log('FFmpeg processing completed')
            resolve()
          })
          .on('error', (err) => {
            console.error('FFmpeg error:', err)
            reject(err)
          })
          .run()
      })

      // Read the clipped video
      const clippedBuffer = await fs.readFile(outputPath)

      // Clean up temp files
      await fs.unlink(inputPath).catch(console.error)
      await fs.unlink(outputPath).catch(console.error)

      // Return the clipped video
      return new NextResponse(new Uint8Array(clippedBuffer), {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': clippedBuffer.length.toString(),
        },
      })
    } catch (processingError) {
      // Clean up temp files on error
      await fs.unlink(inputPath).catch(() => {})
      await fs.unlink(outputPath).catch(() => {})
      throw processingError
    }
  } catch (error) {
    console.error("Video clipping error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to clip video"
    }, { status: 500 })
  }
}