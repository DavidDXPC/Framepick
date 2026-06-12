// FramePick — options page

const $ = (id) => document.getElementById(id);
let provider = 'anthropic';

function applyProvider(p) {
  provider = p;
  document.querySelectorAll('#seg button').forEach((b) =>
    b.classList.toggle('active', b.dataset.provider === p));
  $('fields-anthropic').classList.toggle('active', p === 'anthropic');
  $('fields-openai').classList.toggle('active', p === 'openai');
  status('', true);
}

async function load() {
  const {
    provider: prov = 'anthropic',
    apiKey = '', model = 'claude-opus-4-8',
    openaiKey = '', openaiModel = 'gpt-4o',
    frameCount = 8,
    studioUrl = 'https://framepick.comprido-david.workers.dev',
  } = await chrome.storage.local.get(
    ['provider', 'apiKey', 'model', 'openaiKey', 'openaiModel', 'frameCount', 'studioUrl']);
  $('apiKey').value = apiKey;
  $('model').value = model;
  $('openaiKey').value = openaiKey;
  $('openaiModel').value = openaiModel;
  $('frameCount').value = frameCount;
  $('frameVal').textContent = frameCount;
  $('studioUrl').value = studioUrl;
  applyProvider(prov);
}

function status(text, ok) {
  const s = $('status');
  s.textContent = text;
  s.className = ok ? 'ok' : 'err';
}

document.querySelectorAll('#seg button').forEach((b) =>
  b.addEventListener('click', () => applyProvider(b.dataset.provider)));

$('frameCount').addEventListener('input', () => {
  $('frameVal').textContent = $('frameCount').value;
});

$('save').addEventListener('click', async () => {
  let studioUrl = $('studioUrl').value.trim();
  if (studioUrl) {
    try {
      studioUrl = new URL(studioUrl).origin;
    } catch {
      return status('nFrame Studio URL is not a valid URL', false);
    }
  }
  await chrome.storage.local.set({
    provider,
    apiKey: $('apiKey').value.trim(),
    model: $('model').value,
    openaiKey: $('openaiKey').value.trim(),
    openaiModel: $('openaiModel').value,
    frameCount: Number($('frameCount').value),
    studioUrl,
  });
  $('studioUrl').value = studioUrl;
  status('Saved ✓', true);
  setTimeout(() => status('', true), 2000);
});

// Validate the active provider's key with a lightweight GET.
$('test').addEventListener('click', async () => {
  status('Testing…', true);
  try {
    if (provider === 'openai') {
      const key = $('openaiKey').value.trim();
      if (!key) return status('Enter a key first', false);
      const res = await fetch(`https://api.openai.com/v1/models/${$('openaiModel').value}`, {
        headers: { authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const m = await res.json();
        status(`Key works ✓ (${m.id})`, true);
      } else {
        const data = await res.json().catch(() => null);
        status(data?.error?.message || `Key rejected (${res.status})`, false);
      }
    } else {
      const key = $('apiKey').value.trim();
      if (!key) return status('Enter a key first', false);
      const res = await fetch(`https://api.anthropic.com/v1/models/${$('model').value}`, {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });
      if (res.ok) {
        const m = await res.json();
        status(`Key works ✓ (${m.display_name || m.id})`, true);
      } else {
        const data = await res.json().catch(() => null);
        status(data?.error?.message || `Key rejected (${res.status})`, false);
      }
    }
  } catch (e) {
    status(`Network error: ${e.message}`, false);
  }
});

load();
