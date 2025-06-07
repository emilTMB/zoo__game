// ===== Утилитки =====
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

// ===== Дефолтный пресет =====
const defaultPreset = {
  colors: [
    { name: "Green", color: "#008000", count: 400, size: 5 },
    { name: "Red", color: "#ff0000", count: 200, size: 5 },
    { name: "Yellow", color: "#ffff00", count: 200, size: 5 },
  ],
  rules: {
    "0_0": -0.32,
    "0_1": -0.17,
    "0_2": 0.34,
    "1_0": -0.34,
    "1_1": -0.1,
    "1_2": 0,
    "2_0": -0.2,
    "2_1": 0,
    "2_2": 0.15,
  },
  slow: 0.2,
  maxDistance: 80,
};

let state = loadPreset("default") || JSON.parse(JSON.stringify(defaultPreset));
let particles = [];

// ===== Локальное хранилище =====
function getAllPresets() {
  const json = localStorage.getItem("particlePresets") || "{}";
  return JSON.parse(json);
}
function savePreset(name, preset) {
  const all = getAllPresets();
  all[name] = preset;
  localStorage.setItem("particlePresets", JSON.stringify(all));
}
function loadPreset(name) {
  const all = getAllPresets();
  return all[name] || null;
}
function deletePreset(name) {
  const all = getAllPresets();
  delete all[name];
  localStorage.setItem("particlePresets", JSON.stringify(all));
}

// ===== Канвас и его логика =) =====
const canvas = document.getElementById("life");
const ctx = canvas.getContext("2d");
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = Math.round(window.innerHeight * 0.7);
}
resizeCanvas();
window.addEventListener("resize", () => {
  resizeCanvas();
  renderParticles();
});

// Создание частиц
function createParticlesFromState() {
  particles = [];
  for (let c = 0; c < state.colors.length; ++c) {
    const group = state.colors[c];
    for (let i = 0; i < group.count; ++i) {
      particles.push({
        group: c,
        x: Math.random() * (canvas.width - 50) + 25,
        y: Math.random() * (canvas.height - 50) + 25,
        vx: 0,
        vy: 0,
      });
    }
  }
}

// ===== Правила =====
function rule(p1, p2, g) {
  for (let i = 0; i < p1.length; ++i) {
    let fx = 0,
      fy = 0;
    const a = p1[i];
    for (let j = 0; j < p2.length; ++j) {
      const b = p2[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && d < state.maxDistance) {
        let F = (g * 1) / d;
        fx += F * dx;
        fy += F * dy;
      }
    }
    let slow = state.slow;
    a.vx = (a.vx + fx) * slow;
    a.vy = (a.vy + fy) * slow;
    a.x += a.vx;
    a.y += a.vy;
    // Reflect at borders
    if (a.x <= 0 || a.x >= canvas.width) a.vx *= -1;
    if (a.y <= 0 || a.y >= canvas.height) a.vy *= -1;
  }
}

// ======= Рендер частиц =======
function renderParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let c = 0; c < state.colors.length; ++c) {
    ctx.fillStyle = state.colors[c].color;
    for (let i = 0; i < particles.length; ++i) {
      if (particles[i].group === c) {
        ctx.fillRect(
          particles[i].x,
          particles[i].y,
          state.colors[c].size,
          state.colors[c].size
        );
      }
    }
  }
}

// ======= Анимация =======
function animationLoop() {
  // Взаимодействие между всеми группами
  const groups = state.colors.map((_, idx) =>
    particles.filter((p) => p.group === idx)
  );
  for (let i = 0; i < groups.length; ++i) {
    for (let j = 0; j < groups.length; ++j) {
      const key = `${i}_${j}`;
      let force = +state.rules[key] || 0;
      rule(groups[i], groups[j], force);
    }
  }
  renderParticles();
  requestAnimationFrame(animationLoop);
}

// ======= Контрол панель =======
function renderPanel() {
  const panel = document.getElementById("control-panel");
  panel.innerHTML = "";

  // === Цветовые группы ===
  state.colors.forEach((col, idx) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "color-group";

    // Имя (hex или обычное)
    let name = col.name || col.color;
    if (name === "auto") name = col.color;

    groupDiv.innerHTML = `
          <label>${name}</label>
          <input type="color" value="${
            col.color
          }" data-group="${idx}" data-type="color">
          <label>Кол-во</label>
          <input type="number" value="${
            col.count
          }" min="1" max="2000" data-group="${idx}" data-type="count">
          <label>Размер</label>
          <input type="number" value="${
            col.size
          }" min="1" max="30" data-group="${idx}" data-type="size">
          ${
            state.colors.length > 2
              ? `<button data-remove="${idx}">✕</button>`
              : ""
          }
        `;
    panel.appendChild(groupDiv);
  });

  // Кнопка добавить цвет
  const addBtn = document.createElement("button");
  addBtn.textContent = "Добавить цвет";
  addBtn.onclick = () => {
    state.colors.push({
      name: "auto",
      color:
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0"),
      count: 100,
      size: 5,
    });
    // Для новых пар сила — по дефолту 0
    const N = state.colors.length;
    for (let i = 0; i < N; ++i) {
      state.rules[`${N - 1}_${i}`] = 0;
      state.rules[`${i}_${N - 1}`] = 0;
    }
    renderPanel();
    createParticlesFromState();
  };
  panel.appendChild(addBtn);

  // Удаление цвета
  panel.querySelectorAll("button[data-remove]").forEach((btn) => {
    btn.onclick = () => {
      const idx = +btn.getAttribute("data-remove");
      state.colors.splice(idx, 1);
      // Удаляем правила связанные с этим цветом
      let newRules = {};
      for (let i = 0; i < state.colors.length; ++i) {
        for (let j = 0; j < state.colors.length; ++j) {
          const oldKey = `${i >= idx ? i + 1 : i}_${j >= idx ? j + 1 : j}`;
          if (state.rules[oldKey] !== undefined) {
            newRules[`${i}_${j}`] = state.rules[oldKey];
          } else {
            newRules[`${i}_${j}`] = 0;
          }
        }
      }
      state.rules = newRules;
      renderPanel();
      createParticlesFromState();
    };
  });

  // Изменение параметров цветов
  panel.querySelectorAll(".color-group input").forEach((inp) => {
    inp.oninput = (e) => {
      const idx = +inp.getAttribute("data-group");
      const type = inp.getAttribute("data-type");
      if (type === "color") state.colors[idx].color = inp.value;
      if (type === "count")
        state.colors[idx].count = clamp(+inp.value, 1, 2000);
      if (type === "size") state.colors[idx].size = clamp(+inp.value, 1, 30);
      createParticlesFromState();
    };
  });

  // === Таблица сил ===
  const table = document.createElement("table");
  table.className = "rules-table";
  let header = `<tr><th>→</th>`;
  state.colors.forEach(
    (col, idx) =>
      (header += `<th>${col.name === "auto" ? col.color : col.name}</th>`)
  );
  header += `</tr>`;
  table.innerHTML = header;
  for (let i = 0; i < state.colors.length; ++i) {
    let row = `<tr><th>${
      state.colors[i].name === "auto"
        ? state.colors[i].color
        : state.colors[i].name
    }</th>`;
    for (let j = 0; j < state.colors.length; ++j) {
      const key = `${i}_${j}`;
      row += `<td><input type="number" class="rule-input" step="0.01" min="-1" max="1" value="${
        state.rules[key] || 0
      }" data-key="${key}"></td>`;
    }
    row += `</tr>`;
    table.innerHTML += row;
  }
  panel.appendChild(table);
  panel.querySelectorAll(".rule-input").forEach((inp) => {
    inp.oninput = () => {
      state.rules[inp.dataset.key] = +inp.value;
    };
  });

  // === Скорость и maxDistance ===
  const params = document.createElement("div");
  params.className = "panel-row";
  params.innerHTML = `
        <label>Скорость (от 0 - до 1): <input type="number" min="0" max="1" step="0.01" value="${state.slow}" id="slow-input"></label>
        <label>Макс. дистанция: <input type="number" min="10" max="300" step="1" value="${state.maxDistance}" id="maxdist-input"></label>
      `;
  panel.appendChild(params);
  panel.querySelector("#slow-input").oninput = (e) => {
    state.slow = +e.target.value;
  };
  panel.querySelector("#maxdist-input").oninput = (e) => {
    state.maxDistance = +e.target.value;
  };

  // === Сохранения и действия ===
  const saveBlock = document.createElement("div");
  saveBlock.className = "save-block";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Название для сохранения...";
  saveBlock.appendChild(nameInput);

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Сохранить";
  saveBtn.onclick = () => {
    if (!nameInput.value) return alert("Введите имя!");
    savePreset(nameInput.value, JSON.parse(JSON.stringify(state)));
    renderPanel();
  };
  saveBlock.appendChild(saveBtn);

  // Список сохранений
  const presets = getAllPresets();
  const presetList = document.createElement("select");
  presetList.className = "preset-list";
  presetList.innerHTML = `<option value="">Выбрать сохранённое...</option>`;
  Object.keys(presets).forEach((name) => {
    presetList.innerHTML += `<option value="${name}">${name}</option>`;
  });
  saveBlock.appendChild(presetList);

  // Кнопка применить
  const applyBtn = document.createElement("button");
  applyBtn.textContent = "Загрузить";
  applyBtn.onclick = () => {
    const name = presetList.value;
    if (name && presets[name]) {
      state = JSON.parse(JSON.stringify(presets[name]));
      createParticlesFromState();
      renderPanel();
    }
  };
  saveBlock.appendChild(applyBtn);

  // Кнопка удалить
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Удалить";
  deleteBtn.onclick = () => {
    const name = presetList.value;
    if (name && confirm("Удалить пресет?")) {
      deletePreset(name);
      renderPanel();
    }
  };
  saveBlock.appendChild(deleteBtn);

  // Кнопка сбросить
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Сбросить";
  resetBtn.onclick = () => {
    if (confirm("Сбросить настройки?")) {
      state = JSON.parse(JSON.stringify(defaultPreset));
      createParticlesFromState();
      renderPanel();
    }
  };
  saveBlock.appendChild(resetBtn);

  // Кнопка обновить анимацию
  const restartBtn = document.createElement("button");
  restartBtn.textContent = "Обновить анимацию";
  restartBtn.onclick = () => {
    createParticlesFromState();
  };
  saveBlock.appendChild(restartBtn);

  // Кнопка "?"
  const helpBtn = document.createElement("button");
  helpBtn.title = "Что это?";
  helpBtn.style.background = "transparent";
  helpBtn.style.border = "none";
  helpBtn.style.color = "#87eaf2";
  helpBtn.style.fontWeight = "bold";
  helpBtn.textContent = "?";
  helpBtn.onclick = () => {
    document.getElementById("help-modal").style.display = "flex";
  };
  saveBlock.appendChild(helpBtn);

  panel.appendChild(saveBlock);
}

// ====== Запуск ======
renderPanel();
createParticlesFromState();
animationLoop();
