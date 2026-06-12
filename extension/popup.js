// FramePick — popup: picker toggle + session history + nFrame Studio link

const $ = (id) => document.getElementById(id);
const STUDIO_FALLBACK = 'https://framepick.comprido-david.workers.dev';

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function sendToTab(tabId, msg) {
  return chrome.tabs.sendMessage(tabId, msg).catch(() => null);
}

async function init() {
  // picker toggle state from the page's content script
  const tab = await activeTab();
  const toggle = $('toggle');
  if (tab?.id) {
    const res = await sendToTab(tab.id, { type: 'get-picker' });
    if (res?.ok) toggle.checked = res.on;
    else {
      toggle.disabled = true;
      toggle.closest('.toggle-wrap').title = 'FramePick can’t run on this page';
    }
  }
  toggle.addEventListener('change', async () => {
    if (!tab?.id) return;
    await sendToTab(tab.id, { type: 'set-picker', on: toggle.checked });
    if (toggle.checked) window.close(); // get out of the way so the user can pick
  });

  // API key warning — for whichever provider is active
  const { provider = 'anthropic', apiKey = '', openaiKey = '', studioUrl = STUDIO_FALLBACK } =
    await chrome.storage.local.get(['provider', 'apiKey', 'openaiKey', 'studioUrl']);
  const hasKey = provider === 'openai' ? !!openaiKey : !!apiKey;
  if (!hasKey) $('keyNote').style.display = 'block';
  $('keyLink').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('studio').addEventListener('click', () => chrome.tabs.create({ url: studioUrl || STUDIO_FALLBACK }));

  $('clear').addEventListener('click', async () => {
    await chrome.storage.local.set({ history: [] });
    renderHistory([]);
  });

  const { history = [] } = await chrome.storage.local.get('history');
  renderHistory(history);
}

function renderHistory(history) {
  const list = $('list');
  list.innerHTML = '';
  $('emptyMsg').style.display = history.length ? 'none' : 'block';
  for (const item of history) {
    const row = document.createElement('div');
    row.className = 'item';

    const img = document.createElement('img');
    img.src = item.thumb || '';
    img.alt = '';

    const mid = document.createElement('div');
    mid.className = 'mid';
    const chip = document.createElement('span');
    chip.className = `chip ${item.mode === 'MOTION' ? 'motion' : 'still'}`;
    chip.textContent = item.mode;
    mid.appendChild(chip);
    if (item.mode === 'MOTION' && item.frameCount) {
      const fc = document.createElement('span');
      fc.className = 'frames';
      fc.textContent = `▦×${item.frameCount}`;
      mid.appendChild(fc);
    }
    const line = document.createElement('div');
    line.className = 'line';
    line.textContent = item.prompt || '';
    line.title = item.prompt || '';
    mid.appendChild(line);

    const copy = document.createElement('button');
    copy.className = 'copy';
    copy.textContent = '⧉';
    copy.title = 'Copy prompt';
    copy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(item.prompt || '');
      copy.textContent = '✓';
      setTimeout(() => { copy.textContent = '⧉'; }, 1200);
    });

    row.append(img, mid, copy);
    list.appendChild(row);
  }
}

init();
