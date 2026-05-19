// Transactions screen — list, search, filter, recategorize
function Transactions({ txns, onOpenTxn, onRecategorize, onShowToast }) {
  const [query, setQuery] = React.useState("");
  const [activeCats, setActiveCats] = React.useState(new Set());
  const [activeAccts, setActiveAccts] = React.useState(new Set());
  const [pendingOnly, setPendingOnly] = React.useState(false);
  const [popover, setPopover] = React.useState(null); // {txnId, anchor}

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return txns.filter((t) => {
      if (q && !t.merchant.toLowerCase().includes(q) && !t.note.toLowerCase().includes(q) && !window.catById(t.category).name.toLowerCase().includes(q)) return false;
      if (activeCats.size && !activeCats.has(t.category)) return false;
      if (activeAccts.size && !activeAccts.has(t.bank)) return false;
      if (pendingOnly && !t.pending) return false;
      return true;
    });
  }, [txns, query, activeCats, activeAccts, pendingOnly]);

  const total = filtered.reduce((s, t) => s + t.amount, 0);
  const spend = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + -t.amount, 0);

  // Group by date
  const groups = React.useMemo(() => {
    const map = new Map();
    filtered.forEach((t) => {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const toggleCat = (id) => {
    const next = new Set(activeCats);
    next.has(id) ? next.delete(id) : next.add(id);
    setActiveCats(next);
  };
  const toggleAcct = (id) => {
    const next = new Set(activeAccts);
    next.has(id) ? next.delete(id) : next.add(id);
    setActiveAccts(next);
  };

  const topCats = window.LEDGER_DATA.CATEGORIES.filter((c) => ["groceries","dining","transport","shopping","subscriptions","entertainment","health","travel"].includes(c.id));

  // Derive available banks from real transaction data
  const banks = React.useMemo(() => [...new Set(txns.map((t) => t.bank).filter(Boolean))].sort(), [txns]);

  return (
    <>
      {/* Toolbar */}
      <div className="txn-toolbar">
        <div className="input-wrap">
          <window.Icon name="search" size={14} />
          <input className="input" placeholder="Search merchants, notes, categories…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className={"filter-chip " + (pendingOnly ? "on" : "")} onClick={() => setPendingOnly(!pendingOnly)}>
          <window.Icon name="info" size={12} /> Pending only
        </button>
        <div className="spacer" />
        <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>
          {filtered.length} txns · spent <span style={{ color: "var(--text)" }}>{window.fmtMoneyShort(spend)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{ fontSize: 11.5, color: "var(--muted)", marginRight: 4, alignSelf: "center" }}>Category</span>
        {topCats.map((c) => (
          <button key={c.id}
                  className={"cpill " + c.color}
                  style={{
                    cursor: "pointer",
                    opacity: activeCats.size === 0 || activeCats.has(c.id) ? 1 : 0.4,
                    outline: activeCats.has(c.id) ? "2px solid currentColor" : "none",
                    outlineOffset: -2,
                  }}
                  onClick={() => toggleCat(c.id)}>
            {c.name}
          </button>
        ))}
        {banks.length > 0 && (
          <>
            <span style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 4px 0 12px", alignSelf: "center" }}>Bank</span>
            {banks.map((bank) => (
              <button key={bank}
                      className="filter-chip"
                      style={{
                        background: activeAccts.has(bank) ? "var(--primary-soft)" : "var(--surface)",
                        color: activeAccts.has(bank) ? "var(--primary-ink)" : "var(--text-2)",
                        borderColor: activeAccts.has(bank) ? "transparent" : "var(--line)",
                      }}
                      onClick={() => toggleAcct(bank)}>
                <window.Icon name="card" size={12} />
                {bank}
              </button>
            ))}
          </>
        )}
        {(activeCats.size > 0 || activeAccts.size > 0 || pendingOnly || query) && (
          <button className="btn ghost sm" onClick={() => { setActiveCats(new Set()); setActiveAccts(new Set()); setPendingOnly(false); setQuery(""); }}>
            <window.Icon name="x" size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="txn-table">
        <div className="txn-row header">
          <span>Date</span><span>Merchant</span><span>Category</span><span>Account</span><span style={{ textAlign: "right" }}>Amount</span>
        </div>
        {groups.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No transactions match those filters.
          </div>
        )}
        {groups.map(([date, items]) => (
          <React.Fragment key={date}>
            <div style={{
              padding: "10px 16px",
              background: "var(--inset)",
              fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--mono)",
              borderBottom: "1px solid var(--line-soft)",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>{window.fmtDate(date)} · {window.fmtDateRel(date)}</span>
              <span>{items.length} {items.length === 1 ? "transaction" : "transactions"}</span>
            </div>
            {items.map((t) => (
              <button key={t.id} className="txn-row" onClick={() => onOpenTxn(t.id)}>
                <span className="txn-date">{t.date.slice(8, 10)}</span>
                <span className="txn-merch">
                  <window.MerchantIcon merchant={t.merchant} categoryId={t.category} />
                  <span style={{ minWidth: 0 }}>
                    <span className="name">
                      {t.merchant}
                      {t.pending && <span className="pending-tag">Pending</span>}
                      {t.recurring && <span className="pending-tag" style={{ background: "var(--c-lavender)", color: "var(--c-lavender-ink)" }}>Recurring</span>}
                    </span>
                    {t.note && <div className="note">{t.note}</div>}
                  </span>
                </span>
                <span onClick={(e) => {
                  e.stopPropagation();
                  setPopover({ txnId: t.id, anchor: e.currentTarget.firstElementChild });
                }}>
                  <window.CategoryPill categoryId={t.category} asButton />
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{t.bank || window.accById(t.account).mask}</span>
                <span className={"amount " + (t.amount < 0 ? "neg" : "pos")}>
                  {window.fmtMoney(t.amount, { showPlus: true })}
                </span>
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>

      {popover && (
        <window.CategoryPopover
          value={txns.find((t) => t.id === popover.txnId)?.category}
          anchor={popover.anchor}
          onChange={(cid) => {
            onRecategorize(popover.txnId, cid);
            onShowToast(`Categorized as ${window.catById(cid).name}`);
          }}
          onClose={() => setPopover(null)}
        />
      )}
    </>
  );
}
window.Transactions = Transactions;
