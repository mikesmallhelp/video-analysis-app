# Video Analysis Application

The video analysis application extracts desired clips from a video. You can configure which clips to select.

## Example Application Screenshots

![](doc/ui-1.png)
![](doc/ui-2.png)
![](doc/ui-3.png)
![](doc/ui-4.png)

## Configuration

In the video-analysis-config.json file, you can configure the application title, guide text, AI prompts, and more.

The application uses the Google Vertex AI API. For more information, see these documents:

- https://cloud.google.com/vertex-ai
- https://cloud.google.com/vertex-ai/docs/authentication
- https://cloud.google.com/docs/authentication/application-default-credentials

Refer to `.env.example` and create your own `.env` file. This file is included in `.gitignore` to prevent secrets from being committed to GitHub.

## Commands to Run the Application

```
npm i
npm run dev
```

