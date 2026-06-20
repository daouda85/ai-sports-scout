import { useState, useEffect, useRef } from "react"

const BACKEND_URL = "http://127.0.0.1:8000"

function usePlayerSearch() {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [show, setShow] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/search?query=${encodeURIComponent(query)}`
        )
        const data = await response.json()
        setSuggestions(data.results)
        setActiveIndex(-1)
      } catch {
        setSuggestions([])
      }
    }, 250)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  return {
    query,
    setQuery,
    suggestions,
    setSuggestions,
    show,
    setShow,
    activeIndex,
    setActiveIndex,
  }
}

function PlayerInput({ search, placeholder, onSubmit, wrapperRef }) {
  const handleKeyDown = (e) => {
    if (!search.show || search.suggestions.length === 0) {
      if (e.key === "Enter") onSubmit(search.query)
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      search.setActiveIndex((prev) => (prev + 1) % search.suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      search.setActiveIndex((prev) =>
        prev <= 0 ? search.suggestions.length - 1 : prev - 1
      )
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (search.activeIndex >= 0) {
        const name = search.suggestions[search.activeIndex]
        search.setQuery(name)
        search.setSuggestions([])
        search.setShow(false)
        onSubmit(name)
      } else {
        onSubmit(search.query)
      }
    } else if (e.key === "Escape") {
      search.setShow(false)
    }
  }

  return (
    <div ref={wrapperRef} style={styles.searchWrapperFlex}>
      <div style={styles.inputShell}>
        <span style={styles.inputIcon}>#</span>
        <input
          style={styles.input}
          type="text"
          placeholder={placeholder}
          value={search.query}
          onChange={(e) => {
            search.setQuery(e.target.value)
            search.setShow(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => search.setShow(true)}
        />
      </div>

      {search.show && search.suggestions.length > 0 && (
        <div style={styles.suggestionsBox}>
          {search.suggestions.map((name, i) => (
            <div
              key={name}
              style={{
                ...styles.suggestionItem,
                ...(i === search.activeIndex ? styles.suggestionItemActive : {}),
                ...(i === search.suggestions.length - 1
                  ? { borderBottom: "none" }
                  : {}),
              }}
              onMouseDown={() => {
                search.setQuery(name)
                search.setSuggestions([])
                search.setShow(false)
                onSubmit(name)
              }}
              onMouseEnter={() => search.setActiveIndex(i)}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState("single")

  // single player mode
  const singleSearch = usePlayerSearch()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const singleWrapperRef = useRef(null)

  // compare mode
  const searchA = usePlayerSearch()
  const searchB = usePlayerSearch()
  const [compareResult, setCompareResult] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState(null)
  const wrapperARef = useRef(null)
  const wrapperBRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (singleWrapperRef.current && !singleWrapperRef.current.contains(e.target)) {
        singleSearch.setShow(false)
      }
      if (wrapperARef.current && !wrapperARef.current.contains(e.target)) {
        searchA.setShow(false)
      }
      if (wrapperBRef.current && !wrapperBRef.current.contains(e.target)) {
        searchB.setShow(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = async (nameOverride) => {
    const nameToSearch = nameOverride || singleSearch.query
    if (!nameToSearch.trim()) return

    singleSearch.setShow(false)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${BACKEND_URL}/scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: nameToSearch }),
      })

      if (!response.ok) {
        throw new Error("No record found for that name. Check the spelling and try again.")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = async () => {
    if (!searchA.query.trim() || !searchB.query.trim()) {
      setCompareError("Enter both player names to compare.")
      return
    }

    searchA.setShow(false)
    searchB.setShow(false)
    setCompareLoading(true)
    setCompareError(null)
    setCompareResult(null)

    try {
      const response = await fetch(`${BACKEND_URL}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_a: searchA.query,
          player_b: searchB.query,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.detail || "One of those players could not be found.")
      }

      const data = await response.json()
      setCompareResult(data)
    } catch (err) {
      setCompareError(err.message)
    } finally {
      setCompareLoading(false)
    }
  }

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    setCompareError(null)
  }

  return (
    <div style={styles.page}>
      <style>{fontImports}</style>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <SeamMark />
            <div>
              <div style={styles.brandTitle}>SCOUT AGENT</div>
              <div style={styles.brandSubtitle}>AI Player Reports</div>
            </div>
          </div>
          <div style={styles.liveTag}>
            <span style={styles.liveDot} />
            LIVE BOX SCORES
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.hero}>
          <h1 style={styles.heroTitle}>
            Scout any player.<br />Instantly.
          </h1>
          <p style={styles.heroSubtitle}>
            Pull a player's last five games and get a scouting memo written in
            plain language, generated fresh from current-season box scores.
          </p>
        </section>

        <div style={styles.modeToggle}>
          <button
            style={{
              ...styles.modeButton,
              ...(mode === "single" ? styles.modeButtonActive : {}),
            }}
            onClick={() => switchMode("single")}
          >
            Single player
          </button>
          <button
            style={{
              ...styles.modeButton,
              ...(mode === "compare" ? styles.modeButtonActive : {}),
            }}
            onClick={() => switchMode("compare")}
          >
            Compare two
          </button>
        </div>

        {mode === "single" && (
          <>
            <div style={styles.searchRow}>
              <PlayerInput
                search={singleSearch}
                placeholder="Search a player, e.g. Anthony Edwards"
                onSubmit={handleSearch}
                wrapperRef={singleWrapperRef}
              />
              <button
                style={{
                  ...styles.button,
                  ...(loading ? styles.buttonLoading : {}),
                }}
                onClick={() => handleSearch()}
                disabled={loading}
              >
                {loading ? "Pulling stats…" : "Generate report"}
              </button>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <strong style={styles.errorLabel}>No match</strong>
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div style={styles.skeletonWrap}>
                <div style={{ ...styles.skeletonLine, width: "40%", height: 28 }} />
                <div style={styles.skeletonCard} />
                <div style={styles.skeletonCard} />
              </div>
            )}

            {result && !loading && (
              <div style={styles.resultContainer}>
                <div style={styles.playerRow}>
                  <h2 style={styles.playerName}>{result.player}</h2>
                  <span style={styles.formBadge}>FORM REPORT</span>
                </div>

                <div style={styles.statsCard}>
                  <div style={styles.cardLabel}>Last five games</div>
                  <div style={styles.statTicker}>
                    {result.stats.map((stat, i) => (
                      <div key={i} style={styles.statChip}>
                        {stat}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={styles.memoCard}>
                  <div style={styles.memoStamp}>SCOUTING MEMO</div>
                  <div style={styles.cardLabel}>Analysis</div>
                  <p style={styles.reportText}>{result.report}</p>
                </div>
              </div>
            )}
          </>
        )}

        {mode === "compare" && (
          <>
            <div style={styles.compareRow}>
              <PlayerInput
                search={searchA}
                placeholder="Player A, e.g. LeBron James"
                onSubmit={() => {}}
                wrapperRef={wrapperARef}
              />
              <span style={styles.vsLabel}>VS</span>
              <PlayerInput
                search={searchB}
                placeholder="Player B, e.g. Stephen Curry"
                onSubmit={() => {}}
                wrapperRef={wrapperBRef}
              />
            </div>

            <button
              style={{
                ...styles.button,
                ...styles.compareButton,
                ...(compareLoading ? styles.buttonLoading : {}),
              }}
              onClick={handleCompare}
              disabled={compareLoading}
            >
              {compareLoading ? "Comparing…" : "Compare players"}
            </button>

            {compareError && (
              <div style={styles.errorBox}>
                <strong style={styles.errorLabel}>Can't compare</strong>
                <span>{compareError}</span>
              </div>
            )}

            {compareLoading && (
              <div style={styles.skeletonWrap}>
                <div style={{ ...styles.skeletonLine, width: "40%", height: 28 }} />
                <div style={styles.skeletonCard} />
                <div style={styles.skeletonCard} />
              </div>
            )}

            {compareResult && !compareLoading && (
              <div style={styles.resultContainer}>
                <div style={styles.compareGrid}>
                  <div style={styles.statsCard}>
                    <div style={styles.cardLabel}>{compareResult.player_a.name}</div>
                    <div style={styles.statTicker}>
                      {compareResult.player_a.stats.map((stat, i) => (
                        <div key={i} style={styles.statChip}>
                          {stat}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.cardLabel}>{compareResult.player_b.name}</div>
                    <div style={styles.statTicker}>
                      {compareResult.player_b.stats.map((stat, i) => (
                        <div key={i} style={styles.statChip}>
                          {stat}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={styles.memoCard}>
                  <div style={styles.memoStamp}>HEAD-TO-HEAD</div>
                  <div style={styles.cardLabel}>Analysis</div>
                  <p style={styles.reportText}>{compareResult.report}</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer style={styles.footer}>
        <div>
          Stats sourced from current-season box scores. Reports are AI-generated
          and may not reflect coaching staff evaluations.
        </div>
        <div style={styles.signature}>Built by Daouda Tandian</div>
      </footer>
    </div>
  )
}

function SeamMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="16" stroke="#C8102E" strokeWidth="2" />
      <path d="M18 2 V34" stroke="#C8102E" strokeWidth="1.5" />
      <path d="M2 18 H34" stroke="#C8102E" strokeWidth="1.5" />
      <path
        d="M5 7 C12 14, 12 22, 5 29"
        stroke="#C8102E"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M31 7 C24 14, 24 22, 31 29"
        stroke="#C8102E"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  )
}

const fontImports = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=JetBrains+Mono:wght@400;500&display=swap');
`

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#F2E9D8",
    backgroundImage:
      "radial-gradient(circle at 1px 1px, rgba(11,18,32,0.06) 1px, transparent 0)",
    backgroundSize: "22px 22px",
    fontFamily: "'Source Serif 4', Georgia, serif",
    color: "#0B1220",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    backgroundColor: "#0B1220",
    borderBottom: "4px solid #C8102E",
  },
  headerInner: {
    maxWidth: "880px",
    margin: "0 auto",
    padding: "18px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  brandTitle: {
    fontFamily: "'Archivo Black', sans-serif",
    fontSize: "1.15rem",
    color: "#F2E9D8",
    letterSpacing: "0.04em",
    lineHeight: 1.1,
  },
  brandSubtitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    color: "#E8A33D",
    letterSpacing: "0.08em",
    marginTop: "2px",
  },
  liveTag: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    color: "#9CA8BC",
    letterSpacing: "0.06em",
  },
  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#4ADE80",
    boxShadow: "0 0 0 3px rgba(74,222,128,0.18)",
  },
  main: {
    flex: 1,
    maxWidth: "880px",
    width: "100%",
    margin: "0 auto",
    padding: "56px 24px 40px",
    boxSizing: "border-box",
  },
  hero: {
    marginBottom: "32px",
  },
  heroTitle: {
    fontFamily: "'Archivo Black', sans-serif",
    fontSize: "2.6rem",
    lineHeight: 1.08,
    margin: "0 0 14px 0",
    color: "#0B1220",
  },
  heroSubtitle: {
    fontSize: "1.05rem",
    lineHeight: 1.6,
    color: "#3A4254",
    maxWidth: "560px",
    margin: 0,
  },
  modeToggle: {
    display: "inline-flex",
    border: "2px solid #0B1220",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "20px",
  },
  modeButton: {
    padding: "9px 18px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.8rem",
    letterSpacing: "0.04em",
    backgroundColor: "#FFFDF8",
    color: "#0B1220",
    border: "none",
    cursor: "pointer",
  },
  modeButtonActive: {
    backgroundColor: "#0B1220",
    color: "#F2E9D8",
  },
  searchWrapperFlex: {
    position: "relative",
    flex: 1,
  },
  searchRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  compareRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "14px",
  },
  vsLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.8rem",
    color: "#C8102E",
    fontWeight: "bold",
  },
  compareButton: {
    marginBottom: "20px",
  },
  inputShell: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    border: "2px solid #0B1220",
    borderRadius: "4px",
    padding: "0 4px 0 14px",
  },
  inputIcon: {
    fontFamily: "'JetBrains Mono', monospace",
    color: "#C8102E",
    fontWeight: "bold",
    marginRight: "8px",
  },
  input: {
    flex: 1,
    padding: "13px 8px",
    fontSize: "1rem",
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    fontFamily: "'Source Serif 4', Georgia, serif",
    color: "#0B1220",
    width: "100%",
  },
  button: {
    padding: "0 22px",
    fontSize: "0.92rem",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 500,
    letterSpacing: "0.02em",
    backgroundColor: "#C8102E",
    color: "#FFFDF8",
    border: "2px solid #0B1220",
    borderRadius: "4px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  buttonLoading: {
    backgroundColor: "#9C0C23",
    cursor: "default",
  },
  suggestionsBox: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    backgroundColor: "#FFFDF8",
    border: "2px solid #0B1220",
    borderRadius: "4px",
    overflow: "hidden",
    zIndex: 10,
    boxShadow: "4px 4px 0px rgba(11,18,32,0.12)",
  },
  suggestionItem: {
    padding: "11px 16px",
    cursor: "pointer",
    fontSize: "0.95rem",
    borderBottom: "1px solid #E8DFCC",
  },
  suggestionItemActive: {
    backgroundColor: "#F2E9D8",
  },
  errorBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    backgroundColor: "#FBEAEA",
    border: "1.5px solid #C8102E",
    borderRadius: "4px",
    padding: "14px 16px",
    marginBottom: "8px",
    fontSize: "0.95rem",
    color: "#7A0E20",
  },
  errorLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.06em",
  },
  skeletonWrap: {
    marginTop: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  skeletonLine: {
    backgroundColor: "#E2D8C2",
    borderRadius: "4px",
  },
  skeletonCard: {
    height: "92px",
    backgroundColor: "#E2D8C2",
    borderRadius: "6px",
  },
  resultContainer: {
    marginTop: "32px",
  },
  playerRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "8px",
  },
  playerName: {
    fontFamily: "'Archivo Black', sans-serif",
    fontSize: "1.7rem",
    margin: 0,
    color: "#0B1220",
  },
  formBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.08em",
    color: "#7A4D17",
    backgroundColor: "#E8A33D",
    padding: "4px 10px",
    borderRadius: "3px",
  },
  compareGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "20px",
  },
  statsCard: {
    backgroundColor: "#FFFDF8",
    border: "1.5px solid #0B1220",
    borderRadius: "6px",
    padding: "20px",
    marginBottom: "20px",
  },
  cardLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#8A7D5C",
    marginBottom: "14px",
  },
  statTicker: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  statChip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.82rem",
    padding: "9px 12px",
    backgroundColor: "#F2E9D8",
    borderRadius: "4px",
    color: "#1A1F2B",
  },
  memoCard: {
    position: "relative",
    backgroundColor: "#0B1220",
    color: "#EDE7D8",
    borderRadius: "6px",
    padding: "26px 24px",
  },
  memoStamp: {
    position: "absolute",
    top: "18px",
    right: "22px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.66rem",
    letterSpacing: "0.12em",
    color: "#C8102E",
    border: "1px solid #C8102E",
    borderRadius: "3px",
    padding: "3px 8px",
    transform: "rotate(3deg)",
  },
  reportText: {
    fontSize: "1.02rem",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    margin: 0,
    color: "#EDE7D8",
  },
  footer: {
    textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.72rem",
    color: "#8A7D5C",
    padding: "22px 24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  signature: {
    fontSize: "0.7rem",
    color: "#0B1220",
    letterSpacing: "0.04em",
  },
}