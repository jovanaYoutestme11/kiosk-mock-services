let currentConfig = null;

async function loadConfig() {
  setStatus("Loading config...");
  const response = await fetch("/mock/config");
  const config = await response.json();
  currentConfig = config;
  fillForm(config);
  setStatus("Config loaded.");
}

function fillForm(config) {
  document.getElementById("serverPort").value = config.server?.port ?? 3000;
  document.getElementById("responseDelayMs").value = config.server?.responseDelayMs ?? 0;
  document.getElementById("forceError").value = String(config.server?.forceError ?? false);
  document.getElementById("errorStatusCode").value = config.server?.errorStatusCode ?? 503;

  document.getElementById("candidateLocationId").value = config.candidateKiosk?.location_id ?? "";
  document.getElementById("candidateKioskId").value = config.candidateKiosk?.kiosk_id ?? "";
  document.getElementById("candidateKioskName").value = config.candidateKiosk?.kiosk_name ?? "";

  renderKiosks(config.kiosks || []);
}

function renderKiosks(kiosks) {
  const container = document.getElementById("kiosksContainer");
  container.innerHTML = "";

  kiosks.forEach((kiosk, index) => {
    const item = document.createElement("div");
    item.className = "kiosk-item";

    item.innerHTML = `
      <div class="grid">
        <label>
          Kiosk ID
          <input type="text" data-field="kiosk_id" data-index="${index}" value="${escapeHtml(kiosk.kiosk_id || "")}" />
        </label>
        <label>
          Kiosk Name
          <input type="text" data-field="kiosk_name" data-index="${index}" value="${escapeHtml(kiosk.kiosk_name || "")}" />
        </label>
        <label>
          Device Status
          <select data-field="device_status" data-index="${index}">
            ${buildOptions(["online", "offline", "degraded","unknown","waking"], kiosk.device_status)}
          </select>
        </label>
        <label>
          App Status
          <select data-field="app_status" data-index="${index}">
            ${buildOptions(["running", "stopped", "unknown"], kiosk.app_status)}
          </select>
        </label>
        <label>
          Last Seen
          <input type="text" data-field="last_seen" data-index="${index}" value="${escapeHtml(kiosk.last_seen || "")}" />
        </label>
      </div>
      <div class="kiosk-actions">
        <button type="button" data-remove-index="${index}">Remove</button>
      </div>
    `;

    container.appendChild(item);
  });

  attachKioskEvents();
}

function buildOptions(values, selectedValue) {
  return values.map(value => {
    const selected = value === selectedValue ? "selected" : "";
    return `<option value="${value}" ${selected}>${value}</option>`;
  }).join("");
}

function attachKioskEvents() {
  document.querySelectorAll("[data-field]").forEach(element => {
    element.addEventListener("input", handleKioskFieldChange);
    element.addEventListener("change", handleKioskFieldChange);
  });

  document.querySelectorAll("[data-remove-index]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.getAttribute("data-remove-index"));
      currentConfig.kiosks.splice(index, 1);
      renderKiosks(currentConfig.kiosks);
    });
  });
}

function handleKioskFieldChange(event) {
  const field = event.target.getAttribute("data-field");
  const index = Number(event.target.getAttribute("data-index"));
  currentConfig.kiosks[index][field] = event.target.value;
}

function collectFormData() {
  return {
    server: {
      port: Number(document.getElementById("serverPort").value),
      responseDelayMs: Number(document.getElementById("responseDelayMs").value),
      forceError: document.getElementById("forceError").value === "true",
      errorStatusCode: Number(document.getElementById("errorStatusCode").value)
    },
    candidateKiosk: {
      location_id: Number(document.getElementById("candidateLocationId").value),
      kiosk_id: document.getElementById("candidateKioskId").value.trim(),
      kiosk_name: document.getElementById("candidateKioskName").value.trim()
    },
    kiosks: currentConfig.kiosks
  };
}

async function saveConfig() {
  try {
    const newConfig = collectFormData();

    const response = await fetch("/mock/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newConfig)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to save config.");
    }

    currentConfig = newConfig;
    setStatus("Config saved successfully.");
  } catch (err) {
    setStatus(`Save failed: ${err.message}`, true);
  }
}

function addKiosk() {
  currentConfig.kiosks.push({
    kiosk_id: `KIOSK-${String(currentConfig.kiosks.length + 1).padStart(2, "0")}`,
    kiosk_name: String(currentConfig.kiosks.length + 1).padStart(2, "0"),
    device_status: "online",
    app_status: "running",
    last_seen: new Date().toISOString()
  });

  renderKiosks(currentConfig.kiosks);
}

function setStatus(message, isError = false) {
  const el = document.getElementById("statusMessage");
  el.textContent = message;
  el.className = isError ? "error" : "success";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.getElementById("reloadBtn").addEventListener("click", loadConfig);
document.getElementById("saveBtn").addEventListener("click", saveConfig);
document.getElementById("addKioskBtn").addEventListener("click", addKiosk);

loadConfig();