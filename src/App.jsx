import { useMemo, useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";

const TOTAL_BUDGET = 5000;

const COLORS = {
  stage1: {
    primary: "#16a34a",
    light: "#16a34a",
    border: "#16a34a",
    text: "#ffffff",
  },
  stage2: {
    primary: "#2563eb",
    light: "#2563eb",
    border: "#2563eb",
    text: "#ffffff",
  },
  stage3: {
    primary: "#7c3aed",
    light: "#7c3aed",
    border: "#7c3aed",
    text: "#ffffff",
  },
};

const ICONS = {
  // Stage 1 - Sample types
  stool: "/icons/stool_sample.png",
  vaginal: "/icons/vaginal_swab.png",
  oral: "/icons/oral_swab.png",
  breastmilk: "/icons/breast_milk.png",
  skin: "/icons/skin_swab.png",
  tissue: "/icons/biopsy.png",

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

  // Utility icons
  lock: "/icons/lock_icon.png",
};

const TOOLTIPS = {
  // Stage 1
  participants:
    "Consider your statistical power needs. Larger cohorts give more reliable results but cost more. Plan for ~10–20% attrition.",
  timepoints:
    "More timepoints reveal temporal dynamics of the microbiome. Longitudinal studies cost more but provide mechanistic insights.",
  sampleTypes:
    "Each sample type reveals different microbial communities. Stool: gut microbiome. Vaginal: reproductive health. Oral: oral cavity. Skin: skin barrier function. Tissue biopsy: diseased or specific tissues.",
  tissue: "Tissue biopsy from specific organs. More expensive but provides localized microbial communities. Useful for studying infection sites.",
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
  participant: {
    mice: 2,
    humans: 5,
  },
  sampleTypePerSample: {
    default: 1,
    tissue: 3,
  },
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
  hpcHoursPerSample: {
    taxonomy: 0.5,
    functional: 1.5,
    mag: 4,
    ml: 2,
  },
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
  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (open && !e.target.closest('[role="tooltip"], button[aria-describedby]')) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6 }}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="More information"
        aria-describedby={open ? tooltipId : undefined}
        className="info-tip-btn"
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          border: "1px solid #cbd5e1",
          background: "#f3f4f6",
          color: "#1f2937",
          fontSize: 12,
          lineHeight: "16px",
          fontWeight: 800,
          cursor: "pointer",
          padding: 0,
          outline: "2px solid transparent",
          outlineOffset: "2px",
        }}
      >
        i
      </button>

      {open && (
        <div
          id={tooltipId}
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
  const [studyComplete, setStudyComplete] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // ---- Responsive sizing ----
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---- Stage state ----
  const [stage, setStage] = useState(1);

  // Stage 1
  const [participantType, setParticipantType] = useState("humans");
  const [participants, setParticipants] = useState(0);
  const [timepoints, setTimepoints] = useState(1);
  const [sampleTypes, setSampleTypes] = useState({
    stool: false,
    vaginal: false,
    oral: false,
    breastmilk: false,
    skin: false,
    tissue: false,
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
    const participantCost = p * COSTS.participant[participantType];
    const sampleCost = p * t * selectedSampleTypeCount * COSTS.sampleTypePerSample.default;
    
    // Add extra cost for tissue biopsies
    const tissueCost = sampleTypes.tissue 
      ? p * t * (COSTS.sampleTypePerSample.tissue - COSTS.sampleTypePerSample.default)
      : 0;
    
    const incentiveCost = incentives ? p * COSTS.incentivePerParticipant : 0;
    return participantCost + sampleCost + tissueCost + incentiveCost;
  }, [participants, timepoints, selectedSampleTypeCount, participantType, incentives, sampleTypes.tissue]);

  const stage2Cost = useMemo(() => {
    const perSampleExtraction = Object.entries(extraction)
      .filter(([, v]) => v)
      .reduce((sum, [k]) => sum + COSTS.extraction[k], 0);

    const perSampleSequencing = Object.entries(sequencing)
      .filter(([, v]) => v)
      .reduce((sum, [k]) => sum + COSTS.sequencing[k], 0);

    return totalSamples * (perSampleExtraction + perSampleSequencing);
  }, [extraction, sequencing, totalSamples]);

  const hpcHours = useMemo(() => {
    return Object.entries(analysis)
      .filter(([, v]) => v)
      .reduce((sum, [k]) => sum + (COSTS.hpcHoursPerSample[k] || 0), 0) * totalSamples;
  }, [analysis, totalSamples]);

  const stage3Cost = useMemo(() => {
    const perSampleAnalysis = Object.entries(analysis)
      .filter(([, v]) => v)
      .reduce((sum, [k]) => sum + COSTS.analysisPerSample[k], 0);

    const hpcCost = hpcHours * COSTS.hpcPerHour;
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
    setParticipantType("humans");
    setParticipants(0);
    setTimepoints(1);
    setSampleTypes({ stool: false, vaginal: false, oral: false, breastmilk: false, skin: false, tissue: false });
    setIncentives(false);
    setExtraction({ dna: false, rna: false, metabolite: false, isolation: false });
    setSequencing({ amplicon: false, shotgun: false, rnaseq: false, metabolomics: false });
    setAnalysis({ taxonomy: false, functional: false, mag: false, ml: false });
  }

  function restartGame() {
    setGameStarted(false);
    setTeamName("");
    setTeamNameInput("");
    setStudyComplete(false);
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
    padding: isMobile ? 12 : 20,
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
            maxWidth: isMobile ? "90%" : 400,
            padding: isMobile ? 24 : 40,
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            <h1 style={{ marginTop: 0, color: "#111827", fontSize: isMobile ? 22 : 28 }}>Microbiome Budget Game</h1>
            <p style={{ color: "#1f2937", marginBottom: 24, fontSize: isMobile ? 14 : 16 }}>
              Design a microbiome sequencing study within your budget
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151", textAlign: "left", fontSize: isMobile ? 13 : 14 }}>
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
                  fontSize: isMobile ? 14 : 16,
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
                fontSize: isMobile ? 14 : 16,
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

  // Show study summary if complete
  if (studyComplete) {
    const sampleTypeLabels = {
      stool: "Stool sample",
      vaginal: "Vaginal swab",
      oral: "Oral swab",
      breastmilk: "Breast milk",
      skin: "Skin swab",
      tissue: "Tissue biopsy",
    };

    const extractionLabels = {
      dna: "DNA extraction",
      rna: "RNA extraction",
      metabolite: "Metabolite extraction",
      isolation: "Microbial isolation",
    };

    const sequencingLabels = {
      amplicon: "Amplicon (16S/ITS) sequencing",
      shotgun: "Shotgun metagenomic",
      rnaseq: "RNAseq",
      metabolomics: "Metabolomics",
    };

    const analysisLabels = {
      taxonomy: "Taxonomic profiling",
      functional: "Functional profiling",
      mag: "MAG recovery",
      ml: "Machine learning",
    };

    return (
      <div style={pageStyle}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: isMobile ? "12px" : "20px",
        }}>
          <div style={{
            ...cardStyle,
            maxWidth: isMobile ? "95%" : 700,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}>
            <h1 style={{ marginTop: 0, color: COLORS.stage1.text, fontSize: isMobile ? 20 : 26 }}>Study Design Summary</h1>
            <p style={{ color: "#4b5563", marginBottom: 20, fontSize: isMobile ? 13 : 14 }}>Team: <strong>{teamName}</strong></p>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
              <h3 style={{ color: COLORS.stage1.text, marginTop: 0, fontSize: isMobile ? 16 : 18 }}>Research Design</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: isMobile ? 13 : 14 }} data-grid="summary-grid">
                <div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>Study Subject</div>
                  <div style={{ fontWeight: 600 }}>
                    {participantType === "mice" ? "Mouse models" : "Human subjects"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>Sample Count</div>
                  <div style={{ fontWeight: 600 }}>
                    {clampInt(participants)} {participantType === "mice" ? "mice" : "participants"} × {clampInt(timepoints, 1)} timepoints = {totalSamples} total samples
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, marginTop: 16 }}>
              <h3 style={{ color: COLORS.stage1.text, marginTop: 0, fontSize: isMobile ? 16 : 18 }}>Sample Collection</h3>
              <div style={{ fontSize: isMobile ? 13 : 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Sample Types Selected:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(sampleTypes)
                    .filter(([, selected]) => selected)
                    .map(([key]) => (
                      <span
                        key={key}
                        style={{
                          background: COLORS.stage1.light,
                          color: COLORS.stage1.text,
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {sampleTypeLabels[key]}
                      </span>
                    ))}
                </div>
                {incentives && (
                  <div style={{ marginTop: 8, color: "#059669", fontWeight: 600 }}>
                    ✓ Participant incentives included
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, marginTop: 16 }}>
              <h3 style={{ color: COLORS.stage2.text, marginTop: 0, fontSize: isMobile ? 16 : 18 }}>Data Collection</h3>
              <div style={{ fontSize: isMobile ? 13 : 14 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Extraction Methods:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(extraction)
                      .filter(([, selected]) => selected)
                      .map(([key]) => (
                        <span key={key} style={{ background: "#dbeafe", color: COLORS.stage2.text, padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                          {extractionLabels[key]}
                        </span>
                      ))}
                    {Object.values(extraction).every(v => !v) && <span style={{ color: "#4b5563", fontStyle: "italic" }}>None selected</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Sequencing Methods:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(sequencing)
                      .filter(([, selected]) => selected)
                      .map(([key]) => (
                        <span key={key} style={{ background: "#dbeafe", color: COLORS.stage2.text, padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                          {sequencingLabels[key]}
                        </span>
                      ))}
                    {Object.values(sequencing).every(v => !v) && <span style={{ color: "#4b5563", fontStyle: "italic" }}>None selected</span>}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, marginTop: 16 }}>
              <h3 style={{ color: COLORS.stage3.text, marginTop: 0, fontSize: isMobile ? 16 : 18 }}>Data Analysis</h3>
              <div style={{ fontSize: isMobile ? 13 : 14 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Analysis Methods:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(analysis)
                      .filter(([, selected]) => selected)
                      .map(([key]) => (
                        <span key={key} style={{ background: "#f3e8ff", color: COLORS.stage3.text, padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                          {analysisLabels[key]}
                        </span>
                      ))}
                    {Object.values(analysis).every(v => !v) && <span style={{ color: "#4b5563", fontStyle: "italic" }}>None selected</span>}
                  </div>
                </div>
                {clampInt(hpcHours, 0) > 0 && (
                  <div style={{ color: "#7c3aed", fontWeight: 600 }}>
                    HPC Computing: {clampInt(hpcHours, 0)} hours
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, marginTop: 16, background: overBudget ? "#fef2f2" : COLORS.stage1.light, padding: 16, borderRadius: 12 }}>
              <h3 style={{ marginTop: 0, color: overBudget ? "#b91c1c" : COLORS.stage1.text, fontSize: isMobile ? 16 : 18 }}>Budget Summary</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: isMobile ? 13 : 14, marginBottom: 12 }} data-grid="summary-grid">
                <div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>Stage 1: Recruitment & Sampling</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{stage1Cost.toFixed(1)} credits</div>
                </div>
                <div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>Stage 2: Data Collection</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{stage2Cost.toFixed(1)} credits</div>
                </div>
                <div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>Stage 3: Data Analysis</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{stage3Cost.toFixed(1)} credits</div>
                </div>
                <div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>Total Budget</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{TOTAL_BUDGET} credits</div>
                </div>
              </div>
              <div style={{ borderTop: "2px solid " + (overBudget ? "#fca5a5" : COLORS.stage1.border), paddingTop: 12, marginTop: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: overBudget ? "#b91c1c" : "#059669" }}>
                  {overBudget ? "❌ Over Budget" : "✓ Within Budget"}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, color: overBudget ? "#b91c1c" : COLORS.stage1.text }}>
                  {overBudget
                    ? `Over by ${Math.abs(remaining).toFixed(1)} credits`
                    : `${remaining.toFixed(1)} credits remaining`}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "space-between", flexDirection: isMobile ? "column" : "row" }}>
              <button
                onClick={() => setStudyComplete(false)}
                style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid #d1d5db", background: "white", fontWeight: 600, cursor: "pointer" }}
              >
                ← Edit Design
              </button>
              <button
                onClick={restartGame}
                style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "none", background: COLORS.stage1.primary, color: "white", fontWeight: 800, cursor: "pointer" }}
              >
                New Study
              </button>
            </div>
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
      <style>{`
        * {
          box-sizing: border-box;
        }

        label {
          outline: 2px solid transparent;
          outline-offset: 2px;
        }

        label:focus-within {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        input:focus {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        button:focus {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        @media (max-width: 639px) {
          div[data-grid="sample-types"] {
            grid-template-columns: repeat(1, 1fr) !important;
          }
          div[data-grid="stage2-layout"] {
            grid-template-columns: 1fr !important;
          }
          div[data-grid="summary-grid"] {
            grid-template-columns: 1fr !important;
          }
          div[data-grid="header"] {
            flex-direction: column;
            gap: 12px;
          }
          div[data-grid="budget-row"] {
            flex-direction: column;
            gap: 8px;
          }
          button[data-stage-btn] {
            padding: 8px 6px !important;
            font-size: 13px !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          div[data-grid="sample-types"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (min-width: 1024px) {
          div[data-grid="sample-types"] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          div[data-grid="stage2-layout"] {
            grid-template-columns: 1fr 1fr !important;
          }
          div[data-grid="summary-grid"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 639px) {
          h1 { font-size: 20px !important; }
          h2 { font-size: 18px !important; }
          h3 { font-size: 16px !important; }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .app-root {
            background: #111827 !important;
            color-scheme: dark;
          }

          /* Card backgrounds */
          .app-root > div[style*="border"] {
            background: #1f2937 !important;
            border-color: #374151 !important;
          }

          /* Input styling for dark mode */
          input[type="text"],
          input[type="number"],
          input[type="radio"],
          input[type="checkbox"] {
            background: #2d3748 !important;
            color: #f0f0f0 !important;
            border-color: #4b5563 !important;
            accent-color: #16a34a !important;
          }

          input[type="text"]:focus,
          input[type="number"]:focus,
          input[type="radio"]:focus,
          input[type="checkbox"]:focus {
            outline: 2px solid #60a5fa !important;
            outline-offset: 2px !important;
          }

          input[type="text"]::placeholder,
          input[type="number"]::placeholder {
            color: #9ca3af !important;
          }

          /* Buttons */
          button {
            background: #2d3748 !important;
            color: #f0f0f0 !important;
            border-color: #4b5563 !important;
          }

          button:focus {
            outline: 2px solid #60a5fa !important;
            outline-offset: 2px !important;
          }

          label:focus-within {
            outline: 2px solid #60a5fa !important;
            outline-offset: 2px !important;
          }

          button:disabled {
            background: #4b5563 !important;
            color: #9ca3af !important;
          }

          /* Info tip button styling */
          button.info-tip-btn {
            background: #374151 !important;
            color: #e5e7eb !important;
            border-color: #4b5563 !important;
          }

          /* Tooltip styling */
          div[role="tooltip"] {
            background: #0f172a !important;
            color: white !important;
          }
        }
      `}</style>
      <div style={pageStyle} className="app-root">
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={headerStyle} data-grid="header">
          <div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "#000000" }}>Microbiome Project Budget Game</div>
            <div style={{ color: "#4b5563", fontSize: isMobile ? 12 : 14 }}>Team: <strong>{teamName}</strong></div>
          </div>
          <button onClick={restartGame} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: isMobile ? 13 : 14 }}>
            New Game
          </button>
        </div>

        <div style={{ ...cardStyle, marginBottom: 16, borderColor: overBudget ? "#ef4444" : "#e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }} data-grid="budget-row">
            <div>
              <div style={{ color: "#374151", fontSize: 12 }}>Your Team&apos;s Budget</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {Math.max(0, remaining).toFixed(1)} / {TOTAL_BUDGET} credits remaining
              </div>
              {overBudget && (
                <div style={{ marginTop: 6, color: "#b91c1c", fontWeight: 600 }}>
                  Over budget! You&apos;ve exceeded your {TOTAL_BUDGET} credits by {Math.abs(remaining).toFixed(1)} credits.
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: isMobile ? 8 : 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "#1cb353", fontWeight: 600, fontSize: isMobile ? 12 : 14 }}>Stage 1: {stage1Cost.toFixed(1)}</span>
              <span style={{ color: "#2563eb", fontWeight: 600, fontSize: isMobile ? 12 : 14 }}>Stage 2: {stage2Cost.toFixed(1)}</span>
              <span style={{ color: "#ed3ade", fontWeight: 600, fontSize: isMobile ? 12 : 14 }}>Stage 3: {stage3Cost.toFixed(1)}</span>
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
              data-stage-btn
              style={{
                flex: 1,
                padding: isMobile ? 8 : 10,
                borderRadius: 12,
                border: `2px solid ${COLORS[`stage${s}`].primary}`,
                background: stage === s ? COLORS[`stage${s}`].primary : "white",
                color: stage === s ? "white" : COLORS[`stage${s}`].primary,
                fontWeight: 700,
                fontSize: isMobile ? 13 : 14,
              }}
            >
              {isMobile ? `S${s}` : `Stage ${s}`}
            </button>
          ))}
        </div>

        {stage === 1 && (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: "#000000" }}>Recruitment & Sampling</h2>

            <div style={{ ...cardStyle, background: COLORS.stage1.light, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 12, color: "white" }}>Study Subject <InfoTip text="Choose between mouse models (cheaper) or human subjects (more expensive, more relevant for human disease)" /></div>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  ["mice", "Mouse models", "2 credits/subject"],
                  ["humans", "Human subjects", "5 credits/subject"],
                ].map(([type, label, cost]) => (
                  <label key={type} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="participantType"
                      value={type}
                      checked={participantType === type}
                      onChange={(e) => setParticipantType(e.target.value)}
                    />
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>({cost})</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ outline: "none" }}>
                <div style={{ fontWeight: 600, color: "#1f2937" }}>Number of {participantType === "mice" ? "mice" : "participants"} <InfoTip text={TOOLTIPS.participants} /></div>
                <input
                  type="number"
                  value={participants}
                  min={0}
                  onChange={(e) => setParticipants(clampInt(parseFloat(e.target.value)))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: `2px solid ${COLORS.stage1.primary}` }}
                />
                <div style={{ color: "#4b5563", fontSize: 12 }}>
                  × {COSTS.participant[participantType]} credits = {(clampInt(participants) * COSTS.participant[participantType]).toFixed(1)}
                </div>
              </label>

              <label style={{ outline: "none" }}>
                <div style={{ fontWeight: 600, color: "#1f2937" }}>Time points <InfoTip text={TOOLTIPS.timepoints} /></div>
                <input
                  type="number"
                  value={timepoints}
                  min={1}
                  onChange={(e) => setTimepoints(clampInt(parseFloat(e.target.value), 1))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: `2px solid ${COLORS.stage1.primary}` }}
                />
                <div style={{ color: "#4b5563", fontSize: 12 }}>collection points</div>
              </label>
            </div>

            <div style={{ marginTop: 14, fontWeight: 700, fontSize: isMobile ? 14 : 16, color: "#1f2937" }}>Sample types <InfoTip text={TOOLTIPS.sampleTypes} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: isMobile ? 8 : 10, marginTop: 10 }} data-grid="sample-types">
              {[
                ["stool", "Stool sample"],
                ["vaginal", "Vaginal swab"],
                ["oral", "Oral swab"],
                ["breastmilk", "Breast milk"],
                ["skin", "Skin swab"],
                ["tissue", "Tissue biopsy"],
              ].map(([key, label]) => {
                const cost = key === "tissue" ? COSTS.sampleTypePerSample.tissue : COSTS.sampleTypePerSample.default;
                return (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      alignItems: "center",
                      padding: isMobile ? 10 : 12,
                      borderRadius: 12,
                      border: `2px solid ${sampleTypes[key] ? COLORS.stage1.primary : "#d1d5db"}`,
                      background: sampleTypes[key] ? COLORS.stage1.light : "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <img src={ICONS[key]} alt={label} style={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, objectFit: "contain" }} />
                    <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 500, textAlign: "center", color: sampleTypes[key] ? "white" : "#1f2937" }}>{label}</span>
                    <span style={{ fontSize: isMobile ? 10 : 11, color: "#4b5563" }}>{cost} credits/sample</span>
                    <input
                      type="checkbox"
                      checked={sampleTypes[key]}
                      onChange={(e) => setSampleTypes((prev) => ({ ...prev, [key]: e.target.checked }))}
                      style={{ marginTop: 4 }}
                    />
                  </label>
                );
              })}
            </div>

            {selectedSampleTypeCount === 0 && (
              <div style={{ marginTop: 8, color: "#b45309", fontWeight: 600 }}>
                Please select at least one sample type
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
              <input type="checkbox" checked={incentives} onChange={(e) => setIncentives(e.target.checked)} />
              <span style={{ fontWeight: 700 }}>Include participant incentives <InfoTip text={TOOLTIPS.incentives} /></span>
              <span style={{ color: "#4b5563" }}>({COSTS.incentivePerParticipant} credits/participant)</span>
            </label>

            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: COLORS.stage1.light, border: `1px solid ${COLORS.stage1.border}` }}>
              <div style={{ fontWeight: 700, color: "white" }}>
                Calculation: {clampInt(participants)} participants × {clampInt(timepoints, 1)} timepoints × {selectedSampleTypeCount} sample types ={" "}
                <span>{totalSamples}</span> total samples
              </div>
              <div style={{ marginTop: 6, fontWeight: 700, color: "white" }}>Stage 1 Total: {stage1Cost.toFixed(1)} credits</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => setStage(2)}
                disabled={selectedSampleTypeCount === 0}
                style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: selectedSampleTypeCount === 0 ? "#9ca3af" : COLORS.stage1.primary, color: "white", fontWeight: 800, cursor: selectedSampleTypeCount === 0 ? "not-allowed" : "pointer" }}
              >
                Next Stage →
              </button>
            </div>
          </div>
        )}

        {stage === 2 && (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: "#000000" }}>Data Collection</h2>
            <div style={{ color: "#1f2937", marginBottom: 10 }}>Costs are per sample. Total samples: <b>{totalSamples}</b></div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} data-grid="stage2-layout">
              <div style={{ ...cardStyle, background: COLORS.stage2.light }}>
                <div style={{ fontWeight: 800, marginBottom: 12, color: "white" }}>Extraction methods (per sample) <InfoTip text={TOOLTIPS.extraction} /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    ["dna", "DNA extraction"],
                    ["rna", "RNA extraction"],
                    ["metabolite", "Metabolite extraction"],
                    ["isolation", "Microbial isolation"],
                  ].map(([k, label]) => (
                    <label key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s ease", background: extraction[k] ? "rgba(37, 99, 235, 0.1)" : "white", color: extraction[k] ? "white" : "#1f2937", outline: "none" }}>
                      <img src={ICONS[k]} alt={label} style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={extraction[k]}
                          onChange={(e) => {
                            const newExtraction = { ...extraction, [k]: e.target.checked };
                            setExtraction(newExtraction);
                            
                            // Clean up invalid sequencing selections
                            const newSequencing = { ...sequencing };
                            Object.entries(RESTRICTIONS.sequencing).forEach(([seqKey, restriction]) => {
                              if (newSequencing[seqKey]) {
                                const isBlocked = !restriction.requires.every(req => newExtraction[req]);
                                if (isBlocked) {
                                  newSequencing[seqKey] = false;
                                }
                              }
                            });
                            setSequencing(newSequencing);
                          }}
                          style={{ marginRight: 8 }}
                        />
                        {label} <InfoTip text={TOOLTIPS[k]} />
                      </span>
                      <span style={{ color: "#4b5563", whiteSpace: "nowrap" }}>{COSTS.extraction[k]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ ...cardStyle, background: COLORS.stage2.light }}>
                <div style={{ fontWeight: 800, marginBottom: 12, color: "white" }}>Sequencing methods (per sample)</div>
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
                      <div key={k} style={{ position: "relative" }}>
                        {isDisabled && (
                          <div style={{ position: "absolute", top: 2, right: 2, width: 28, height: 28, background: "white", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #d1d5db", zIndex: 10 }}>
                            <img src={ICONS.lock} alt="locked" style={{ width: 18, height: 18, objectFit: "contain" }} />
                          </div>
                        )}
                        <label style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 10, cursor: isDisabled ? "not-allowed" : "pointer", transition: "all 0.2s ease", background: sequencing[k] ? "rgba(37, 99, 235, 0.1)" : "white", opacity: isDisabled ? 0.5 : 1, color: sequencing[k] ? "white" : "#1f2937", outline: "none" }}>
                          <img src={ICONS[k]} alt={label} style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={sequencing[k]}
                              onChange={(e) => {
                                const newSequencing = { ...sequencing, [k]: e.target.checked };
                                setSequencing(newSequencing);
                                
                                // Clean up invalid analysis selections
                                const newAnalysis = { ...analysis };
                                Object.entries(RESTRICTIONS.analysis).forEach(([analysisKey, restriction]) => {
                                  if (newAnalysis[analysisKey]) {
                                    const isBlocked = !restriction.requires.every(req => newSequencing[req]);
                                    if (isBlocked) {
                                      newAnalysis[analysisKey] = false;
                                    }
                                  }
                                });
                                setAnalysis(newAnalysis);
                              }}
                              style={{ marginRight: 8 }}
                              disabled={isDisabled}
                            />
                            {label} <InfoTip text={TOOLTIPS[k]} />
                            {isDisabled && <div style={{ color: "#d97706", fontSize: 11, marginTop: 4 }}>⚠️ {restrictionMsg}</div>}
                          </span>
                          <span style={{ color: "#4b5563", whiteSpace: "nowrap" }}>{COSTS.sequencing[k]}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: COLORS.stage2.light, border: `1px solid ${COLORS.stage2.border}` }}>
              <div style={{ fontWeight: 800, color: "white" }}>Stage 2 Total: {stage2Cost.toFixed(1)} credits ({totalSamples} samples)</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
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
            <h2 style={{ marginTop: 0, color: "#000000" }}>Data Analysis</h2>
            <div style={{ color: "#1f2937", marginBottom: 10 }}>Costs are per sample. Total samples: <b>{totalSamples}</b></div>

            <div style={{ ...cardStyle, background: COLORS.stage3.light }}>
              <div style={{ fontWeight: 800, marginBottom: 12, color: "white" }}>Analysis methods (per sample)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["taxonomy", "Taxonomic profiling"],
                  ["functional", "Functional profiling"],
                  ["mag", "MAG recovery"],
                  ["ml", "Machine learning"],
                ].map(([k, label]) => {
                  const restrictionMsg = getRestrictionMessage("analysis", k, sequencing);
                  const isDisabled = !!restrictionMsg;
                  const hpcPerSample = COSTS.hpcHoursPerSample[k] || 0;
                  
                  return (
                    <div key={k} style={{ position: "relative" }}>
                      {isDisabled && (
                        <div style={{ position: "absolute", top: 2, right: 2, width: 28, height: 28, background: "white", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #d1d5db", zIndex: 10 }}>
                          <img src={ICONS.lock} alt="locked" style={{ width: 18, height: 18, objectFit: "contain" }} />
                        </div>
                      )}
                      <label style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 10, cursor: isDisabled ? "not-allowed" : "pointer", transition: "all 0.2s ease", background: analysis[k] ? "rgba(124, 58, 237, 0.1)" : "white", opacity: isDisabled ? 0.5 : 1, color: analysis[k] ? "white" : "#1f2937", outline: "none" }}>
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
                        <span style={{ color: "#6b7280", whiteSpace: "nowrap" }}>
                          <div style={{ fontSize: 12 }}>{COSTS.analysisPerSample[k]}</div>
                          <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>{hpcPerSample} hrs/sample</div>
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: COLORS.stage3.light, border: `1px solid ${COLORS.stage3.border}` }}>
              <div style={{ fontWeight: 800, marginBottom: 8, color: "white" }}>HPC Computing Required</div>
              <div style={{ fontSize: 14, color: "white", marginBottom: 8 }}>
                {Object.values(analysis).some(v => v) 
                  ? `${hpcHours.toFixed(1)} hours (${(hpcHours * COSTS.hpcPerHour).toFixed(1)} credits)`
                  : "No analysis methods selected"}
              </div>
              <div style={{ fontWeight: 800, paddingTop: 8, borderTop: `1px solid ${COLORS.stage3.border}`, color: "white" }}>Stage 3 Total: {stage3Cost.toFixed(1)} credits</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button onClick={() => setStage(2)} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #d1d5db", background: "white" }}>
                ← Previous
              </button>
              <button
                onClick={() => setStudyComplete(true)}
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
