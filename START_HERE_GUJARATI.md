# VivaSloth AI: સરળ ગુજરાતી માર્ગદર્શિકા

આ updated versionમાં sidebar dashboard અને નવા study tools છે. `Qwen GGUF` model અથવા `llama-server.exe` download કરવાની જરૂર નથી. AI માટે OpenRouterનું hosted open-weight model વપરાય છે, એટલે internet જોઈએ અને text તથા screenshot OpenRouterને મોકલાય છે.

## હાલનો app update કરવો હોય તો

1. VivaSlothની ચાલી રહેલી કાળી Command Prompt windowમાં `Ctrl + C` દબાવી app બંધ કર.
2. તારા હાલના project folderમાં `.env` અને `.venv` છે તે જાળવી રાખજે. `.env`માં API key છે, એટલે એને delete કે overwrite ન કરવી.
3. Update ZIPને **એ જ હાલના VivaSloth folderમાં** extract કર અને files replace કરવા પૂછે તો replace કરજે. `.env` અને `.venv` replace/કાઢવાની જરૂર નથી.
4. `START_VIVASLOTH.bat` ફરી ચલાવ. Dependenciesમાં કોઈ ફેરફાર નથી, એટલે સામાન્ય રીતે setup ફરી કરવાની જરૂર નથી.

## Features ક્યાં મળશે?

- **Home:** બધા toolsની cards અને recent activity.
- **Study Studio:** Prep Pack, Explain Code, Viva Questions, GTU Answer, Syllabus Map અને Screenshot Notes.
- **Syllabus Map:** GTU syllabus paste કર અથવા PDF આપ; unit-wise map અને 7-day revision plan મળશે.
- **GTU Answer:** question લખ, marksમાં 2/3/4/5/7 પસંદ કર. Source notes હોય તો સાથે add કર.
- **Screenshot Notes:** readable PNG/JPG/JPEG/WEBP upload કર. Image સમજવા માટે OpenRouter model vision support કરતો હોવો જોઈએ.
- **Mock Viva:** source upload/paste કર્યા પછી Start interactive mock viva દબાવ.
- **History:** generated results આ browserમાં locally સચવાય છે. Settingsમાંથી clear કરી શકાય.
- **Settings:** API key configured છે કે નહીં અને current model ID જોઈ શકાય; secret key દેખાતી નથી.

## Test કરવાની સરળ રીત

1. Study Studio ખોલ અને `Load a sample practical` દબાવ.
2. `Make my prep pack` દબાવ.
3. `GTU Answer` mode પસંદ કરીને 5 marksનો જવાબ test કર.
4. પછી કોઈ readable notesનો screenshot upload કરીને `Screenshot Notes` test કર.
5. કોઈ error આવે તો કાળી Command Prompt અને browserનો screenshot મોકલ, પરંતુ API key દેખાતી હોય એવો screenshot મોકલતો નહીં.

## Error આવે તો

- **Add API key / 401:** `.env`માં key સાચી છે કે નહીં ચેક કર.
- **402:** OpenRouter પર account/model availability તપાસ.
- **429:** free model busy છે અથવા limit પૂરી છે; થોડી વાર રાહ જો.
- **Image not understood:** screenshot સ્પષ્ટ રાખ; `.env`માં એવી model ID રાખજે જે image input support કરે.
- **Cannot reach OpenRouter:** internet ચેક કર.

## Privacy

આ app uploaded filesને disk પર save કરતું નથી, પરંતુ AI જવાબ માટે fileમાંથી કાઢેલું text અને screenshot OpenRouter તથા serving providerને મોકલે છે. Sensitive documents, passwords અથવા personal IDs upload ન કર. આ version offline નથી.
