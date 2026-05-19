// Sidebar — Ledger
function Sidebar({ active, onNavigate, theme, onToggleTheme, pendingCount, txns }) {
  const items = [
    { id: "dashboard",    name: "Dashboard",    icon: "dashboard" },
    { id: "transactions", name: "Transactions", icon: "list", count: pendingCount },
    { id: "budgets",      name: "Budgets",      icon: "budget" },
    { id: "import",       name: "Import",       icon: "import" },
  ];

  // Derive banks and net cash flow from real transactions
  const { banks, netFlow } = React.useMemo(() => {
    if (!txns || txns.length === 0) return { banks: [], netFlow: 0 };

    const bankMap = {};
    let net = 0;
    txns.forEach((t) => {
      const key = t.bank || "Unknown";
      if (!bankMap[key]) bankMap[key] = { spend: 0, income: 0 };
      if (t.amount < 0) bankMap[key].spend += -t.amount;
      else bankMap[key].income += t.amount;
      net += t.amount;
    });

    const banks = Object.entries(bankMap).map(([name, v]) => ({ name, net: v.income - v.spend }));
    return { banks, netFlow: net };
  }, [txns]);

  const now = new Date();
  const monthStr = now.toLocaleDateString("en-US", { month: "short" }).toLowerCase() + " · " + now.getFullYear();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">L</div>
        <div>
          <div className="brand-name">Ledger</div>
          <div className="brand-sub">{monthStr}</div>
        </div>
      </div>

      <div className="nav-section">
        {items.map((it) => (
          <button key={it.id}
                  className={"nav-item " + (active === it.id ? "active" : "")}
                  onClick={() => onNavigate(it.id)}>
            <window.Icon name={it.icon} size={16} />
            {it.name}
            {it.count > 0 && <span className="count">{it.count}</span>}
          </button>
        ))}
      </div>

      {banks.length > 0 && (
        <div className="nav-section">
          <div className="nav-label">Banks</div>
          {banks.map((b) => (
            <div key={b.name} className="account-row">
              <span className="account-dot" style={{ background: "var(--c-sky-ink)" }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="account-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
              </div>
              <span className={"account-bal " + (b.net < 0 ? "neg" : "")}>
                {window.fmtMoneyShort(b.net)}
              </span>
            </div>
          ))}
          <div style={{ padding: "8px 10px", marginTop: 6, borderTop: "1px solid var(--line-soft)", display: "flex" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 11.5, color: "var(--muted)" }}>
              <span>Net cash flow</span>
              <span style={{ fontFamily: "var(--mono)", color: netFlow >= 0 ? "var(--pos)" : "var(--neg)", fontWeight: 500 }}>
                {window.fmtMoneyShort(netFlow)}
              </span>
            </div>
          </div>
        </div>
      )}

      {banks.length === 0 && (
        <div className="nav-section">
          <div className="nav-label">Banks</div>
          <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--faint)" }}>
            No statements imported yet.
          </div>
        </div>
      )}

      <div className="spacer" style={{ flex: 1 }} />

      <button className="theme-toggle" onClick={onToggleTheme}>
        <window.Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </button>
    </aside>
  );
}
window.Sidebar = Sidebar;
