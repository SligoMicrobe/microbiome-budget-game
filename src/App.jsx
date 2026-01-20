import { useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";

const TOTAL_BUDGET = 5000;

const COLORS = {
  stage1: {
    primary: "#16a34a",
    light: "#ecfdf5",
    border: "#bbf7d0",
    text: "#15803d",
  },
  stage2: {
    primary: "#2563eb",
    light: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e40af",
  },
  stage3: {
    primary: "#7c3aed",
    light: "#faf5ff",
    border: "#e9d5ff",
    text: "#6d28d9",
  },
};

const ICONS = {
  // Stage 1 - Sample types
  stool: "/icons/stool_sample.png",
  vaginal: "/icons/vaginal_swab.png",
  oral: "/icons/oral_swab.png",
  breastmilk: "/icons/breast_milk.png",
  skin: "/icons/skin_swab.png",

  // Stage 2 - Extraction
  dna: "/icons/dna_icon.png",
  rna: "/icons/rna_icon.png",
  metabolite: "/icons/metabolite_icon.png",
  isolation: "/icons/microbe_icon.png",

  // Stage 2 - Sequencing
  amplicon: "/icons/amplicon_icon.png",
  shotgun: "/icons/shotgun_icon.png",
  rnaseq: "/icons/rnaseq_icon.png",
  metabolomics: "/icons/metabolomics_icon.png",

  // Stage 3 - Analysis
  taxonomy: "/icons/taxonomic_icon.png",
  functional: "/icons/functional_icon.png",
  mag: "/icons/mags_icon.png",
  ml: "/icons/machinelearning_icon.png",
};

const TOOLTIPS = {
  // Stage 1
  participants:
    "Consider your statistical power needs. Larger cohorts give more reliable results but cost more. Plan for ~10–20% attrition.",
  timepoints:
    "More timepoints reveal temporal dynamics of the microbiome. Longitudinal studies cost more but provide mechanistic insights.",
  sampleTypes:
    "Each sample type reveals different microbial communities. Stool: gut microbiome. Vaginal: reproductive health. Oral: oral cavity. Skin: skin barrier function.",
  incentives:
    "Paying participants increases recruitment and retention rates. Essential for longitudinal studies to reduce dropout.",

  // Stage 2
  extraction:
    "Different extraction methods yield different biases. DNA extraction is standard; RNA captures active taxa; metabolites show functional activity.",
  dna: "Extracts total DNA for community profiling. Most commonly used approach.",
  rna: "Captures RNA from living cells. Shows which organisms are metabolically active.",
  metabolite: "Extracts small molecules produced by microbes. Reveals functional output of the community.",
  isolation: "Cultures and isolates individual strains. Expensive but enables functional assays.",

  amplicon:
    "Sequences marker genes (16S for bacteria, ITS for fungi). Fast, cheap, deep coverage. Limited taxonomic resolution.",
  shotgun:
    "Sequences random DNA fragments. Expensive but gives complete genomes and metabolic potential. Detects viruses.",
  rnaseq:
    "Sequences total RNA. Shows active genes and expression levels. Most expensive sequencing method.",
  metabolomics:
    "Measures small molecules. Shows functional metabolic state. Highest per-sample cost.",

  // Stage 3
  taxonomy:
    "Identifies 'who is there.' Assigns organisms to taxa (species, genus, family). Foundation for all analyses.",
  functional:
    "Identifies 'what can they do.' Predicts metabolic pathways and genes. Requires higher coverage.",
  mag: "Metagenome-Assembled Genomes. Reconstructs complete genomes from environmental samples. Computationally intensive.",
  ml: "Machine learning models for prediction (disease, phenotype, etc.). Requires statistical expertise and computational resources.",
  hpcHours:
    "High-performance computing for intensive analyses. MAG recovery and ML models require significant compute time.",
};

const COSTS = {
  // Stage 1
  participant: 5,          // per participant
  sampleTypePerSample: 1,  // per sample type per timepoint per participant
  incentivePerParticipant: 2,

  // Stage 2 (per sample)
  extraction: {
    dna: 2,
    rna: 2,
    metabolite: 2,
    isolation: 2,
  },
  sequencing: {
    amplicon: 2,
    shotgun: 5,
    rnaseq: 5,
    metabolomics: 5,
  },

  // Stage 3
  analysisPerSample: {
    taxonomy: 0.5,
    functional: 1,
    mag: 1,
    ml: 2,
  },
  hpcPerHour: 0.1,
};

const RESTRICTIONS = {
  sequencing: {
    amplicon: {
      requires: ["dna"],
      message: "Amplicon sequencing requires DNA extraction",
    },
    shotgun: {
      requires: ["dna"],
      message: "Shotgun sequencing requires DNA extraction",
    },
    rnaseq: {
      requires: ["rna"],
      message: "RNAseq requires RNA extraction",
    },
    metabolomics: {
      requires: ["metabolite"],
      message: "Metabolomics requires metabolite extraction",
    },
  },
  analysis: {
    functional: {
      requires: ["shotgun"],
      message: "Functional profiling requires shotgun sequencing",
    },
    mag: {
      requires: ["shotgun"],
      message: "MAG recovery requires shotgun sequencing",
    },
  },
};

function clampInt(n, min = 0) {
  const x = Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.floor(x));
}

function getRestrictionMessage(category, key, currentState) {
  const restriction = RESTRICTIONS[category]?.[key];
  if (!restriction) return null;
  
  const isBlocked = !restriction.requires.every(req => currentState[req]);
  return isBlocked ? restriction.message : null;
}

function InfoTip({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6 }}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="More info"
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          border: "1px solid #cbd5e1",
          background: "white",
          color: "#334155",
          fontSize: 12,
          lineHeight: "16px",
          fontWeight: 800,
          cursor: "pointer",
          padding: 0,
        }}
      >
        i
      </button>

      {open && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: 280,
            padding: 12,
            borderRadius: 12,
            background: "#0f172a",
            color: "white",
            fontSize: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            zIndex: 50,
          }}
        >
          {text}
          <div
            style={{
              position: "absolute",
              top: -6,
              left: 10,
              width: 12,
              height: 12,
              background: "#0f172a",
              transform: "rotate(45deg)",
            }}
          />
        </div>
      )}
    </span>
  );
}


export default function App() {
  // ---- Game state ----
  const [teamName, setTeamName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState("");

  // ---- Stage state ----
  const [stage, setStage] = useState(1);

  // Stage 1
  const [participants, setParticipants] = useState(0);
  const [timepoints, setTimepoints] = useState(1);
  const [sampleTypes, setSampleTypes] = useState({
    stool: false,
    vaginal: false,
    oral: false,
    breastmilk: false,
    skin: false,
  });
  const [incentives, setIncentives] = useState(false);

  // Stage 2
  const [extraction, setExtraction] = useState({
    dna: false,
    rna: false,
    metabolite: false,
    isolation: false,
  });
  const [sequencing, setSequencing] = useState({
    amplicon: false,
    shotgun: false,
    rnaseq: false,
    metabolomics: false,
  });

  // Stage 3
  const [analysis, setAnalysis] = useState({
    taxonomy: false,
    functional: false,
    mag: false,
    ml: false,
  });
  const [hpcHours, setHpcHours] = useState(0);

  // ---- Derived values ----
  const selectedSampleTypeCount = useMemo(
    () => Object.values(sampleTypes).filter(Boolean).length,
    [sampleTypes]
  );

  const totalSamples = useMemo(() => {
    return clampInt(participants) * clampInt(timepoints, 1) * selectedSampleTypeCount;
  }, [participants, timepoints, selectedSampleTypeCount]);

  const stage1Cost = useMemo(() => {
    const p = clampInt(participants);
    const t = clampInt(timepoints, 1);
    const sampleCost = p * t * selectedSampleTypeCount * COSTS.sampleTypePerSample;
    const recruitmentCost = p * COSTS.participant;
    const incentiveCost = incentives ? p * COSTS.incentivePerParticipant : 0;
    return recruitmentCost + sampleCost + incentiveCost;
  }, [participants, timepoints, selectedSampleTypeCount, incentives]);

  const stage2Cost = useMemo(() => {
    const perSampleExtraction = Object.entries(extraction)
      .filter(([, v]) => v)
      .reduce((sum, [k]) => sum + COSTS.extraction[k], 0);

    const perSampleSequencing = Object.entries(sequencing)
      .filter(([, v]) => v)
      .reduce((sum, [k]) => sum + COSTS.sequencing[k], 0);

    return totalSamples * (perSampleExtraction + perSampleSequencing);
  }, [extraction, sequencing, totalSamples]);

  const stage3Cost = useMemo(() => {
    const perSampleAnalysis = Object.entries(analysis)
      .filter(([, v]) => v)
      .reduce((sum, [k]) => sum + COSTS.analysisPerSample[k], 0);

    const hpcCost = Math.max(0, Number(hpcHours) || 0) * COSTS.hpcPerHour;
    return totalSamples * perSampleAnalysis + hpcCost;
  }, [analysis, hpcHours, totalSamples]);

  const totalCost = stage1Cost + stage2Cost + stage3Cost;
  const remaining = TOTAL_BUDGET - totalCost;
  const overBudget = remaining < 0;

  function startGame() {
    if (teamNameInput.trim()) {
      setTeamName(teamNameInput);
      setGameStarted(true);
    }
  }

  function resetAll() {
    setStage(1);
    setParticipants(0);
    setTimepoints(1);
    setSampleTypes({ stool: false, vaginal: false, oral: false, breastmilk: false, skin: false });
    setIncentives(false);
    setExtraction({ dna: false, rna: false, metabolite: false, isolation: false });
    setSequencing({ amplicon: false, shotgun: false, rnaseq: false, metabolomics: false });
    setAnalysis({ taxonomy: false, functional: false, mag: false, ml: false });
    setHpcHours(0);
  }

  function restartGame() {
    setGameStarted(false);
    setTeamName("");
    setTeamNameInput("");
    resetAll();
  }

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "white",
  };

  const pageStyle = {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    background: "#f6f7fb",
    minHeight: "100vh",
    padding: 20,
  };

  // Show team name modal if game hasn't started
  if (!gameStarted) {
    return (
      <div style={pageStyle}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}>
          <div style={{
            ...cardStyle,
            maxWidth: 400,
            padding: 40,
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            <h1 style={{ marginTop: 0, color: "#111827", fontSize: 28 }}>Microbiome Budget Game</h1>
            <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 16 }}>
              Design a microbiome sequencing study within your budget
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151", textAlign: "left" }}>
                Research Team Name
              </label>
              <input
                type="text"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && startGame()}
                placeholder="Enter your team name..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "2px solid #d1d5db",
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
                autoFocus
              />
            </div>

            <button
              onClick={startGame}
              disabled={!teamNameInput.trim()}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                background: teamNameInput.trim() ? "#16a34a" : "#d1d5db",
                color: "white",
                fontWeight: 800,
                fontSize: 16,
                cursor: teamNameInput.trim() ? "pointer" : "not-allowed",
                transition: "background 0.2s ease",
              }}
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  };

  return (
    <>
      <div style={pageStyle}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Microbiome Project Budget Game</div>
            <div style={{ color: "#6b7280" }}>Team: <strong>{teamName}</strong></div>
          </div>
          <button onClick={restartGame} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}>
            New Game
          </button>
        </div>

        <div style={{ ...cardStyle, marginBottom: 16, borderColor: overBudget ? "#ef4444" : "#e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>Your Team&apos;s Budget</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {remaining.toFixed(1)} / {TOTAL_BUDGET} credits remaining
              </div>
              {overBudget && (
                <div style={{ marginTop: 6, color: "#b91c1c", fontWeight: 600 }}>
                  Over budget! You&apos;ve exceeded your {TOTAL_BUDGET} credits by {Math.abs(remaining).toFixed(1)} credits.
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ color: "#1cb353", fontWeight: 600 }}>Stage 1: {stage1Cost.toFixed(1)}</span>
              <span style={{ color: "#2563eb", fontWeight: 600 }}>Stage 2: {stage2Cost.toFixed(1)}</span>
              <span style={{ color: "#ed3ade", fontWeight: 600 }}>Stage 3: {stage3Cost.toFixed(1)}</span>
            </div>
          </div>

          <div style={{ marginTop: 16, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Budget Used</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{((totalCost / TOTAL_BUDGET) * 100).toFixed(0)}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: 24,
                borderRadius: 12,
                background: "#e5e7eb",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min((totalCost / TOTAL_BUDGET) * 100, 100)}%`,
                  background: overBudget ? "#ef4444" : "#16a34a",
                  transition: "width 0.3s ease, background-color 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "white",
                }}
              >
                {(totalCost / TOTAL_BUDGET * 100).toFixed(0) > 5 && `${totalCost.toFixed(1)} / ${TOTAL_BUDGET}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 12,
                border: `2px solid ${COLORS[`stage${s}`].primary}`,
                background: stage === s ? COLORS[`stage${s}`].primary : "white",
                color: stage === s ? "white" : COLORS[`stage${s}`].primary,
                fontWeight: 700,
              }}
            >
              Stage {s}
            </button>
          ))}
        </div>

        {stage === 1 && (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: COLORS.stage1.text }}>Recruitment & Sampling</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <div style={{ fontWeight: 600 }}>  Number of participants  <InfoTip text={TOOLTIPS.participants} /> </div>
                <input
                  type="number"
                  value={participants}
                  min={0}
                  onChange={(e) => setParticipants(clampInt(parseFloat(e.target.value)))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: `2px solid ${COLORS.stage1.primary}` }}
                />
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  × {COSTS.participant} credits = {(clampInt(participants) * COSTS.participant).toFixed(1)}
                </div>
              </label>

              <label>
                <div style={{ fontWeight: 600 }}>Time points <InfoTip text={TOOLTIPS.timepoints} /></div>
                <input
                  type="number"
                  value={timepoints}
                  min={1}
                  onChange={(e) => setTimepoints(clampInt(parseFloat(e.target.value), 1))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: `2px solid ${COLORS.stage1.primary}` }}
                />
                <div style={{ color: "#6b7280", fontSize: 12 }}>collection points</div>
              </label>
            </div>

            <div style={{ marginTop: 14, fontWeight: 700 }}>Sample types (1 credit per sample) <InfoTip text={TOOLTIPS.sampleTypes} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
              {[
                ["stool", "Stool sample"],
                ["vaginal", "Vaginal swab"],
                ["oral", "Oral swab"],
                ["breastmilk", "Breast milk"],
                ["skin", "Skin swab"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 12,
                    border: `2px solid ${sampleTypes[key] ? COLORS.stage1.primary : "#d1d5db"}`,
                    background: sampleTypes[key] ? COLORS.stage1.light : "white",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <img src={ICONS[key]} alt={label} style={{ width: 48, height: 48, objectFit: "contain" }} />
                  <span style={{ fontSize: 13, fontWeight: 500, textAlign: "center" }}>{label}</span>
                  <input
                    type="checkbox"
                    checked={sampleTypes[key]}
                    onChange={(e) => setSampleTypes((prev) => ({ ...prev, [key]: e.target.checked }))}
                    style={{ marginTop: 4 }}
                  />
                </label>
              ))}
            </div>

            {selectedSampleTypeCount === 0 && (
              <div style={{ marginTop: 8, color: "#b45309", fontWeight: 600 }}>
                Please select at least one sample type
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
              <input type="checkbox" checked={incentives} onChange={(e) => setIncentives(e.target.checked)} />
              <span style={{ fontWeight: 700 }}>Include participant incentives <InfoTip text={TOOLTIPS.incentives} /></span>
              <span style={{ color: "#6b7280" }}>({COSTS.incentivePerParticipant} credits/participant)</span>
            </label>

            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: COLORS.stage1.light, border: `1px solid ${COLORS.stage1.border}` }}>
              <div style={{ fontWeight: 700 }}>
                Calculation: {clampInt(participants)} participants × {clampInt(timepoints, 1)} timepoints × {selectedSampleTypeCount} sample types ={" "}
                <span>{totalSamples}</span> total samples
              </div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>Stage 1 Total: {stage1Cost.toFixed(1)} credits</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => setStage(2)}
                style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: COLORS.stage1.primary, color: "white", fontWeight: 800 }}
              >
                Next Stage →
              </button>
            </div>
          </div>
        )}

        {stage === 2 && (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: COLORS.stage2.text }}>Data Collection</h2>
            <div style={{ color: "#6b7280", marginBottom: 10 }}>Costs are per sample. Total samples: <b>{totalSamples}</b></div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ ...cardStyle, background: "#f9fafb" }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Extraction methods (per sample) <InfoTip text={TOOLTIPS.extraction} /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    ["dna", "DNA extraction"],
                    ["rna", "RNA extraction"],
                    ["metabolite", "Metabolite extraction"],
                    ["isolation", "Microbial isolation"],
                  ].map(([k, label]) => (
                    <label key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s ease", background: extraction[k] ? "rgba(37, 99, 235, 0.1)" : "white" }}>
                      <img src={ICONS[k]} alt={label} style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={extraction[k]}
                          onChange={(e) => setExtraction((prev) => ({ ...prev, [k]: e.target.checked }))}
                          style={{ marginRight: 8 }}
                        />
                        {label} <InfoTip text={TOOLTIPS[k]} />
                      </span>
                      <span style={{ color: "#6b7280", whiteSpace: "nowrap" }}>{COSTS.extraction[k]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ ...cardStyle, background: "#f9fafb" }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Sequencing methods (per sample)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    ["amplicon", "Amplicon (16S/ITS) sequencing"],
                    ["shotgun", "Shotgun metagenomic"],
                    ["rnaseq", "RNAseq"],
                    ["metabolomics", "Metabolomics"],
                  ].map(([k, label]) => {
                    const restrictionMsg = getRestrictionMessage("sequencing", k, extraction);
                    const isDisabled = !!restrictionMsg;
                    
                    return (
                      <label key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 10, cursor: isDisabled ? "not-allowed" : "pointer", transition: "all 0.2s ease", background: sequencing[k] ? "rgba(37, 99, 235, 0.1)" : "white", opacity: isDisabled ? 0.5 : 1 }}>
                        <img src={ICONS[k]} alt={label} style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={sequencing[k]}
                            onChange={(e) => setSequencing((prev) => ({ ...prev, [k]: e.target.checked }))}
                            style={{ marginRight: 8 }}
                            disabled={isDisabled}
                          />
                          {label} <InfoTip text={TOOLTIPS[k]} />
                          {isDisabled && <div style={{ color: "#d97706", fontSize: 11, marginTop: 4 }}>⚠️ {restrictionMsg}</div>}
                        </span>
                        <span style={{ color: "#6b7280", whiteSpace: "nowrap" }}>{COSTS.sequencing[k]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: COLORS.stage2.light, border: `1px solid ${COLORS.stage2.border}` }}>
              <div style={{ fontWeight: 800 }}>Stage 2 Total: {stage2Cost.toFixed(1)} credits ({totalSamples} samples)</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button onClick={() => setStage(1)} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #d1d5db", background: "white" }}>
                ← Previous
              </button>
              <button
                onClick={() => setStage(3)}
                style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: COLORS.stage2.primary, color: "white", fontWeight: 800 }}
              >
                Next Stage →
              </button>
            </div>
          </div>
        )}

        {stage === 3 && (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: COLORS.stage3.text }}>Data Analysis</h2>
            <div style={{ color: "#6b7280", marginBottom: 10 }}>Costs are per sample. Total samples: <b>{totalSamples}</b></div>

            <label style={{ display: "block", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>HPC computing time (hours) <InfoTip text={TOOLTIPS.hpcHours} /></div>
              <input
                type="number"
                value={hpcHours}
                min={0}
                onChange={(e) => setHpcHours(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: `2px solid ${COLORS.stage3.primary}` }}
              />
              <div style={{ color: "#6b7280", fontSize: 12 }}>× {COSTS.hpcPerHour} credits = {((Math.max(0, Number(hpcHours) || 0)) * COSTS.hpcPerHour).toFixed(1)}</div>
            </label>

            <div style={{ ...cardStyle, background: COLORS.stage3.light }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Analysis methods (per sample)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["taxonomy", "Taxonomic profiling"],
                  ["functional", "Functional profiling"],
                  ["mag", "MAG recovery"],
                  ["ml", "Machine learning"],
                ].map(([k, label]) => {
                  const restrictionMsg = getRestrictionMessage("analysis", k, sequencing);
                  const isDisabled = !!restrictionMsg;
                  
                  return (
                    <label key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 10, cursor: isDisabled ? "not-allowed" : "pointer", transition: "all 0.2s ease", background: analysis[k] ? "rgba(124, 58, 237, 0.1)" : "white", opacity: isDisabled ? 0.5 : 1 }}>
                      <img src={ICONS[k]} alt={label} style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={analysis[k]}
                          onChange={(e) => setAnalysis((prev) => ({ ...prev, [k]: e.target.checked }))}
                          style={{ marginRight: 8 }}
                          disabled={isDisabled}
                        />
                        {label} <InfoTip text={TOOLTIPS[k]} />
                        {isDisabled && <div style={{ color: "#d97706", fontSize: 11, marginTop: 4 }}>⚠️ {restrictionMsg}</div>}
                      </span>
                      <span style={{ color: "#6b7280", whiteSpace: "nowrap" }}>{COSTS.analysisPerSample[k]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: COLORS.stage3.light, border: `1px solid ${COLORS.stage3.border}` }}>
              <div style={{ fontWeight: 800 }}>Stage 3 Total: {stage3Cost.toFixed(1)} credits</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button onClick={() => setStage(2)} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #d1d5db", background: "white" }}>
                ← Previous
              </button>
              <button
                onClick={() => alert("Nice! Next we can add a Study Summary screen + export/sharing.")}
                style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: COLORS.stage3.primary, color: "white", fontWeight: 800 }}
              >
                Complete Study Design
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
      <Analytics />
    </>
  );
}
