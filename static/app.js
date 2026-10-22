const $ = (id) => document.getElementById(id);
const HISTORY_KEY = 'vivasloth.studyHistory.v2';
const modes = {
  pack: { title: 'Practical Prep Pack', description: 'Create a clear, exam-friendly study pack from your material.', button: 'Make my prep pack', resultTitle: 'Your practical prep pack', icon: '✦', includes: ['Aim and concept in simple words', 'Algorithm and code walkthrough', 'Viva questions with answers', 'Common errors and quick revision'] },
  explain: { title: 'Explain My Code', description: 'Understand the logic, important lines and common beginner mistakes.', button: 'Explain my code', resultTitle: 'Code explanation', icon: '⌘', includes: ['Step-by-step code explanation', 'Key variables and logic', 'Common beginner mistakes', 'Quick recap to remember'] },
  viva: { title: 'Viva Question Set', description: 'Create concise questions and answers from the material you give.', button: 'Make viva questions', resultTitle: 'Your viva question set', icon: '◉', includes: ['10 source-based viva questions', 'Short, understandable answers', 'Basic to application level', 'Missing information flagged'] },
  gtu: { title: 'GTU Marks-wise Answer', description: 'Practise a structured exam answer for the selected marks.', button: 'Generate GTU answer', resultTitle: 'Your GTU-style answer', icon: '✎', includes: ['Selected 2 / 3 / 4 / 5 / 7 marks', 'Simple English and clear headings', 'Numbered points and examples if useful', 'No invented official weightage'] },
  syllabus: { title: 'Syllabus to Study Map', description: 'Turn syllabus units into a study sequence and a manageable revision plan.', button: 'Build syllabus map', resultTitle: 'Your syllabus study map', icon: '▤', includes: ['Unit-by-unit topic map', 'Prerequisites and study order', '7-day revision plan', 'Syllabus-grounded checklist'] },
  image: { title: 'Screenshot to Notes', description: 'Read an image of notes, a question, a diagram or code and structure it.', button: 'Read screenshot / make notes', resultTitle: 'Your screenshot notes', icon: '▧', includes: ['Read visible text or code', 'Structure it into readable notes', 'Explain diagrams in words', 'Flag blurry or uncertain areas'] }
};
let selectedMode = 'pack';
let latestResult = '';
let latestResultMode = 'pack';
let mockSource = '';
let mockHistory = [];
let currentQuestion = '';
let questionCount = 1;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function inlineFormat(value) {
  return value.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function renderMarkdown(text) {
  const lines = escapeHtml(text || '').replace(/\r/g, '').split('\n');
  let out = '', listType = '', inCode = false, codeLines = [];
  const closeList = () => { if (listType) { out += `</${listType}>`; listType = ''; } };
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^```/.test(line)) { closeList(); if (!inCode) { inCode = true; codeLines = []; } else { out += `<pre class="code-block"><code>${codeLines.join('\n')}</code></pre>`; inCode = false; } continue; }
    if (inCode) { codeLines.push(line); continue; }
    if (!line.trim()) { closeList(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { closeList(); const level = Math.min(4, heading[1].length + 1); out += `<h${level}>${inlineFormat(heading[2])}</h${level}>`; continue; }
    const unordered = line.match(/^\s*[-*]\s+(.+)$/), ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) { const wanted = unordered ? 'ul' : 'ol'; if (listType !== wanted) { closeList(); listType = wanted; out += `<${listType}>`; } out += `<li>${inlineFormat((unordered || ordered)[1])}</li>`; continue; }
    closeList(); out += `<p>${inlineFormat(line)}</p>`;
  }
  closeList(); if (inCode) out += `<pre class="code-block"><code>${codeLines.join('\n')}</code></pre>`;
  return out;
}

function setMode(mode) {
  if (!modes[mode]) mode = 'pack';
  selectedMode = mode;
  document.querySelectorAll('.mode-chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.mode === mode));
  const config = modes[mode];
  $('modeIcon').textContent = config.icon;
  $('modeTitle').textContent = config.title;
  $('modeDescription').textContent = config.description;
  $('generateLabel').textContent = config.button;
  $('outputIncludes').innerHTML = config.includes.map((item) => `<div><span>✓</span>${escapeHtml(item)}</div>`).join('');
  $('resultTitle').textContent = config.resultTitle;
  $('marksWrap').classList.toggle('hidden', mode !== 'gtu');
  $('examQuestionWrap').classList.toggle('hidden', mode !== 'gtu');
  if (mode === 'syllabus') {
    $('studyPageTitle').textContent = 'Syllabus Map';
    $('studyPageDescription').textContent = 'Upload or paste your syllabus and build a source-grounded unit map and 7-day study plan.';
  } else if (mode === 'gtu') {
    $('studyPageTitle').textContent = 'GTU Marks-wise Answer';
    $('studyPageDescription').textContent = 'Ask a question, select marks, and practise a structured answer in simple English.';
  } else if (mode === 'image') {
    $('studyPageTitle').textContent = 'Screenshot to Notes';
    $('studyPageDescription').textContent = 'Upload screenshots of notes, diagrams, question papers or code. Keep text readable.';
  } else {
    $('studyPageTitle').textContent = 'Study Studio';
    $('studyPageDescription').textContent = 'Add notes, code, a syllabus or a screenshot. Choose what you want to make.';
  }
  hideResultAndErrors();
}
document.querySelectorAll('.mode-chip').forEach((chip) => chip.addEventListener('click', () => setMode(chip.dataset.mode)));

const pages = { home: 'homeView', study: 'studyView', history: 'historyView', settings: 'settingsView' };
function showPage(page, options = {}) {
  const viewPage = (page === 'syllabus' || page === 'mock') ? 'study' : page;
  const viewId = pages[viewPage] || 'homeView';
  document.querySelectorAll('.page-view').forEach((view) => view.classList.toggle('active', view.id === viewId));
  document.querySelectorAll('.nav-item[data-page]').forEach((button) => {
    const active = (page === 'syllabus' ? button.dataset.page === 'syllabus' : page === 'mock' ? button.dataset.page === 'mock' : button.dataset.page === viewPage);
    button.classList.toggle('active', active);
  });
  const crumb = page === 'syllabus' ? 'Syllabus Map' : page === 'mock' ? 'Mock Viva' : page.charAt(0).toUpperCase() + page.slice(1);
  $('breadcrumbTitle').textContent = crumb;
  if (page === 'syllabus') setMode('syllabus');
  else if (page === 'mock') setMode('viva');
  else if (viewPage === 'study' && options.mode) setMode(options.mode);
  $('sidebar').classList.remove('open');
  if (viewPage === 'history') renderHistoryPage();
  if (viewPage === 'home') renderRecentActivity();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', (event) => {
  if (button.tagName === 'A') event.preventDefault();
  showPage(button.dataset.page);
}));
document.querySelectorAll('[data-go-mode]').forEach((button) => button.addEventListener('click', () => { showPage('study', { mode: button.dataset.goMode }); $('sourceText').focus({ preventScroll: true }); }));
$('mobileMenu').addEventListener('click', () => $('sidebar').classList.toggle('open'));
document.addEventListener('click', (event) => { if (window.innerWidth <= 720 && $('sidebar').classList.contains('open') && !$('sidebar').contains(event.target) && !$('mobileMenu').contains(event.target)) $('sidebar').classList.remove('open'); });

function hideResultAndErrors() {
  $('resultCard').classList.add('hidden');
  $('mockCard').classList.add('hidden');
  $('errorBanner').classList.add('hidden');
}
function showError(message) {
  $('errorText').textContent = message;
  $('errorBanner').classList.remove('hidden');
  if (!$('studyView').classList.contains('active')) showPage('study');
  $('errorBanner').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('closeError').addEventListener('click', () => $('errorBanner').classList.add('hidden'));

async function refreshHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    const configured = !!data.configured;
    ['statusDot', 'sidebarStatusDot'].forEach((id) => $(id).classList.toggle('online', configured));
    $('statusText').textContent = configured ? 'OpenRouter key set' : 'Add API key';
    $('sidebarStatusText').textContent = configured ? 'OpenRouter key set' : 'API key needed';
    $('settingsKeyStatus').textContent = configured ? 'Configured' : 'Missing';
    $('settingsKeyStatus').style.color = configured ? '#2e7c52' : '#bd6c46';
    $('settingsModel').textContent = data.model || 'Configured in .env';
    $('footerStatus').textContent = configured ? 'OpenRouter configured' : 'API key needed';
  } catch (_) {
    $('statusText').textContent = 'API status unavailable';
    $('sidebarStatusText').textContent = 'Status unavailable';
  }
}
refreshHealth();

function makeFormData() {
  const data = new FormData();
  data.append('practical_title', $('practicalTitle').value.trim());
  data.append('subject', $('subject').value.trim() || 'Computer Engineering');
  data.append('source_text', $('sourceText').value.trim());
  data.append('exam_question', $('examQuestion').value.trim());
  data.append('marks', $('marks').value);
  Array.from($('documents').files || []).forEach((file) => data.append('documents', file));
  return data;
}
function hasMaterial() { return $('sourceText').value.trim().length > 0 || $('documents').files.length > 0; }
function resultLabel(mode) { return modes[mode] ? modes[mode].resultTitle : 'Study result'; }
function getHistory() { try { const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(list) ? list : []; } catch (_) { return []; } }
function saveHistory(mode, title, result) {
  const list = getHistory();
  list.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, mode, title: title || resultLabel(mode), result, createdAt: new Date().toISOString() });
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 15))); } catch (_) { /* private browsing can block storage */ }
  renderRecentActivity();
}
function formatDate(value) { try { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch (_) { return ''; } }
function renderRecentActivity() {
  const list = getHistory().slice(0, 3);
  $('recentActivity').innerHTML = list.length ? list.map((item) => `<div class="history-item"><span class="history-symbol">${escapeHtml((modes[item.mode] || modes.pack).icon)}</span><div class="history-main"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(resultLabel(item.mode))} · ${escapeHtml(formatDate(item.createdAt))}</p></div><button class="button-secondary" data-open-history="${escapeHtml(item.id)}">Open</button></div>`).join('') : '<div class="empty-recent"><span>✦</span><div><b>Your study history will appear here</b><p>Generate a pack or answer to save it locally in this browser.</p></div></div>';
  bindOpenHistoryButtons();
}
function renderHistoryPage() {
  const list = getHistory();
  $('historyList').innerHTML = list.length ? list.map((item) => `<article class="history-item"><span class="history-symbol">${escapeHtml((modes[item.mode] || modes.pack).icon)}</span><div class="history-main"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(resultLabel(item.mode))} · ${escapeHtml(formatDate(item.createdAt))} · stored in this browser</p></div><button class="button-secondary" data-open-history="${escapeHtml(item.id)}">Open result ↗</button></article>`).join('') : '<div class="empty-state"><span>↺</span><h3>No saved activity yet</h3><p>Your packs and GTU answers will appear here after you generate them.</p><button class="button-primary" data-go-mode="pack">Create your first pack →</button></div>';
  $('historyList').querySelectorAll('[data-go-mode]').forEach((button) => button.addEventListener('click', () => { showPage('study', { mode: button.dataset.goMode }); }));
  bindOpenHistoryButtons();
}
function bindOpenHistoryButtons() {
  document.querySelectorAll('[data-open-history]').forEach((button) => button.onclick = () => {
    const item = getHistory().find((row) => row.id === button.dataset.openHistory);
    if (!item) return;
    latestResult = item.result; latestResultMode = item.mode;
    showPage('study', { mode: item.mode });
    $('resultTitle').textContent = item.title;
    $('resultSubtitle').textContent = `Recovered from browser history · ${formatDate(item.createdAt)}`;
    $('resultContent').innerHTML = renderMarkdown(item.result);
    $('resultCard').classList.remove('hidden');
    $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch (_) {}
  renderHistoryPage(); renderRecentActivity();
}
$('clearHistoryButton').addEventListener('click', clearHistory);
$('clearLocalHistorySettings').addEventListener('click', () => { clearHistory(); $('clearLocalHistorySettings').textContent = 'Browser history cleared ✓'; setTimeout(() => $('clearLocalHistorySettings').textContent = 'Clear browser history', 1700); });

$('generateButton').addEventListener('click', async () => {
  hideResultAndErrors();
  const questionOnly = selectedMode === 'gtu' && $('examQuestion').value.trim();
  if (!hasMaterial() && !questionOnly) { showError(selectedMode === 'gtu' ? 'Add a question or supply syllabus/notes to answer from.' : 'Paste notes or upload a syllabus, practical file or screenshot before continuing.'); return; }
  $('generateButton').disabled = true;
  $('generateLoading').classList.remove('hidden');
  try {
    const form = makeFormData(); form.append('mode', selectedMode);
    const response = await fetch('/api/generate', { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Could not generate a result.');
    latestResult = data.result; latestResultMode = selectedMode;
    $('resultTitle').textContent = resultLabel(selectedMode);
    $('resultSubtitle').textContent = `Generated from ${Number(data.source_chars || 0).toLocaleString()} characters of supplied material using ${data.model || 'the configured model'}.`;
    $('resultContent').innerHTML = renderMarkdown(latestResult);
    $('resultCard').classList.remove('hidden'); $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    const title = $('practicalTitle').value.trim() || $('examQuestion').value.trim() || resultLabel(selectedMode);
    saveHistory(selectedMode, title, latestResult);
  } catch (error) { showError(error.message || 'Something went wrong.'); }
  finally { $('generateButton').disabled = false; $('generateLoading').classList.add('hidden'); refreshHealth(); }
});

$('copyButton').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(latestResult); $('copyButton').textContent = 'Copied ✓'; setTimeout(() => $('copyButton').textContent = 'Copy result', 1500); }
  catch (_) { showError('Clipboard was blocked. Select and copy the result text instead.'); }
});
$('downloadButton').addEventListener('click', () => {
  const safeTitle = ($('practicalTitle').value.trim() || 'vivasloth-study-result').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const blob = new Blob([latestResult], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${safeTitle}.txt`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
});

const uploadZone = $('uploadZone');
$('documents').addEventListener('change', () => {
  const files = Array.from($('documents').files || []);
  if (!files.length) { $('fileList').classList.add('hidden'); $('fileList').innerHTML = ''; return; }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  $('fileList').innerHTML = files.map((file) => {
    const image = /\.(png|jpe?g|webp)$/i.test(file.name);
    const symbol = image ? '▧' : /\.pdf$/i.test(file.name) ? '▤' : /\.(py|c|cpp|h|java|js)$/i.test(file.name) ? '⌘' : '▣';
    return `<div class="file-row"><span class="file-symbol">${symbol}</span><b>${escapeHtml(file.name)}</b><small>${(file.size / 1024).toFixed(0)} KB</small></div>`;
  }).join('');
  $('fileList').classList.remove('hidden');
  if (total > 12 * 1024 * 1024) showError('These files exceed 12 MB combined. Remove a file or choose smaller screenshots.');
  hideResultAndErrors();
});
['dragenter', 'dragover'].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); uploadZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); uploadZone.classList.remove('dragover'); }));
uploadZone.addEventListener('drop', (event) => {
  const files = Array.from(event.dataTransfer.files || []); if (!files.length) return;
  try { const transfer = new DataTransfer(); files.forEach((file) => transfer.items.add(file)); $('documents').files = transfer.files; $('documents').dispatchEvent(new Event('change')); }
  catch (_) { showError('Use the Browse files control to select your files.'); }
});

$('demoButton').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/sample'); const text = await response.text();
    $('sourceText').value = text; $('practicalTitle').value = 'Linear Search in Python'; $('subject').value = 'Data Structures / Python Practical';
    $('documents').value = ''; $('fileList').innerHTML = ''; $('fileList').classList.add('hidden'); $('sourceText').focus();
  } catch (_) { showError('Could not load the sample. Open sample_data/gtu_sample_practical.txt and paste its text.'); }
});

async function startMockViva() {
  hideResultAndErrors();
  if (!hasMaterial()) { showError('First paste notes or add a syllabus/practical/screenshot. Then start the mock viva.'); $('sourceText').focus(); return; }
  $('startMockButton').disabled = true; $('generateLoading').classList.remove('hidden');
  try {
    const response = await fetch('/api/mock/start', { method: 'POST', body: makeFormData() }); const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Could not start mock viva.');
    mockSource = data.source || $('sourceText').value.trim(); mockHistory = []; currentQuestion = data.question || ''; questionCount = 1;
    $('questionNumber').textContent = '01'; $('currentQuestion').textContent = currentQuestion; $('mockAnswer').value = '';
    $('mockAnswer').disabled = false; $('submitAnswer').classList.remove('hidden'); $('feedbackBox').classList.add('hidden'); $('nextQuestionButton').textContent = 'Next question →';
    $('mockCard').classList.remove('hidden'); $('mockCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { showError(error.message || 'Could not start the mock viva.'); }
  finally { $('startMockButton').disabled = false; $('generateLoading').classList.add('hidden'); refreshHealth(); }
}
$('startMockButton').addEventListener('click', startMockViva);
$('submitAnswer').addEventListener('click', async () => {
  const answer = $('mockAnswer').value.trim();
  if (!answer) { showError('Write a short answer before asking AI to check it.'); return; }
  $('errorBanner').classList.add('hidden'); $('submitAnswer').disabled = true; $('mockLoading').classList.remove('hidden');
  try {
    const response = await fetch('/api/mock/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: mockSource, subject: $('subject').value.trim(), practical_title: $('practicalTitle').value.trim(), question: currentQuestion, answer, history: mockHistory }) });
    const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'Could not assess the answer.');
    mockHistory.push({ question: currentQuestion, answer });
    const split = data.result.split(/##\s*NEXT QUESTION\s*/i); const feedback = split[0].trim(); const nextQuestion = (split[1] || '').trim();
    $('feedbackContent').innerHTML = renderMarkdown(feedback); $('feedbackBox').classList.remove('hidden');
    if (nextQuestion) { currentQuestion = nextQuestion.replace(/^[:\-\s]+/, '').trim(); $('nextQuestionButton').textContent = 'Next question →'; }
    else { currentQuestion = ''; $('nextQuestionButton').textContent = 'End session'; }
    $('mockAnswer').disabled = true; $('submitAnswer').classList.add('hidden'); $('feedbackBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) { showError(error.message || 'Could not assess the answer.'); }
  finally { $('submitAnswer').disabled = false; $('mockLoading').classList.add('hidden'); refreshHealth(); }
});
$('nextQuestionButton').addEventListener('click', () => {
  if (!currentQuestion) { $('mockCard').classList.add('hidden'); return; }
  questionCount += 1; $('questionNumber').textContent = String(questionCount).padStart(2, '0'); $('currentQuestion').textContent = currentQuestion;
  $('mockAnswer').value = ''; $('mockAnswer').disabled = false; $('submitAnswer').classList.remove('hidden'); $('feedbackBox').classList.add('hidden'); $('mockAnswer').focus();
});

renderRecentActivity();
