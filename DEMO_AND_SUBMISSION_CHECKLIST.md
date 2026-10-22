# VivaSloth AI: Demo and submission checklist

Use this before publishing the DEV post. Do not claim that a feature works until you have tested it on your laptop.

## API smoke test

- [ ] Run `SETUP_ONCE.bat` successfully.
- [ ] Copy `.env.example` to `.env` and add your OpenRouter API key. Do not show the key in the recording.
- [ ] Start `START_VIVASLOTH.bat` and check that the header says `OpenRouter key set`.
- [ ] Click **Try with a sample practical** and generate a prep pack.
- [ ] Check that the output has an explanation, questions, and a revision checklist.
- [ ] Try **Explain my code** and **Viva questions**.
- [ ] Start **interactive mock viva**, answer a question, and check that feedback and the next question appear.
- [ ] Upload a small text-based PDF or `.py`/`.c` file and verify it is parsed correctly.
- [ ] If the free model returns a 429 error, wait and retry or switch to another available free open-weight model ID.
- [ ] Remember: AI generation requires internet. This version is not offline-capable.
- [ ] If any feature fails, fix it or remove the claim from the public post.

## Suggested 45-second screen recording

Keep the capture focused on the app and use readable on-screen captions. Voice-over is optional.

1. **0-5 sec:** Show the new sidebar dashboard and caption: “VivaSloth AI | GTU study tools without model downloads”.
2. **5-13 sec:** Load a sample practical and generate a prep pack.
3. **13-21 sec:** Show GTU marks-wise answer or syllabus map.
4. **21-30 sec:** Upload a readable screenshot and show Screenshot to Notes.
5. **30-40 sec:** Run one mock-viva answer and show feedback.
6. **40-45 sec:** End caption: “Open-weight model through OpenRouter. No local model download. Internet required.”

Record real app behaviour. Do not edit in fabricated outputs or claim a time-saving number you have not measured. Do not show your API key.

## GitHub publish steps

1. Create a **new public repository** named `vivasloth-ai` under your GitHub account. Do not push this as a change to the previous challenge repository.
2. Extract the ZIP, open a terminal inside the `vivasloth_ai` folder, and run:

   ```powershell
   git init
   git add .
   git status
   git commit -m "Build VivaSloth open-weight practical prep assistant"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/vivasloth-ai.git
   git push -u origin main
   ```

3. Before committing, use `git status` and confirm that `.env`, API keys, and private files are not staged. `.env` is in `.gitignore`, but always verify.
4. Open the public repository URL in a signed-out/private browser window to confirm it is accessible.

## DEV submission

Use the official Week 3 submission template and tag `hf26challenge`. The starter draft is `DEVTO_SUBMISSION_DRAFT.md`.

Before publishing, replace placeholders with your public GitHub repository link, actual demo video link, and a real, measured effort-saving example if you have one. Explain clearly that the model is hosted by OpenRouter, prompts are sent to OpenRouter/provider, and internet is required.

Verify the official challenge page for exact terms and deadlines before publishing.
