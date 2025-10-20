"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileVideo, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface TimeRange {
  start: number
  end: number
  originalText: string
}

interface AnalysisResult {
  analysis: string
  timeRange: TimeRange | null
}

export default function VideoAnalysisApp() {
  const [file, setFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [clippedVideoUrl, setClippedVideoUrl] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isClipping, setIsClipping] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const appTitle = process.env.NEXT_PUBLIC_APP_TITLE || "Video Analysis AI"
  const guideText = process.env.NEXT_PUBLIC_GUIDE_TEXT || "Upload a video and our AI will analyze it for you"

  const clipVideo = async (timeRange: TimeRange) => {
    if (!file) return

    setIsClipping(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("video", file)
      formData.append("startTime", timeRange.start.toString())
      formData.append("endTime", timeRange.end.toString())

      const response = await fetch("/api/clip-video", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to clip video")
      }

      const clippedBlob = await response.blob()
      const url = URL.createObjectURL(clippedBlob)
      setClippedVideoUrl(url)
    } catch (err) {
      setError("Failed to clip video. Please try again.")
      console.error("Video clipping error:", err)
    } finally {
      setIsClipping(false)
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type.startsWith("video/")) {
      setFile(selectedFile)
      setVideoUrl(URL.createObjectURL(selectedFile))
      setClippedVideoUrl("")
      setError("")
      setAnalysisResult(null)
    } else {
      setError("Please select a valid video file")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const analyzeVideo = async () => {
    if (!file) return

    setIsAnalyzing(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("video", file)

      const response = await fetch("/api/analyze-video", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to analyze video")
      }

      const result = await response.json()
      setAnalysisResult(result)

      // If AI found a time range, automatically clip the video
      if (result.timeRange) {
        await clipVideo(result.timeRange)
      }
    } catch (err) {
      setError("Failed to analyze video. Please try again.")
      console.error("Analysis error:", err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetUpload = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
    if (clippedVideoUrl) {
      URL.revokeObjectURL(clippedVideoUrl)
    }
    setFile(null)
    setVideoUrl("")
    setClippedVideoUrl("")
    setAnalysisResult(null)
    setError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">{appTitle}</h1>
          <p className="text-lg text-muted-foreground text-pretty">{guideText}</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileVideo className="h-5 w-5" />
              Upload Video
            </CardTitle>
            <CardDescription>Select or drag and drop a video file to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            {!file ? (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">Drop your video here or click to browse</p>
                <p className="text-sm text-muted-foreground">Supports MP4, MOV, AVI and other video formats</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileVideo className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={resetUpload}>
                    Remove
                  </Button>
                </div>

                <Button onClick={analyzeVideo} disabled={isAnalyzing || isClipping} className="w-full" size="lg">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Video...
                    </>
                  ) : isClipping ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Clipping Video...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Analyze Video
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Video Player and Analysis Results */}
        {analysisResult && (
          <div className="space-y-6">
            {/* Video Player */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileVideo className="h-5 w-5 text-primary" />
                  {clippedVideoUrl ? "AI Extracted Scene" : isClipping ? "Processing Video..." : "Video Player"}
                </CardTitle>
                <CardDescription>
                  {clippedVideoUrl
                    ? `Showing only the AI-found scene: ${analysisResult.timeRange?.originalText || ""}`
                    : isClipping
                    ? `Clipping scene at ${analysisResult.timeRange?.originalText || ""}...`
                    : analysisResult.timeRange
                    ? `AI found the scene at ${analysisResult.timeRange.originalText}`
                    : "Original uploaded video"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isClipping ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <Loader2 className="h-12 w-12 mb-4 animate-spin text-primary" />
                    <p className="text-lg font-medium mb-2">Clipping video...</p>
                    <p className="text-sm text-muted-foreground">Extracting AI-found scene</p>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      src={clippedVideoUrl || videoUrl}
                      controls
                      className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>

                    {analysisResult.timeRange && (
                      <div className="mt-4 text-center">
                        <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {clippedVideoUrl
                            ? `AI Scene Extracted: ${analysisResult.timeRange.originalText}`
                            : `AI Scene: ${analysisResult.timeRange.originalText}`
                          }
                        </div>
                        {clippedVideoUrl && (
                          <p className="text-sm text-muted-foreground mt-2">
                            This video contains only the scene identified by AI
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Analysis Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Analysis Results
                </CardTitle>
                <CardDescription>AI analysis of your video content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-6 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">{analysisResult.analysis}</pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
