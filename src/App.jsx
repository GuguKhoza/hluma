import { useState, useEffect } from "react";

// ─── CONFIG ────────────────────────────────────────────────
const CONFIG = {
  supabase: {
    url: "https://wfzzfmfcuskgpurgjzom.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmenpmbWZjdXNrZ3B1cmdqem9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODQ4NTQsImV4cCI6MjA5MDQ2MDg1NH0.fR5qTnq5r2Suy0yhA2g9Q0P-o3aqqVNvo---LHPT350",
  },
  payfast: {
    merchantId: "YOUR_PAYFAST_MERCHANT_ID",
    merchantKey: "YOUR_PAYFAST_MERCHANT_KEY",
    returnUrl: "https://hluma.co.za/payment/success",
    cancelUrl: "https://hluma.co.za/payment/cancel",
    notifyUrl: "https://hluma.co.za/api/payfast/notify",
    sandbox: true,
  },
};

// ─── DATABASE HELPER ───────────────────────────────────────
const db = (() => {
  const h = {
    "Content-Type": "application/json",
    apikey: CONFIG.supabase.anonKey,
    Authorization: `Bearer ${CONFIG.supabase.anonKey}`,
  };

  const q = async (table, method = "GET", body = null, params = "") => {
    const res = await fetch(`${CONFIG.supabase.url}/rest/v1/${table}${params}`, {
      method,
      headers: { ...h, Prefer: method === "POST" ? "return=representation" : "" },
      body: body ? JSON.stringify(body) : null,
    });

    if (!res.ok) throw new Error(await res.text());
    return res.status === 204 ? null : res.json();
  };

  return {
    from: (t) => ({
      select: (c = "*", p = "") => q(t, "GET", null, `?select=${c}${p}`),
      insert: (d) => q(t, "POST", d),
      update: (d, m) => q(t, "PATCH", d, `?${m}`),
    }),
  };
})();

// ─── DESIGN TOKENS ────────────────────────────────────────
const C = {
  forest: "#1B4332",
  primary: "#2D6A4F",
  mid: "#40916C",
  light: "#52B788",
  pale: "#B7E4C7",
  mint: "#D8F3DC",
  cream: "#F8FAF8",
  white: "#FFFFFF",
  dark: "#0D1F16",
  soil: "#5C4033",
  muted: "rgba(27,67,50,0.5)",
  border: "rgba(45,106,79,0.12)",
  shadow: "rgba(27,67,50,0.08)",
};

const GS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap'); 
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box} 
body{font-family:'Plus Jakarta Sans',sans-serif;background:#F8FAF8;color:#0D1F16;-webkit-font-smoothing:antialiased} 
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#52B788;border-radius:3px}`;

// ─── SHARED COMPONENTS ───────────────────────────────────
const Logo = ({ size = 32 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <ellipse cx="22" cy="38" rx="13" ry="4.5" fill={C.soil} opacity=".6" />
      <path d="M22 36 Q22 26 22 15" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 26 Q14 21 11 13 Q17 14 22 20" fill={C.mid} opacity=".9" />
      <path d="M22 20 Q30 13 33 5 Q27 8 22 15" fill={C.forest} />
    </svg>
    <span style={{ fontFamily: "Playfair Display", fontWeight: 800, fontSize: size * 0.72, color: C.forest, letterSpacing: 0.3 }}>
      Hluma
    </span>
  </div>
);

const Spin = ({ color = C.white, size = 15 }) => (
  <div style={{ width: size, height: size, border: `2px solid ${color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
);

const Btn = ({ children, onClick, variant = "primary", disabled, style = {}, ...rest }) => {
  const styles = {
    primary: { background: C.primary, color: C.white, border: "none", boxShadow: `0 3px 14px ${C.shadow}` },
    outline: { background: C.white, color: C.primary, border: `1.5px solid ${C.primary}` },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    dark: { background: C.forest, color: C.white, border: "none" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: "11px 24px",
        borderRadius: 100,
        fontWeight: 600,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
};

const Tag = ({ children, color = C.primary }) => (
  <span style={{ background: `${color}14`, color, border: `1px solid ${color}28`, padding: "3px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600 }}>
    {children}
  </span>
);

const Input = ({ label, type = "text", ...props }) => (
  <div>
    {label && <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block", fontWeight: 500 }}>{label}</label>}
    <input
      type={type}
      style={{
        background: C.cream,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "12px 16px",
        color: C.dark,
        fontSize: 14,
        width: "100%",
      }}
      {...props}
    />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div>
    {label && <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block", fontWeight: 500 }}>{label}</label>}
    <select
      style={{
        background: C.cream,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "12px 16px",
        color: C.dark,
        fontSize: 14,
        width: "100%",
      }}
      {...props}
    >
      {children}
    </select>
  </div>
);

const Card = ({ children, style = {}, hover = true, ...rest }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        boxShadow: hov ? `0 12px 40px ${C.shadow}` : `0 2px 12px ${C.shadow}`,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "all .25s",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: C.white, border: `1.5px solid ${type === "error" ? "#c0392b" : C.primary}`, borderRadius: 16, padding: "16px 22px", maxWidth: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.13)", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 20 }}>{type === "success" ? "🌱" : "💚"}</span>
      <span style={{ fontSize: 13, color: C.dark, lineHeight: 1.55, flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>×</button>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────
function Nav({ page, setPage }) {
  const links = [["Marketplace", "market"], ["Fund a Biz", "fund"], ["Get Funded", "apply"], ["Dashboard", "dash"]];

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "rgba(248,250,248,0.97)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, height: 66 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => setPage("home")} style={{ cursor: "pointer" }}><Logo size={28} /></div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {links.map(([l, p]) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                background: page === p ? "rgba(45,106,79,0.1)" : "transparent",
                color: page === p ? C.primary : C.muted,
                border: page === p ? `1px solid rgba(45,106,79,0.2)` : "1px solid transparent",
                padding: "7px 16px",
                borderRadius: 100,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {l}
            </button>
          ))}
          <Btn onClick={() => setPage("sell")} variant="outline" style={{ padding: "8px 18px", fontSize: 12 }}>Sell on Hluma</Btn>
          <Btn onClick={() => setPage("home")} variant="dark" style={{ padding: "8px 18px", fontSize: 12 }}>Join Now</Btn>
        </div>
      </div>
    </nav>
  );
}

// ─── HOME ─────────────────────────────────────────────────
function Home({ setPage, businesses, products }) {
  const totalRaised = businesses.reduce((s, b) => s + (b.amount_raised || 0), 0);
  const totalRepaid = businesses.reduce((s, b) => s + (b.total_repaid || 0), 0);

  return (
    <div style={{ paddingTop: 66 }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(155deg,#F0FAF4 0%,#E0F5E9 50%,#D0EDD9 100%)`, padding: "90px 32px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ marginBottom: 20 }}><Logo size={48} /></div>
          <div style={{ display: "inline-block", background: "rgba(45,106,79,0.08)", border: `1px solid rgba(45,106,79,0.18)`, color: C.primary, padding: "6px 20px", borderRadius: 100, fontSize: 11, marginBottom: 24 }}>🇿🇦 SA · Buy · Sell · Fund</div>
          <h1 style={{ fontFamily: "Playfair Display", fontWeight: 800, fontSize: "clamp(38px,6vw,76px)", lineHeight: 1.05, color: C.dark, marginBottom: 20 }}>
            Where SA entrepreneurs<br /><span style={{ color: C.primary }}>sell, grow</span> & get funded.
          </h1>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 520, margin: "0 auto 36px" }}>
            One platform. Buy from SA businesses. Fund them with revenue sharing. Or list your own products and apply for funding.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn onClick={() => setPage("market")} variant="dark" style={{ padding: "15px 34px", fontSize: 15 }}>Shop the Marketplace →</Btn>
            <Btn onClick={() => setPage("fund")} variant="outline" style={{ padding: "15px 34px", fontSize: 15 }}>Fund a Business</Btn>
            <Btn onClick={() => setPage("sell")} variant="ghost" style={{ padding: "15px 34px", fontSize: 15 }}>Start Selling</Btn>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: C.forest, padding: "28px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 0 }}>
          {[
            [`R${totalRaised.toLocaleString("en-ZA")}`, "Funding Raised"],
            [`R${totalRepaid.toLocaleString("en-ZA")}`, "Repaid to Investors"],
            [businesses.length + "", "Live Businesses"],
            [products.length + "", "Products Listed"],
            ["R50", "Min. Investment"],
            ["150%", "Target Return"]
          ].map(([v, l], i) => (
            <div key={i} style={{ textAlign: "center", padding: "0 20px", borderRight: i < 5 ? `1px solid rgba(255,255,255,0.1)` : "none" }}>
              <div style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 22, color: C.pale }}>{v}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Pillars */}
      <div style={{ padding: "72px 32px", background: C.white }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ background: `linear-gradient(135deg,${C.mint},#E8F8ED)`, border: `1px solid ${C.border}`, borderRadius: 24, padding: "44px 36px" }}>
            <div style={{ fontSize: 44, marginBottom: 20 }}>🛍️</div>
            <h2 style={{ fontFamily: "Playfair Display", fontWeight: 800, fontSize: 30, marginBottom: 12 }}>The Marketplace</h2>
            <p style={{ color: C.muted, lineHeight: 1.8, marginBottom: 28 }}>Shop directly from SA youth entrepreneurs. Clothing, food, crafts, digital products and services.</p>
            <Btn onClick={() => setPage("market")} variant="primary">Browse Marketplace →</Btn>
          </div>

          <div style={{ background: `linear-gradient(135deg,#1B4332,#2D6A4F)`, borderRadius: 24, padding: "44px 36px", color: C.white }}>
            <div style={{ fontSize: 44, marginBottom: 20 }}>🌱</div>
            <h2 style={{ fontFamily: "Playfair Display", fontWeight: 800, fontSize: 30, marginBottom: 12 }}>Revenue Sharing</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.8, marginBottom: 28 }}>Fund SA businesses and earn monthly payments from their revenue.</p>
            <Btn onClick={() => setPage("fund")} variant="outline" style={{ borderColor: C.pale, color: C.pale }}>Fund a Business →</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ──────────────────────────────────────────
function ProductCard({ p }) {
  const typeIcons = { Physical: "📦", Digital: "💻", Service: "🛠️", Food: "🍽️" };
  const typeColors = { Physical: C.primary, Digital: "#6366f1", Service: "#e67e22", Food: "#e91e8c" };
  const tc = typeColors[p.type] || C.primary;

  return (
    <Card style={{ borderRadius: 16, overflow: "hidden", cursor: "pointer" }}>
      <div style={{ height: 180, background: `linear-gradient(135deg,${tc}18,${tc}08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, position: "relative" }}>
        {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{typeIcons[p.type] || "🛍️"}</span>}
        <div style={{ position: "absolute", top: 12, left: 12 }}><Tag color={tc}>{p.type}</Tag></div>
      </div>
      <div style={{ padding: "18px 20px" }}>
        <h3 style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{p.name}</h3>
        <p style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>by {p.seller_name}</p>
        <div style={{ fontFamily: "Playfair Display", fontWeight: 800, fontSize: 20, color: C.primary }}>R{Number(p.price).toLocaleString("en-ZA")}</div>
      </div>
    </Card>
  );
}

// ─── BIZ CARD ─────────────────────────────────────────────
function BizCard({ b, setPage }) {
  const pct = Math.min(Math.round(((b.amount_raised || 0) / b.funding_goal) * 100), 100);
  return (
    <Card style={{ padding: 26 }}>
      <Tag color={C.primary}>{b.category}</Tag>
      <h3 style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 19, margin: "12px 0 4px" }}>{b.project_title}</h3>
      <p style={{ fontSize: 13, color: "rgba(13,31,22,0.62)", marginBottom: 16 }}>{b.description?.slice(0, 120)}…</p>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: C.primary }}>R{(b.amount_raised || 0).toLocaleString("en-ZA")}</span>
          <span>{pct}% of R{Number(b.funding_goal).toLocaleString("en-ZA")}</span>
        </div>
        <div style={{ background: "rgba(45,106,79,0.1)", height: 6, borderRadius: 100 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: C.primary, borderRadius: 100 }} />
        </div>
      </div>
      <Btn onClick={() => setPage && setPage("fund")} style={{ width: "100%" }}>Fund from R50 →</Btn>
    </Card>
  );
}

// ─── MARKETPLACE ──────────────────────────────────────────
function Marketplace({ products, loading, setPage }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const types = ["All", "Physical", "Digital", "Service", "Food"];
  const filtered = products.filter(p => (filter === "All" || p.type === filter) && (!search || p.name?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ paddingTop: 66, background: C.cream, minHeight: "100vh" }}>
      <div style={{ background: `linear-gradient(135deg,${C.mint},#EAF7EE)`, padding: "48px 32px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "Playfair Display", fontWeight: 800, fontSize: 42, marginBottom: 16 }}>Shop from SA Sellers</h1>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products, services, sellers…"
            style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px", width: "100%", maxWidth: 500 }}
          />
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>
        {loading ? <div style={{ textAlign: "center", padding: "80px" }}><Spin size={40} color={C.primary} /></div> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 22 }}>
            {filtered.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SELL / APPLY FORM ─────────────────────────────────────
function SellForm({ addToast, setPage }) {
  const [tab, setTab] = useState("product");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    seller_name: "", email: "", phone: "", sa_id: "", business_name: "", location: "",
    name: "", type: "Physical", category: "", price: "", description: "", whatsapp: "",
    project_title: "", biz_desc: "", monthly_revenue: "", funding_goal: "", revenue_share_pct: "", repayment_multiple: "1.5", use_of_funds: "", agreed: false
  });

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmitProduct = async () => {
    setLoading(true);
    try {
      await db.from("products").insert({ ...form, status: "pending" });
      setDone("product");
      addToast("Product listed successfully! 🛍️", "success");
    } catch (err) {
      addToast("Failed to list product: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFunding = async () => {
    setLoading(true);
    try {
      await db.from("founders").insert({ ...form, status: "pending" });
      setDone("funding");
      addToast("Funding application submitted successfully! 🌱", "success");
    } catch (err) {
      addToast("Failed to submit application: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ paddingTop: 66, minHeight: "100vh", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ padding: "52px 44px", maxWidth: 500, textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>{done === "product" ? "🛍️" : "🌱"}</div>
          <h2 style={{ fontFamily: "Playfair Display", fontWeight: 800, fontSize: 28 }}>{done === "product" ? "Product Listed!" : "Application Submitted!"}</h2>
          <p style={{ color: C.muted, margin: "20px 0 30px" }}>{done === "product" ? "Your product will go live after review." : "Your funding application is under review."}</p>
          <Btn onClick={() => setPage("market")}>Browse Marketplace</Btn>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 66, background: C.cream, minHeight: "100vh" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "52px 24px" }}>
        <h1 style={{ fontFamily: "Playfair Display", fontWeight: 800, fontSize: 40, marginBottom: 6 }}>Sell & Get Funded</h1>
        <p style={{ color: C.muted, marginBottom: 32 }}>One account. List products. Apply for funding.</p>

        {/* Tab Switcher */}
        <div style={{ display: "flex", background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 4, marginBottom: 32 }}>
          {[["🛍️ List a Product", "product"], ["🌱 Apply for Funding", "funding"]].map(([label, t]) => (
            <button key={t} onClick={() => { setTab(t); setStep(1); }} style={{ flex: 1, background: tab === t ? C.primary : "transparent", color: tab === t ? C.white : C.muted, padding: "12px", borderRadius: 11, fontWeight: 600 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Form Steps */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: "32px 28px" }}>
          {step === 1 && (
            <div>
              <h3>Your Details</h3>
              <Input label="Full Name *" value={form.seller_name} onChange={e => set("seller_name", e.target.value)} />
              <Input label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
              <Input label="Phone *" value={form.phone} onChange={e => set("phone", e.target.value)} />
              <Input label="SA ID Number *" value={form.sa_id} onChange={e => set("sa_id", e.target.value)} />
            </div>
          )}

          {tab === "product" && step === 2 && (
            <div>
              <h3>Product Information</h3>
              <Input label="Product Name *" value={form.name} onChange={e => set("name", e.target.value)} />
              <Select label="Type *" value={form.type} onChange={e => set("type", e.target.value)}>
                {["Physical", "Digital", "Service", "Food"].map(t => <option key={t}>{t}</option>)}
              </Select>
              <Input label="Price (R) *" type="number" value={form.price} onChange={e => set("price", e.target.value)} />
            </div>
          )}

          {tab === "funding" && step === 2 && (
            <div>
              <h3>Business Information</h3>
              <Input label="Project Title *" value={form.project_title} onChange={e => set("project_title", e.target.value)} />
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}>
            {step > 1 && <Btn onClick={() => setStep(s => s - 1)} variant="ghost">← Back</Btn>}
            {step < 2 ? (
              <Btn onClick={() => setStep(s => s + 1)}>Continue →</Btn>
            ) : tab === "product" ? (
              <Btn onClick={handleSubmitProduct} disabled={loading}>{loading ? <><Spin /> Submitting...</> : "List Product 🛍️"}</Btn>
            ) : (
              <Btn onClick={handleSubmitFunding} disabled={loading}>{loading ? <><Spin /> Submitting...</> : "Apply for Funding 🌱"}</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FUND PAGE ────────────────────────────────────────────
function FundPage({ businesses, loading, setPage }) {
  return (
    <div style={{ paddingTop: 66, background: C.cream, minHeight: "100vh" }}>
      <div style={{ background: `linear-gradient(135deg,${C.forest},${C.primary})`, padding: "52px 32px", color: C.white }}>
        <h1 style={{ fontFamily: "Playfair Display", fontWeight: 800, fontSize: 42 }}>Fund a Business</h1>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>
        {loading ? <Spin /> : businesses.map(b => <BizCard key={b.id} b={b} setPage={setPage} />)}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────
function Dashboard({ businesses, products }) {
  return (
    <div style={{ paddingTop: 66, padding: "40px", background: C.cream }}>
      <h1 style={{ fontFamily: "Playfair Display", fontWeight: 800 }}>Dashboard</h1>
      <p>Businesses: {businesses.length} | Products: {products.length}</p>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [businesses, setBusinesses] = useState([]);
  const [products, setProducts] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const addToast = (msg, type = "info") => setToast({ msg, type });

  useEffect(() => {
    const load = async () => {
      try {
        const [biz, prod] = await Promise.all([
          db.from("founders").select("*"),
          db.from("products").select("*"),
        ]);
        setBusinesses(Array.isArray(biz) ? biz : []);
        setProducts(Array.isArray(prod) ? prod : []);
      } catch (err) {
        console.warn("DB Error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pages = {
    home: <Home setPage={setPage} businesses={businesses} products={products} />,
    market: <Marketplace products={products} loading={loading} setPage={setPage} />,
    fund: <FundPage businesses={businesses} loading={loading} setPage={setPage} />,
    sell: <SellForm addToast={addToast} setPage={setPage} />,
    apply: <SellForm addToast={addToast} setPage={setPage} />,
    dash: <Dashboard businesses={businesses} products={products} />,
  };

  return (
    <>
      <style>{GS}</style>
      <Nav page={page} setPage={setPage} />
      <div style={{ minHeight: "100vh" }}>{pages[page] || pages.home}</div>

      <footer style={{ background: C.forest, padding: "40px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, color: "rgba(255,255,255,0.7)" }}>
        <Logo size={24} />
        <div style={{ fontSize: 12 }}>Marketplace · Revenue Sharing · SA Registered · POPIA · 2026</div>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy", "Terms", "Contact"].map(l => <span key={l} style={{ fontSize: 12, cursor: "pointer" }}>{l}</span>)}
        </div>
      </footer>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}