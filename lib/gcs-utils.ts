import { Storage } from '@google-cloud/storage'

// Initialize Google Cloud Storage client
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

const bucketName = process.env.GCS_BUCKET_NAME || 'video-analysis-temp'

/**
 * Upload a video file to Google Cloud Storage
 * @param fileBuffer - The video file buffer
 * @param fileName - The name of the file
 * @param mimeType - The MIME type of the video
 * @returns The GCS URI of the uploaded file (gs://bucket-name/file-path)
 */
export async function uploadVideoToGCS(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const bucket = storage.bucket(bucketName)

  // Create a unique filename with timestamp
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const gcsFileName = `videos/${timestamp}-${sanitizedFileName}`

  const file = bucket.file(gcsFileName)

  // Upload the file
  await file.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        uploadedAt: new Date().toISOString(),
        originalFileName: fileName,
      }
    },
    resumable: false, // For files smaller than 10MB, non-resumable is faster
  })

  console.log(`Video uploaded to GCS: gs://${bucketName}/${gcsFileName}`)

  // Return the GCS URI
  return `gs://${bucketName}/${gcsFileName}`
}

/**
 * Delete a video file from Google Cloud Storage
 * @param gcsUri - The GCS URI of the file (gs://bucket-name/file-path)
 */
export async function deleteVideoFromGCS(gcsUri: string): Promise<void> {
  try {
    // Parse the GCS URI
    const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/)
    if (!match) {
      throw new Error(`Invalid GCS URI: ${gcsUri}`)
    }

    const [, bucketName, filePath] = match
    const bucket = storage.bucket(bucketName)
    const file = bucket.file(filePath)

    await file.delete()
    console.log(`Video deleted from GCS: ${gcsUri}`)
  } catch (error) {
    console.error(`Error deleting video from GCS: ${gcsUri}`, error)
    // Don't throw - deletion errors shouldn't fail the main operation
  }
}

/**
 * Check if a bucket exists, and create it if it doesn't
 */
export async function ensureBucketExists(): Promise<void> {
  const bucket = storage.bucket(bucketName)

  try {
    const [exists] = await bucket.exists()

    if (!exists) {
      console.log(`Bucket ${bucketName} does not exist. Creating...`)
      await storage.createBucket(bucketName, {
        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
        storageClass: 'STANDARD',
        lifecycle: {
          rule: [
            {
              action: { type: 'Delete' },
              condition: { age: 1 } // Auto-delete files older than 1 day
            }
          ]
        }
      })
      console.log(`Bucket ${bucketName} created successfully`)
    }
  } catch (error) {
    console.error(`Error ensuring bucket exists:`, error)
    throw error
  }
}
