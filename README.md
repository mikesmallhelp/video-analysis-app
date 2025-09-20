# Video Analysis App

## Example Application Screenshots

![](doc/ui-1.png)
![](doc/ui-2.png)
![](doc/ui-3.png)
![](doc/ui-4.png)

## Configuration

You can configure the application title, guide text, and AI prompt to analyze different aspects of videos.

Refer to `.env.example` and create your own `.env` file. This file is included in `.gitignore` to prevent secrets from being committed to GitHub.

Create a Google Cloud account if you don't have one already, and configure your Google Vertex AI environment variables in the `.env` file.

You can use these commands to get your environment variables:

```
gcloud auth login
```

```
gcloud config set project <your project id>
```

```
gcloud iam service-accounts create <your service account's name>
```

```
gcloud projects add-iam-policy-binding <your project id> --member="serviceAccount:<your service account's email>" --role="roles/aiplatform.user"
```

```
gcloud iam service-accounts keys create ~/keys/<your filename>.json --iam-account=<your service account's email>
```
Extract the private key and other values from the generated JSON file.

## Commands to Run the Application

```
npm i
npm run dev
```

## Deploy to Vercel

This project has been tested to run on the Vercel platform. Note that the hobby plan has a short timeout (approximately 10 seconds). Testing shows that only 1 second long videos can be analyzed successfully on Vercel, while locally the application handles at least 15 seconds long videos without issues.

Log in to the Vercel platform at: https://vercel.com/login
