// Transaction detail drawer (with split + recategorize)
function TxnDrawer({ txn, onClose, onUpdate, onShowToast }) {
  const [editingCat, setEditingCat] = React.useState(false);
  const [showSplit, setShowSplit] = React.useState(false);
  const [splits, setSplits] = React.useState([
    { categoryId: txn.category, amount: Math.abs(txn.amount) },
  ]);
  const [note, setNote] = React.useState(txn.note || "");
  const pillRef = React.useRef(null);
  const acc = window.accById(txn.account);
  const cat = window.catById(txn.category);

  const splitTotal = splits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const splitRemaining = Math.abs(txn.amount) - splitTotal;

  const saveNote = () => {
    onUpdate({ note });
    onShowToast("Note saved");
  };
  const saveSplit = () => {
    onUpdate({ splits });
    setShowSplit(false);
    onShowToast(`Split into ${splits.length} categories`);
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <window.MerchantIcon merchant={txn.merchant} categoryId={txn.category} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {txn.merchant}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--mono)" }}>
              {window.fmtDate(txn.date)} · {acc.mask}
            </div>
          </div>
          <button className="btn ghost sm" onClick={onClose}><window.Icon name="x" size={14} /></button>
        </div>
        <div className="drawer-body">
          {/* Amount */}
          <div className="drawer-section" style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className={"amount " + (txn.amount < 0 ? "neg" : "pos")} style={{ fontSize: 32, fontWeight: 500 }}>
              {window.fmtMoney(txn.amount, { showPlus: true })}
            </span>
            {txn.pending && <span className="pending-tag">Pending</span>}
            {txn.recurring && <span className="pending-tag" style={{ background: "var(--c-lavender)", color: "var(--c-lavender-ink)" }}>Recurring</span>}
          </div>

          {/* Category */}
          <div className="drawer-section">
            <h4>Category</h4>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
              <span ref={pillRef} onClick={() => setEditingCat(true)} style={{ cursor: "pointer" }}>
                <window.CategoryPill categoryId={txn.category} asButton />
              </span>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                {txn.recurring ? "from monthly pattern" : "auto-detected"}
              </span>
              {editingCat && (
                <window.CategoryPopover
                  value={txn.category}
                  anchor={pillRef.current}
                  onChange={(cid) => {
                    onUpdate({ category: cid });
                    onShowToast(`Categorized as ${window.catById(cid).name}`);
                  }}
                  onClose={() => setEditingCat(false)}
                />
              )}
            </div>
          </div>

          {/* Split toggle */}
          <div className="drawer-section">
            <h4>Split this transaction</h4>
            {!showSplit ? (
              <button className="btn" onClick={() => setShowSplit(true)}>
                <window.Icon name="split" size={14} /> Split into multiple categories
              </button>
            ) : (
              <>
                {splits.map((s, i) => (
                  <div key={i} className="split-row">
                    <select value={s.categoryId} onChange={(e) => {
                      const next = [...splits]; next[i] = { ...next[i], categoryId: e.target.value }; setSplits(next);
                    }}>
                      {window.LEDGER_DATA.CATEGORIES.filter((c) => c.id !== "income" && c.id !== "transfers").map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input type="number" step="0.01" value={s.amount} onChange={(e) => {
                      const next = [...splits]; next[i] = { ...next[i], amount: parseFloat(e.target.value) || 0 }; setSplits(next);
                    }} />
                    <button className="x" onClick={() => setSplits(splits.filter((_, idx) => idx !== i))} disabled={splits.length === 1}>
                      <window.Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <button className="btn sm" onClick={() => setSplits([...splits, { categoryId: "shopping", amount: Math.max(splitRemaining, 0) }])}>
                    <window.Icon name="plus" size={12} /> Add split
                  </button>
                  <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: Math.abs(splitRemaining) < 0.01 ? "var(--pos)" : "var(--warn)" }}>
                    Remaining: ${splitRemaining.toFixed(2)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn" onClick={() => setShowSplit(false)}>Cancel</button>
                  <button className="btn primary" onClick={saveSplit} disabled={Math.abs(splitRemaining) > 0.01}>Save split</button>
                </div>
              </>
            )}
            {txn.splits && txn.splits.length > 1 && !showSplit && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {txn.splits.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--inset)", borderRadius: 8, fontSize: 12.5 }}>
                    <window.CategoryPill categoryId={s.categoryId} />
                    <span className="spacer" />
                    <span className="amount">${(s.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="drawer-section">
            <h4>Details</h4>
            <div className="kv">
              <span className="k">Bank</span><span className="v">{txn.bank || acc.name}{acc.mask ? <span style={{ color: "var(--muted)", fontFamily: "var(--mono)" }}> {acc.mask}</span> : null}</span>
              <span className="k">Posted</span><span className="v">{window.fmtDate(txn.date)}</span>
              <span className="k">Amount</span><span className="v amount">{window.fmtMoney(txn.amount)}</span>
              <span className="k">Status</span><span className="v">{txn.pending ? "Pending" : "Posted"}</span>
              <span className="k">Type</span><span className="v">{txn.recurring ? "Recurring" : "One-off"}</span>
              <span className="k">Imported</span><span className="v">{window.fmtDate(txn.date)} (auto-matched)</span>
            </div>
          </div>

          {/* Note */}
          <div className="drawer-section">
            <h4>Note</h4>
            <textarea
              className="input"
              style={{ padding: "8px 12px", minHeight: 64, resize: "vertical" }}
              placeholder="Add context…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
            />
          </div>

          {/* Similar */}
          <div className="drawer-section">
            <h4>Make a rule</h4>
            <div className="card tight" style={{ background: "var(--inset)", border: "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--c-violet)", color: "var(--c-violet-ink)", display: "grid", placeItems: "center" }}>
                  <window.Icon name="sparkles" size={14} />
                </span>
                <div style={{ flex: 1, fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                  Always categorize <strong style={{ color: "var(--text)" }}>{txn.merchant}</strong> as <window.CategoryPill categoryId={txn.category} />?
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button className="btn sm primary" onClick={async () => {
                      if (window.api) await window.api.saveRule(txn.merchant, txn.category);
                      onShowToast("Rule created — future imports will auto-categorize this merchant");
                    }}>Create rule</button>
                    <button className="btn sm ghost" onClick={() => onShowToast("Skipped")}>Not now</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
window.TxnDrawer = TxnDrawer;
