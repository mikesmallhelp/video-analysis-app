# Video Analysis Application

This application uses AI to analyze videos and extract relevant clips based on configurable criteria. The system intelligently identifies and extracts video segments that match your specified requirements.

## Example Application Screenshots

![](doc/ui-1.png)
![](doc/ui-2.png)
![](doc/ui-3.png)
![](doc/ui-4.png)

## Configuration

The application supports multiple languages through internationalization (i18n). UI texts and AI prompts are configured in language files located in the `messages/` directory.

This application uses the Google Vertex AI API. For detailed information, refer to the following documentation:

- https://cloud.google.com/vertex-ai
- https://cloud.google.com/vertex-ai/docs/authentication
- https://cloud.google.com/docs/authentication/application-default-credentials

Create your own `.env` file based on the `.env.example` template.

## Setting Up Vertex AI

First, create your Google Cloud account at https://cloud.google.com/vertex-ai.

Next, authenticate with the Google Cloud CLI:

```
gcloud auth login
```

Create a Google Cloud Storage bucket:

```
gcloud storage buckets create gs://<your GCS bucket name> \
    --location=us-central1 \
    --uniform-bucket-level-access
```

Create a service account for the application:

```
gcloud iam service-accounts create <your service account name> --display-name="<your service account display name>"
```

Grant Vertex AI permissions to the service account: 

```
gcloud projects add-iam-policy-binding <your project name> \
   --member="serviceAccount:<your service account name>@<your project name>.iam.gserviceaccount.com" \
   --role="roles/aiplatform.user"
```

Grant Cloud Storage permissions to the service account:

```
gcloud storage buckets add-iam-policy-binding gs://<your GCS bucket name> \
    --member="serviceAccount:<your service account name>@<your project name>.iam.gserviceaccount.com" \
    --role="roles/storage.objectUser"
gcloud storage buckets add-iam-policy-binding gs://<your GCS bucket name> \
    --member="serviceAccount:<your service account name>@<your project name>.iam.gserviceaccount.com" \
    --role="roles/storage.legacyBucketReader"
```

Generate a service account key file:

```
gcloud iam service-accounts keys create ~/keys/<your credentials json file name>.json \
   --iam-account=<your service account name>@<your project name>.iam.gserviceaccount.com
```

Note: The service account key files are only recommended for development. According to the page https://cloud.google.com/docs/authentication/application-default-credentials: "Service account keys create a security risk and are not recommended".

## Running the Application

Install dependencies and start the development server:

```
npm i
npm run dev
```

