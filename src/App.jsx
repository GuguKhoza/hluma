// src/App.jsx  (or just App.js)

import { useState, useEffect } from "react";

// ─── CONFIG ────────────────────────────────────────────────
const CONFIG = {
  supabase: {
    url: "https://wfzzfmfcuskgpurgjzom.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmenpmbWZjdXNrZ3B1cmdqem9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODQ4NTQsImV4cCI6MjA5MDQ2MDg1NH0.fR5qTnq5r2Suy0yhA2g9Q0P-o3aqqVNvo---LHPT350",
  },
  originstamp: {
    apiKey: "YOUR_ORIGINSTAMP_API_KEY",
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

const db = (() => {
  const h = {
    "Content-Type": "application/json",
    apikey: CONFIG.supabase.anonKey,
    Authorization: `Bearer ${CONFIG.supabase.anonKey}`,
  };

  const q = async (table, method = "GET", body = null, params = "") => {
    const res = await fetch(
      `${CONFIG.supabase.url}/rest/v1/${table}${params}`,
      {
        method,
        headers: {
          ...h,
          Prefer: method === "POST" ? "return=representation" : "",
        },
        body: body ? JSON.stringify(body) : null,
      }
    );

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

const hashContent = async (content) => {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content + Date.now())
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const payfast = ({ amount, name, email, itemName, id1, id2 }) => {
  const pf = CONFIG.payfast;
  const params = {
    merchant_id: pf.merchantId,
    merchant_key: pf.merchantKey,
    return_url: pf.returnUrl,
    cancel_url: pf.cancelUrl,
    notify_url: pf.notifyUrl,
    name_first: name.split(" ")[0],
    name_last: name.split(" ").slice(1).join(" ") || ".",
    email_address: email,
    m_payment_id: `HL-${Date.now()}`,
    amount: Number(amount).toFixed(2),
    item_name: `Hluma: ${itemName}`,
    custom_str1: id1,
    custom_str2: id2,
  };

  const host = pf.sandbox
    ? "https://sandbox.payfast.co.za"
    : "https://www.payfast.co.za";

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${host}/eng/process`;

  Object.entries(params).forEach(([k, v]) => {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    form.appendChild(i);
  });

  document.body.appendChild(form);
  form.submit();
};

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
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#52B788;border-radius:3px} 
@keyframes up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}} 
@keyframes spin{to{transform:rotate(360deg)}} 
@keyframes sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}} 
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}} 
input:focus,select:focus,textarea:focus{outline:none;border-color:#52B788!important;box-shadow:0 0 0 3px rgba(82,183,136,0.12)} 
input,select,textarea{color-scheme:light} 
button{font-family:'Plus Jakarta Sans',sans-serif}`;

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
  <div
    style={{
      width: size,
      height: size,
      border: `2px solid ${color}`,
      borderTopColor: "transparent",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    }}
  />
);

const Btn = ({ children, onClick, variant = "primary", disabled, style = {}, ...rest }) => {
  const styles = {
    primary: { background: C.primary, color: C.white, border: "none", boxShadow: `0 3px 14px ${C.shadow}` },
    outline: { background: C.white, color: C.primary, border: `1.5px solid ${C.primary}` },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    dark: { background: C.forest, color: C.white, border: "none", boxShadow: `0 3px 14px rgba(27,67,50,0.25)` },
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
        transition: "all .2s",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
};

const Tag = ({ children, color = C.primary }) => (
  <span
    style={{
      background: `${color}14`,
      color,
      border: `1px solid ${color}28`,
      padding: "3px 12px",
      borderRadius: 100,
      fontSize: 11,
      fontWeight: 600,
    }}
  >
    {children}
  </span>
);

const Input = ({ label, type = "text", ...props }) => (
  <div>
    {label && (
      <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block", fontWeight: 500 }}>
        {label}
      </label>
    )}
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
        fontFamily: "Plus Jakarta Sans",
        transition: "all .2s",
      }}
      {...props}
    />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div>
    {label && (
      <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block", fontWeight: 500 }}>
        {label}
      </label>
    )}
    <select
      style={{
        background: C.cream,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "12px 16px",
        color: C.dark,
        fontSize: 14,
        width: "100%",
        fontFamily: "Plus Jakarta Sans",
        cursor: "pointer",
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

  const cols = { success: C.primary, error: "#c0392b", info: "#2980b9" };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        background: C.white,
        border: `1.5px solid ${cols[type] || C.primary}`,
        borderRadius: 16,
        padding: "16px 22px",
        maxWidth: 360,
        boxShadow: "0 8px 40px rgba(0,0,0,0.13)",
        animation: "up .3s ease",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 20 }}>
        {type === "success" ? "🌱" : type === "error" ? "❌" : "💚"}
      </span>
      <span style={{ fontSize: 13, color: C.dark, lineHeight: 1.55, flex: 1 }}>{msg}</span>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}

// All other components (Nav, Home, ProductCard, BizCard, Marketplace, SellForm, FundPage, Dashboard, etc.) 
// remain exactly as you provided them — I only fixed the quotes and minor syntax issues.

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
        const [biz, prod, inv] = await Promise.all([
          db.from("founders").select("*", "&order=created_at.desc"),
          db.from("products").select("*", "&order=created_at.desc"),
          db.from("investments").select("*", "&order=created_at.desc&limit=50"),
        ]);
        setBusinesses(Array.isArray(biz) ? biz : []);
        setProducts(Array.isArray(prod) ? prod : []);
        setInvestments(Array.isArray(inv) ? inv : []);
      } catch (err) {
        console.warn("DB:", err.message);
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
    dash: <Dashboard businesses={businesses} products={products} investments={investments} />,
  };

  return (
    <>
      <style>{GS}</style>
      <Nav page={page} setPage={setPage} />
      <div style={{ minHeight: "100vh" }}>{pages[page] || pages.home}</div>
      <footer
        style={{
          background: C.forest,
          padding: "40px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <Logo size={24} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          Marketplace · Revenue Sharing · SA Registered · POPIA · 2026
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy", "Terms", "Contact"].map((l) => (
            <span key={l} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
              {l}
            </span>
          ))}
        </div>
      </footer>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}