const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG_PATH = path.join(__dirname, "mock-config.json");
const PUBLIC_PATH = path.join(__dirname, "public");

function readConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.use(async (req, res, next) => {
  if (req.path.startsWith("/mock")) {
    return next();
  }

  try {
    const config = readConfig();
    const delay = config.server?.responseDelayMs || 0;
    const forceError = config.server?.forceError || false;
    const errorStatusCode = config.server?.errorStatusCode || 503;

    if (delay > 0) {
      await sleep(delay);
    }

    if (forceError) {
      return res.status(errorStatusCode).json({
        error: "mock_error",
        message: "Mock service forced error mode."
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      error: "config_read_error",
      message: err.message
    });
  }
});

app.use(express.static(PUBLIC_PATH));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/kiosk/name", (req, res) => {
  const config = readConfig();

  res.json({
    location_id: config.candidateKiosk.location_id,
    kiosk_id: config.candidateKiosk.kiosk_id,
    kiosk_name: config.candidateKiosk.kiosk_name
  });
});

app.get("/api/kiosks", (req, res) => {
  const config = readConfig();

  const kiosks = (config.kiosks || []).map(kiosk => ({
    kiosk_id: kiosk.kiosk_id,
    kiosk_name: kiosk.kiosk_name,
    device_status: kiosk.device_status,
    last_seen: kiosk.last_seen
  }));

  res.json({ kiosks });
});

app.get("/api/kiosks/:kiosk_id", (req, res) => {
  const config = readConfig();
  const kioskId = req.params.kiosk_id;

  const kiosk = (config.kiosks || []).find(k => k.kiosk_id === kioskId);

  if (!kiosk) {
    return res.status(404).json({
      error: "kiosk_not_found",
      message: `Kiosk '${kioskId}' was not found.`
    });
  }

  res.json({
    kiosk_id: kiosk.kiosk_id,
    kiosk_name: kiosk.kiosk_name,
    device_status: kiosk.device_status,
    app_status: kiosk.app_status,
    last_seen: kiosk.last_seen
  });
});

app.get("/mock/config", (req, res) => {
  try {
    const config = readConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({
      error: "config_read_error",
      message: err.message
    });
  }
});

app.post("/mock/config", (req, res) => {
  try {
    const newConfig = req.body;

    if (!newConfig || typeof newConfig !== "object") {
      return res.status(400).json({
        error: "invalid_payload",
        message: "Request body must be a valid JSON object."
      });
    }

    if (!newConfig.server || !newConfig.candidateKiosk || !Array.isArray(newConfig.kiosks)) {
      return res.status(400).json({
        error: "invalid_config_shape",
        message: "Config must contain 'server', 'candidateKiosk', and 'kiosks'."
      });
    }

    writeConfig(newConfig);

    res.json({
      success: true,
      message: "Configuration saved successfully."
    });
  } catch (err) {
    res.status(500).json({
      error: "config_write_error",
      message: err.message
    });
  }
});

const config = readConfig();
const port = process.env.PORT || config.server?.port || 3000;

app.listen(port, () => {
  console.log(`Mock kiosk service running on http://localhost:${port}`);
});