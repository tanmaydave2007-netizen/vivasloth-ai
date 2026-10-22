from __future__ import annotations

import base64
import io
import mimetypes
import os
import re
from typing import Any

import requests
from flask import Flask, jsonify, render_template, request, send_from_directory
from pypdf import PdfReader

APP_TITLE = "VivaSloth AI"
APP_DIR = os.path.dirname(os.path.abspath(__file__))


def load_dotenv_file() -> None:
    """Load simple KEY=value pairs from a local .env file without extra dependencies."""
    env_path = os.path.join(APP_DIR, ".env")
    if not os.path.isfile(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.lower().startswith("export "):
                    line = line[7:].strip()
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        return


load_dotenv_file()
OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
OPENROUTER_MODEL = os.environ.get("VIVASLOTH_OPENROUTER_MODEL", "qwen/qwen3.8-27b:free").strip()
MAX_INPUT_CHARS = 16000
MAX_TOTAL_UPLOAD_BYTES = 12 * 1024 * 1024
ALLOWED_TEXT_EXTENSIONS = {".pdf", ".txt", ".md", ".py", ".c", ".cpp", ".h", ".java", ".js", ".json", ".html", ".css"}
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_TOTAL_UPLOAD_BYTES

SYSTEM_PROMPT = """You are VivaSloth, a careful study assistant for GTU and other engineering college students.
Use simple, clear English suitable for a student preparing for practicals, vivas and university exams.
Ground your answer in the student's material when provided. If a syllabus, image or source is unclear, say so instead of inventing details.
Use GTU-friendly exam structure when requested: a short definition, key points, steps/diagram description or example as appropriate to the selected marks.
Do not claim to provide an official GTU answer key. Do not invent official weightage, paper predictions, exact marking schemes or guaranteed exam questions.
Use readable Markdown headings, tables only when helpful, and short complete sentences. Encourage verifying important details against the official syllabus, practical manual or teacher's notes."""


def _read_uploaded_file(uploaded_file: Any) -> tuple[str, str | None, dict[str, str] | None]:
    """Return extracted text, optional file label, and optional image data for vision requests."""
    filename = (uploaded_file.filename or "Uploaded file").strip()
    ext = os.path.splitext(filename)[1].lower()
    raw = uploaded_file.read()
    if not raw:
        raise ValueError(f"{filename} is empty. Choose another file.")

    if ext in ALLOWED_IMAGE_EXTENSIONS:
        mime = mimetypes.guess_type(filename)[0] or "image/png"
        image = {"name": filename, "mime_type": mime, "base64": base64.b64encode(raw).decode("ascii")}
        return "", filename, image

    if ext not in ALLOWED_TEXT_EXTENSIONS:
        raise ValueError(f"{filename}: unsupported file type. Use PDF, TXT, MD, code files, PNG, JPG or WEBP.")

    if ext == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(raw))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n\n".join(pages).strip()
        except Exception as exc:
            raise ValueError(f"I couldn't read {filename}. Try a text-based PDF or paste the key text.") from exc
        if not text:
            raise ValueError(f"{filename} has no selectable text. If it is a scanned PDF, upload the page screenshots as PNG/JPG instead.")
        return text, filename, None

    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding).strip(), filename, None
        except UnicodeDecodeError:
            continue
    raise ValueError(f"I couldn't read {filename}. Save it as UTF-8 and try again.")


def collect_source(allow_question_only: bool = False) -> tuple[str, str, str, list[dict[str, str]]]:
    """Collect pasted notes and multiple source files; images are sent through a vision-capable model."""
    pasted_text = (request.form.get("source_text") or "").strip()
    subject = (request.form.get("subject") or "Computer Engineering").strip()[:100]
    practical_title = (request.form.get("practical_title") or "My study topic").strip()[:160]
    uploads = [f for f in request.files.getlist("documents") if f and f.filename]
    if not uploads:
        old_upload = request.files.get("document")
        if old_upload and old_upload.filename:
            uploads = [old_upload]

    total_bytes = 0
    text_parts: list[str] = [pasted_text] if pasted_text else []
    images: list[dict[str, str]] = []
    if len(uploads) > 5:
        raise ValueError("Please add no more than 5 files at a time.")
    for upload in uploads:
        # Read through the helper. Upload size is also capped by Flask at the request level.
        text, label, image = _read_uploaded_file(upload)
        total_bytes += len(base64.b64decode(image["base64"])) if image else 0
        if image:
            images.append(image)
            text_parts.append(f"[Image provided: {label}. Inspect the image for readable syllabus, question, code or practical details.]")
        elif text.strip():
            text_parts.append(f"[Content from {label}]\n{text.strip()}")

    if len(images) > 4:
        raise ValueError("Please upload up to 4 screenshots/images at a time.")
    source = "\n\n".join(part for part in text_parts if part).strip()
    question = (request.form.get("exam_question") or "").strip()
    if not source and allow_question_only and question:
        source = "No reference document was supplied. Answer the student's question using general knowledge, and flag any syllabus-specific details that should be checked."
    if not source:
        raise ValueError("Add your syllabus/practical by pasting text, uploading PDF/code, or adding a screenshot.")
    if len(source) > MAX_INPUT_CHARS:
        source = source[:MAX_INPUT_CHARS] + "\n\n[Source shortened to fit request size.]"
    return source, subject, practical_title, images


def _content_with_images(prompt: str, images: list[dict[str, str]]) -> str | list[dict[str, Any]]:
    if not images:
        return prompt
    parts: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for image in images:
        parts.append({
            "type": "image_url",
            "image_url": {"url": f"data:{image['mime_type']};base64,{image['base64']}"},
        })
    return parts


def call_openrouter_model(messages: list[dict[str, Any]], max_tokens: int = 1500, temperature: float = 0.25) -> str:
    """Call the configured OpenRouter model. No large model is downloaded to the laptop."""
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OpenRouter API key is missing. Add OPENROUTER_API_KEY to the .env file beside app.py. Never share your key publicly.")

    endpoint = f"{OPENROUTER_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": APP_TITLE,
    }
    payload = {"model": OPENROUTER_MODEL, "messages": messages, "temperature": temperature, "max_tokens": max_tokens, "stream": False}
    try:
        response = requests.post(endpoint, headers=headers, json=payload, timeout=(10, 150))
    except requests.exceptions.ConnectionError as exc:
        raise RuntimeError("Cannot reach OpenRouter. Check your internet connection and try again.") from exc
    except requests.exceptions.Timeout as exc:
        raise RuntimeError("The model took too long to respond. Try a smaller file or try again later.") from exc
    except requests.RequestException as exc:
        raise RuntimeError("Could not contact OpenRouter. Check your internet connection and try again.") from exc

    if response.status_code in (401, 403):
        raise RuntimeError("OpenRouter rejected the API key. Check OPENROUTER_API_KEY in your .env file.")
    if response.status_code == 402:
        raise RuntimeError("OpenRouter reports that this request cannot run with the available account credits. Check that the selected model is free and available.")
    if response.status_code == 429:
        raise RuntimeError("The free model is busy or its rate limit was reached. Wait and retry, or select another available free model in .env.")
    if response.status_code >= 400:
        detail = response.text[:350].replace("\n", " ")
        raise RuntimeError(f"OpenRouter returned an error ({response.status_code}). {detail}")
    try:
        response_data = response.json()
        output = response_data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("OpenRouter returned an unexpected response. Try again in a moment.") from exc
    if isinstance(output, list):
        output = "\n".join(str(part.get("text", "")) for part in output if isinstance(part, dict))
    output = re.sub(r"<think>.*?</think>", "", str(output), flags=re.DOTALL | re.IGNORECASE).strip()
    if not output:
        raise RuntimeError("The model returned an empty answer. Try again with a shorter input.")
    return output


def build_pack_prompt(source: str, subject: str, practical_title: str, mode: str, marks: str = "5", question: str = "", images: list[dict[str, str]] | None = None) -> list[dict[str, Any]]:
    images = images or []
    if mode == "explain":
        task = """Explain this practical/code/screenshot in simple English. Include: what it shows, aim or purpose, step-by-step explanation, key lines/concepts, common beginner mistakes, and a quick recap. If a code screenshot is blurry, mark uncertain text rather than guessing."""
    elif mode == "viva":
        task = """Create 10 useful viva questions with short, accurate answers based on the supplied material. Start with basics and move to understanding/application. Flag answers that need confirmation because the source does not contain enough detail."""
    elif mode == "syllabus":
        task = """Create a GTU-oriented syllabus map from the supplied syllabus. Organize the actual units/modules and topics as written, explain each in simple language, identify prerequisite topics, make a practical study sequence, and provide a realistic 7-day revision plan. Mark topics as 'source lists this' or 'study suggestion' where needed. Do NOT invent official marks weightage, paper predictions, or guaranteed questions. End with a checklist of details the student should confirm against the current official GTU syllabus."""
    elif mode == "gtu":
        task = f"""Write an exam-ready GTU-style answer for a {marks}-mark question. Student's question: {question or practical_title}. Use simple, correct English and an appropriate length for {marks} marks. Use a definition first, then a well-structured explanation and numbered points/steps. Add a small example or ASCII diagram only if it helps. Do not claim this is an official answer key. If no exact question was supplied, derive one only from the given material and state it clearly."""
    elif mode == "image":
        task = """Read the uploaded screenshot/image carefully. Convert visible notes, a syllabus section, a question, a diagram, or code into structured study notes. Preserve key terms and formula/code as accurately as possible; use [unclear] when characters cannot be read. Explain any diagram in words. Do not guess content hidden or blurred in the image."""
    else:
        task = """Create a student-friendly practical preparation pack with these sections: 1) practical in simple words, 2) aim, 3) key concept/theory, 4) algorithm or steps, 5) code/diagram walkthrough if present, 6) eight viva questions with short answers, 7) common mistakes, and 8) five-minute revision checklist. Keep it concise and beginner-friendly."""

    question_text = f"\nExtra exam question requested by student: {question}" if question else ""
    user_prompt = f"""Subject: {subject}
Topic / practical: {practical_title}
Selected output mode: {mode}
{question_text}

Task:
{task}

Student's provided material (text and/or images attached below):
--- BEGIN MATERIAL ---
{source}
--- END MATERIAL ---

Return the answer in simple English with useful headings and short complete sentences. If information is missing, explicitly flag it instead of inventing it."""
    user_content = _content_with_images(user_prompt, images)
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_content}]


@app.get("/")
def index():
    return render_template("index.html", title=APP_TITLE)


@app.get("/api/sample")
def sample_practical():
    return send_from_directory(os.path.join(APP_DIR, "sample_data"), "gtu_sample_practical.txt", mimetype="text/plain")


@app.get("/api/health")
def health():
    configured = bool(os.environ.get("OPENROUTER_API_KEY", "").strip())
    return jsonify({"connected": configured, "configured": configured, "mode": "openrouter", "model": OPENROUTER_MODEL, "message": "OpenRouter key configured" if configured else "API key missing"})


@app.post("/api/generate")
def generate():
    mode = request.form.get("mode", "pack")
    allowed_modes = {"pack", "explain", "viva", "syllabus", "gtu", "image"}
    if mode not in allowed_modes:
        mode = "pack"
    try:
        source, subject, practical_title, images = collect_source(allow_question_only=(mode == "gtu"))
        marks = request.form.get("marks", "5")
        if marks not in {"2", "3", "4", "5", "7"}:
            marks = "5"
        question = (request.form.get("exam_question") or "").strip()[:1000]
        result = call_openrouter_model(build_pack_prompt(source, subject, practical_title, mode, marks, question, images))
        return jsonify({"ok": True, "result": result, "mode": mode, "source_chars": len(source), "model": OPENROUTER_MODEL})
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503


@app.post("/api/mock/start")
def start_mock_viva():
    try:
        source, subject, practical_title, images = collect_source()
        prompt = f"""Subject: {subject}
Topic: {practical_title}
Reference text:
{source}

Use the attached screenshot(s) as reference material if included. Start a gentle GTU-style practical viva. Output exactly these two sections:
REFERENCE SUMMARY:
A compact summary (5-12 lines) of the source material, including important readable screenshot content if present.
FIRST QUESTION:
Ask exactly one short opening viva question based only on this source. Do not include its answer or hints. Use [unclear] for unreadable screenshot text."""
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + " You conduct a one-question-at-a-time engineering practical viva."},
            {"role": "user", "content": _content_with_images(prompt, images)},
        ]
        model_output = call_openrouter_model(messages, max_tokens=500, temperature=0.35)
        match = re.search(r"FIRST QUESTION\s*:\s*(.+)$", model_output, flags=re.IGNORECASE | re.DOTALL)
        summary_match = re.search(r"REFERENCE SUMMARY\s*:\s*(.+?)\s*FIRST QUESTION\s*:", model_output, flags=re.IGNORECASE | re.DOTALL)
        question = match.group(1).strip() if match else model_output.strip()
        source_summary = summary_match.group(1).strip() if summary_match else source
        return jsonify({"ok": True, "question": question, "source": source_summary[:MAX_INPUT_CHARS], "subject": subject, "practical_title": practical_title, "source_chars": len(source)})
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503


@app.post("/api/mock/answer")
def answer_mock_viva():
    data = request.get_json(silent=True) or {}
    source = str(data.get("source", "")).strip()[:MAX_INPUT_CHARS]
    subject = str(data.get("subject", "Computer Engineering")).strip()[:100]
    practical_title = str(data.get("practical_title", "My study topic")).strip()[:160]
    question = str(data.get("question", "")).strip()[:1000]
    answer = str(data.get("answer", "")).strip()[:3000]
    history = data.get("history", [])
    if not source or not question or not answer:
        return jsonify({"ok": False, "error": "Add the reference material and write an answer before submitting."}), 400
    if not isinstance(history, list):
        history = []
    history_text = "\n".join(f"Q: {str(item.get('question', ''))[:500]}\nA: {str(item.get('answer', ''))[:1000]}" for item in history[-3:] if isinstance(item, dict))
    prompt = f"""Subject: {subject}
Topic: {practical_title}
Reference material summary:
{source}

Previous Q&A (if any):
{history_text or '(first question)'}

Current question: {question}
Student's answer: {answer}

Give kind but honest feedback with exactly these headings:
## Feedback
(2-4 sentences on what is correct and what is missing)
## Score
(X/5, based on correctness and clarity)
## Better answer
(A concise answer the student could give in a real viva)
## NEXT QUESTION
(Ask exactly one new question grounded in this material, without its answer.)
Do not reward unsupported claims. If the source does not support a detail, say so."""
    try:
        result = call_openrouter_model([
            {"role": "system", "content": SYSTEM_PROMPT + " You are a supportive viva evaluator."},
            {"role": "user", "content": prompt},
        ], max_tokens=700, temperature=0.25)
        return jsonify({"ok": True, "result": result})
    except RuntimeError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"ok": False, "error": "The selected files are too large (12 MB total limit). Use fewer or smaller files."}), 413


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
