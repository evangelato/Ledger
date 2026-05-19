// Main app shell — Ledger
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp, useCallback: useCallbackApp } = React;

// Convert a DB row (pending/recurring as 0/1) to UI format (booleans)
function dbToTxn(row) {
  return { ...row, pending: !!row.pending, recurring: !!row.recurring };
}

function App() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "light",
    "dashboardVariant": "summary",
    "accent": "sage"
  }/*EDITMODE-END*/;

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const ACCENT_MAP = {
    sage:     { light: ["oklch(0.62 0.08 155)", "oklch(0.93 0.04 155)", "oklch(0.32 0.05 155)"],
                dark:  ["oklch(0.78 0.09 155)", "oklch(0.30 0.05 155)", "oklch(0.90 0.06 155)"],
                swatch: "oklch(0.62 0.10 155)" },
    lavender: { light: ["oklch(0.55 0.10 290)", "oklch(0.94 0.04 290)", "oklch(0.32 0.06 290)"],
                dark:  ["oklch(0.78 0.10 290)", "oklch(0.30 0.06 290)", "oklch(0.92 0.06 290)"],
                swatch: "oklch(0.60 0.14 290)" },
    peach:    { light: ["oklch(0.65 0.13 35)",  "oklch(0.94 0.05 35)",  "oklch(0.38 0.08 35)"],
                dark:  ["oklch(0.80 0.11 35)",  "oklch(0.32 0.07 35)",  "oklch(0.92 0.07 35)"],
                swatch: "oklch(0.70 0.15 35)" },
    ocean:    { light: ["oklch(0.55 0.10 230)", "oklch(0.94 0.04 230)", "oklch(0.32 0.07 230)"],
                dark:  ["oklch(0.78 0.09 230)", "oklch(0.30 0.06 230)", "oklch(0.92 0.06 230)"],
                swatch: "oklch(0.60 0.13 230)" },
  };

  const [route, setRoute] = useStateApp("dashboard");
  const [txns, setTxns] = useStateApp([]);
  const [budgets, setBudgets] = useStateApp([]);
  const [loading, setLoading] = useStateApp(true);
  const [openTxn, setOpenTxn] = useStateApp(null);
  const [toast, setToast] = useStateApp(null);
  const [pendingDropContents, setPendingDropContents] = useStateApp(null);

  // Load data from SQLite on mount (Electron) or fall back to fake data (browser preview)
  useEffectApp(() => {
    if (window.api) {
      Promise.all([
        window.api.getTransactions(),
        window.api.getBudgets(),
        window.api.getCategories(),
      ]).then(([txnRows, budgetRows, catRows]) => {
        window.CATEGORIES_STORE = catRows;
        setTxns(txnRows.map(dbToTxn));
        setBudgets(budgetRows);
        setLoading(false);
      });
    } else {
      setTxns(window.LEDGER_DATA.TXNS);
      setBudgets(window.LEDGER_DATA.BUDGETS.map((b) => ({ category_id: b.categoryId, monthly: b.monthly })));
      setLoading(false);
    }
  }, []);

  // Theme
  useEffectApp(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
  }, [tweaks.theme]);

  // Accent — remap primary
  useEffectApp(() => {
    const m = ACCENT_MAP[tweaks.accent]?.[tweaks.theme === "dark" ? "dark" : "light"];
    if (m) {
      document.documentElement.style.setProperty("--primary", m[0]);
      document.documentElement.style.setProperty("--primary-soft", m[1]);
      document.documentElement.style.setProperty("--primary-ink", m[2]);
    }
  }, [tweaks.accent, tweaks.theme]);

  const onToggleTheme = () => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark");

  // Toast auto-dismiss
  useEffectApp(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  // Cross-screen events
  useEffectApp(() => {
    const handler = (e) => setRoute(e.detail);
    window.addEventListener("ledger-nav", handler);
    return () => window.removeEventListener("ledger-nav", handler);
  }, []);

  // Global drag-and-drop — works anywhere in the window
  useEffectApp(() => {
    const onDragOver = (e) => e.preventDefault();
    const onDrop = async (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      const csvFiles = files.filter((f) => f.name.endsWith('.csv'));
      const pdfFiles = files.filter((f) => f.name.endsWith('.pdf'));

      if (pdfFiles.length > 0) {
        const buf = await pdfFiles[0].arrayBuffer();
        setPendingDropContents({ type: 'pdf', data: new Uint8Array(buf) });
      } else if (csvFiles.length > 0) {
        const contents = await Promise.all(csvFiles.map((f) => f.text()));
        setPendingDropContents({ type: 'csv', data: contents });
      }
      if (csvFiles.length > 0 || pdfFiles.length > 0) setRoute('import');
    };
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  const pendingCount = useMemoApp(() => txns.filter((t) => t.pending).length, [txns]);
  const openTxnObj = useMemoApp(() => txns.find((t) => t.id === openTxn), [txns, openTxn]);

  const onRecategorize = useCallbackApp((txnId, categoryId) => {
    setTxns((arr) => arr.map((t) => t.id === txnId ? { ...t, category: categoryId } : t));
    if (window.api) window.api.updateTransaction(txnId, { category: categoryId });
  }, []);

  const onUpdateTxn = useCallbackApp((patch) => {
    if (!openTxn) return;
    setTxns((arr) => arr.map((t) => t.id === openTxn ? { ...t, ...patch } : t));
    if (window.api) window.api.updateTransaction(openTxn, patch);
  }, [openTxn]);

  // Called after import is confirmed — reload all transactions from DB
  const onImportComplete = useCallbackApp((count) => {
    if (window.api) {
      window.api.getTransactions().then((rows) => {
        setTxns(rows.map(dbToTxn));
        setToast(`Imported ${count} transactions`);
      });
    } else {
      setToast(`Imported ${count} transactions`);
    }
  }, []);

  const today = new Date();
  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const titleFor = {
    dashboard:    { title: "Dashboard",    sub: monthLabel },
    transactions: { title: "Transactions", sub: `${txns.length} total · ${pendingCount} pending` },
    budgets:      { title: "Budgets",      sub: monthLabel },
    import:       { title: "Import",       sub: "Upload a CSV statement" },
  };
  const title = titleFor[route];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="app">
      <window.Sidebar
        active={route}
        onNavigate={setRoute}
        theme={tweaks.theme}
        onToggleTheme={onToggleTheme}
        pendingCount={pendingCount}
        txns={txns}
      />
      <main className="main">
        <header className="topbar">
          <div>
            <h1>{title.title}</h1>
            <div className="sub">{title.sub}</div>
          </div>
          <div className="topbar-spacer" />
          {route === "dashboard" && (
            <div className="tabs">
              {[
                { id: "summary",   label: "Summary"   },
                { id: "insights",  label: "Insights"  },
                { id: "cashflow",  label: "Cash flow" },
              ].map((t) => (
                <button key={t.id}
                        className={"tab " + (tweaks.dashboardVariant === t.id ? "active" : "")}
                        onClick={() => setTweak("dashboardVariant", t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {route !== "import" && (
            <button className="btn primary" onClick={() => setRoute("import")}>
              <window.Icon name="plus" size={14} /> Import statement
            </button>
          )}
        </header>

        <section className="content">
          {route === "dashboard" && (
            <window.Dashboard variant={tweaks.dashboardVariant} txns={txns} onOpenTxn={setOpenTxn} />
          )}
          {route === "transactions" && (
            <window.Transactions txns={txns} onOpenTxn={setOpenTxn} onRecategorize={onRecategorize} onShowToast={setToast} />
          )}
          {route === "budgets" && (
            <window.Budgets txns={txns} budgets={budgets} onOpenTxn={setOpenTxn} />
          )}
          {route === "import" && (
            <window.ImportFlow
              onComplete={onImportComplete}
              onShowToast={setToast}
              dropContents={pendingDropContents}
              onDropConsumed={() => setPendingDropContents(null)}
            />
          )}
        </section>
      </main>

      {openTxnObj && (
        <window.TxnDrawer
          txn={openTxnObj}
          onClose={() => setOpenTxn(null)}
          onUpdate={onUpdateTxn}
          onShowToast={setToast}
        />
      )}

      <window.Toast message={toast} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance">
          <TweakRadio label="Theme" value={tweaks.theme} onChange={(v) => setTweak("theme", v)}
                      options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
          <TweakSelect label="Accent" value={tweaks.accent} onChange={(v) => setTweak("accent", v)}
                       options={[
                         { value: "sage",     label: "Sage" },
                         { value: "lavender", label: "Lavender" },
                         { value: "peach",    label: "Peach" },
                         { value: "ocean",    label: "Ocean" },
                       ]} />
        </TweakSection>
        <TweakSection label="Dashboard">
          <TweakSelect label="Default variant" value={tweaks.dashboardVariant} onChange={(v) => setTweak("dashboardVariant", v)}
                       options={[
                         { value: "summary",  label: "Summary" },
                         { value: "insights", label: "Insights" },
                         { value: "cashflow", label: "Cash flow" },
                       ]} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
