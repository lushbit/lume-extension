const api = globalThis.browser ?? globalThis.chrome;

const LUME_BASE_URL = "https://lume-reader.vercel.app";
const DEFAULT_SETTINGS = { enabled: true, customBaseUrl: "", lumeBaseUrl: "" };

const processedByTab = new Map();

function isHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isLikelyUnsupportedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true;
    }

    const blockedHosts = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
    ];

    return blockedHosts.includes(parsed.hostname.toLowerCase());
  } catch {
    return true;
  }
}

async function getSettings() {
  const result = await api.storage.sync.get(DEFAULT_SETTINGS);
  const customBaseUrl = normalizeBaseUrl(result.customBaseUrl) || normalizeBaseUrl(result.lumeBaseUrl);
  return {
    enabled: Boolean(result.enabled),
    customBaseUrl,
    baseUrl: customBaseUrl || LUME_BASE_URL,
  };
}

function normalizeBaseUrl(raw) {
  if (!raw || typeof raw !== "string") {
    return "";
  }

  try {
    return new URL(raw.trim()).origin;
  } catch {
    return "";
  }
}

async function canReadInLume(baseUrl, pageUrl) {
  const response = await fetch(`${baseUrl}/api/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: pageUrl }),
  });

  if (!response.ok) {
    return false;
  }

  const payload = await response.json();
  return Boolean(payload && payload.title && payload.content && payload.sourceUrl);
}

async function sendPrompt(tabId, pageUrl, baseUrl) {
  const readerUrl = `${baseUrl}/reader?url=${encodeURIComponent(pageUrl)}`;
  try {
    await api.tabs.sendMessage(tabId, {
      type: "LUME_SHOW_PROMPT",
      payload: {
        pageUrl,
        readerUrl,
      },
    });
  } catch {
    // Ignore tabs where content script is unavailable.
  }
}

async function evaluateTab(tabId, tabUrl) {
  if (tabId === undefined || tabId === null || !tabUrl || !isHttpUrl(tabUrl) || isLikelyUnsupportedUrl(tabUrl)) {
    return;
  }

  const settings = await getSettings();
  if (!settings.enabled) {
    return;
  }

  const lumeOrigin = new URL(settings.baseUrl).origin;
  const currentOrigin = new URL(tabUrl).origin;

  if (lumeOrigin === currentOrigin) {
    return;
  }

  const lastUrl = processedByTab.get(tabId);
  if (lastUrl === tabUrl) {
    return;
  }
  processedByTab.set(tabId, tabUrl);

  let valid = false;
  try {
    valid = await canReadInLume(settings.baseUrl, tabUrl);
  } catch {
    return;
  }

  if (!valid) {
    return;
  }

  await sendPrompt(tabId, tabUrl, settings.baseUrl);
}

api.runtime.onInstalled.addListener(async () => {
  const existing = await api.storage.sync.get(DEFAULT_SETTINGS);
  const migratedCustomBaseUrl = normalizeBaseUrl(existing.customBaseUrl) || normalizeBaseUrl(existing.lumeBaseUrl);
  await api.storage.sync.set({
    enabled: existing.enabled ?? DEFAULT_SETTINGS.enabled,
    customBaseUrl: migratedCustomBaseUrl,
  });
  await api.storage.sync.remove("lumeBaseUrl");

  const [active] = await api.tabs.query({ active: true, currentWindow: true });
  if (active?.id && active.url) {
    await evaluateTab(active.id, active.url);
  }
});

api.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) {
    return;
  }
  await evaluateTab(tabId, tab.url);
});

api.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await api.tabs.get(tabId);
  if (!tab?.url) {
    return;
  }
  await evaluateTab(tabId, tab.url);
});

api.tabs.onRemoved.addListener((tabId) => {
  processedByTab.delete(tabId);
});

api.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== "LUME_OPEN_READER") {
    return;
  }

  const { readerUrl } = message.payload ?? {};
  if (!readerUrl) {
    return;
  }

  const tabId = sender?.tab?.id;
  if (tabId) {
    api.tabs.create({ url: readerUrl, index: sender.tab.index + 1 }).catch(() => {
      api.tabs.create({ url: readerUrl });
    });
    return;
  }

  api.tabs.create({ url: readerUrl });
});
