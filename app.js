import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
import { getDatabase, ref, push, set, onValue, remove, get, serverTimestamp, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// ===== TVŮJ EXISTUJÍCÍ CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyBgG4z9BoNyzH85md03qDr89GWohllbVmI",
  authDomain: "akaya-7d708.firebaseapp.com",
  projectId: "akaya-7d708",
  storageBucket: "akaya-7d708.appspot.com",
  messagingSenderId: "977350328474",
  appId: "1:977350328474:web:bfd3809534d58084175f23",
  measurementId: "G-QK2Q79WBXY",
  databaseURL: "https://akaya-7d708-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);
let currentUser = "";
let isAdmin = false;

// ===== LOGIN =====
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Vyplň email i heslo!");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user.email;
  } catch (e) { alert("Chyba při přihlášení: " + e.message); }
});

// ===== AUTH STATE =====
onAuthStateChanged(auth, async user => {
  if (!user) return;

  currentUser = user.email;
  const userUID = user.uid;

  document.getElementById("loginWrap").style.display = "none";
  document.getElementById("appContent").style.display = "flex";

  const roleSnap = await get(ref(db, `roles/${userUID}`));
  const role = roleSnap.exists() ? roleSnap.val() : "user";
  isAdmin = role === "admin";

  if (!isAdmin) {
    document.querySelectorAll(".addBtn, .del-btn").forEach(b => b.style.display = "none");
    document.getElementById("imgInput").style.display = "none";
    document.getElementById("mapInput").style.display = "none";
    document.getElementById("clearDotsBtn").style.display = "none";
  }

  initLevelSections();
  initSharedImage();
  initMap();

  // ===== Počty účtů a online lidí =====
  loadUserCount();
  startPresence(userUID);
  loadOnlineCount();
});

// ===== LOGOUT =====
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  currentUser = "";
  isAdmin = false;
  document.getElementById("appContent").style.display = "none";
  document.getElementById("loginWrap").style.display = "flex";
});

// ===== POČET ÚČTŮ =====
function loadUserCount() {
  const rolesRef = ref(db, "roles");
  onValue(rolesRef, snap => {
    const data = snap.val();
    const count = data ? Object.keys(data).length : 0;
    const userCountBox = document.getElementById("userCountBox");
    userCountBox.textContent = `👥 ${count}`;
  });
}

// ===== ONLINE PŘÍTOMNOST =====
function startPresence(uid) {
  const statusRef = ref(db, "presence/" + uid);
  set(statusRef, { state: "online", lastSeen: serverTimestamp() });
  onDisconnect(statusRef).set({ state: "offline", lastSeen: serverTimestamp() });
}

// ===== POČET ONLINE LIDÍ =====
function loadOnlineCount() {
  const presenceRef = ref(db, "presence");
  const onlineBox = document.getElementById("onlineCountBox");

  onValue(presenceRef, snap => {
    const data = snap.val();
    let online = 0;
    const now = Date.now(); // aktuální čas v ms

    if (data) {
      for (let uid in data) {
        const user = data[uid];
        // pouze pokud je online a lastSeen v posledních 10 sekundách
        if (user.state === "online" && (now - user.lastSeen) < 10000) {
          online++;
        }
      }
    }
    onlineBox.textContent = `🟢 ${online}`;
  });
}


// ===== ÚKOLNÍČEK =====
function initLevelSections() {
  const levels = ["level0_75", "level75_90", "level90_105", "level105_120"];
  levels.forEach(lvl => {
    const section = document.getElementById(lvl);
    const input = section.querySelector(".taskInput");
    const btn = section.querySelector(".addBtn");
    const list = section.querySelector(".tasks");
    const totalEl = section.querySelector(".total");
    const doneEl = section.querySelector(".done");

    btn.addEventListener("click", () => {
      if (!currentUser) return alert("Přihlaš se pro přidání úkolu!");
      const title = input.value.trim();
      if (!title) return;
      const taskRef = push(ref(db, "tasks"));
      set(taskRef, { title, level: lvl, author: currentUser });
      input.value = "";
    });

    onValue(ref(db, "tasks"), snapshot => {
      list.innerHTML = "";
      let total = 0, doneCount = 0;

      snapshot.forEach(child => {
        const task = child.val();
        if (task.level !== lvl) return;

        const li = document.createElement("li");
        const userDone = task.doneUsers || {};
        const safeUser = currentUser.replace(/\./g, "_");
        const isDone = userDone[safeUser] || false;
        const doneUsersList = Object.keys(userDone).map(u => u.replace(/_/g, "."));
        const doneCountNum = doneUsersList.length;

        li.className = "task" + (isDone ? " done" : "");
        li.innerHTML = `
          <div style="display:flex;gap:10px;align-items:center;">
            <div class="chk ${isDone ? "checked" : ""}">${isDone ? "✓" : ""}</div>
            <div class="title">${task.title}<br><small>Autor: ${task.author}</small></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="done-badge tooltip-container">${doneCountNum}
              <span class="tooltip">${doneCountNum > 0 ? doneUsersList.join(', ') : 'Nikdo zatím ne'}</span>
            </div>
            <button class="del-btn">✖</button>
          </div>
        `;

        li.querySelector(".chk").addEventListener("click", () => {
          const userDoneRef = ref(db, `tasks/${child.key}/doneUsers/${safeUser}`);
          get(userDoneRef).then(snap => {
            if (snap.exists()) remove(userDoneRef);
            else set(userDoneRef, true);
          });
        });

        li.querySelector(".del-btn").addEventListener("click", () => {
          if (!currentUser) return;
          remove(ref(db, "tasks/" + child.key));
        });

        list.appendChild(li);
        total++;
        doneCount += doneCountNum;
      });

      totalEl.textContent = "Úkolů: " + total;
      doneEl.textContent = "Splněno: " + doneCount;
    });
  });
}

// ===== OBRAZEK =====
function initSharedImage() {
  const imgInput = document.getElementById("imgInput");
  const imageBox = document.getElementById("imageBox");
  const imgRef = ref(db, "sharedImage");

  onValue(imgRef, snap => {
    const url = snap.val();
    imageBox.innerHTML = url ? `<img src="${url}" alt="Sdílený obrázek">` : "Klikni na tlačítko níže pro přidání obrázku";
  });

  imgInput.addEventListener("change", e => {
    if (!currentUser || !isAdmin) return;
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set(imgRef, ev.target.result);
    reader.readAsDataURL(file);
  });
}

// ===== MAPA =====
function initMap() {
  const mapBox = document.getElementById("mapBox");
  const mapInput = document.getElementById("mapInput");
  const clearBtn = document.getElementById("clearDotsBtn");
  const logList = document.getElementById("dotLog");

  const mapRef = ref(db, "sharedMap");
  const dotsRef = ref(db, "dots");

  onValue(mapRef, snap => {
    const url = snap.val();
    mapBox.innerHTML = url ? `<img src="${url}" alt="Mapa">` : "Klikni pro přidání puntíku";
  });

  mapInput.addEventListener("change", e => {
    if (!currentUser || !isAdmin) return;
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set(mapRef, ev.target.result);
    reader.readAsDataURL(file);
  });

  mapBox.addEventListener("click", e => {
    if (!currentUser) return;
    const rect = mapBox.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width).toFixed(3);
    const y = ((e.clientY - rect.top) / rect.height).toFixed(3);
    if (!isAdmin) return alert("Nemáš práva přidat tečku!");
    const dotRef = push(dotsRef);
    set(dotRef, { x, y, author: currentUser });
  });

  onValue(dotsRef, snap => {
    mapBox.querySelectorAll(".dot").forEach(d => d.remove());
    logList.innerHTML = "";
    snap.forEach(child => {
      const d = child.val();
      const dotEl = document.createElement("div");
      dotEl.className = "dot";
      dotEl.style.left = (d.x * 100) + "%";
      dotEl.style.top = (d.y * 100) + "%";
      mapBox.appendChild(dotEl);

      const li = document.createElement("li");
      li.textContent = `${d.author} (${(d.x*100).toFixed(1)}%, ${(d.y*100).toFixed(1)}%)`;
      logList.appendChild(li);

      dotEl.addEventListener("click", e => {
        e.stopPropagation();
        if (!isAdmin) return;
        remove(ref(db, "dots/" + child.key));
      });

      li.addEventListener("click", () => {
        if (!isAdmin) return;
        remove(ref(db, "dots/" + child.key));
      });
    });
  });

  clearBtn.addEventListener("click", () => {
    if (!isAdmin) return;
    if (confirm("Opravdu smazat všechny puntíky?")) remove(dotsRef);
  });
}
