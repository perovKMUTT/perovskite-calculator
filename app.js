// ---- Global state -------------------------------------------------------
const STORAGE_KEY = "perovskite-calc-state-v1";

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch (e) {}
  return null;
}

function defaultState() {
  return {
    setup: { samples: 8, volPerSampleUL: 70, bufferPct: 10, weighTolerancePct: 2 },
    mapbi3: { ...PRESETS.mapbi3, stockBatchVolumeML: 1 },
    fapbi3: { ...PRESETS.fapbi3, stockBatchVolumeML: 1 },
    mapbbr3: { ...PRESETS.mapbbr3, stockBatchVolumeML: 1 },
    dopants: {
      csi: { ...DOPANTS.csi, batchVolumeML: 1, baseVolumeML: 1, dopingPct: 5 },
      rbi: { ...DOPANTS.rbi, batchVolumeML: 1, baseVolumeML: 1, dopingPct: 5 },
      gai: { ...DOPANTS.gai, batchVolumeML: 1, baseVolumeML: 1, dopingPct: 5 },
    },
    spiro: { volPerSampleUL: 40 },
    ptaa: { volPerSampleUL: 40 },
    _mixCalc: { a: "DMF", b: "DMSO", ratioA: 4, ratioB: 1 },
  };
}

let state = loadState() || defaultState();
// merge in any keys added since a user's saved state was created
const _defaults = defaultState();
Object.keys(_defaults).forEach(k => { if (!(k in state)) state[k] = _defaults[k]; });

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---- Router --------------------------------------------------------------
const titles = {
  setup: "Setup — today's batch",
  mapbi3: "MAPbI₃ precursor",
  fapbi3: "FAPbI₃ precursor",
  mapbbr3: "MAPbBr₃ precursor",
  dopants: "Dopants (CsI / RbI / GAI)",
  spiro: "Spiro-OMeTAD (HTM)",
  ptaa: "PTAA (HTM)",
  density: "Solvent density reference",
};

const pageRenderers = {
  setup: renderSetupPage,
  mapbi3: (root) => renderPerovskitePage(root, "mapbi3"),
  fapbi3: (root) => renderPerovskitePage(root, "fapbi3"),
  mapbbr3: (root) => renderPerovskitePage(root, "mapbbr3"),
  dopants: renderDopantsPage,
  spiro: (root) => renderHTMPage(root, "spiro"),
  ptaa: (root) => renderHTMPage(root, "ptaa"),
  density: renderDensityPage,
};

let currentPage = "setup";
let currentRefresh = null; // refresh function set by the active page, called on any input change

function navigate(page) {
  currentPage = page;
  document.getElementById("pageTitle").textContent = titles[page];
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  const root = document.getElementById("app");
  root.innerHTML = "";
  currentRefresh = null;
  pageRenderers[page](root);
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => navigate(btn.dataset.page));
});

function onInputChanged() {
  saveState();
  if (currentRefresh) currentRefresh();
}

// ---- Small DOM helpers ----------------------------------------------------
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function numberField(label, value, onChange, opts = {}) {
  const step = opts.step ?? "any";
  const id = "f" + Math.random().toString(36).slice(2, 9);
  const wrap = el(`<label class="field">
    <span>${label}${opts.unit ? ` <em>(${opts.unit})</em>` : ""}</span>
    <input type="number" inputmode="decimal" step="${step}" id="${id}" value="${value}">
  </label>`);
  wrap.querySelector("input").addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    onChange(isNaN(v) ? 0 : v);
    onInputChanged();
  });
  return wrap;
}

function selectField(label, value, options, onChange) {
  const wrap = el(`<label class="field"><span>${label}</span><select></select></label>`);
  const sel = wrap.querySelector("select");
  options.forEach(name => {
    sel.appendChild(el(`<option value="${name}" ${name === value ? "selected" : ""}>${name}</option>`));
  });
  sel.addEventListener("change", e => { onChange(e.target.value); onInputChanged(); });
  return wrap;
}

function card(title, contentEl) {
  const c = el(`<section class="card"><h3>${title}</h3></section>`);
  if (contentEl) c.appendChild(contentEl);
  return c;
}

function row(label, value, opts = {}) {
  const cls = opts.highlight ? "row highlight" : "row";
  return el(`<div class="${cls}"><span class="row-label">${label}</span><span class="row-value">${value}${opts.unit ? ` <em>${opts.unit}</em>` : ""}</span></div>`);
}

// ---- Page: Setup -----------------------------------------------------------
function renderSetupPage(root) {
  const s = state.setup;

  // Perovskite structure visualization
  const vizCard = el(`<section class="card"><h3>ABX₃ Perovskite Structure</h3><div class="perov-structure" id="perov-viz-container"></div></section>`);
  const vizContainer = vizCard.querySelector("#perov-viz-container");
  const svgEl = document.getElementById("perovskite-viz").cloneNode(true);
  svgEl.style.display = "block";
  vizContainer.appendChild(svgEl);
  root.appendChild(vizCard);

  // Bandgap reference table
  const bgCard = el(`<section class="card"><h3>Bandgap Energy (eV) by Recipe</h3></section>`);
  const bgTable = el(`<table class="bandgap-table">
    <thead><tr><th>Perovskite</th><th>Bandgap (eV)</th><th>Light Absorption</th></tr></thead>
    <tbody>
      <tr><td>MAPbI₃</td><td>1.55</td><td>Infrared</td></tr>
      <tr><td>FAPbI₃</td><td>1.48</td><td>Near-IR</td></tr>
      <tr><td>MAPbBr₃</td><td>2.25</td><td>Green</td></tr>
    </tbody>
  </table>`);
  bgCard.appendChild(bgTable);
  root.appendChild(bgCard);

  root.appendChild(el(`<p class="lead">Tell the app how many samples you're preparing today. Every recipe page below will scale automatically from this.</p>`));

  const fields = el(`<div class="field-grid"></div>`);
  fields.appendChild(numberField("Number of samples today", s.samples, v => s.samples = v, { step: 1 }));
  fields.appendChild(numberField("Solution volume needed per sample", s.volPerSampleUL, v => s.volPerSampleUL = v, { unit: "µL" }));
  fields.appendChild(numberField("Extra buffer (dead volume / pipetting loss)", s.bufferPct, v => s.bufferPct = v, { unit: "%" }));
  fields.appendChild(numberField("Weighing tolerance to report as acceptable range", s.weighTolerancePct, v => s.weighTolerancePct = v, { unit: "%" }));
  root.appendChild(card("Today's plan", fields));

  const outputs = el(`<div></div>`);
  root.appendChild(card("Result", outputs));

  function refresh() {
    outputs.innerHTML = "";
    const totalUL = totalFinalVolumeUL(s.samples, s.volPerSampleUL, s.bufferPct);
    outputs.appendChild(row("Total final perovskite/HTM solution needed", fmt(totalUL, 1), { unit: "µL", highlight: true }));
    outputs.appendChild(row("…which is", fmt(totalUL / 1000, 3), { unit: "mL" }));
  }
  currentRefresh = refresh;
  refresh();

  root.appendChild(el(`<p class="hint">Tip: a typical spin-coating deposition uses ~70 µL of perovskite solution per sample (small lab substrates) and ~35–40 µL of HTM solution. Add 10–20% buffer volume so you don't run short from pipetting losses on the last sample.</p>`));
}

// ---- Page: perovskite recipe (MAPbI3 / FAPbI3 / MAPbBr3) -------------------
function renderPerovskitePage(root, key) {
  const cfg = state[key];

  const fields = el(`<div class="field-grid"></div>`);
  fields.appendChild(numberField(`${cfg.pbHalide} stock concentration`, cfg.stockM, v => cfg.stockM = v, { unit: "M" }));
  fields.appendChild(numberField("Final target perovskite concentration", cfg.finalM, v => cfg.finalM = v, { unit: "M" }));
  fields.appendChild(numberField(`${cfg.pbHalide} excess vs. ${cfg.salt} (1.0 = no excess)`, cfg.pbExcessRatio, v => cfg.pbExcessRatio = v, { unit: "×" }));
  fields.appendChild(numberField(`${cfg.solventA} : ${cfg.solventB} ratio — part A`, cfg.ratioA, v => cfg.ratioA = v));
  fields.appendChild(numberField(`${cfg.solventA} : ${cfg.solventB} ratio — part B`, cfg.ratioB, v => cfg.ratioB = v));
  fields.appendChild(numberField(`${cfg.pbHalide} stock batch size to prepare`, cfg.stockBatchVolumeML, v => cfg.stockBatchVolumeML = v, { unit: "mL" }));
  root.appendChild(card(`${cfg.name} — recipe settings`, fields));

  const step1Out = el(`<div></div>`);
  root.appendChild(card("Step 1 · Pb-halide stock solution", step1Out));
  const step2Out = el(`<div></div>`);
  root.appendChild(card("Step 2 · Final perovskite solution", step2Out));

  function refresh() {
    const setup = state.setup;
    const result = calcPerovskite({
      saltMw: cfg.saltMw, pbMw: cfg.pbMw,
      ratioA: cfg.ratioA, ratioB: cfg.ratioB,
      densityA: DENSITY[cfg.solventA], densityB: DENSITY[cfg.solventB],
      stockM: cfg.stockM, finalM: cfg.finalM, pbExcessRatio: cfg.pbExcessRatio,
      samplesN: setup.samples, volPerSampleUL: setup.volPerSampleUL, bufferPct: setup.bufferPct,
      weighTolerancePct: setup.weighTolerancePct, stockBatchVolumeML: cfg.stockBatchVolumeML
    });

    step1Out.innerHTML = "";
    step1Out.appendChild(el(`<p class="lead">Skip this step if you already have fresh ${cfg.pbHalide} stock on hand.</p>`));
    step1Out.appendChild(row(`Weigh ${cfg.pbHalide} powder`, fmt(result.massPbPowderG, 4), { unit: "g", highlight: true }));
    step1Out.appendChild(row("Acceptable weighing range", `${fmt(result.pbRangeLowG, 4)} – ${fmt(result.pbRangeHighG, 4)}`, { unit: "g" }));
    step1Out.appendChild(row(`Dissolve in ${cfg.solventA}`, fmt(result.stockVolA_mL, 3), { unit: "mL" }));
    step1Out.appendChild(row(`+ ${cfg.solventB}`, fmt(result.stockVolB_mL, 3), { unit: "mL" }));
    step1Out.appendChild(row("Mixed-solvent density (calculated)", fmt(result.mixDensity, 4), { unit: "g/mL" }));
    step1Out.appendChild(row(`Total stock volume prepared`, fmt(cfg.stockBatchVolumeML, 3), { unit: "mL" }));
    step1Out.appendChild(row(`Stock concentration`, fmt(cfg.stockM, 3), { unit: "M" }));
    if (!result.stockEnoughForBatch) {
      step1Out.appendChild(el(`<p class="warn">⚠ This stock batch size is smaller than the ${fmt(result.volStockNeededUL, 1)} µL of stock you'll need in Step 2. Increase the stock batch size.</p>`));
    }

    step2Out.innerHTML = "";
    step2Out.appendChild(el(`<p class="lead">Weigh the organic salt, dissolve it directly into the Pb-halide stock, then top up with neat solvent.</p>`));
    step2Out.appendChild(row(`Weigh ${cfg.salt} powder`, fmt(result.massSaltG, 4), { unit: "g", highlight: true }));
    step2Out.appendChild(row("Acceptable weighing range", `${fmt(result.saltRangeLowG, 4)} – ${fmt(result.saltRangeHighG, 4)}`, { unit: "g" }));
    step2Out.appendChild(row(`Add ${cfg.pbHalide} stock solution`, fmt(result.volStockNeededUL, 2), { unit: "µL", highlight: true }));
    step2Out.appendChild(row(`Top up with neat ${cfg.solventA}:${cfg.solventB} (${cfg.ratioA}:${cfg.ratioB}) mixed solvent`, fmt(Math.max(result.volNeatSolventUL, 0), 2), { unit: "µL" }));
    step2Out.appendChild(row("Final solution volume produced", fmt(result.finalVolUL, 1), { unit: "µL", highlight: true }));
    step2Out.appendChild(row("Final perovskite concentration", fmt(cfg.finalM, 3), { unit: "M" }));
    if (result.volNeatSolventUL < 0) {
      step2Out.appendChild(el(`<p class="warn">⚠ The stock concentration is lower than the final target concentration — this final molarity can't be reached by dilution alone. Increase the stock concentration or lower the final target.</p>`));
    }
  }
  currentRefresh = refresh;
  refresh();

  root.appendChild(el(`<p class="hint">Filter the final solution through a 0.20–0.45 µm PTFE filter before spin-coating. Stir or vortex until fully dissolved (FAI/MABr-based recipes sometimes need gentle heating, ~60–70 °C, to fully dissolve).</p>`));
}

// ---- Page: dopants ---------------------------------------------------------
function renderDopantsPage(root) {
  const refreshers = [];
  ["csi", "rbi", "gai"].forEach(key => {
    const d = state.dopants[key];
    const fields = el(`<div class="field-grid"></div>`);
    fields.appendChild(numberField("Target stock concentration", d.defaultM, v => d.defaultM = v, { unit: "M" }));
    fields.appendChild(numberField("Stock batch size to prepare", d.batchVolumeML, v => d.batchVolumeML = v, { unit: "mL" }));
    fields.appendChild(numberField("Volume of base solution to dope", d.baseVolumeML, v => d.baseVolumeML = v, { unit: "mL" }));
    fields.appendChild(numberField("Target doping (vol % of final solution)", d.dopingPct, v => d.dopingPct = v, { unit: "%" }));

    const out = el(`<div></div>`);
    const c = card(`${d.name} (Mw ${d.mw})`, fields);
    c.appendChild(out);
    root.appendChild(c);

    function refresh() {
      out.innerHTML = "";
      const stock = calcDopantStock({ mw: d.mw, targetM: d.defaultM, batchVolumeML: d.batchVolumeML, ratioA: d.ratioA, ratioB: d.ratioB, densityA: DENSITY[d.solventA], densityB: DENSITY[d.solventB] });
      const doping = calcDoping({ baseVolumeML: d.baseVolumeML, dopingPct: d.dopingPct });

      out.appendChild(el(`<p class="lead">Stock solution — dissolve in ${d.solvent}.</p>`));
      out.appendChild(row(`Weigh ${d.name} powder`, fmt(stock.massG, 4), { unit: "g", highlight: true }));
      if (d.ratioB > 0) {
        out.appendChild(row(`${d.solventA}`, fmt(stock.volA_mL, 3), { unit: "mL" }));
        out.appendChild(row(`${d.solventB}`, fmt(stock.volB_mL, 3), { unit: "mL" }));
      } else {
        out.appendChild(row(`${d.solventA} (neat)`, fmt(d.batchVolumeML, 3), { unit: "mL" }));
      }
      out.appendChild(el(`<hr>`));
      out.appendChild(el(`<p class="lead">Doping into the base perovskite solution.</p>`));
      out.appendChild(row(`Add ${d.name} stock to your ${fmt(d.baseVolumeML, 3)} mL base solution`, fmt(doping.dopantVolML, 4), { unit: "mL", highlight: true }));
      out.appendChild(row("Final doped solution volume", fmt(doping.finalVolML, 4), { unit: "mL" }));
    }
    refresh();
    refreshers.push(refresh);
  });
  currentRefresh = () => refreshers.forEach(r => r());
}

// ---- Page: HTM (Spiro-OMeTAD / PTAA) ---------------------------------------
function renderHTMPage(root, key) {
  const preset = HTM_PRESETS[key];
  const local = state[key];

  const fields = el(`<div class="field-grid"></div>`);
  fields.appendChild(numberField("Solution volume needed per sample", local.volPerSampleUL, v => local.volPerSampleUL = v, { unit: "µL" }));
  root.appendChild(card(`${preset.name} — settings`, fields));

  const hostOut = el(`<div></div>`);
  root.appendChild(card("Step 1 · Host solution", hostOut));
  const addOut = el(`<div></div>`);
  root.appendChild(card("Step 2 · Add dopants/additives", addOut));

  const stockCards = [];
  preset.additives.filter(a => a.mode === "stock").forEach(a => {
    const subState = local["_stock_" + a.key] || (local["_stock_" + a.key] = { massG: a.key === "litfsi" ? 0.26 : 0.375 });
    const wrap = el(`<div></div>`);
    const f = el(`<div class="field-grid"></div>`);
    f.appendChild(numberField(`Mass of ${a.name} weighed`, subState.massG, v => subState.massG = v, { unit: "g" }));
    wrap.appendChild(el(`<p class="lead">If you need to make fresh ${a.name} stock (target ${a.stockM} M in ${a.stockSolvent}):</p>`));
    wrap.appendChild(f);
    const out = el(`<div></div>`);
    wrap.appendChild(out);
    root.appendChild(card(`${a.name} stock solution prep`, wrap));
    stockCards.push({ a, subState, out });
  });

  function refresh() {
    const setup = state.setup;
    const finalVolUL = setup.samples * local.volPerSampleUL * (1 + setup.bufferPct / 100);
    const result = calcHTM({ mw: preset.mw, targetM: preset.targetM, finalVolumeUL: finalVolUL, additives: preset.additives });

    hostOut.innerHTML = "";
    hostOut.appendChild(row("Samples today (from Setup)", setup.samples));
    hostOut.appendChild(row("Total final HTM solution needed", fmt(finalVolUL, 1), { unit: "µL", highlight: true }));
    hostOut.appendChild(row(`Weigh ${preset.name}`, fmt(result.massHTM_g, 4), { unit: "g", highlight: true }));
    hostOut.appendChild(row("Target concentration", fmt(preset.targetM, 3), { unit: "M" }));
    hostOut.appendChild(row("Spin program", preset.spinNote));

    addOut.innerHTML = "";
    result.additiveResults.forEach(a => {
      addOut.appendChild(row(`${a.name}`, fmt(a.volUL, 3), { unit: "µL", highlight: true }));
      if (a.mode === "stock") {
        addOut.appendChild(el(`<p class="hint">From a ${a.stockM} M stock in ${a.stockSolvent}.</p>`));
      } else {
        addOut.appendChild(el(`<p class="hint">Added neat (density ${a.density} g/mL).</p>`));
      }
    });
    addOut.appendChild(row(`Top up with ${preset.hostSolvent}`, fmt(Math.max(result.hostSolventVolUL, 0), 2), { unit: "µL", highlight: true }));
    if (result.hostSolventVolUL < 0) {
      addOut.appendChild(el(`<p class="warn">⚠ Additive volumes already exceed the total target volume — increase your per-sample volume or reduce additive ratios.</p>`));
    }

    stockCards.forEach(({ a, subState, out }) => {
      out.innerHTML = "";
      const prep = calcAdditiveStockPrep({ mw: a.mw, stockM: a.stockM, weighedMassG: subState.massG });
      out.appendChild(row(`Dissolve in ${a.stockSolvent}`, fmt(prep.volmL, 4), { unit: "mL", highlight: true }));
    });
  }
  currentRefresh = refresh;
  refresh();
}

// ---- Page: density reference -----------------------------------------------
function renderDensityPage(root) {
  root.appendChild(el(`<p class="lead">Use these to cross-check by weighing a known pipetted volume — if your measured mass is off by more than a few %, recheck your pipette or solution.</p>`));

  const tbl = el(`<table class="dens-table"><thead><tr><th>Solvent</th><th>Density (g/mL)</th></tr></thead><tbody></tbody></table>`);
  const tbody = tbl.querySelector("tbody");
  Object.entries(DENSITY).forEach(([name, d]) => {
    tbody.appendChild(el(`<tr><td>${name}</td><td>${d}</td></tr>`));
  });
  root.appendChild(card("Pure solvent densities", tbl));

  const calcState = state._mixCalc;
  const mixWrap = el(`<div></div>`);
  const fgrid = el(`<div class="field-grid"></div>`);
  fgrid.appendChild(selectField("Solvent A", calcState.a, Object.keys(DENSITY), v => calcState.a = v));
  fgrid.appendChild(selectField("Solvent B", calcState.b, Object.keys(DENSITY), v => calcState.b = v));
  fgrid.appendChild(numberField("Ratio A", calcState.ratioA, v => calcState.ratioA = v));
  fgrid.appendChild(numberField("Ratio B", calcState.ratioB, v => calcState.ratioB = v));
  mixWrap.appendChild(fgrid);
  const mixOut = el(`<div></div>`);
  mixWrap.appendChild(mixOut);
  root.appendChild(card("Mixed-solvent density calculator", mixWrap));

  const checks = el(`<div></div>`);
  DENSITY_CHECKS.forEach(c => {
    checks.appendChild(row(c.label, `${fmt(c.avg, 4)} ± ${fmt(c.std, 4)}`, { unit: c.unit }));
    if (c.note) checks.appendChild(el(`<p class="hint">${c.note}</p>`));
  });
  root.appendChild(card("Historical pipetting cross-checks", checks));

  function refresh() {
    mixOut.innerHTML = "";
    const mixD = mixedDensity(calcState.ratioA, calcState.ratioB, DENSITY[calcState.a], DENSITY[calcState.b]);
    mixOut.appendChild(row(`Mixed density (${calcState.a}:${calcState.b} = ${calcState.ratioA}:${calcState.ratioB})`, fmt(mixD, 4), { unit: "g/mL", highlight: true }));
  }
  currentRefresh = refresh;
  refresh();
}

navigate("setup");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
