// Pure calculation helpers — no DOM access here, so logic stays easy to verify.

function mixedDensity(ratioA, ratioB, dA, dB) {
  const total = ratioA + ratioB;
  if (total <= 0) return dA;
  return (dA * ratioA + dB * ratioB) / total;
}

function fmt(n, digits = 4) {
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(digits)).toString();
}

// samplesN, volPerSampleUL, bufferPct -> total final volume in microlitres
function totalFinalVolumeUL(samplesN, volPerSampleUL, bufferPct) {
  return samplesN * volPerSampleUL * (1 + bufferPct / 100);
}

/**
 * Generalised AB-halide perovskite calculation:
 * organic salt (1:1 mol with Pb-halide) dissolved into a Pb-halide stock solution,
 * topped up with neat mixed solvent to hit the final target molarity.
 */
function calcPerovskite({
  saltMw, pbMw, ratioA, ratioB, densityA, densityB,
  stockM, finalM, pbExcessRatio, samplesN, volPerSampleUL, bufferPct,
  weighTolerancePct, stockBatchVolumeML
}) {
  const finalVolUL = totalFinalVolumeUL(samplesN, volPerSampleUL, bufferPct);
  const finalVolL = finalVolUL * 1e-6;

  // Final molarity is defined relative to the organic salt (the labelled "1 M perovskite solution"),
  // while the Pb-halide is typically dosed in slight excess (pbExcessRatio, e.g. 1.09 = 9% excess PbI2).
  const molFinal = finalM * finalVolL;
  const massSaltG = molFinal * saltMw;
  const molPbNeeded = molFinal * pbExcessRatio;

  const volStockNeededL = stockM > 0 ? molPbNeeded / stockM : 0;
  const volStockNeededUL = volStockNeededL * 1e6;
  const volNeatSolventUL = finalVolUL - volStockNeededUL;

  const mixDensity = mixedDensity(ratioA, ratioB, densityA, densityB);

  // Stock solution prep, sized independently (the student typically prepares a round batch, e.g. 1-2 mL)
  const stockVolL = stockBatchVolumeML / 1000;
  const molPbInStock = stockM * stockVolL;
  const massPbPowderG = molPbInStock * pbMw;
  const stockVolA_mL = stockBatchVolumeML * ratioA / (ratioA + ratioB);
  const stockVolB_mL = stockBatchVolumeML * ratioB / (ratioA + ratioB);

  return {
    finalVolUL, molFinal, massSaltG,
    saltRangeLowG: massSaltG * (1 - weighTolerancePct / 100),
    saltRangeHighG: massSaltG * (1 + weighTolerancePct / 100),
    volStockNeededUL, volNeatSolventUL,
    mixDensity,
    molPbInStock, massPbPowderG,
    pbRangeLowG: massPbPowderG * (1 - weighTolerancePct / 100),
    pbRangeHighG: massPbPowderG * (1 + weighTolerancePct / 100),
    stockVolA_mL, stockVolB_mL,
    stockEnoughForBatch: volStockNeededUL <= stockBatchVolumeML * 1000,
  };
}

function calcDopantStock({ mw, targetM, batchVolumeML, ratioA, ratioB, densityA, densityB }) {
  const volL = batchVolumeML / 1000;
  const mol = targetM * volL;
  const massG = mol * mw;
  const volA_mL = batchVolumeML * ratioA / (ratioA + ratioB);
  const volB_mL = batchVolumeML * ratioB / (ratioA + ratioB);
  return { massG, volA_mL, volB_mL, mixDensity: mixedDensity(ratioA, ratioB, densityA, densityB) };
}

function calcDoping({ baseVolumeML, dopingPct }) {
  // volume of dopant stock to add so that dopant is dopingPct of the FINAL volume
  const dopantVolML = baseVolumeML / (100 - dopingPct) * dopingPct;
  return { dopantVolML, finalVolML: baseVolumeML + dopantVolML };
}

/**
 * HTM (Spiro-OMeTAD / PTAA) solution calculation, scaled to a target final volume.
 * additives: [{name, mw, ratio (mol/mol HTM), mode: 'stock'|'neat', stockM/density}]
 */
function calcHTM({ mw, targetM, finalVolumeUL, additives }) {
  const finalVolL = finalVolumeUL * 1e-6;
  const molHTM = targetM * finalVolL;
  const massHTM_g = molHTM * mw;

  let usedVolumeUL = 0;
  const additiveResults = additives.map(a => {
    const molAdditive = a.ratio * molHTM;
    let volUL;
    if (a.mode === "stock") {
      volUL = (molAdditive / a.stockM) * 1e6; // L -> uL
    } else {
      // neat liquid, by density: mass = mol * MW, volume = mass / density
      const massG = molAdditive * a.mw;
      volUL = (massG / a.density) * 1000; // mL -> uL
    }
    usedVolumeUL += volUL;
    return { ...a, molAdditive, volUL };
  });

  const hostSolventVolUL = finalVolumeUL - usedVolumeUL;

  return { molHTM, massHTM_g, additiveResults, hostSolventVolUL, finalVolumeUL };
}

function calcAdditiveStockPrep({ mw, stockM, weighedMassG, density }) {
  // Volume of solvent needed to dissolve a chosen mass of solid additive to reach stockM
  const mol = weighedMassG / mw;
  const volL = mol / stockM;
  return { mol, volmL: volL * 1000 };
}

function calcMixedCation({ samplesN, volPerSampleUL, bufferPct, ratioFAPbI3, ratioMAPbBr3 }) {
  const finalVolUL = totalFinalVolumeUL(samplesN, volPerSampleUL, bufferPct);
  const totalRatio = ratioFAPbI3 + ratioMAPbBr3;
  const volFAPbI3UL = finalVolUL * (ratioFAPbI3 / totalRatio);
  const volMAPbBr3UL = finalVolUL * (ratioMAPbBr3 / totalRatio);
  return { finalVolUL, volFAPbI3UL, volMAPbBr3UL, ratioStr: `${ratioFAPbI3}:${ratioMAPbBr3}` };
}
