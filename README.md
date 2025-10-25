# Video Analysis Application

The video analysis application extracts desired clips from a video. You can configure which clips to select.

## Example Application Screenshots

![](doc/ui-1.png)
![](doc/ui-2.png)
![](doc/ui-3.png)
![](doc/ui-4.png)

## Configuration

In the `video-analysis-config.json` file, you can configure the application title, guide text, AI prompts, and more.

The application uses the Google Vertex AI API. For more information, see these documents:

- https://cloud.google.com/vertex-ai
- https://cloud.google.com/vertex-ai/docs/authentication
- https://cloud.google.com/docs/authentication/application-default-credentials

Refer to `.env.example` and create your own `.env` file. This file is included in `.gitignore` to prevent secrets from being committed to GitHub.

## Commands to configure Vertex AI usage

Create first you your account to the Google services in the page https://cloud.google.com/vertex-ai.

Then in the console, login to the service

```
gcloud auth login
```

Create the Google Cloud Storage bucket:

```
gcloud storage buckets create gs://<your GCS bucket name> \
    --location=us-central1 \
    --uniform-bucket-level-access
```

Create the service account:

```
gcloud iam service-accounts create <your service account name> --display-name="<your service account display name>"
```

Create the Vertex AI access rights: 

```
gcloud projects add-iam-policy-binding <your project name> \
   --member="serviceAccount:<your service account name>@<your project name>.iam.gserviceaccount.com" \
   --role="roles/aiplatform.user"
```

Create the Google Cloud Storage bucket access rights:

```
gcloud storage buckets add-iam-policy-binding gs://<your GCS bucket name> \
    --member="serviceAccount:<your service account name>@<your project name>.iam.gserviceaccount.com" \
    --role="roles/storage.objectUser"
gcloud storage buckets add-iam-policy-binding gs://<your GCS bucket name> \
    --member="serviceAccount:<your service account name>@<your project name>.iam.gserviceaccount.com" \
    --role="roles/storage.legacyBucketReader"
```

Create your credentials json file:

```
gcloud iam service-accounts keys create ~/keys/<your credentials json file name>.json \
   --iam-account=<your service account name>@<your project name>.iam.gserviceaccount.com
```

## Commands to Run the Application

```
npm i
npm run dev
```

