const bannerEl = document.querySelector("#bossBanner .boss-body");
const countdownEl = document.getElementById("bossCountdown");
const tableEl = document.getElementById("bossTable");
const tooltipIcon = document.getElementById("tooltipIcon");
const settingsBtn = document.getElementById("settingsBtn");
const currentLangBtn = document.getElementById("currentLang");
const langOptions = document.getElementById("langOptions");

let WARNING_TIME_MINUTES = 7;
let blinkState = true;

const LANGUAGES = {
  cz: {
    nearestBoss: "Nejbližší boss:",
    minibossName: "Miniboss Beta Mapa",
    bosses: {
      "Ledová čarodějnice": "Jeskyně vyhnanství, DMG:100.000",
      "Král Wubba": "Beta Mapa levý horní roh, DMG:100.000",
      "Vládce En-Tai": "Zakletý les horní pravý roh, DMG:XXX",
      "Hadí královna Nethis": "Hadí chrám levý spodní roh, DMG:XXX",
      "BO: Vládce En-Tai": "Zakletý les spodní pravý roh, DMG:150.000",
      "ČT: Bagjanamu": "Zakletý les vlevo uprostřed, DMG:XXX",
      "Naga Serpent": "Hadí chrám pravý horní roh, DMG:XXX",
      "Miniboss": "Beta Mapa, DMG:XXX"
    }
  },
  en: {
    nearestBoss: "Next Boss:",
    minibossName: "Miniboss Beta Map",
    bosses: {
      "Ledová čarodějnice": "Exile Cave, DMG:100,000",
      "Král Wubba": "Beta Map, top left corner, DMG:100,000",
      "Vládce En-Tai": "Enchanted Forest, top right, DMG:XXX",
      "Hadí královna Nethis": "Snake Temple, bottom left, DMG:XXX",
      "BO: Vládce En-Tai": "Enchanted Forest, bottom right, DMG:150,000",
      "ČT: Bagjanamu": "Enchanted Forest, middle left, DMG:XXX",
      "Naga Serpent": "Snake Temple, top right, DMG:XXX",
      "Miniboss": "Beta Map, DMG:XXX"
    }
  },
  de: {
    nearestBoss: "Nächster Boss:",
    minibossName: "Miniboss Beta Karte",
    bosses: {
      "Ledová čarodějnice": "Exil Höhle, DMG:100.000",
      "Král Wubba": "Beta Karte, obere linke Ecke, DMG:100.000",
      "Vládce En-Tai": "Verzauberter Wald, obere rechte Ecke, DMG:XXX",
      "Hadí královna Nethis": "Schlangentempel, untere linke Ecke, DMG:XXX",
      "BO: Vládce En-Tai": "Verzauberter Wald, untere rechte Ecke, DMG:150.000",
      "ČT: Bagjanamu": "Verzauberter Wald, Mitte links, DMG:XXX",
      "Naga Serpent": "Schlangentempel, obere rechte Ecke, DMG:XXX",
      "Miniboss": "Beta Karte, DMG:XXX"
    }
  }
};

let currentLang = localStorage.getItem("bossLang") || "cz";
let showMiniboss = localStorage.getItem("showMiniboss") === "true";
let bossInfo = { ...LANGUAGES[currentLang].bosses };

// --- funkce pro tooltipy ---
let tooltipDiv = document.getElementById("bossInfoTooltip");
if (!tooltipDiv) {
  tooltipDiv = document.createElement("div");
  tooltipDiv.id = "bossInfoTooltip";
  document.body.appendChild(tooltipDiv);
}
function showTooltipAt(text, x, y) {
  tooltipDiv.textContent = text || "";
  tooltipDiv.style.display = "block";
  tooltipDiv.style.opacity = "1";
  let left = x + 12;
  let top = y + 12;
  tooltipDiv.style.left = left + "px";
  tooltipDiv.style.top = top + "px";
}
function hideTooltip() {
  tooltipDiv.style.opacity = "0";
  clearTimeout(tooltipDiv._hideTimeout);
  tooltipDiv._hideTimeout = setTimeout(() => {
    tooltipDiv.style.display = "none";
  }, 120);
}

// --- boss config ---
const bossConfig = [
  { name: "Ledová čarodějnice", cooldown: 2 },
  { name: "Král Wubba", cooldown: 3 },
  { name: "Vládce En-Tai", cooldown: 4 },
  { name: "Hadí královna Nethis", cooldown: 6 },
  { name: "BO: Vládce En-Tai", cooldown: 4 },
  { name: "ČT: Bagjanamu", cooldown: 4 },
  { name: "Naga Serpent", cooldown: 6 }
];
const minibossConfig = [{ name: "Miniboss", cooldown: 0.5 }];

function generateSpawns() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let allBosses = [...bossConfig];
  if (showMiniboss) allBosses = [...allBosses, ...minibossConfig];
  return allBosses.map(b => {
    const times = [];
    let next = new Date(today);
    const endTime = today.getTime() + 24 * 60 * 60 * 1000;
    while (next.getTime() <= endTime) {
      times.push(next.getTime());
      next = new Date(next.getTime() + b.cooldown * 60 * 60 * 1000);
    }
    return { name: b.name, times };
  });
}

function getBossDisplayName(name) {
  switch (currentLang) {
    case "en":
      return {
        "Ledová čarodějnice": "Ice Witch",
        "Král Wubba": "King Wubba",
        "Vládce En-Tai": "Lord En-Tai",
        "Hadí královna Nethis": "Snake Queen Nethis",
        "BO: Vládce En-Tai": "BO: Lord En-Tai",
        "ČT: Bagjanamu": "CT: Bagjanamu",
        "Naga Serpent": "Naga Serpent",
        "Miniboss": "Miniboss"
      }[name] || name;
    case "de":
      return {
        "Ledová čarodějnice": "Eishexe",
        "Král Wubba": "König Wubba",
        "Vládce En-Tai": "Herr En-Tai",
        "Hadí královna Nethis": "Schlangenkönigin Nethis",
        "BO: Vládce En-Tai": "BO: Herr En-Tai",
        "ČT: Bagjanamu": "CT: Bagjanamu",
        "Naga Serpent": "Naga Serpent",
        "Miniboss": "Miniboss"
      }[name] || name;
    default:
      return name;
  }
}

// --- update banner ---
function updateBanner(spawnsData) {
  const now = Date.now();
  const upcoming = [];
  spawnsData.forEach(b => {
    const nextTimes = b.times.filter(ts => ts > now);
    if (nextTimes.length) upcoming.push({ name: b.name, nextTime: Math.min(...nextTimes) });
  });
  upcoming.sort((a, b) => a.nextTime - b.nextTime);
  const nextTime = upcoming[0]?.nextTime || null;
  const nextBosses = upcoming.filter(b => b.nextTime === nextTime).map(b => b.name);

  bannerEl.innerHTML = nextBosses.map(name => `<div class="boss-btn" data-boss="${name}">${getBossDisplayName(name)}</div>`).join("");

  if (nextTime) {
    const diff = nextTime - now;
    const h = Math.floor(diff / 1000 / 60 / 60);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    countdownEl.textContent = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
    countdownEl.style.color = diff <= WARNING_TIME_MINUTES * 60 * 1000 ? (blinkState ? "red" : "#fff") : "#fff";
  } else {
    countdownEl.textContent = "00:00:00";
    countdownEl.style.color = "#fff";
  }

  blinkState = !blinkState;

  bannerEl.querySelectorAll(".boss-btn").forEach(btn => {
    const name = btn.dataset.boss;
    const info = bossInfo[name] || "Žádné informace";
    const moveHandler = e => showTooltipAt(info, e.clientX, e.clientY);
    const enterHandler = e => moveHandler(e);
    const leaveHandler = () => hideTooltip();
    btn.removeEventListener("mousemove", btn._moveHandler);
    btn.removeEventListener("mouseenter", btn._enterHandler);
    btn.removeEventListener("mouseleave", btn._leaveHandler);
    btn._moveHandler = moveHandler; btn._enterHandler = enterHandler; btn._leaveHandler = leaveHandler;
    btn.addEventListener("mousemove", moveHandler);
    btn.addEventListener("mouseenter", enterHandler);
    btn.addEventListener("mouseleave", leaveHandler);
  });

  // --- table ---
  let html = "<table><tr><th>Boss</th><th>Spawn</th></tr>";
  const allSpawns = [];
  spawnsData.forEach(b => b.times.forEach(ts => {
    if (ts > now && ts <= now + 24 * 60 * 60 * 1000) allSpawns.push({ name: b.name, time: ts });
  }));
  allSpawns.sort((a, b) => a.time - b.time);
  allSpawns.forEach(sp => {
    const diff = sp.time - now;
    const h = Math.floor(diff / 1000 / 60 / 60);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    html += `<tr><td>${getBossDisplayName(sp.name)}</td><td>${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}</td></tr>`;
  });
  html += "</table>";
  tableEl.innerHTML = html;
}

// --- inicializace ---
let spawns = generateSpawns();
updateBanner(spawns);
setInterval(() => updateBanner(spawns), 1000);

// --- tooltip ---
tooltipIcon.addEventListener("click", e => { e.stopPropagation(); tableEl.classList.toggle("show"); });
document.addEventListener("click", () => tableEl.classList.remove("show"));
tableEl.addEventListener("click", e => e.stopPropagation());

// --- settings popup ---
let settingsPopup = document.createElement("div");
settingsPopup.id = "settingsPopup";
settingsPopup.style.display = "none";
settingsPopup.style.position = "absolute";
settingsPopup.style.top = "-45px";
settingsPopup.style.right = "20px";
settingsPopup.style.width = "200px";
settingsPopup.style.background = "rgba(0,0,0,0.95)";
settingsPopup.style.color = "#fff";
settingsPopup.style.padding = "10px";
settingsPopup.style.borderRadius = "8px";
settingsPopup.style.fontSize = "14px";
settingsPopup.innerHTML = `<label><input type="checkbox" id="minibossCheckbox"> ${LANGUAGES[currentLang].minibossName}</label>`;
settingsBtn.parentElement.appendChild(settingsPopup);

document.getElementById("minibossCheckbox").checked = showMiniboss;
settingsBtn.addEventListener("click", e => { e.stopPropagation(); settingsPopup.style.display = settingsPopup.style.display === "block" ? "none" : "block"; });
document.getElementById("minibossCheckbox").addEventListener("change", e => { showMiniboss = e.target.checked; localStorage.setItem("showMiniboss", showMiniboss); spawns = generateSpawns(); updateBanner(spawns); });
document.addEventListener("click", () => { settingsPopup.style.display = "none"; });
settingsPopup.addEventListener("click", e => e.stopPropagation());

// --- language dropdown s obrázky ---
const langMap = {
   cz: "https://flagcdn.com/w40/cz.png",
  en: "https://flagcdn.com/w40/gb.png",
  de: "https://flagcdn.com/w40/de.png"
};

function updateLangUIWithImages() {
  currentLangBtn.innerHTML = `<img src="${langMap[currentLang]}" alt="${currentLang}" width="28" height="28">`;
  bossInfo = { ...LANGUAGES[currentLang].bosses };
  document.querySelector(".boss-title").textContent = LANGUAGES[currentLang].nearestBoss;
  document.getElementById("minibossCheckbox").nextSibling.textContent = " " + LANGUAGES[currentLang].minibossName;
  spawns = generateSpawns();
  updateBanner(spawns);
}

updateLangUIWithImages();

currentLangBtn.addEventListener("click", () => {
  langOptions.style.display = langOptions.style.display === "flex" ? "none" : "flex";
});

langOptions.querySelectorAll(".lang-option").forEach(opt => {
  opt.addEventListener("click", () => {
    currentLang = opt.dataset.lang;
    localStorage.setItem("bossLang", currentLang);
    updateLangUIWithImages();
    langOptions.style.display = "none";
  });
});
// --- překlady funkcí ---
const FEATURES_TEXT = {
  cz: [
    "Zobrazuje nejbližšího bosse s odpočtem",
    "Ukazuje všechny spawny bosse za 24 hodin",
    "Tooltip s informacemi o bossovi při najetí myší",
    "Možnost zapnout/vypnout miniboss",
    "Přepínání jazyka (Čeština, English, Deutsch)"
  ],
  en: [
    "Displays the next boss with a countdown",
    "Shows all boss spawns for 24 hours",
    "Tooltip with boss information on hover",
    "Option to enable/disable miniboss",
    "Language switcher (Czech, English, German)"
  ],
  de: [
    "Zeigt den nächsten Boss mit Countdown",
    "Zeigt alle Boss-Spawns für 24 Stunden",
    "Tooltip mit Boss-Informationen beim Hover",
    "Option zum Ein-/Ausschalten von Miniboss",
    "Sprachauswahl (Tschechisch, Englisch, Deutsch)"
  ]
};

// --- funkce pro aktualizaci seznamu funkcí ---
function updateFeaturesList() {
  const container = document.getElementById("featuresList");
  const features = FEATURES_TEXT[currentLang] || FEATURES_TEXT.cz;
  container.innerHTML = `<h3>${currentLang === "cz" ? "Co web umí" : currentLang === "en" ? "Features" : "Funktionen"}</h3>
    <ul>${features.map(f => `<li>${f}</li>`).join("")}</ul>`;
}

// --- zavoláme při načtení ---
updateFeaturesList();

// --- aktualizace při změně jazyka ---
const originalUpdateLangUIWithImages = updateLangUIWithImages;
updateLangUIWithImages = function() {
  originalUpdateLangUIWithImages();
  updateFeaturesList();
};
