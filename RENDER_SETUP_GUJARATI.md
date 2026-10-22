# VivaSloth AI: Render deployment guide (ગુજરાતીમાં)

## 1. GitHubમાં project મૂકો
1. `VivaSloth_Render_Deploy.zip` download કરીને extract કરો.
2. Extract થયેલા folderની અંદરની files select કરો. એટલે `app.py`, `requirements.txt`, `render.yaml`, `templates`, `static` સીધા દેખાવા જોઈએ.
3. GitHub પર નવું public repository `vivasloth-ai` બનાવો.
4. આ files repositoryના rootમાં upload કરીને commit કરો.
5. **તમારી `.env` ફાઇલ અથવા API key upload ન કરશો.** `.gitignore`માં `.env` પહેલેથી ignore છે, છતાં file manually upload ન કરવી.

## 2. Render પર deploy કરો

### સરળ રીત: Blueprint
1. <https://render.com> ખોલીને GitHub વડે login કરો.
2. **New + → Blueprint** પસંદ કરો.
3. `vivasloth-ai` repository connect કરો.
4. Render `render.yaml` વાંચશે. Secret value માંગે ત્યારે `OPENROUTER_API_KEY`માં તારી API key મૂકો.
5. Apply/Create કરો અને deploy complete થઈ `Live` થાય ત્યાં સુધી Logs જુઓ.

### જો Blueprint option વાપરવો ન હોય
Renderમાં **New + → Web Service** પસંદ કરો અને repository connect કરો. આ settings મૂકો:
- **Runtime:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 app:app`

પછી **Environment** tabમાં આ values ઉમેરો:
- `OPENROUTER_API_KEY` = તમારી OpenRouter secret key
- `VIVASLOTH_OPENROUTER_MODEL` = `qwen/qwen3.8-27b:free`

Save કરીને deploy થવા દો.

## 3. Live website test કરો
1. Renderમાં મળેલું `https://...onrender.com` URL ખોલો.
2. પ્રથમ load વખતે થોડો સમય લાગે તો રાહ જુઓ, free service sleep થઈ હોઈ શકે.
3. Browserમાં `https://તમારી-site.onrender.com/api/health` ખોલો. `connected: true` દેખાય તો key configure છે. આનો અર્થ model API test પૂર્ણ થયો એવો નથી.
4. Websiteમાં Study Studio ખોલીને sample practicalથી Prep Pack બનાવો. પછી Mock Viva test કરો.
5. Screenshot upload test કરો. Image understanding selected model પર આધારિત છે.
6. Error આવે તો Render → service → **Logs**માં error જુઓ. Secret key ક્યારેય screenshotમાં ન દેખાડવી.

## જરૂરી સાવચેતીઓ
- `.env` GitHubમાં ક્યારેય ન મૂકવી. API key Renderના Environment tabમાં જ રાખવી.
- Public websiteનો કોઈપણ visitor AI request કરી શકે છે. Demo માટે અલગ OpenRouter key બનાવવી અને શક્ય હોય તો low spending limit/guardrail સેટ કરવું. Free model પર પણ rate limits હોય છે.
- AI માટેનો text અને screenshots OpenRouter/model providerને મોકલાય છે. Private કે sensitive data upload ન કરવું.
- Render Free service 15 મિનિટ traffic ન મળે તો sleep થાય છે. પછીનો પહેલો visit જાગવા માટે આશરે એક મિનિટ લઈ શકે. Local/server filesystem data restarts/redeploys પછી રહેવાની ખાતરી નથી.
- History browser-local છે. બીજા device પર એ જ history દેખાશે નહીં.
- આ online demo છે, offline AI નથી.

## Official links
- Render Flask deploy guide: <https://render.com/docs/deploy-flask>
- Render environment variables: <https://render.com/docs/configure-environment-variables>
- Render free service limitations: <https://render.com/docs/free>
- OpenRouter API keys: <https://openrouter.ai/settings/keys>
