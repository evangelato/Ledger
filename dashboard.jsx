// Dashboard — three variations
const { useMemo: useMemoD, useState: useStateD } = React;

function useDashboardData(txns) {
  return useMemoD(() => {
    const today = new Date();
    const curKey = today.toISOString().slice(0, 7);
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today); d.setMonth(d.getMonth() - i); d.setDate(1);
      months.push(d.toISOString().slice(0, 7));
    }

    const byMonth = {};
    months.forEach((m) => byMonth[m] = { income: 0, spend: 0, byCat: {} });
    txns.forEach((t) => {
      const m = t.date.slice(0, 7);
      if (!byMonth[m]) return;
      if (t.amount > 0 && t.category === "income") byMonth[m].income += t.amount;
      else if (t.amount < 0 && t.category !== "transfers") {
        byMonth[m].spend += -t.amount;
        byMonth[m].byCat[t.category] = (byMonth[m].byCat[t.category] || 0) + -t.amount;
      }
    });

    const cur = byMonth[curKey];
    const prevKey = months[months.length - 2];
    const prev = byMonth[prevKey];

    // Top categories this month
    const catEntries = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1]);
    const topCats = catEntries.slice(0, 6).map(([cid, v]) => ({
      label: window.catById(cid).name, value: -v, color: window.catById(cid).color, categoryId: cid,
    }));

    // Daily spend for this month (for heatmap & sparkline)
    const daysIn = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayTotals = Array(daysIn).fill(0);
    txns.forEach((t) => {
      if (t.date.slice(0, 7) !== curKey) return;
      if (t.amount < 0 && t.category !== "transfers") {
        const d = parseInt(t.date.slice(8, 10), 10);
        dayTotals[d - 1] += -t.amount;
      }
    });

    // Cumulative spend this month
    const cum = [];
    let acc = 0;
    for (let i = 0; i < dayTotals.length; i++) { acc += dayTotals[i]; cum.push(acc); }

    // Last month cumulative for compare
    const prevDayTotals = Array(daysIn).fill(0);
    txns.forEach((t) => {
      if (t.date.slice(0, 7) !== prevKey) return;
      if (t.amount < 0 && t.category !== "transfers") {
        const d = parseInt(t.date.slice(8, 10), 10);
        if (d <= daysIn) prevDayTotals[d - 1] += -t.amount;
      }
    });
    const prevCum = [];
    acc = 0;
    for (let i = 0; i < prevDayTotals.length; i++) { acc += prevDayTotals[i]; prevCum.push(acc); }

    // Monthly trend (last 6)
    const monthlySpend = months.map((m) => ({ x: window.monthLabel(m).split(" ")[0], y: byMonth[m].spend }));
    const monthlyIncome = months.map((m) => ({ x: window.monthLabel(m).split(" ")[0], y: byMonth[m].income }));

    return { cur, prev, topCats, dayTotals, cum, prevCum, monthlySpend, monthlyIncome, months, byMonth, curKey, daysIn };
  }, [txns]);
}

// ---------- Variation A: Summary ----------
function DashboardSummary({ txns, onOpenTxn }) {
  const data = useDashboardData(txns);
  const today = new Date();
  const dayOfMonth = today.getDate();
  const projectedSpend = (data.cur.spend / dayOfMonth) * data.daysIn;
  const spendDelta = data.prev.spend > 0 ? ((data.cur.spend - data.prev.spend) / data.prev.spend) * 100 : 0;
  const incomeDelta = data.prev.income > 0 ? ((data.cur.income - data.prev.income) / data.prev.income) * 100 : 0;
  const netCur = data.cur.income - data.cur.spend;
  const netPrev = data.prev.income - data.prev.spend;
  const netDelta = netPrev !== 0 ? ((netCur - netPrev) / Math.abs(netPrev)) * 100 : 0;

  const recent = txns.slice(0, 8);

  return (
    <>
      {/* Headline */}
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card-title">Spent this month</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className="amount huge">${data.cur.spend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            <window.Delta value={spendDelta} suffix="%" invert />
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 4, color: "var(--muted)", fontSize: 12.5 }}>
            <span>Projected: <span className="amount" style={{ color: "var(--text)" }}>${projectedSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></span>
            <span>Last month: <span className="amount" style={{ color: "var(--text)" }}>${data.prev.spend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></span>
          </div>
          <div style={{ marginTop: 8, height: 100 }}>
            <window.LineChart
              height={100}
              showAxis={false}
              series={[
                { color: "var(--muted)", points: data.prevCum.map((v, i) => ({ x: i + 1, y: v })), fill: false },
                { color: "var(--c-sage-ink)", points: data.cum.slice(0, dayOfMonth).map((v, i) => ({ x: i + 1, y: v })), fill: true },
              ]}
            />
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 2, background: "var(--c-sage-ink)", borderRadius: 2 }} />This month
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 2, background: "var(--muted)", borderRadius: 2 }} />Last month
            </span>
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <window.Donut data={data.topCats} size={104} thickness={16} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="card-title" style={{ margin: 0 }}>Top categories</div>
              {data.topCats.slice(0, 5).map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, minWidth: 0 }}>
                  <span className={`dot ${c.color}`}></span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
                  <span className="amount" style={{ fontSize: 12 }}>${Math.abs(c.value).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="card tight">
              <div className="card-title">Income</div>
              <div className="amount big" style={{ color: "var(--pos)" }}>${data.cur.income.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
              <div style={{ marginTop: 6 }}><window.Delta value={incomeDelta} suffix="%" /></div>
            </div>
            <div className="card tight">
              <div className="card-title">Net</div>
              <div className="amount big">${netCur.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
              <div style={{ marginTop: 6 }}><window.Delta value={netDelta} suffix="%" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center" }}>
          <div className="card-title" style={{ margin: 0 }}>Recent activity</div>
          <div className="spacer" />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{recent.length} of {txns.length}</span>
        </div>
        <div>
          {recent.map((t) => (
            <button key={t.id} className="txn-row" onClick={() => onOpenTxn(t.id)}>
              <span className="txn-date">{window.fmtDateRel(t.date)}</span>
              <span className="txn-merch">
                <window.MerchantIcon merchant={t.merchant} categoryId={t.category} />
                <span style={{ minWidth: 0 }}>
                  <span className="name">{t.merchant}{t.pending && <span className="pending-tag">Pending</span>}</span>
                  {t.note && <div className="note">{t.note}</div>}
                </span>
              </span>
              <window.CategoryPill categoryId={t.category} />
              <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{t.bank || window.accById(t.account).mask}</span>
              <span className={"amount " + (t.amount < 0 ? "neg" : "pos")}>
                {window.fmtMoney(t.amount, { showPlus: true })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------- Variation B: Insights (heatmap + trend + insight cards) ----------
function DashboardInsights({ txns, onOpenTxn }) {
  const data = useDashboardData(txns);
  const today = new Date();
  const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Heatmap levels
  const dayMax = Math.max(...data.dayTotals, 1);
  const levelOf = (v) => v === 0 ? 0 : v < dayMax * 0.15 ? 1 : v < dayMax * 0.35 ? 2 : v < dayMax * 0.6 ? 3 : v < dayMax * 0.85 ? 4 : 5;

  // Compute biggest categorical changes
  const catDiffs = [];
  const allCats = new Set([...Object.keys(data.cur.byCat), ...Object.keys(data.prev.byCat)]);
  allCats.forEach((c) => {
    const cur = data.cur.byCat[c] || 0;
    const prev = data.prev.byCat[c] || 0;
    if (cur === 0 && prev === 0) return;
    catDiffs.push({ cat: c, cur, prev, diff: cur - prev, pct: prev > 0 ? ((cur - prev) / prev) * 100 : 100 });
  });
  catDiffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const insights = [
    {
      title: "Dining is up sharply",
      body: `You've spent ${window.fmtMoney(-catDiffs.find(c => c.cat === "dining")?.cur || 0).replace("-","")} on dining so far — ${(catDiffs.find(c => c.cat === "dining")?.pct || 0).toFixed(0)}% more than last month, driven by 4 visits to Tartine.`,
      tone: "warn",
    },
    {
      title: "Subscriptions look stable",
      body: "9 recurring charges, $151.95/mo. No price increases detected in the last 90 days.",
      tone: "good",
    },
    {
      title: "Cash flow this month",
      body: `Income ${window.fmtMoneyShort(data.cur.income)} vs spend ${window.fmtMoneyShort(data.cur.spend)}. You'll likely end ${window.fmtMoneyShort(data.cur.income - data.cur.spend * (data.daysIn / today.getDate()))} net.`,
      tone: "neutral",
    },
  ];

  return (
    <>
      <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">
            <window.Icon name="dashboard" size={12} />
            Spending heatmap — {monthName}
            <span className="right" style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
              Daily total
            </span>
          </div>
          <div className="heatmap" style={{ gridTemplateColumns: `repeat(${data.daysIn}, 1fr)` }}>
            {data.dayTotals.map((v, i) => {
              const lvl = levelOf(v);
              return (
                <div key={i} className={`cell ${lvl ? "l" + lvl : ""}`}
                     title={`Day ${i+1}: ${window.fmtMoney(-v)}`}>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
            <span>day 1</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              less <span className="cell l1" style={{ width: 10, height: 10, borderRadius: 3, display: "inline-block" }}/>
              <span className="cell l2" style={{ width: 10, height: 10, borderRadius: 3, display: "inline-block" }}/>
              <span className="cell l3" style={{ width: 10, height: 10, borderRadius: 3, display: "inline-block" }}/>
              <span className="cell l4" style={{ width: 10, height: 10, borderRadius: 3, display: "inline-block" }}/>
              <span className="cell l5" style={{ width: 10, height: 10, borderRadius: 3, display: "inline-block" }}/> more
            </span>
            <span>day {data.daysIn}</span>
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <window.Icon name="trending-up" size={12} />
            6-month trend
          </div>
          <window.LineChart
            height={220}
            series={[
              { color: "var(--c-sage-ink)", points: data.monthlySpend, fill: true },
              { color: "var(--c-peach-ink)", points: data.monthlyIncome, fill: false },
            ]}
          />
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 2, background: "var(--c-sage-ink)", borderRadius: 2 }} />Spend
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 2, background: "var(--c-peach-ink)", borderRadius: 2 }} />Income
            </span>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        {insights.map((ins, i) => (
          <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center",
                background: ins.tone === "warn" ? "var(--c-peach)" : ins.tone === "good" ? "var(--c-sage)" : "var(--c-sky)",
                color: ins.tone === "warn" ? "var(--c-peach-ink)" : ins.tone === "good" ? "var(--c-sage-ink)" : "var(--c-sky-ink)",
              }}>
                <window.Icon name="sparkles" size={14} />
              </span>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{ins.title}</h3>
            </div>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13, lineHeight: 1.5 }}>{ins.body}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Biggest changes vs. last month</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {catDiffs.slice(0, 5).map((d, i) => {
            const cat = window.catById(d.cat);
            const maxAbs = Math.max(...catDiffs.slice(0, 5).map((x) => Math.max(x.cur, x.prev)));
            const curW = (d.cur / maxAbs) * 100;
            const prevW = (d.prev / maxAbs) * 100;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 120px", alignItems: "center", gap: 14 }}>
                <window.CategoryPill categoryId={d.cat} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ height: 8, background: "var(--inset)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${curW}%`, background: `var(--c-${cat.color}-ink)`, borderRadius: 999 }} />
                  </div>
                  <div style={{ height: 4, background: "var(--inset)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${prevW}%`, background: "var(--muted)", borderRadius: 999, opacity: 0.5 }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="amount" style={{ fontSize: 13 }}>{window.fmtMoneyShort(d.cur)}</span>
                  <window.Delta value={d.pct} suffix="%" invert />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Derive upcoming recurring from transaction history
// A merchant is considered recurring if it appears in 3+ of the last 6 months
function UpcomingRecurring({ txns }) {
  const upcoming = useMemoD(() => {
    const today = new Date();
    const sixMonthsAgo = new Date(today); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoff = sixMonthsAgo.toISOString().slice(0, 10);

    // Group negative transactions by merchant
    const byMerchant = {};
    txns.filter((t) => t.amount < 0 && t.date >= cutoff && t.category !== "transfers").forEach((t) => {
      const key = t.merchant;
      if (!byMerchant[key]) byMerchant[key] = [];
      byMerchant[key].push(t);
    });

    // Keep merchants appearing in 3+ distinct months
    return Object.entries(byMerchant)
      .filter(([, arr]) => {
        const months = new Set(arr.map((t) => t.date.slice(0, 7)));
        return months.size >= 3;
      })
      .map(([merchant, arr]) => {
        const latest = arr.sort((a, b) => b.date > a.date ? 1 : -1)[0];
        const dayOfMonth = parseInt(latest.date.slice(8, 10), 10);
        const next = new Date(today.getFullYear(), today.getMonth() + (today.getDate() >= dayOfMonth ? 1 : 0), dayOfMonth);
        return {
          merchant,
          category: latest.category,
          amount: Math.abs(latest.amount),
          when: next.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
      })
      .sort((a, b) => a.when > b.when ? 1 : -1)
      .slice(0, 5);
  }, [txns]);

  if (upcoming.length === 0) {
    return <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>Import more months to detect recurring charges.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {upcoming.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < upcoming.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
          <window.MerchantIcon merchant={r.merchant} categoryId={r.category} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.merchant}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--mono)" }}>{r.when}</div>
          </div>
          <span className="amount neg">-${r.amount.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Variation C: Cashflow streams ----------
function DashboardCashflow({ txns, onOpenTxn }) {
  const data = useDashboardData(txns);
  const net = data.cur.income - data.cur.spend;

  // Income sources
  const incomeMap = {};
  txns.filter((t) => t.amount > 0 && t.category === "income" && t.date.slice(0, 7) === data.curKey)
      .forEach((t) => {
        const key = t.merchant.split("—")[0].trim();
        incomeMap[key] = (incomeMap[key] || 0) + t.amount;
      });
  const incomeSources = Object.entries(incomeMap).map(([k, v]) => ({ label: k, value: v }));
  const incomeTotal = data.cur.income || 1;

  // Categories spend
  const spendTotal = data.cur.spend || 1;
  const spendList = Object.entries(data.cur.byCat).sort((a, b) => b[1] - a[1]);

  // Spend by bank
  const accSpend = {};
  txns.filter((t) => t.date.slice(0, 7) === data.curKey && t.amount < 0 && t.category !== "transfers")
      .forEach((t) => { const key = t.bank || t.account || "Unknown"; accSpend[key] = (accSpend[key] || 0) + -t.amount; });

  return (
    <>
      {/* Top metric row */}
      <div className="grid-4" style={{ marginBottom: 18 }}>
        <div className="card tight">
          <div className="card-title">Income</div>
          <div className="amount" style={{ fontSize: 24, fontWeight: 500 }}>{window.fmtMoneyShort(data.cur.income)}</div>
        </div>
        <div className="card tight">
          <div className="card-title">Spend</div>
          <div className="amount" style={{ fontSize: 24, fontWeight: 500 }}>{window.fmtMoneyShort(data.cur.spend)}</div>
        </div>
        <div className="card tight">
          <div className="card-title">Net</div>
          <div className="amount" style={{ fontSize: 24, fontWeight: 500, color: net >= 0 ? "var(--pos)" : "var(--neg)" }}>
            {window.fmtMoneyShort(net)}
          </div>
        </div>
        <div className="card tight">
          <div className="card-title">Savings rate</div>
          <div className="amount" style={{ fontSize: 24, fontWeight: 500 }}>
            {((net / Math.max(data.cur.income, 1)) * 100).toFixed(1)}<span style={{ fontSize: 14, color: "var(--muted)" }}>%</span>
          </div>
        </div>
      </div>

      {/* Money flow */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Money flow — this month</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 16, alignItems: "stretch", marginTop: 10 }}>
          {/* Sources */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Sources</div>
            {incomeSources.map((s, i) => (
              <div key={i} style={{
                padding: "12px 14px",
                background: "var(--c-moss)",
                color: "var(--c-moss-ink)",
                borderRadius: 12,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 13, fontWeight: 500,
                height: `${Math.max((s.value / incomeTotal) * 100, 18)}%`,
                minHeight: 50,
              }}>
                <span>{s.label}</span>
                <span className="amount">{window.fmtMoneyShort(s.value)}</span>
              </div>
            ))}
          </div>
          {/* Center */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="80" height="100%" viewBox="0 0 80 200" preserveAspectRatio="none" style={{ width: "100%", height: "100%", minHeight: 200 }}>
              <defs>
                <linearGradient id="flow" x1="0" x2="1">
                  <stop offset="0%" stopColor="var(--c-moss-ink)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="var(--c-sage-ink)" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path d="M 0 50 C 40 50 40 100 80 100 L 80 100 C 40 100 40 150 0 150 Z" fill="url(#flow)" opacity="0.4" />
              <path d="M 0 80 C 40 80 40 100 80 100 C 40 100 40 120 0 120 Z" fill="url(#flow)" opacity="0.6" />
            </svg>
            <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)" }}>
              <window.Icon name="chevron" size={16} />
            </div>
          </div>
          {/* Categories */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Spent on</div>
            {spendList.map(([cid, v], i) => {
              const cat = window.catById(cid);
              const pct = (v / spendTotal) * 100;
              return (
                <div key={i} style={{
                  padding: "8px 12px",
                  background: `var(--c-${cat.color})`,
                  color: `var(--c-${cat.color}-ink)`,
                  borderRadius: 10,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: 12.5, fontWeight: 500,
                  height: `${Math.max(pct, 6)}%`,
                  minHeight: 30,
                }}>
                  <span>{cat.name}</span>
                  <span className="amount" style={{ fontSize: 12 }}>{window.fmtMoneyShort(v)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-card */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">By bank</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(accSpend).sort((a, b) => b[1] - a[1]).map(([bank, v]) => {
              const max = Math.max(...Object.values(accSpend));
              return (
                <div key={bank}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <window.Icon name="card" size={14} />
                      {bank || "Unknown"}
                    </span>
                    <span className="amount">{window.fmtMoneyShort(v)}</span>
                  </div>
                  <div className="bar"><span style={{ width: `${(v / max) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Upcoming recurring</div>
          <UpcomingRecurring txns={txns} />
        </div>
      </div>
    </>
  );
}

function EmptyDashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--inset)", display: "grid", placeItems: "center", color: "var(--muted)" }}>
        <window.Icon name="import" size={28} stroke={1.4} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>No transactions yet</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Import a CSV statement to get started.</div>
        <button className="btn primary" onClick={() => window.dispatchEvent(new CustomEvent("ledger-nav", { detail: "import" }))}>
          <window.Icon name="plus" size={14} /> Import statement
        </button>
      </div>
    </div>
  );
}

function Dashboard({ variant, txns, onOpenTxn }) {
  if (!txns || txns.length === 0) return <EmptyDashboard />;
  if (variant === "insights") return <DashboardInsights txns={txns} onOpenTxn={onOpenTxn} />;
  if (variant === "cashflow") return <DashboardCashflow txns={txns} onOpenTxn={onOpenTxn} />;
  return <DashboardSummary txns={txns} onOpenTxn={onOpenTxn} />;
}
window.Dashboard = Dashboard;
