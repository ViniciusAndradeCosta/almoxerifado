import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/useApi";
import {
  IconZap, IconAlertTriangle, IconCheckCircle,
  IconArrowRight, IconPackage, IconSearch, IconX, IconUsers, IconPlus, IconCalendar
} from "../../components/Icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertItem {
  itemId: number;
  itemName: string;
  itemType: string;
  itemSector: string;
  itemSize?: string;
  estoqueAtual: number;
  margemSeguranca: number;
  deficit: number;
  nivel: string;
}

interface FeedItem {
  tipo: "entrada" | "saida" | "devolucao_estoque" | "devolucao_descarte";
  descricao: string;
  quantidade: number;
  horario: string;
  ts: number;
}

interface Employee {
  id: number;
  name: string;
  role: string;
  department: string;
  company: string;
  admissionDate: string;
}

interface Item {
  id: number;
  name: string;
  type: string;
  sector: string;
  size: string;
  quantity: number;
}

interface CartItem {
  item: Item;
  quantity: number;
  origemPeca: "NOVA" | "DEVOLVIDA";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nivelColor = (n: string) =>
  n === "CRITICO"
    ? "var(--status-critical)"
    : n === "ALERTA"
    ? "var(--status-alert)"
    : "var(--status-warning)";

const nivelLabel = (n: string) =>
  n === "CRITICO"
    ? "Sem estoque"
    : n === "ALERTA"
    ? "Abaixo da margem"
    : "Atenção";

const todayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const twentyDaysAgoString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 20);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ─── Style tokens ─────────────────────────────────────────────────────────────

const s = {
  // Layout
  page: {
    paddingBottom: 40,
  } as React.CSSProperties,

  pageHeader: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: "1px solid var(--border)",
  } as React.CSSProperties,

  pageTitle: {
    fontSize: "1.25rem",
    fontWeight: 800,
    letterSpacing: "-0.025em",
    margin: "0 0 2px",
  } as React.CSSProperties,

  pageSubtitle: {
    color: "var(--text-muted)",
    fontSize: "0.75rem",
    margin: 0,
    textTransform: "capitalize",
  } as React.CSSProperties,

  body: {
    display: "flex",
    gap: 20,
    alignItems: "flex-start",
    flexWrap: "wrap",
  } as React.CSSProperties,

  // Columns
  leftCol: {
    width: 380,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    position: "sticky",
    top: 16,
  } as React.CSSProperties,

  rightCol: {
    flex: 1,
    minWidth: 400,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  } as React.CSSProperties,

  // Panel
  panel: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    overflow: "hidden",
  } as React.CSSProperties,

  panelNoOverflow: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
  } as React.CSSProperties,

  panelHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface-2)",
    fontSize: "0.78rem",
    fontWeight: 700,
  } as React.CSSProperties,

  panelHeadLink: {
    marginLeft: "auto",
    fontSize: "0.7rem",
    color: "var(--brand)",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 700,
  } as React.CSSProperties,

  panelBody: {
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  } as React.CSSProperties,

  // Field label
  fieldLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    color: "var(--text-secondary)",
  } as React.CSSProperties,

  // Search wrapper
  searchWrapper: {
    position: "relative",
  } as React.CSSProperties,

  searchIcon: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    display: "flex",
    pointerEvents: "none",
  } as React.CSSProperties,

  searchInput: {
    paddingRight: 36,
    fontSize: "0.82rem",
  } as React.CSSProperties,

  // Dropdown list
  dropdown: {
    position: "absolute",
    width: "100%",
    zIndex: 20,
    marginTop: 4,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    background: "var(--surface)",
    borderRadius: 6,
    overflow: "hidden",
    border: "1px solid var(--border)",
    padding: 0,
    margin: "4px 0 0 0",
    listStyle: "none",
  } as React.CSSProperties,

  dropdownItem: (highlighted: boolean): React.CSSProperties => ({
    cursor: "pointer",
    padding: "8px 12px",
    background: highlighted ? "var(--brand)" : "transparent",
    color: highlighted ? "#fff" : "var(--text-primary)",
    transition: "background 0.1s",
  }),

  dropdownItemBorder: {
    borderBottom: "1px solid var(--border)",
  } as React.CSSProperties,

  dropdownItemName: {
    fontWeight: 600,
    fontSize: "0.78rem",
  } as React.CSSProperties,

  dropdownItemSub: (highlighted: boolean): React.CSSProperties => ({
    fontSize: "0.68rem",
    color: highlighted ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
  }),

  // Selected employee chip
  selectedEmpChip: {
    padding: "10px 12px",
    marginTop: 10,
    background: "var(--brand-subtle)",
    border: "1px solid var(--brand)",
    borderRadius: 6,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,

  selectedEmpName: {
    fontWeight: 700,
    fontSize: "0.8rem",
  } as React.CSSProperties,

  selectedEmpDept: {
    color: "var(--text-muted)",
    fontSize: "0.7rem",
  } as React.CSSProperties,

  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    display: "flex",
    padding: 4,
  } as React.CSSProperties,

  // Item dropdown row
  itemDropdownRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  } as React.CSSProperties,

  itemDropdownLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  } as React.CSSProperties,

  itemDropdownName: {
    fontWeight: 600,
    fontSize: "0.78rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  sizeBadge: (highlighted: boolean): React.CSSProperties => ({
    padding: "2px 7px",
    borderRadius: 4,
    flexShrink: 0,
    background: highlighted ? "rgba(255,255,255,0.25)" : "var(--brand)",
    color: "#fff",
    fontSize: "0.62rem",
    fontWeight: 800,
    letterSpacing: "0.05em",
    lineHeight: 1.4,
    display: "inline-flex",
    alignItems: "center",
  }),

  itemQty: (qty: number, highlighted: boolean): React.CSSProperties => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    fontWeight: 700,
    flexShrink: 0,
    marginLeft: 8,
    color: highlighted
      ? "rgba(255,255,255,0.9)"
      : qty === 0
      ? "var(--danger)"
      : qty <= 10
      ? "var(--warning)"
      : "var(--success)",
  }),

  // Cart
  cartContainer: {
    border: "1px solid var(--border)",
    borderRadius: 6,
    overflow: "hidden",
  } as React.CSSProperties,

  cartRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 12px",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface-2)",
  } as React.CSSProperties,

  cartItemInfo: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  cartItemNameRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties,

  cartItemName: {
    fontWeight: 600,
    fontSize: "0.78rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  cartSizeBadge: {
    padding: "2px 6px",
    borderRadius: 4,
    background: "var(--brand)",
    color: "#fff",
    fontSize: "0.6rem",
    fontWeight: 800,
    flexShrink: 0,
  } as React.CSSProperties,

  cartItemSub: {
    fontSize: "0.68rem",
    color: "var(--text-muted)",
    marginTop: 2,
  } as React.CSSProperties,

  cartExceeds: {
    color: "var(--danger)",
    fontWeight: 700,
    marginLeft: 6,
  } as React.CSSProperties,

  cartQtyInput: (exceeds: boolean): React.CSSProperties => ({
    width: 48,
    textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    fontSize: "0.82rem",
    padding: "4px 3px",
    borderRadius: 4,
    border: `1px solid ${exceeds ? "var(--danger)" : "var(--input-border)"}`,
    background: "var(--input-bg)",
    color: "var(--text-primary)",
  }),

  // Confirm button
  confirmBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "10px",
    fontWeight: 700,
  } as React.CSSProperties,

  // KPI grid
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 10,
    marginTop: 0,
  } as React.CSSProperties,

  kpiCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "14px 16px",
  } as React.CSSProperties,

  kpiLabel: {
    fontSize: "0.62rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-muted)",
    marginBottom: 8,
  } as React.CSSProperties,

  kpiValue: (color: string): React.CSSProperties => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "1.7rem",
    fontWeight: 800,
    color,
    lineHeight: 1,
  }),

  // Quick actions
  quickActionsLabel: {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "var(--text-muted)",
    margin: "0 0 10px",
  } as React.CSSProperties,

  quickActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 10,
  } as React.CSSProperties,

  quickActionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 14px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s",
  } as React.CSSProperties,

  quickActionIcon: (color: string): React.CSSProperties => ({
    width: 32,
    height: 32,
    borderRadius: 7,
    background: `${color}18`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color,
    flexShrink: 0,
  }),

  quickActionTitle: {
    fontWeight: 700,
    fontSize: "0.8rem",
    color: "var(--text-primary)",
  } as React.CSSProperties,

  quickActionDesc: {
    fontSize: "0.68rem",
    color: "var(--text-muted)",
    marginTop: 2,
  } as React.CSSProperties,

  // Alerts
  alertRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: "1px solid var(--border)",
  } as React.CSSProperties,

  alertLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  } as React.CSSProperties,

  alertBar: (color: string): React.CSSProperties => ({
    width: 4,
    height: 24,
    borderRadius: 2,
    background: color,
  }),

  alertName: {
    fontSize: "0.8rem",
    fontWeight: 600,
  } as React.CSSProperties,

  alertNameBadge: {
    marginLeft: 6,
    padding: "2px 5px",
    borderRadius: 3,
    background: "var(--brand)",
    color: "#fff",
    fontSize: "0.6rem",
    fontWeight: 800,
  } as React.CSSProperties,

  alertSub: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
  } as React.CSSProperties,

  alertOrderBtn: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "var(--brand)",
    border: "1px solid var(--brand)",
    borderRadius: 5,
    padding: "4px 10px",
    textDecoration: "none",
    transition: "all 0.15s",
  } as React.CSSProperties,

  // Empty states
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "30px",
  } as React.CSSProperties,

  emptyStateText: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--success)",
  } as React.CSSProperties,

  emptyStateTextMuted: {
    padding: "30px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "0.8rem",
  } as React.CSSProperties,

  // Feed
  feedRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "10px 16px",
  } as React.CSSProperties,

  feedTime: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    minWidth: 36,
  } as React.CSSProperties,

  feedBadge: (tipo: FeedItem["tipo"]): React.CSSProperties => ({
    fontSize: "0.6rem",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: 4,
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    background:
      tipo === "entrada"
        ? "var(--success-subtle)"
        : tipo === "devolucao_estoque"
        ? "var(--info-subtle)"
        : tipo === "devolucao_descarte"
        ? "var(--danger-subtle)"
        : "var(--brand-subtle)",
    color:
      tipo === "entrada"
        ? "var(--success)"
        : tipo === "devolucao_estoque"
        ? "var(--info)"
        : tipo === "devolucao_descarte"
        ? "var(--danger)"
        : "var(--brand)",
  }),

  feedDesc: {
    flex: 1,
    fontSize: "0.8rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  feedQty: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
  } as React.CSSProperties,

  // New employees
  newEmpRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
  } as React.CSSProperties,

  newEmpAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "var(--success-subtle)",
    color: "var(--success)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.65rem",
    fontWeight: 800,
    flexShrink: 0,
  } as React.CSSProperties,

  newEmpInfo: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  newEmpName: {
    fontSize: "0.8rem",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  newEmpSub: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  newEmpLink: {
    fontSize: "0.65rem",
    fontWeight: 800,
    color: "var(--brand)",
    background: "var(--brand-subtle)",
    padding: "4px 8px",
    borderRadius: 4,
    textDecoration: "none",
    flexShrink: 0,
  } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────────────────────

const Hoje = () => {
  const navigate = useNavigate();

  // State
  const [alertas, setAlertas] = useState<AlertItem[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [saidasHoje, setSaidasHoje] = useState(0);
  const [entradasHoje, setEntradas] = useState(0);
  const [pedidosAbertos, setPedidos] = useState(0);
  const [naLavanderia, setLav] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredEmp, setFilteredEmp] = useState<Employee[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [empSearch, setEmpSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dataEntrega, setDataEntrega] = useState(todayDateString());
  const [sending, setSending] = useState(false);
  const [highlightedEmpIndex, setHighlightedEmpIndex] = useState(-1);
  const [highlightedItemIndex, setHighlightedItemIndex] = useState(-1);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const minDateLimit = twentyDaysAgoString();
  const maxDateLimit = todayDateString();

  useEffect(() => {
    fetchAll();
  }, []);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [
        alertsRes, entradasRes, saidasRes,
        pedidosRes, lavRes, empRes, itemRes,
      ] = await Promise.all([
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
      setEntradas(
        entradasRes.data.filter(
          (e: any) => new Date(e.entryDate).toDateString() === todayStr
        ).length
      );
      setSaidasHoje(
        saidasRes.data.filter(
          (s: any) => new Date(s.withdrawalDate).toDateString() === todayStr
        ).length
      );
      setPedidos(
        pedidosRes.data.filter((p: any) =>
          ["PENDENTE", "PARCIAL"].includes(p.status)
        ).length
      );
      setLav(lavRes.data.totalPecas || 0);
      setEmployees(empRes.data);
      setItems(itemRes.data);

      const feedE: FeedItem[] = entradasRes.data.map((e: any) => ({
        tipo: "entrada" as const,
        descricao: `${e.item?.name || "Item"} — ${e.supplier || "Entrada manual"}`,
        quantidade: e.quantity,
        horario: new Date(e.entryDate).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        ts: new Date(e.entryDate).getTime(),
      }));

      const feedS: FeedItem[] = saidasRes.data.map((s: any) => {
        let tipo: "saida" | "devolucao_estoque" | "devolucao_descarte" = "saida";
        let desc = `${s.itemName} → ${s.employeeName}`;

        if (s.tipoMovimento === "DEVOLUCAO_ESTOQUE") {
          tipo = "devolucao_estoque";
          desc = `Retornou p/ Estoque ← ${s.employeeName} (${s.itemName})`;
        } else if (s.tipoMovimento === "DEVOLUCAO_DESCARTE") {
          tipo = "devolucao_descarte";
          desc = `Descartado ← ${s.employeeName} (${s.itemName})`;
        }

        return {
          tipo,
          descricao: desc,
          quantidade: s.quantity,
          horario: new Date(s.withdrawalDate).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          ts: new Date(s.withdrawalDate).getTime(),
        };
      });

      setFeed(
        [...feedE, ...feedS].sort((a, b) => b.ts - a.ts).slice(0, 6)
      );
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleEmpSearch = (val: string) => {
    setEmpSearch(val);
    setSelectedEmp(null);
    setHighlightedEmpIndex(-1);
    setFilteredEmp(
      val.length > 0
        ? employees
            .filter((e) =>
              e.name.toLowerCase().startsWith(val.toLowerCase())
            )
            .slice(0, 5)
        : []
    );
  };

  const handleItemSearch = (val: string) => {
    setItemSearch(val);
    setHighlightedItemIndex(-1);
    setFilteredItems(
      val.length > 0
        ? items
            .filter((i) => 
              i.name.toLowerCase().startsWith(val.toLowerCase())
            )
            .slice(0, 6)
        : []
    );
  };

  const selectEmp = (emp: Employee) => {
    setSelectedEmp(emp);
    setEmpSearch(emp.name);
    setFilteredEmp([]);
    setHighlightedEmpIndex(-1);
  };

  const addToCart = (item: Item) => {
    const existing = cart.find((c) => c.item.id === item.id);
    setCart(
      existing
        ? cart.map((c) =>
            c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
          )
        : [...cart, { item, quantity: 1, origemPeca: "NOVA" }]
    );
    setItemSearch("");
    setFilteredItems([]);
    setHighlightedItemIndex(-1);
  };

  const setOrigemCart = (id: number, origem: "NOVA" | "DEVOLVIDA") =>
    setCart(cart.map((c) => (c.item.id === id ? { ...c, origemPeca: origem } : c)));

  const updateQty = (id: number, q: number) =>
    q <= 0
      ? setCart(cart.filter((c) => c.item.id !== id))
      : setCart(cart.map((c) => (c.item.id === id ? { ...c, quantity: q } : c)));

  const removeCart = (id: number) =>
    setCart(cart.filter((c) => c.item.id !== id));

  const confirmEntrega = async () => {
    if (!selectedEmp) { window.alert("Selecione um colaborador."); return; }
    if (cart.length === 0) { window.alert("Adicione pelo menos um item."); return; }
    
    // Validação extra de segurança para a data limite de 20 dias
    if (dataEntrega < minDateLimit || dataEntrega > maxDateLimit) {
      window.alert("A data da entrega deve ser registrada entre os últimos 20 dias e a data de hoje.");
      return;
    }

    for (const c of cart) {
      if (c.quantity > c.item.quantity) {
        window.alert(`Estoque insuficiente: ${c.item.name}`);
        return;
      }
    }
    try {
      setSending(true);
      
      const dataFinal = dataEntrega 
        ? new Date(`${dataEntrega}T12:00:00`).toISOString() 
        : new Date().toISOString();

      await Promise.all(
        cart.map((c) =>
          api.post("/giveitem", {
            employeeId: selectedEmp.id,
            itemId: c.item.id,
            quantity: c.quantity,
            withdrawalDate: dataFinal,
            origemPeca: c.origemPeca
          })
        )
      );
      setCart([]);
      setSelectedEmp(null);
      setEmpSearch("");
      setDataEntrega(todayDateString());
      window.alert("Entrega registrada com sucesso!");
      fetchAll();
    } catch (e: any) {
      window.alert(e.response?.data?.error || "Erro ao registrar entrega.");
    } finally {
      setSending(false);
    }
  };

  // ─── Derived values ─────────────────────────────────────────────────────────

  const totalCart = cart.reduce((a, c) => a + c.quantity, 0);
  const cartError = cart.some((c) => c.quantity > c.item.quantity);
  const hojeDateString = todayDateString();
  const novosHoje = employees.filter(
    (e) => e.admissionDate && e.admissionDate.split("T")[0] === hojeDateString
  );

  const kpis = [
    { label: "Saídas Hoje", value: saidasHoje, color: "var(--brand)" },
    { label: "Entradas Hoje", value: entradasHoje, color: "var(--success)" },
    {
      label: "Pedidos Abertos",
      value: pedidosAbertos,
      color: pedidosAbertos > 0 ? "var(--warning)" : "var(--success)",
    },
    { label: "Na Lavanderia", value: naLavanderia, color: "var(--info)" },
  ];

  const quickActions = [
    {
      label: "Cadastrar Funcionário",
      desc: "Registrar novo colaborador",
      icon: <IconUsers size={18} />,
      color: "var(--brand)",
      onClick: () => navigate("/funcionarios?novo=true"),
    },
    {
      label: "Cadastrar Item",
      desc: "Adicionar item ao estoque",
      icon: <IconPlus size={18} />,
      color: "#2563EB",
      onClick: () => navigate("/estoque"),
    },
    {
      label: "Registrar Devolução",
      desc: "Receber uniforme devolvido",
      icon: <IconArrowRight size={18} />,
      color: "var(--warning)",
      onClick: () => navigate("/devolucao"),
    },
  ];

  const feedLabel = (tipo: FeedItem["tipo"]) => {
    if (tipo === "entrada") return "ENTRADA";
    if (tipo === "devolucao_estoque") return "RETORNO";
    if (tipo === "devolucao_descarte") return "DESCARTE";
    return "SAÍDA";
  };

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>

      {/* Page header */}
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Visão do Dia</h1>
        <p style={s.pageSubtitle}>{hoje}</p>
      </div>

      <div style={s.body}>

        {/* ── LEFT COLUMN ── */}
        <div style={s.leftCol}>

          {/* Entrega Rápida */}
          <div style={s.panelNoOverflow}>
            <div style={s.panelHead}>
              <IconZap size={15} color="var(--brand)" />
              Entrega Rápida
            </div>

            <div style={s.panelBody}>

              {/* Employee search */}
              <div>
                <label style={s.fieldLabel}>
                  <IconUsers size={12} /> Colaborador
                </label>
                <div style={s.searchWrapper}>
                  <input
                    className="form-control"
                    value={empSearch}
                    onChange={(e) => handleEmpSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (!filteredEmp.length) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlightedEmpIndex((p) =>
                          Math.min(p + 1, filteredEmp.length - 1)
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlightedEmpIndex((p) => Math.max(p - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        if (highlightedEmpIndex >= 0)
                          selectEmp(filteredEmp[highlightedEmpIndex]);
                      } else if (e.key === "Escape") {
                        setFilteredEmp([]);
                        setHighlightedEmpIndex(-1);
                      }
                    }}
                    placeholder="Buscar nome ou setor..."
                    autoComplete="off"
                    style={s.searchInput}
                  />
                  <div style={s.searchIcon}>
                    <IconSearch size={14} />
                  </div>

                  {filteredEmp.length > 0 && (
                    <ul style={s.dropdown}>
                      {filteredEmp.map((emp, idx) => (
                        <li
                          key={emp.id}
                          onMouseDown={(e) => { e.preventDefault(); selectEmp(emp); }}
                          onMouseEnter={() => setHighlightedEmpIndex(idx)}
                          style={{
                            ...s.dropdownItem(idx === highlightedEmpIndex),
                            ...(idx < filteredEmp.length - 1 ? s.dropdownItemBorder : {}),
                          }}
                        >
                          <div style={s.dropdownItemName}>{emp.name}</div>
                          <div style={s.dropdownItemSub(idx === highlightedEmpIndex)}>
                            {emp.role} · {emp.department}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {selectedEmp && (
                  <div style={s.selectedEmpChip}>
                    <div>
                      <div style={s.selectedEmpName}>{selectedEmp.name}</div>
                      <div style={s.selectedEmpDept}>{selectedEmp.department}</div>
                    </div>
                    <button
                      onClick={() => { setSelectedEmp(null); setEmpSearch(""); }}
                      style={s.iconBtn}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Item search */}
              <div>
                <label style={s.fieldLabel}>
                  <IconPackage size={12} /> Itens
                </label>
                <div style={s.searchWrapper}>
                  <input
                    className="form-control"
                    value={itemSearch}
                    onChange={(e) => handleItemSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (!filteredItems.length) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlightedItemIndex((p) =>
                          Math.min(p + 1, filteredItems.length - 1)
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlightedItemIndex((p) => Math.max(p - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        if (highlightedItemIndex >= 0)
                          addToCart(filteredItems[highlightedItemIndex]);
                      } else if (e.key === "Escape") {
                        setFilteredItems([]);
                        setHighlightedItemIndex(-1);
                      }
                    }}
                    placeholder="Buscar item..."
                    autoComplete="off"
                    style={s.searchInput}
                  />
                  <div style={s.searchIcon}>
                    <IconSearch size={14} />
                  </div>

                  {filteredItems.length > 0 && (
                    <ul style={s.dropdown}>
                      {filteredItems.map((item, idx) => (
                        <li
                          key={item.id}
                          onMouseDown={(e) => { e.preventDefault(); addToCart(item); }}
                          onMouseEnter={() => setHighlightedItemIndex(idx)}
                          style={{
                            ...s.dropdownItem(idx === highlightedItemIndex),
                            padding: "9px 12px",
                            ...(idx < filteredItems.length - 1 ? s.dropdownItemBorder : {}),
                          }}
                        >
                          <div style={s.itemDropdownRow}>
                            <div style={s.itemDropdownLeft}>
                              <span style={s.itemDropdownName}>{item.name}</span>
                              {item.size && (
                                <span style={s.sizeBadge(idx === highlightedItemIndex)}>
                                  {item.size}
                                </span>
                              )}
                            </div>
                            <span style={s.itemQty(item.quantity, idx === highlightedItemIndex)}>
                              {item.quantity} un.
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Cart */}
              {cart.length > 0 && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                  {cart.map(c => {
                    const temDevolvido = ((c.item as any).quantityReturned || 0) > 0;
                    return (
                    <div key={c.item.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "9px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.item.name}</span>
                            {c.item.size && (<span style={{ padding: "2px 6px", borderRadius: 4, background: "var(--brand)", color: "#fff", fontSize: "0.6rem", fontWeight: 800, flexShrink: 0 }}>{c.item.size}</span>)}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>Disp.: {c.item.quantity}{c.quantity > c.item.quantity && <span style={{ color: "var(--danger)", fontWeight: 700, marginLeft: 6 }}>Excede</span>}</div>
                        </div>
                        <input type="number" value={c.quantity || ""} onChange={e => updateQty(c.item.id, e.target.value === "" ? 0 : Number(e.target.value))} min={1} max={c.item.quantity} style={{ width: 48, textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.82rem", padding: "4px 3px", borderRadius: 4, border: `1px solid ${c.quantity > c.item.quantity ? "var(--danger)" : "var(--input-border)"}`, background: "var(--input-bg)", color: "var(--text-primary)" }}/>
                        <button onClick={() => removeCart(c.item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 }}><IconX size={14}/></button>
                      </div>
                      {/* Seletor de origem: só aparece se o item tem peças devolvidas disponíveis */}
                      {temDevolvido && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {(["NOVA", "DEVOLVIDA"] as const).map(o => (
                            <button key={o} onClick={() => setOrigemCart(c.item.id, o)} style={{
                              padding: "4px 6px", borderRadius: 5, cursor: "pointer", fontSize: "0.65rem", fontWeight: 700,
                              border: `1px solid ${c.origemPeca === o ? "var(--brand)" : "var(--border)"}`,
                              background: c.origemPeca === o ? "var(--brand)" : "var(--surface)",
                              color: c.origemPeca === o ? "#fff" : "var(--text-secondary)",
                            }}>
                              {o === "NOVA" ? "🆕 Nova" : `♻️ Devolvida (${(c.item as any).quantityReturned})`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Data da Entrega */}
              <div>
                <label style={s.fieldLabel}>
                  <IconCalendar size={12} /> Data da Entrega
                </label>
                <div style={s.searchWrapper}>
                  <input
                    type="date"
                    className="form-control"
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
                    min={minDateLimit}
                    max={maxDateLimit}
                    style={{ fontSize: "0.82rem", border: "1px solid var(--border)", borderRadius: "6px", width: "100%", padding: "8px 12px", background: "var(--surface)" }}
                  />
                </div>
              </div>

              {/* Confirm button */}
              <button
                className="btn btn-primary w-100"
                onClick={confirmEntrega}
                disabled={sending || cart.length === 0 || !selectedEmp || cartError}
                style={{ ...s.confirmBtn, marginTop: 4 }}
              >
                {sending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" /> Registrando...
                  </>
                ) : (
                  <>
                    <IconCheckCircle size={15} />
                    {cart.length > 0
                      ? `Confirmar Entrega (${totalCart})`
                      : "Confirmar Entrega"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Novos Colaboradores Hoje */}
          <div style={s.panel}>
            <div style={s.panelHead}>
              <IconUsers size={15} color="var(--success)" />
              Novos Colaboradores Hoje
            </div>

            {novosHoje.length === 0 ? (
              <div style={s.emptyStateTextMuted}>
                Nenhuma admissão registrada hoje.
              </div>
            ) : (
              <div>
                {novosHoje.slice(0, 5).map((emp, i) => (
                  <div
                    key={emp.id}
                    style={{
                      ...s.newEmpRow,
                      borderBottom:
                        i < Math.min(novosHoje.length, 5) - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <div style={s.newEmpAvatar}>
                      {emp.name
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div style={s.newEmpInfo}>
                      <div style={s.newEmpName}>{emp.name}</div>
                      <div style={s.newEmpSub}>
                        {emp.role} · {emp.department}
                      </div>
                    </div>
                    <Link to="/funcionarios" style={s.newEmpLink}>
                      VER
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={s.rightCol}>

          {/* Quick Actions */}
          <div>
            <p style={s.quickActionsLabel}>Ações Rápidas</p>
            <div style={s.quickActionsGrid}>
              {quickActions.map(({ label, desc, icon, color, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  style={s.quickActionBtn}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = color;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${color}22`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div style={s.quickActionIcon(color)}>{icon}</div>
                  <div>
                    <div style={s.quickActionTitle}>{label}</div>
                    <div style={s.quickActionDesc}>{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div style={s.kpiGrid}>
            {kpis.map(({ label, value, color }) => (
              <div key={label} style={s.kpiCard}>
                <div style={s.kpiLabel}>{label}</div>
                <div style={s.kpiValue(color)}>{value}</div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          <div style={s.panel}>
            <div style={s.panelHead}>
              <IconAlertTriangle size={15} color="var(--brand)" />
              Itens que precisam de atenção
              <Link to="/sugestoes" style={s.panelHeadLink}>
                Ver todos <IconArrowRight size={12} />
              </Link>
            </div>

            {alertas.length === 0 ? (
              <div style={s.emptyState}>
                <IconCheckCircle size={28} color="var(--success)" />
                <span style={s.emptyStateText}>Estoque saudável</span>
              </div>
            ) : (
              alertas.map((a) => (
                <div key={a.itemId} style={s.alertRow}>
                  <div style={s.alertLeft}>
                    <div style={s.alertBar(nivelColor(a.nivel))} />
                    <div>
                      <div style={s.alertName}>
                        {a.itemName}
                        {a.itemSize && (
                          <span style={s.alertNameBadge}>{a.itemSize}</span>
                        )}
                      </div>
                      <div style={s.alertSub}>
                        {nivelLabel(a.nivel)} · {a.estoqueAtual}/{a.margemSeguranca} un.
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/pedidos?itemId=${a.itemId}&itemName=${encodeURIComponent(a.itemName)}&itemType=${encodeURIComponent(a.itemType || "")}&itemSize=${encodeURIComponent(a.itemSize || "")}`}
                    style={s.alertOrderBtn}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--brand)";
                      (e.currentTarget as HTMLElement).style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--brand)";
                    }}
                  >
                    Pedir
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* Feed */}
          <div style={s.panel}>
            <div style={s.panelHead}>
              <IconPackage size={15} color="var(--text-muted)" />
              Últimas movimentações
            </div>

            {feed.length === 0 ? (
              <div style={s.emptyStateTextMuted}>
                Nenhuma movimentação registrada hoje.
              </div>
            ) : (
              feed.map((item, i) => (
                <div
                  key={i}
                  style={{
                    ...s.feedRow,
                    borderBottom:
                      i < feed.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span style={s.feedTime}>{item.horario}</span>
                  <span style={s.feedBadge(item.tipo)}>{feedLabel(item.tipo)}</span>
                  <span style={s.feedDesc}>{item.descricao}</span>
                  <span style={s.feedQty}>×{item.quantidade}</span>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Hoje;