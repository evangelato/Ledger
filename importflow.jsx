// Import flow — Upload → Review → Done
function ImportFlow({ onComplete, onShowToast, dropContents, onDropConsumed }) {
  const [step, setStep] = React.useState(0);
  const [banks, setBanks] = React.useState([]);
  const [drag, setDrag] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState([]);
  const [importedCount, setImportedCount] = React.useState(0);

  const handlePreviewResult = (result) => {
    if (result.canceled) return;
    setBanks(result.banks);
    setRows(result.rows.map((r) => ({ ...r, include: true })));
    setStep(1);
  };

  const handlePickFile = async () => {
    if (!window.api) { handleSampleData(); return; }
    setLoading(true);
    const result = await window.api.previewCSV();
    setLoading(false);
    handlePreviewResult(result);
  };

  const handleDropContents = async (contents) => {
    if (!window.api) { handleSampleData(); return; }
    setLoading(true);
    const result = await window.api.previewCSVContents(contents);
    setLoading(false);
    handlePreviewResult(result);
  };

  const handleDropPdf = async (uint8Array) => {
    if (!window.api) return;
    setLoading(true);
    const result = await window.api.previewPaystub(uint8Array);
    setLoading(false);
    if (result.error) { alert(result.error); return; }
    handlePreviewResult(result);
  };

  // Auto-process files dropped from outside the import screen
  React.useEffect(() => {
    if (dropContents) {
      onDropConsumed();
      if (dropContents.type === 'pdf') handleDropPdf(dropContents.data);
      else handleDropContents(dropContents.data);
    }
  }, []);

  // Browser fallback using built-in sample data
  const handleSampleData = () => {
    const guess = (raw) => {
      const m = raw.toLowerCase();
      if (m.includes("whole foods") || m.includes("trader joe")) return "groceries";
      if (m.includes("tartine") || m.includes("philz") || m.includes("blue bottle")) return "dining";
      if (m.includes("lyft") || m.includes("uber") || m.includes("bart")) return "transport";
      if (m.includes("netflix") || m.includes("spotify")) return "subscriptions";
      if (m.includes("pg&e") || m.includes("verizon")) return "utilities";
      if (m.includes("amazon") || m.includes("apple")) return "shopping";
      return "uncategorized";
    };
    setBanks(["Sample"]);
    setRows(window.LEDGER_DATA.SAMPLE_CSV_ROWS.map((r, i) => ({
      date: r[0], merchant: r[1], amount: parseFloat(r[2]),
      category: guess(r[1]), bank: "Sample",
      include: true, isDuplicate: i === 6,
    })));
    setStep(1);
  };

  const handleConfirm = async () => {
    const toImport = rows.filter((r) => r.include);
    if (window.api) {
      await window.api.importCSV(toImport);
    }
    const count = toImport.length;
    setImportedCount(count);
    setStep(2);
    onComplete(count);
  };

  return (
    <div style={{ maxWidth: 880 }}>
      <Stepper step={step} />
      {step === 0 && (
        <StepUpload
          drag={drag} setDrag={setDrag}
          loading={loading}
          onPickFile={handlePickFile}
          onDropContents={handleDropContents}
          onDropPdf={handleDropPdf}
        />
      )}
      {step === 1 && (
        <StepReview
          rows={rows} setRows={setRows} banks={banks}
          onBack={() => { setStep(0); setRows([]); }}
          onConfirm={handleConfirm}
        />
      )}
      {step === 2 && (
        <StepDone
          count={importedCount}
          onNew={() => { setStep(0); setRows([]); setBanks([]); }}
        />
      )}
    </div>
  );
}

function Stepper({ step }) {
  const steps = ["Upload", "Review", "Done"];
  return (
    <div className="import-stepper">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className={"step " + (i < step ? "done" : i === step ? "active" : "")}>
            <span className="num">{i < step ? <window.Icon name="check" size={12} /> : (i + 1)}</span>
            <span className="label">{label}</span>
          </div>
          {i < steps.length - 1 && <div className="step-sep" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function StepUpload({ drag, setDrag, loading, onPickFile, onDropContents, onDropPdf }) {
  return (
    <div
      className={"dropzone " + (drag ? "active" : "")}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDrag(false);
        const files = Array.from(e.dataTransfer.files);
        const pdf = files.find((f) => f.name.endsWith('.pdf'));
        const csvs = files.filter((f) => f.name.endsWith('.csv'));
        if (pdf) {
          const buf = await pdf.arrayBuffer();
          onDropPdf(new Uint8Array(buf));
        } else if (csvs.length > 0) {
          Promise.all(csvs.map((f) => f.text())).then(onDropContents);
        } else {
          onPickFile();
        }
      }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--inset)", display: "grid", placeItems: "center", margin: "0 auto 14px", color: "var(--muted)" }}>
        <window.Icon name="import" size={28} stroke={1.4} />
      </div>
      <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 600 }}>
        {loading ? "Parsing…" : "Drop a statement here"}
      </h3>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        Supports <strong>Chase, Capital One, Bank of America, Wells Fargo,</strong> and <strong>Apple Card</strong> CSV exports.<br/>
        Also accepts <strong>ADP Earnings Statements</strong> (PDF).
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22 }}>
        <button className="btn primary" onClick={onPickFile} disabled={loading}>
          <window.Icon name="file" size={14} /> {window.api ? "Browse files…" : "Use sample data"}
        </button>
      </div>
      <div style={{ marginTop: 18, fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)" }}>
        Statements are parsed locally. Nothing leaves your Mac.
      </div>
    </div>
  );
}

function StepReview({ rows, setRows, banks, onBack, onConfirm }) {
  const update = (i, patch) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const dupes = rows.filter((r) => r.isDuplicate).length;
  const total = rows.filter((r) => r.include).reduce((s, r) => s + r.amount, 0);
  const includeCount = rows.filter((r) => r.include).length;
  const uncategorizedCount = rows.filter((r) => r.include && r.category === 'uncategorized').length;

  return (
    <>
      <div className="grid-3" style={{ marginBottom: 14 }}>
        <div className="card tight">
          <div className="card-title">Detected {banks.length > 1 ? "banks" : "bank"}</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{banks.join(", ") || "—"}</div>
        </div>
        <div className="card tight">
          <div className="card-title">To import</div>
          <div className="amount" style={{ fontSize: 22, fontWeight: 500 }}>
            {includeCount} <span style={{ color: "var(--muted)", fontSize: 12 }}>of {rows.length}</span>
          </div>
        </div>
        <div className="card tight" style={{ background: dupes > 0 ? "var(--c-butter)" : "var(--card)", color: dupes > 0 ? "var(--c-butter-ink)" : "var(--text)", border: "none" }}>
          <div className="card-title" style={{ color: "inherit", opacity: 0.7 }}>Potential duplicates</div>
          <div className="amount" style={{ fontSize: 22, fontWeight: 500, color: "inherit" }}>{dupes}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 14 }}>
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
          <strong style={{ fontSize: 13.5 }}>Review transactions</strong>
          <span className="spacer" />
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Click a category to change · uncheck to skip</span>
        </div>
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "44px 90px 1fr 160px 100px",
            gap: 0, padding: "8px 16px",
            background: "var(--inset)",
            fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500,
            alignItems: "center",
          }}>
            <span></span><span>Date</span><span>Merchant</span><span>Category</span><span style={{ textAlign: "right" }}>Amount</span>
          </div>
          {rows.map((r, i) => (
            <ReviewRow key={i} r={r} i={i} onUpdate={update} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="btn" onClick={onBack}>Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {uncategorizedCount > 0 && (
            <span style={{ fontSize: 12, color: "var(--c-butter-ink)", background: "var(--c-butter)", padding: "4px 10px", borderRadius: 999 }}>
              {uncategorizedCount} uncategorized — click to assign
            </span>
          )}
          <button className="btn primary" onClick={onConfirm} disabled={includeCount === 0 || uncategorizedCount > 0}>
            <window.Icon name="check" size={12} /> Import {includeCount} transactions
          </button>
        </div>
      </div>
    </>
  );
}

function ReviewRow({ r, i, onUpdate }) {
  const [popover, setPopover] = React.useState(false);
  const anchorRef = React.useRef(null);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "44px 90px 1fr 160px 100px",
      padding: "10px 16px",
      borderBottom: "1px solid var(--line-soft)",
      alignItems: "center",
      fontSize: 13,
      background: r.isDuplicate ? "var(--c-butter)" : r.include && r.category === 'uncategorized' ? "var(--c-rose-soft, oklch(0.97 0.02 10))" : "transparent",
      opacity: r.include ? 1 : 0.45,
    }}>
      <input type="checkbox" checked={r.include} onChange={(e) => onUpdate(i, { include: e.target.checked })} style={{ width: 16, height: 16 }} />
      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.date.slice(5)}</span>
      <div>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{r.merchant}</div>
        {r.isDuplicate && <div style={{ fontSize: 10.5, color: "var(--c-butter-ink)", fontWeight: 500 }}>Possible duplicate</div>}
      </div>
      <div ref={anchorRef} style={{ position: "relative" }}>
        <span onClick={() => setPopover(!popover)}>
          <window.CategoryPill categoryId={r.category} asButton />
        </span>
        {popover && (
          <window.CategoryPopover
            value={r.category}
            anchor={anchorRef.current}
            onChange={(cid) => {
              onUpdate(i, { category: cid });
              if (window.api) window.api.saveRule(r.merchant, cid);
            }}
            onClose={() => setPopover(false)}
          />
        )}
      </div>
      <span className={"amount " + (r.amount < 0 ? "neg" : "pos")} style={{ textAlign: "right" }}>
        {window.fmtMoney(r.amount)}
      </span>
    </div>
  );
}

function StepDone({ count, onNew }) {
  return (
    <div className="card" style={{ padding: 48, textAlign: "center" }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "var(--c-sage)", color: "var(--c-sage-ink)",
        display: "grid", placeItems: "center",
        margin: "0 auto 18px",
      }}>
        <window.Icon name="check" size={36} stroke={2.2} />
      </div>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
        Imported {count} transaction{count !== 1 ? "s" : ""}
      </h2>
      <p style={{ margin: "0 0 22px", color: "var(--muted)", fontSize: 13.5 }}>
        Your ledger is up to date.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button className="btn" onClick={onNew}>Import another</button>
        <button className="btn primary" onClick={() => window.dispatchEvent(new CustomEvent("ledger-nav", { detail: "dashboard" }))}>
          View dashboard <window.Icon name="chevron" size={12} />
        </button>
      </div>
    </div>
  );
}

window.ImportFlow = ImportFlow;
