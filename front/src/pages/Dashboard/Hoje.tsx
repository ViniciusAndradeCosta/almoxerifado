import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/useApi";
import {
  IconZap, IconInbox, IconShoppingCart, IconWash,
  IconAlertTriangle, IconCheckCircle, IconArrowRight, IconPackage,
  IconSearch, IconX, IconUsers
} from "../../components/Icons";

interface AlertItem {
  itemId: number; itemName: string; itemType: string; itemSector: string;
  estoqueAtual: number; margemSeguranca: number; deficit: number; nivel: string;
}
interface FeedItem {
  tipo: "entrada" | "saida"; descricao: string; quantidade: number; horario: string; ts: number;
}
interface Employee { id: number; name: string; role: string; department: string; company: string; }
interface Item { id: number; name: string; type: string; sector: string; size: string; quantity: number; }
interface CartItem { item: Item; quantity: number; }

const nivelColor = (n: string) =>
  n === "CRITICO" ? "var(--status-critical)" : n === "ALERTA" ? "var(--status-alert)" : "var(--status-warning)";
const nivelLabel = (n: string) =>
  n === "CRITICO" ? "Sem estoque" : n === "ALERTA" ? "Abaixo da margem" : "Atenção";

const Hoje = () => {
  const [alertas, setAlertas]        = useState<AlertItem[]>([]);
  const [feed, setFeed]              = useState<FeedItem[]>([]);
  const [saidasHoje, setSaidasHoje]  = useState(0);
  const [entradasHoje, setEntradas]  = useState(0);
  const [pedidosAbertos, setPedidos] = useState(0);
  const [naLavanderia, setLav]       = useState(0);
  const [loading, setLoading]        = useState(true);
  const [employees, setEmployees]    = useState<Employee[]>([]);
  const [items, setItems]            = useState<Item[]>([]);
  const [filteredEmp, setFilteredEmp]     = useState<Employee[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedEmp, setSelectedEmp]     = useState<Employee | null>(null);
  const [empSearch, setEmpSearch]         = useState("");
  const [itemSearch, setItemSearch]       = useState("");
  const [cart, setCart]                   = useState<CartItem[]>([]);
  const [sending, setSending]             = useState(false);

  // Estados para navegação por teclado
  const [highlightedEmpIndex, setHighlightedEmpIndex] = useState(-1);
  const [highlightedItemIndex, setHighlightedItemIndex] = useState(-1);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [alertsRes, entradasRes, saidasRes, pedidosRes, lavRes, empRes, itemRes] = await Promise.all([
        api.get("/alerts"),
        api.get("/getstockentries"),
        api.get("/getallwithdrawals"),
        api.get("/getorders"),
        api.get("/laundry/pending"),
        api.get("/getemployees"),
        api.get("/getitems"),
      ]);

      const all = [
        ...alertsRes.data.alertas.critico,
        ...alertsRes.data.alertas.alerta,
        ...alertsRes.data.alertas.atencao,
      ];
      setAlertas(all.slice(0, 6));

      const todayStr = new Date().toDateString();
      setEntradas(entradasRes.data.filter((e: any) => new Date(e.entryDate).toDateString() === todayStr).length);
      setSaidasHoje(saidasRes.data.filter((s: any) => new Date(s.withdrawalDate).toDateString() === todayStr).length);
      setPedidos(pedidosRes.data.filter((p: any) => ["PENDENTE", "PARCIAL"].includes(p.status)).length);
      setLav(lavRes.data.totalPecas || 0);
      setEmployees(empRes.data);
      setItems(itemRes.data);

      const feedEntradas: FeedItem[] = entradasRes.data.map((e: any) => ({
        tipo: "entrada" as const,
        descricao: `${e.item?.name || "Item"} — ${e.supplier || "Entrada manual"}`,
        quantidade: e.quantity,
        horario: new Date(e.entryDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        ts: new Date(e.entryDate).getTime(),
      }));
      const feedSaidas: FeedItem[] = saidasRes.data.map((s: any) => ({
        tipo: "saida" as const,
        descricao: `${s.itemName} → ${s.employeeName}`,
        quantidade: s.quantity,
        horario: new Date(s.withdrawalDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        ts: new Date(s.withdrawalDate).getTime(),
      }));
      setFeed([...feedEntradas, ...feedSaidas].sort((a, b) => b.ts - a.ts).slice(0, 10));
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  // Funções de busca com reset de highlight
  const handleEmpSearch = (val: string) => {
    setEmpSearch(val); 
    setSelectedEmp(null);
    setHighlightedEmpIndex(-1);
    setFilteredEmp(val.length > 0
      ? employees.filter(e =>
          e.name.toLowerCase().includes(val.toLowerCase()) ||
          e.department.toLowerCase().includes(val.toLowerCase())
        ).slice(0, 5) : []);
  };

  const handleItemSearch = (val: string) => {
    setItemSearch(val);
    setHighlightedItemIndex(-1);
    setFilteredItems(val.length > 0
      ? items.filter(i => i.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5) : []);
  };

  const selectEmp = (emp: Employee) => { 
    setSelectedEmp(emp); 
    setEmpSearch(emp.name); 
    setFilteredEmp([]); 
    setHighlightedEmpIndex(-1);
  };

  const addToCart = (item: Item) => {
    const ex = cart.find(c => c.item.id === item.id);
    setCart(ex
      ? cart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { item, quantity: 1 }]);
    setItemSearch(""); 
    setFilteredItems([]);
    setHighlightedItemIndex(-1);
  };

  const updateQty = (id: number, q: number) =>
    q <= 0
      ? setCart(cart.filter(c => c.item.id !== id))
      : setCart(cart.map(c => c.item.id === id ? { ...c, quantity: q } : c));

  const removeCart = (id: number) => setCart(cart.filter(c => c.item.id !== id));

  const confirmEntrega = async () => {
    if (!selectedEmp) { window.alert("Selecione um colaborador."); return; }
    if (cart.length === 0) { window.alert("Adicione pelo menos um item."); return; }
    for (const c of cart) {
      if (c.quantity > c.item.quantity) { window.alert(`Estoque insuficiente: ${c.item.name}`); return; }
    }
    try {
      setSending(true);
      await Promise.all(cart.map(c => api.post("/giveitem", {
        employeeId: selectedEmp.id, itemId: c.item.id,
        quantity: c.quantity, withdrawalDate: new Date().toISOString(),
      })));
      setCart([]); setSelectedEmp(null); setEmpSearch("");
      window.alert("Entrega registrada com sucesso!");
      fetchAll();
    } catch (e: any) {
      window.alert(e.response?.data?.error || "Erro ao registrar entrega.");
    } finally { setSending(false); }
  };

  const totalCart = cart.reduce((a, c) => a + c.quantity, 0);
  const cartError = cart.some(c => c.quantity > c.item.quantity);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  const kpis = [
    { label: "Saídas Hoje",     value: saidasHoje,     color: "var(--brand)" },
    { label: "Entradas Hoje",   value: entradasHoje,   color: "var(--success)" },
    { label: "Pedidos Abertos", value: pedidosAbertos, color: pedidosAbertos > 0 ? "var(--warning)" : "var(--success)" },
    { label: "Na Lavanderia",   value: naLavanderia,   color: "var(--info)" },
  ];

  const S = {
    panel: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      overflow: "hidden",
    } as React.CSSProperties,
    panelHead: {
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 16px",
      borderBottom: "1px solid var(--border)",
      background: "var(--surface-2)",
      fontSize: "0.78rem", fontWeight: 700,
    } as React.CSSProperties,
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 2px" }}>
          Visão do Dia
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: 0, textTransform: "capitalize" }}>
          {hoje}
        </p>
      </div>

      {/* Layout flex */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* ═══ ESQUERDA — Entrega Rápida ═══ */}
        <div style={{
          width: 380, flexShrink: 0,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, display: "flex", flexDirection: "column",
          position: "sticky", top: 16
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)", borderRadius: "8px 8px 0 0",
            fontSize: "0.78rem", fontWeight: 700,
          }}>
            <IconZap size={15} color="var(--brand)" />
            Entrega Rápida
          </div>

          {/* Corpo */}
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Colaborador */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                <IconUsers size={12} /> Colaborador
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-control"
                  value={empSearch}
                  onChange={e => handleEmpSearch(e.target.value)}
                  onKeyDown={e => {
                    if (filteredEmp.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedEmpIndex(prev => Math.min(prev + 1, filteredEmp.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedEmpIndex(prev => Math.max(prev - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (highlightedEmpIndex >= 0) selectEmp(filteredEmp[highlightedEmpIndex]);
                    } else if (e.key === "Escape") {
                      setFilteredEmp([]);
                      setHighlightedEmpIndex(-1);
                    }
                  }}
                  placeholder="Buscar nome ou setor..."
                  autoComplete="off"
                  style={{ paddingRight: 36, fontSize: "0.82rem" }}
                />
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
                  <IconSearch size={14} />
                </div>
                {/* DROPDOWN DE COLABORADOR COM FUNDO SÓLIDO */}
                {filteredEmp.length > 0 && (
                  <ul style={{ 
                    position: "absolute", width: "100%", zIndex: 20, marginTop: 4, 
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)", background: "var(--surface)", 
                    borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)",
                    padding: 0, margin: "4px 0 0 0", listStyle: "none"
                  }}>
                    {filteredEmp.map((emp, index) => (
                      <li key={emp.id} 
                        onMouseDown={(e) => { e.preventDefault(); selectEmp(emp); }} // Evita blur do input antes de clicar
                        onMouseEnter={() => setHighlightedEmpIndex(index)}
                        style={{ 
                          cursor: "pointer", padding: "8px 12px",
                          background: index === highlightedEmpIndex ? "var(--brand)" : "transparent",
                          color: index === highlightedEmpIndex ? "#fff" : "var(--text-primary)",
                          transition: "background 0.1s",
                          borderBottom: index < filteredEmp.length - 1 ? "1px solid var(--border)" : "none"
                        }}>
                        <div style={{ fontWeight: 600, fontSize: "0.78rem" }}>{emp.name}</div>
                        <div style={{ 
                          color: index === highlightedEmpIndex ? "rgba(255,255,255,0.8)" : "var(--text-muted)", 
                          fontSize: "0.68rem" 
                        }}>{emp.role} · {emp.department}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedEmp && (
                <div style={{
                  padding: "10px 12px", marginTop: 10,
                  background: "var(--brand-subtle)", border: "1px solid var(--brand)",
                  borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-primary)" }}>{selectedEmp.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{selectedEmp.department}</div>
                  </div>
                  <button onClick={() => { setSelectedEmp(null); setEmpSearch(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 }}>
                    <IconX size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Itens */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                <IconPackage size={12} /> Itens
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-control"
                  value={itemSearch}
                  onChange={e => handleItemSearch(e.target.value)}
                  onKeyDown={e => {
                    if (filteredItems.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedItemIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedItemIndex(prev => Math.max(prev - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (highlightedItemIndex >= 0) addToCart(filteredItems[highlightedItemIndex]);
                    } else if (e.key === "Escape") {
                      setFilteredItems([]);
                      setHighlightedItemIndex(-1);
                    }
                  }}
                  placeholder="Buscar item..."
                  autoComplete="off"
                  style={{ paddingRight: 36, fontSize: "0.82rem" }}
                />
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
                  <IconSearch size={14} />
                </div>
                {/* DROPDOWN DE ITENS COM FUNDO SÓLIDO */}
                {filteredItems.length > 0 && (
                  <ul style={{ 
                    position: "absolute", width: "100%", zIndex: 20, marginTop: 4, 
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)", background: "var(--surface)", 
                    borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)",
                    padding: 0, margin: "4px 0 0 0", listStyle: "none"
                  }}>
                    {filteredItems.map((item, index) => (
                      <li key={item.id} 
                        onMouseDown={(e) => { e.preventDefault(); addToCart(item); }}
                        onMouseEnter={() => setHighlightedItemIndex(index)}
                        style={{ 
                          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px",
                          background: index === highlightedItemIndex ? "var(--brand)" : "transparent",
                          color: index === highlightedItemIndex ? "#fff" : "var(--text-primary)",
                          transition: "background 0.1s",
                          borderBottom: index < filteredItems.length - 1 ? "1px solid var(--border)" : "none"
                        }}>
                        <span style={{ fontWeight: 600, fontSize: "0.78rem" }}>{item.name}</span>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", fontWeight: 700,
                          color: index === highlightedItemIndex ? "rgba(255,255,255,0.9)" : (item.quantity === 0 ? "var(--danger)" : item.quantity <= 10 ? "var(--warning)" : "var(--success)")
                        }}>
                          {item.quantity} un.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Carrinho */}
            {cart.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                {cart.map(c => (
                  <div key={c.item.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)"
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.item.name}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                        Disp.: {c.item.quantity}
                        {c.quantity > c.item.quantity && (
                          <span style={{ color: "var(--danger)", fontWeight: 700, marginLeft: 6 }}>Excede</span>
                        )}
                      </div>
                    </div>
                    <input
                      type="number"
                      value={c.quantity || ""}
                      onChange={e => updateQty(c.item.id, e.target.value === "" ? 0 : Number(e.target.value))}
                      min={1} max={c.item.quantity}
                      style={{
                        width: 48, textAlign: "center",
                        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.82rem",
                        padding: "4px 3px", borderRadius: 4,
                        border: `1px solid ${c.quantity > c.item.quantity ? "var(--danger)" : "var(--input-border)"}`,
                        background: "var(--input-bg)", color: "var(--text-primary)",
                      }}
                    />
                    <button onClick={() => removeCart(c.item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 }}>
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botão */}
            <button
              className="btn btn-primary w-100"
              onClick={confirmEntrega}
              disabled={sending || cart.length === 0 || !selectedEmp || cartError}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", fontWeight: 700, marginTop: 4 }}
            >
              {sending
                ? <><span className="spinner-border spinner-border-sm" /> Registrando...</>
                : <><IconCheckCircle size={15} /> {cart.length > 0 ? `Confirmar Entrega (${totalCart})` : "Confirmar Entrega"}</>
              }
            </button>
          </div>
        </div>

        {/* ═══ DIREITA — Painel do dia ═══ */}
        <div style={{ flex: 1, minWidth: 400, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Ações rápidas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { to: "/entradas",   icon: <IconInbox size={16} />,        label: "Entrada de Estoque" },
              { to: "/pedidos",    icon: <IconShoppingCart size={16} />, label: "Novo Pedido" },
              { to: "/lavanderia", icon: <IconWash size={16} />,         label: "Lavanderia" },
            ].map(({ to, icon, label }) => (
              <Link key={to} to={to} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, textDecoration: "none", color: "var(--text-secondary)",
                fontSize: "0.8rem", fontWeight: 600, transition: "all 0.15s"
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)"; (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}>
                <span style={{ display: "flex", color: "var(--brand)" }}>{icon}</span>
                {label}
              </Link>
            ))}
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {kpis.map(({ label, value, color }) => (
              <div key={label} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "16px 18px",
              }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>
                  {label}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.8rem", fontWeight: 800, color, lineHeight: 1 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Alertas */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <IconAlertTriangle size={15} color="var(--brand)" />
              Itens que precisam de atenção
              <Link to="/sugestoes" style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--brand)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                Ver todos <IconArrowRight size={12} />
              </Link>
            </div>
            {alertas.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "30px", color: "var(--text-muted)" }}>
                <IconCheckCircle size={28} color="var(--success)" />
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--success)" }}>Estoque saudável</span>
              </div>
            ) : alertas.map(a => (
              <div key={a.itemId} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 4, height: 24, borderRadius: 2, background: nivelColor(a.nivel) }} />
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{a.itemName}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {nivelLabel(a.nivel)} · {a.estoqueAtual}/{a.margemSeguranca} un.
                    </div>
                  </div>
                </div>
                <Link to="/pedidos" style={{
                  fontSize: "0.7rem", fontWeight: 700, color: "var(--brand)",
                  border: "1px solid var(--brand)", borderRadius: 5,
                  padding: "4px 10px", textDecoration: "none", transition: "all 0.15s"
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--brand)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}>
                  Pedir
                </Link>
              </div>
            ))}
          </div>

          {/* Feed */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <IconPackage size={15} color="var(--text-muted)" />
              Últimas movimentações
            </div>
            {feed.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                Nenhuma movimentação registrada hoje.
              </div>
            ) : feed.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "10px 16px",
                borderBottom: i < feed.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "var(--text-muted)", minWidth: 36 }}>
                  {item.horario}
                </span>
                <span style={{
                  fontSize: "0.6rem", fontWeight: 800, padding: "3px 8px", borderRadius: 4,
                  background: item.tipo === "entrada" ? "var(--success-subtle)" : "var(--brand-subtle)",
                  color: item.tipo === "entrada" ? "var(--success)" : "var(--brand)",
                  letterSpacing: "0.05em", whiteSpace: "nowrap",
                }}>
                  {item.tipo === "entrada" ? "ENTRADA" : "SAÍDA"}
                </span>
                <span style={{ flex: 1, fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.descricao}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                  ×{item.quantidade}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Hoje;