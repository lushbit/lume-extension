const api = globalThis.browser ?? globalThis.chrome;

const DEFAULT_SETTINGS = { enabled: true, customBaseUrl: "", lumeBaseUrl: "" };

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

function setStatus(text, ok = true) {
  const status = document.getElementById("status");
  status.textContent = text;
  status.style.color = ok ? "#14532d" : "#7f1d1d";
}

async function loadSettings() {
  const data = await api.storage.sync.get(DEFAULT_SETTINGS);
  const migratedCustomBaseUrl = normalizeBaseUrl(data.customBaseUrl) || normalizeBaseUrl(data.lumeBaseUrl);
  document.getElementById("enabled").checked = Boolean(data.enabled);
  document.getElementById("customBaseUrl").value = migratedCustomBaseUrl;
}

async function saveSettings() {
  const enabled = document.getElementById("enabled").checked;
  const rawCustomBaseUrl = document.getElementById("customBaseUrl").value;
  const customBaseUrl = rawCustomBaseUrl.trim();

  if (customBaseUrl && !normalizeBaseUrl(customBaseUrl)) {
    setStatus("Please enter a valid custom domain URL.", false);
    return;
  }

  await api.storage.sync.set({
    enabled,
    customBaseUrl: normalizeBaseUrl(customBaseUrl),
  });
  await api.storage.sync.remove("lumeBaseUrl");

  setStatus("Settings saved.");
}

document.getElementById("saveBtn").addEventListener("click", () => {
  void saveSettings();
});

void loadSettings();
