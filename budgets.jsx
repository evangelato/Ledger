// Budgets screen
function Budgets({ txns, budgets, onOpenTxn }) {
  const today = new Date();
  const curKey = today.toISOString().slice(0, 7);
  const daysIn = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const monthFrac = dayOfMonth / daysIn;

  // Spend per cat this month
  const spendByCat = {};
  txns.filter((t) => t.date.slice(0, 7) === curKey && t.amount < 0 && t.category !== "transfers")
      .forEach((t) => { spendByCat[t.category] = (spendByCat[t.category] || 0) + -t.amount; });

  const items = (budgets || []).map((b) => {
    const categoryId = b.category_id || b.categoryId;
    const spent = spendByCat[categoryId] || 0;
    const pct = (spent / b.monthly) * 100;
    const expected = b.monthly * monthFrac;
    return { ...b, categoryId, spent, pct, expected, cat: window.catById(categoryId) };
  });

  const totalBudget = items.reduce((s, b) => s + b.monthly, 0);
  const totalSpent = items.reduce((s, b) => s + b.spent, 0);
  const totalPct = (totalSpent / totalBudget) * 100;

  return (
    <>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-title">May overall</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
            <span className="amount big">${totalSpent.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>
              of <span className="amount" style={{ color: "var(--text)" }}>${totalBudget.toLocaleString()}</span> budgeted
            </span>
          </div>
          <div className="bar" style={{ height: 12 }}>
            <span style={{ width: `${Math.min(totalPct, 100)}%`, background: totalPct > 100 ? "var(--neg)" : "var(--primary)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--mono)" }}>
            <span>{totalPct.toFixed(0)}% spent</span>
            <span>${(totalBudget - totalSpent).toLocaleString()} remaining</span>
            <span>day {dayOfMonth} of {daysIn}</span>
          </div>
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="card-title">Pace</div>
          <p style={{ margin: "4px 0 0", color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
            You're {monthFrac < totalSpent / totalBudget ? "ahead of" : "on"} pace.
            At this rate you'll end May at <span className="amount" style={{ color: "var(--text)" }}>${(totalSpent / monthFrac).toFixed(0)}</span>,
            which is <span style={{ color: totalSpent / monthFrac > totalBudget ? "var(--neg)" : "var(--pos)", fontWeight: 500 }}>
              {((totalSpent / monthFrac - totalBudget) / totalBudget * 100).toFixed(0)}%
            </span> {(totalSpent / monthFrac - totalBudget) > 0 ? "over" : "under"} budget.
          </p>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--primary)" }} />
              <span style={{ flex: 1 }}>Actual</span>
              <span className="amount">${totalSpent.toFixed(0)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--muted)" }} />
              <span style={{ flex: 1 }}>Expected (pro-rated)</span>
              <span className="amount" style={{ color: "var(--muted)" }}>${(totalBudget * monthFrac).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2>By category</h2>
        <span className="sub">{items.length} envelopes</span>
        <span className="right">
          <button className="btn sm"><window.Icon name="plus" size={12} /> New envelope</button>
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((b) => {
          const over = b.spent > b.monthly;
          return (
            <div key={b.categoryId} className="card tight">
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 180px", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <window.CategoryPill categoryId={b.categoryId} />
                </div>
                <div>
                  <div style={{ position: "relative" }}>
                    <div className={"bar" + (over ? " over" : "")} style={{ height: 10 }}>
                      <span style={{ width: `${Math.min(b.pct, 100)}%`, background: over ? "var(--neg)" : `var(--c-${b.cat.color}-ink)` }} />
                    </div>
                    {/* Expected marker */}
                    <div style={{ position: "absolute", left: `${(monthFrac * 100).toFixed(1)}%`, top: -2, bottom: -2, width: 2, background: "var(--text)", opacity: 0.4, borderRadius: 2 }} title={`Pace marker: day ${dayOfMonth}/${daysIn}`} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                    <span>${b.spent.toFixed(0)} of ${b.monthly}</span>
                    <span>{b.pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="amount" style={{ fontSize: 16, fontWeight: 500, color: over ? "var(--neg)" : "var(--text)" }}>
                    ${(b.monthly - b.spent).toFixed(0)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {over ? `${window.fmtMoneyShort(b.spent - b.monthly)} over` : "left to spend"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
window.Budgets = Budgets;
