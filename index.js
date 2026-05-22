import fs from "node:fs/promises";

const MAP_API = "https://fumo.touhouspots.com/api/map/posts?refresh=100";
const POST_API = "https://fumo.touhouspots.com/api/posts/";

// 🔒 Grab the webhook from the environment, crash immediately if it's missing
const WEBHOOK_URL = process.env.WEBHOOK_URL;
if (!WEBHOOK_URL) {
  console.error("❌ ERROR: WEBHOOK_URL environment variable is missing.");
  process.exit(1);
}

// 📁 Move state files to a dedicated folder for clean Docker volume mounting
const DATA_DIR = "./data";
const STATE_FILE = `${DATA_DIR}/seen_ids.json`;
const FOUND_FILE = `${DATA_DIR}/found_ids.json`;

// Ensure our data directory exists before we try to read/write
async function initStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadSeenIds() {
  try {
    const data = await fs.readFile(STATE_FILE, "utf-8");
    return new Set(JSON.parse(data));
  } catch (error) {
    return new Set();
  }
}
async function loadFoundIds() {
  try {
    const data = await fs.readFile(FOUND_FILE, "utf-8");
    return new Set(JSON.parse(data));
  } catch (error) {
    return new Set();
  }
}
async function saveSeenIds(seenIds) {
  await fs.writeFile(STATE_FILE, JSON.stringify([...seenIds]));
}
async function saveFoundIds(foundIds) {
  await fs.writeFile(FOUND_FILE, JSON.stringify([...foundIds]));
}

async function sendDiscordAlert(detail) {
  const payload = {
    content: "🇨🇭 **New Swiss Fumo Spot Detected!**",
    embeds: [
      {
        title: detail.title || "Unnamed Fumo Spot",
        description: detail.body || "No description provided.",
        color: 16711680,
        fields: [
          {
            name: "Location",
            value: `${detail.cityName || "Unknown City"}, ${detail.regionName || "Unknown Region"}`,
            inline: true,
          },
          {
            name: "Author",
            value: detail.author?.username || "Unknown Photographer",
            inline: true,
          },
        ],
        image: {
          url: detail.imageUrl,
        },
        timestamp: detail.capturedAt,
      },
    ],
  };

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function checkFumoRadar() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📡 Scanning FumoSpots...`);

  try {
    const seenIds = await loadSeenIds();
    const foundIds = await loadFoundIds();

    const mapResponse = await fetch(MAP_API);
    const mapData = await mapResponse.json();
    const allPosts = mapData.features || [];

    let newSwissFumos = 0;

    for (const post of allPosts) {
      const id = post.properties.id;

      if (!seenIds.has(id)) {
        console.log(`New Fumo detected (ID: ${id}). Checking passport...`);

        const detailResponse = await fetch(`${POST_API}${id}`);
        const detail = await detailResponse.json();

        const acceptedSwissNames = [
          "Switzerland",
          "瑞士",
          "Schweiz",
          "Suisse",
          "Svizzera",
        ];

        if (acceptedSwissNames.includes(detail.countryName)) {
          console.log(
            `🇨🇭 SWISS FUMO FOUND: ${detail.title}. Pinging Discord...`,
          );
          await sendDiscordAlert(detail);
          newSwissFumos++;
          foundIds.add(id);
        }

        seenIds.add(id);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    await saveSeenIds(seenIds);
    await saveFoundIds(foundIds);
    console.log(
      `Scan complete. Pushed ${newSwissFumos} new Swiss spots to Discord.`,
    );
  } catch (error) {
    console.error("Radar encountered interference:", error);
  }
}

// 🚀 Boot Sequence
console.log("🌸 Swissokyo Fumo Radar Initializing...");
await initStorage();
checkFumoRadar(); // Run immediately on boot

// Then run every 30 minutes (30 * 60 * 1000 milliseconds)
// Adjust this interval if you want it faster/slower
setInterval(checkFumoRadar, 30 * 60 * 1000);
