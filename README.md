# Smart Fasal Kisan Alert

Smart Fasal Kisan Alert is a voice and SMS based agricultural intelligence prototype for small and marginal farmers. It recommends crops using soil, rainfall, groundwater and satellite context, sends dry spell and irrigation alerts, and routes crop health cases to Rythu Seva Kendra experts for follow up.

## Problem statement fit

This project is built for the Kisan Alert problem statement from Build with AI: Code for Communities by Google Cloud.

Core modules:

1. Smart crop recommendation using soil, rainfall, groundwater and satellite context.
2. Real time dry spell, irrigation and fertilizer advisories.
3. Crop health logging through photo, symptom text or voice.
4. Rythu Seva Kendra expert dashboard for follow up.
5. MP or district dashboard for village level risk visibility.
6. Multilingual voice and SMS first access for low literacy and low connectivity farmers.

## Prototype status

This repository currently contains a static Firebase Hosting prototype that demonstrates the end to end user flow with simulated AI outputs. The next build connects the same screens to Google Cloud services.

## Planned Google Cloud stack

- Gemini API or Vertex AI for structured advisory generation and crop health triage
- Cloud Speech to Text for farmer voice intake
- Cloud Text to Speech for spoken advisories
- Translation API for Indic language support
- Google Earth Engine for satellite and geospatial farm context
- Firebase Auth for user login
- Firestore for farmer profiles, readings, alerts and expert cases
- Cloud Storage for crop images and documents
- Cloud Functions or Cloud Run for backend APIs and AI orchestration
- BigQuery for district analytics and dashboard reporting
- Firebase Cloud Messaging, SMS gateway or WhatsApp Business API for alerts

## Deploy to Firebase Hosting

1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

2. Login

```bash
firebase login
```

3. Create a Firebase project in the Firebase console, or use an existing project.

4. From this repository folder, initialize hosting if needed

```bash
firebase init hosting
```

Recommended answers:

- Use existing project
- Public directory: public
- Configure as single page app: Yes
- Overwrite index.html: No

5. Deploy

```bash
firebase deploy --only hosting
```

The deployment will produce a URL like:

```text
https://your-project-id.web.app
```

## Local preview

Open `public/index.html` directly in a browser, or run a simple local server:

```bash
python3 -m http.server 5173 --directory public
```

Then open:

```text
http://localhost:5173
```

## Submission pitch

Smart Fasal Kisan Alert is a voice and SMS agricultural advisory platform that helps small farmers choose suitable crops, receive dry spell and irrigation alerts, get fertilizer guidance, and report crop health problems by photo or voice. AI triages cases and routes serious issues to Rythu Seva Kendra experts, while MP and district teams see village level risk dashboards for faster intervention.
