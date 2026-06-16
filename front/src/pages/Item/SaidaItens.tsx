import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/useApi";
import { formatDate, getLocalDateISO } from "../../utils/dateFunctions";
import { Employee } from "../../types/Employee";
import { Item } from "../../types/Item";
import { Withdrawal } from "../../types/Withdrawal";
import {
  IconSearch, IconX, IconEdit, IconTrash, IconDownload,
  IconCheckCircle, IconPackage, IconUsers, IconArrowRight, IconCalendar
} from "../../components/Icons";

const SaidaItens = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [funcionario, setFuncionario]     = useState<Employee | null>(null);
  const [saidas, setSaidas]               = useState<Withdrawal[]>([]);
  const [items, setItems]                 = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [itemSearch, setItemSearch]       = useState("");
  const [selectedItem, setSelectedItem]   = useState<Item | null>(null);
  const [quantity, setQuantity]           = useState<number>(0);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [empRes, saidasRes, itemsRes] = await Promise.all([
        api.get(`/employee/${id}`),
        api.get(`/getitemsout/${id}`),
        api.get("/getitems"),
      ]);
      setFuncionario(empRes.data);
      setSaidas(saidasRes.data);
      setItems(itemsRes.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const handleItemSearch = (val: string) => {
    setItemSearch(val.toUpperCase());
    setSelectedItem(null);
    setFilteredItems(val.length > 0
      ? items.filter(i => i.name.toLowerCase().includes(val.toLowerCase()))
      : []);
  };

  const selectItem = (item: Item) => {
    setSelectedItem(item);
    setItemSearch(item.name);
    setFilteredItems([]);
  };

  const handleCadastrarSaida = async () => {
    if (!selectedItem) { window.alert("Selecione um item."); return; }
    if (quantity <= 0) { window.alert("Informe uma quantidade válida."); return; }
    if (quantity > (selectedItem.quantity ?? 0)) { window.alert(`Estoque insuficiente. Disponível: ${selectedItem.quantity}`); return; }
    try {
      setSaving(true);
      const res = await api.post("/giveitem", {
        employeeId: parseInt(id!),
        itemId: selectedItem.id,
        quantity,
        withdrawalDate: getLocalDateISO(),
      });
      if (res.data.success) {
        setSelectedItem(null); setItemSearch(""); setQuantity(0);
        fetchAll();
      } else {
        window.alert(res.data.error || "Erro ao cadastrar saída.");
      }
    } catch (e: any) {
      window.alert(e.response?.data?.error || "Erro ao cadastrar saída.");
    } finally { setSaving(false); }
  };

  const handleDevolver = async (saidaId: number) => {
    if (!window.confirm("Devolver este item ao estoque?")) return;
    try { await api.delete(`/returnitemandaddquantity/${saidaId}`); fetchAll(); }
    catch (e) { window.alert("Erro ao devolver."); }
  };

  const handleExcluir = async (saidaId: number) => {
    if (!window.confirm("Excluir este registro?")) return;
    try { await api.delete(`/returnitem/${saidaId}`); fetchAll(); }
    catch (e) { window.alert("Erro ao excluir."); }
  };

  const handleDownloadFicha = async () => {
    try {
      const username = localStorage.getItem("name");
      const res = await api.get(`/downloadnewemployee/${id}`, {
        responseType: "blob", headers: { username: username || "" },
      });
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(new Blob([res.data]));
      a.download = "funcionario.xlsx"; a.click();
    } catch (e) { window.alert("Erro ao baixar ficha."); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div className="spinner-border" role="status"/>
    </div>
  );

  const totalItens = saidas.reduce((acc, s) => acc + s.quantity, 0);
  const ultimaSaida = saidas.length > 0
    ? [...saidas].sort((a, b) => new Date(b.withdrawalDate).getTime() - new Date(a.withdrawalDate).getTime())[0]
    : null;

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
  };
  const head: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
    borderBottom: "1px solid var(--border)", background: "var(--surface-2)",
    fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
  };
  const lbl: React.CSSProperties = {
    fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 5, display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("/funcionarios")} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 12px", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 5 }}>
            ← Voltar
          </button>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--brand-subtle)", border: "2px solid var(--brand)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 800, flexShrink: 0 }}>
            {funcionario?.name?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 3px" }}>
              {funcionario?.name}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", margin: 0 }}>
              {funcionario?.role} · {funcionario?.department} · {funcionario?.company}
            </p>
          </div>
        </div>
        <button onClick={handleDownloadFicha} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
          <IconDownload size={13}/> Baixar Ficha
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: "Total de Saídas",  value: saidas.length, color: "var(--brand)", icon: <IconArrowRight size={16}/> },
          { label: "Peças Entregues",  value: totalItens,    color: "var(--info)",  icon: <IconPackage size={16}/> },
          { label: "Última Entrega",   value: ultimaSaida ? formatDate(ultimaSaida.withdrawalDate) : "—", color: "var(--text-primary)", icon: <IconCalendar size={16}/>, mono: false },
        ].map(({ label, value, color, icon, mono }) => (
          <div key={label} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--brand-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: mono !== false ? "'JetBrains Mono', monospace" : "inherit", fontSize: mono !== false ? "1.6rem" : "0.9rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Layout principal ── */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>

        {/* ── Registrar Saída ── */}
        <div style={{ ...card, display: "flex", flexDirection: "column" }}>
          <div style={head}>
            <IconPackage size={13} color="var(--brand)"/> Registrar Nova Saída
          </div>
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>

            <div>
              <label style={lbl}>Item</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
                  <IconSearch size={13}/>
                </div>
                <input className="form-control" value={itemSearch}
                  onChange={e => handleItemSearch(e.target.value)}
                  placeholder="Buscar item pelo nome..." autoComplete="off"
                  style={{ paddingRight: 32 }}/>
                {filteredItems.length > 0 && (
                  <ul className="list-group" style={{ position: "absolute", width: "100%", zIndex: 20, marginTop: 2 }}>
                    {filteredItems.map(item => (
                      <li key={item.id} className="list-group-item" onClick={() => selectItem(item)}
                        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.78rem" }}>{item.name}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", fontWeight: 700, color: (item.quantity ?? 0) === 0 ? "var(--danger)" : (item.quantity ?? 0) <= 10 ? "var(--warning)" : "var(--success)" }}>
                          {item.quantity} un.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedItem && (
                <div style={{ marginTop: 8, padding: "10px 14px", background: "var(--brand-subtle)", border: "1px solid var(--brand)", borderRadius: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{selectedItem.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", marginTop: 2 }}>
                      Disponível: <strong style={{ color: (selectedItem.quantity ?? 0) > 0 ? "var(--success)" : "var(--danger)" }}>{selectedItem.quantity} un.</strong>
                      {selectedItem.size && ` · Tam. ${selectedItem.size}`}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedItem(null); setItemSearch(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                    <IconX size={14}/>
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>Quantidade</label>
              <input type="number" className="form-control" value={quantity || ""}
                onChange={e => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))}
                min={1} max={selectedItem?.quantity} placeholder="0"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.1rem", textAlign: "center" }}/>
              {selectedItem && quantity > (selectedItem.quantity ?? 0) && (
                <p style={{ color: "var(--danger)", fontSize: "0.68rem", margin: "4px 0 0", fontWeight: 600 }}>
                  Quantidade excede o estoque disponível
                </p>
              )}
            </div>

            <div style={{ flex: 1 }}/>

            {/* Resumo antes de confirmar */}
            {selectedItem && quantity > 0 && quantity <= (selectedItem.quantity ?? 0) && (
              <div style={{ padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                Entregar <strong style={{ color: "var(--text-primary)" }}>{quantity}x {selectedItem.name}</strong> para <strong style={{ color: "var(--text-primary)" }}>{funcionario?.name}</strong>
              </div>
            )}

            <button onClick={handleCadastrarSaida} disabled={saving || !selectedItem || quantity <= 0 || quantity > (selectedItem?.quantity ?? 0)}
              className="btn btn-primary w-100"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px" }}>
              {saving
                ? <><span className="spinner-border spinner-border-sm"/>Registrando...</>
                : <><IconCheckCircle size={14}/> Confirmar Saída</>
              }
            </button>
          </div>
        </div>

        {/* ── Histórico ── */}
        <div style={{ ...card, display: "flex", flexDirection: "column" }}>
          <div style={head}>
            <IconArrowRight size={13} color="var(--text-muted)"/>
            Histórico de Saídas
            <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
              {saidas.length} registro{saidas.length !== 1 ? "s" : ""}
            </span>
          </div>
          {saidas.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-muted)", padding: 40 }}>
              <IconUsers size={32} color="var(--border)"/>
              <p style={{ margin: 0, fontSize: "0.8rem" }}>Nenhuma saída registrada para este funcionário.</p>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <table className="table table-striped" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "center" }}>Qtd</th>
                    <th>Data</th>
                    <th style={{ textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {[...saidas]
                    .sort((a, b) => new Date(b.withdrawalDate).getTime() - new Date(a.withdrawalDate).getTime())
                    .map(saida => (
                      <tr key={saida.id}>
                        <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>{(saida as any).item?.name || "—"}</td>
                        <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{(saida as any).item?.type || "—"}</td>
                        <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.82rem" }}>{saida.quantity}</td>
                        <td style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(saida.withdrawalDate)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                            <button onClick={() => handleDevolver(saida.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--success)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                              <IconCheckCircle size={11}/> Devolver
                            </button>
                            <button onClick={() => navigate(`/atualizarsaida/${saida.id}`)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "none", background: "#2563EB", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                              <IconEdit size={11}/> Editar
                            </button>
                            <button onClick={() => handleExcluir(saida.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--danger)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                              <IconTrash size={11}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SaidaItens;