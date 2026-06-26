// Molecular weights (g/mol) and reference densities (g/mL)
// Source: "perovskite solution calculator_28_11_2025.xlsx"
const MW = {
  PbI2: 461.01,
  PbBr2: 367.01,
  MAI: 158.97,
  FAI: 171.97,
  MABr: 111.97,
  CsI: 259.81,
  RbI: 212.37,
  GAI: 186.98,
  LiTFSI: 287.09,
  TBP: 135.21,
  CoIII: 1503.18,
  Spiro: 1225.45,
  PTAA: 285.60
};

const DENSITY = {
  DMF: 0.944,
  DMSO: 1.100,
  GBL: 1.130,
  Chlorobenzene: 1.110,
  Toluene: 0.867,
  ACN: 0.786,
  TBP: 0.923
};

// Historical pipetting / density cross-check data, from "density error" sheet.
// avg = average measured g per 100 microL, n = number of historical measurements, std = population std dev
const DENSITY_CHECKS = [
  { label: "DMF:DMSO 4:1 (v:v) solvent mix", avg: 0.975, std: 0.0, unit: "g / 100 µL", note: "Nominal density ~0.9908 g/mL by calculation; measured neat solvent mix runs slightly lower." },
  { label: "PbBr2 solution, 1.5 M (DMF:DMSO 4:1)", avg: 0.140, std: 0.0008, unit: "g / 100 µL" },
  { label: "PbI2 solution, 1.5 M (DMF:DMSO 4:1)", avg: 0.1476, std: 0.0024, unit: "g / 100 µL" },
  { label: "PbI2 solution, 1.4 M (DMF:DMSO 7:3)", avg: 0.1449, std: 0.0008, unit: "g / 100 µL" },
  { label: "PbI2 solution, 1.4 M (DMF:DMSO 4:1)", avg: 0.1434, std: 0.0, unit: "g / 100 µL" },
  { label: "Chlorobenzene (pipette calibration, 1 mL)", avg: 1.089, std: 0.0, unit: "g / mL", note: "Nominal density 1.11 g/mL — measured ~1.9% low. Suspect a systematic pipette under-delivery; re-calibrate if your value differs from 1.089 g by more than ~2%." },
  { label: "Chlorobenzene (pipette calibration, 100 µL)", avg: 0.108, std: 0.0, unit: "g / 100 µL", note: "Nominal 0.111 g — measured ~2.7% low, consistent with the 1 mL check." }
];

// Default recipe presets, editable in the UI. Pulled from the spreadsheet's example values.
const PRESETS = {
  mapbi3: {
    name: "MAPbI₃",
    salt: "MAI", saltMw: MW.MAI,
    pbHalide: "PbI2", pbMw: MW.PbI2,
    solventA: "DMF", solventB: "DMSO",
    ratioA: 7, ratioB: 3,
    stockM: 1.12,
    finalM: 1.0,
    pbExcessRatio: 1.09,
    samplePowderDensity: 1.453
  },
  fapbi3: {
    name: "FAPbI₃",
    salt: "FAI", saltMw: MW.FAI,
    pbHalide: "PbI2", pbMw: MW.PbI2,
    solventA: "DMF", solventB: "DMSO",
    ratioA: 4, ratioB: 1,
    stockM: 1.5,
    finalM: 1.5,
    pbExcessRatio: 1.0,
    samplePowderDensity: 1.66
  },
  mapbbr3: {
    name: "MAPbBr₃",
    salt: "MABr", saltMw: MW.MABr,
    pbHalide: "PbBr2", pbMw: MW.PbBr2,
    solventA: "DMF", solventB: "DMSO",
    ratioA: 4, ratioB: 1,
    stockM: 1.42,
    finalM: 1.25,
    pbExcessRatio: 1.09,
    samplePowderDensity: 1.44
  },
  mixed: {
    name: "Mixed-Cation Perovskite (FA:MA = 5:1)",
    description: "Blend of FAPbI₃ (5 parts) + MAPbBr₃ (1 part)",
    ratioFAPbI3: 5,
    ratioMAPbBr3: 1,
    bandgap: 1.51
  }
};

const DOPANTS = {
  csi: { name: "CsI", mw: MW.CsI, solvent: "DMSO (neat)", ratioA: 1, ratioB: 0, solventA: "DMSO", solventB: "DMSO", defaultM: 1.5 },
  rbi: { name: "RbI", mw: MW.RbI, solvent: "DMF:DMSO 4:1", ratioA: 4, ratioB: 1, solventA: "DMF", solventB: "DMSO", defaultM: 1.5 },
  gai: { name: "GAI", mw: MW.GAI, solvent: "DMSO (neat)", ratioA: 1, ratioB: 0, solventA: "DMSO", solventB: "DMSO", defaultM: 1.5 }
};

const BANDGAP_DATA = {
  mapbi3: { name: "MAPbI₃", bandgap: 1.55, color: "🔴" },
  fapbi3: { name: "FAPbI₃", bandgap: 1.48, color: "🟠" },
  mapbbr3: { name: "MAPbBr₃", bandgap: 2.25, color: "🟡" },
  mixed: { name: "Mixed (FA:MA 5:1)", bandgap: 1.51, color: "🟣" }
};

const HTM_PRESETS = {
  spiro: {
    name: "Spiro-OMeTAD",
    mw: MW.Spiro,
    hostSolvent: "Chlorobenzene",
    hostDensity: DENSITY.Chlorobenzene,
    targetM: 0.07,
    spinNote: "4000 rpm for 30 sec",
    additives: [
      { key: "litfsi", name: "Li-TFSI", mw: MW.LiTFSI, ratio: 0.43, mode: "stock", stockSolvent: "ACN", stockM: 0.9 },
      { key: "tbp", name: "TBP (tert-butylpyridine)", mw: MW.TBP, ratio: 2.8, mode: "neat", density: DENSITY.TBP },
      { key: "co3", name: "Co(III) complex (FK209-type)", mw: MW.CoIII, ratio: 0.10, mode: "stock", stockSolvent: "ACN", stockM: 0.25 }
    ]
  },
  ptaa: {
    name: "PTAA",
    mw: MW.PTAA,
    hostSolvent: "Toluene",
    hostDensity: DENSITY.Toluene,
    targetM: 0.042,
    spinNote: "3000 rpm for 30 sec",
    additives: [
      { key: "litfsi", name: "Li-TFSI", mw: MW.LiTFSI, ratio: 0.325, mode: "stock", stockSolvent: "ACN", stockM: 1.8 },
      { key: "tbp", name: "TBP (tert-butylpyridine)", mw: MW.TBP, ratio: 1.0, mode: "neat", density: DENSITY.TBP }
    ]
  }
};
