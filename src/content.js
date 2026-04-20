(() => {
  const api = globalThis.browser ?? globalThis.chrome;

  const OVERLAY_ID = "lume-extension-overlay";
  const DISMISS_KEY = "lume_overlay_dismissed_urls";

  function storageGet(keys) {
    if (api.storage?.local?.get.length <= 1) {
      return api.storage.local.get(keys);
    }
    return new Promise((resolve) => {
      api.storage.local.get(keys, resolve);
    });
  }

  function storageSet(value) {
    if (api.storage?.local?.set.length <= 1) {
      return api.storage.local.set(value);
    }
    return new Promise((resolve) => {
      api.storage.local.set(value, resolve);
    });
  }

  async function getDismissedUrls() {
    const result = await storageGet([DISMISS_KEY]);
    const list = Array.isArray(result[DISMISS_KEY]) ? result[DISMISS_KEY] : [];
    return new Set(list);
  }

  async function saveDismissedUrl(url) {
    const set = await getDismissedUrls();
    set.add(url);
    await storageSet({ [DISMISS_KEY]: Array.from(set).slice(-200) });
  }

  function removeExistingOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
    }
  }

  function showOverlay({ pageUrl, readerUrl }) {
    removeExistingOverlay();

    const host = (() => {
      try {
        return new URL(pageUrl).hostname;
      } catch {
        return "this site";
      }
    })();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    const card = document.createElement("div");
    card.className = "lume-ext-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-live", "polite");
    card.setAttribute("aria-label", "Open in Lume");

    const title = document.createElement("div");
    title.className = "lume-ext-title";
    title.textContent = "Readable article detected";

    const text = document.createElement("div");
    text.className = "lume-ext-text";
    text.textContent = `This page on ${host} can be opened in Lume for an ad-free reading view.`;

    const actions = document.createElement("div");
    actions.className = "lume-ext-actions";

    const openButton = document.createElement("button");
    openButton.className = "lume-ext-btn lume-ext-btn-primary";
    openButton.setAttribute("data-lume-action", "open");
    openButton.textContent = "Read in Lume";

    const dismissButton = document.createElement("button");
    dismissButton.className = "lume-ext-btn";
    dismissButton.setAttribute("data-lume-action", "dismiss");
    dismissButton.textContent = "Dismiss";

    actions.appendChild(openButton);
    actions.appendChild(dismissButton);
    card.appendChild(title);
    card.appendChild(text);
    card.appendChild(actions);
    overlay.appendChild(card);

    overlay.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const action = target.getAttribute("data-lume-action");
      if (action === "open") {
        api.runtime.sendMessage({
          type: "LUME_OPEN_READER",
          payload: { readerUrl },
        });
        overlay.remove();
        return;
      }

      if (action === "dismiss") {
        await saveDismissedUrl(pageUrl);
        overlay.remove();
      }
    });

    document.documentElement.appendChild(overlay);
  }

  api.runtime.onMessage.addListener(async (message) => {
    if (!message || message.type !== "LUME_SHOW_PROMPT") {
      return;
    }

    const { pageUrl, readerUrl } = message.payload ?? {};
    if (!pageUrl || !readerUrl) {
      return;
    }

    const dismissed = await getDismissedUrls();
    if (dismissed.has(pageUrl)) {
      return;
    }
    showOverlay({ pageUrl, readerUrl });
  });
})();
