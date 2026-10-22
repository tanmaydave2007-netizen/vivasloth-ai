# VivaSloth AI

**A GTU-friendly study workspace for practicals, syllabi, screenshots, exam answers and viva practice.**

VivaSloth uses an open-weight model hosted through OpenRouter. No large model files or local AI server are needed. Internet access is needed for AI generation.

## Features

- Study dashboard with separate Home, Study Studio, Syllabus Map, Mock Viva, History and Settings screens.
- Practical preparation pack and code explanations.
- GTU-style answers for 2, 3, 4, 5 or 7 marks.
- Syllabus-to-study map and a suggested 7-day revision plan.
- Screenshot-to-notes for image files, depending on model image support.
- Multiple source files, browser-local history and interactive mock viva.

## Deploy to Render

This repository includes `render.yaml`, `Procfile` and `gunicorn` in `requirements.txt`.

1. Create a new **public GitHub repository** named `vivasloth-ai` (or another name).
2. Extract this project ZIP. Upload the **contents of this folder** to the repository root, so `app.py`, `requirements.txt`, `render.yaml`, `templates/` and `static/` appear at the top level. Do not upload your real `.env` file.
3. Open Render and choose **New + → Blueprint** if you want Render to read `render.yaml`, or **New + → Web Service** and connect the repository.
4. If using Web Service manually, set: **Runtime: Python 3**, **Build Command:** `pip install -r requirements.txt`, **Start Command:** `gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 app:app`.
5. In Render → your service → **Environment**, add `OPENROUTER_API_KEY` with your secret key and `VIVASLOTH_OPENROUTER_MODEL` with `qwen/qwen3.8-27b:free`. Never put the API key in GitHub, HTML, JavaScript, README or screenshots.
6. Deploy. Wait for **Live**, open the `onrender.com` URL, then test `/`, `/api/health`, one text practical, and one screenshot (if supported). Check Render **Logs** if a test fails.

## Important before sharing the public link

- Use a dedicated OpenRouter API key for the public demo and set a low key spending limit/guardrail where available. Keep the model environment variable set to the intended free model. Public visitors can trigger AI requests and use the key's provider quota.
- The UI is hosted on Render, but AI calls go to OpenRouter. Uploaded file content and screenshots used for AI are sent to OpenRouter and the model provider. Do not upload passwords, private records or sensitive student information.
- The app's History is stored in each visitor's browser, not as a shared server database. Render Free instances have an ephemeral filesystem, so don't add server-side file/database storage without choosing a persistent datastore.
- Render Free web services sleep after 15 minutes without traffic and may take about a minute to start on the next visit.
- This is a student demo, not a production service with user accounts or abuse protection.

## Run locally on Windows

1. Extract the project.
2. Run `SETUP_ONCE.bat`.
3. Put your OpenRouter key in `.env`.
4. Run `START_VIVASLOTH.bat`.
5. Open `http://127.0.0.1:5000`.

## Why open-weight AI?

The model weights are open-weight, while inference is hosted through OpenRouter rather than being run locally. This avoids a large model download and keeps local storage small, but it is **not an offline AI mode**. Verify study answers against the official current GTU syllabus and teacher's notes.
