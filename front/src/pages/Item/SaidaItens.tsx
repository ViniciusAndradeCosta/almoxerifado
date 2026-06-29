import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/useApi";
import { formatDate, getLocalDateISO } from "../../utils/dateFunctions";
import { format, subDays } from "date-fns";
import { Employee } from "../../types/Employee";
import { Item } from "../../types/Item";
import { Withdrawal } from "../../types/Withdrawal";
import { SearchDropdown } from "../../components/SearchDropdown";
import {
  IconX, IconEdit, IconTrash, IconDownload,
  IconCheckCircle, IconPackage, IconUsers, IconArrowRight, IconCalendar, IconRefreshCw
} from "../../components/Icons";

interface Cabinet {
  number: number; size: string; sector: string;
  situation: string; date: string | null; name: string | null;
}

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
  const [withdrawalDate, setWithdrawalDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  // Armário vinculado
  const [armario, setArmario]             = useState<Cabinet | null>(null);

  // Troca de uniforme
  const [shirtSize, setShirtSize]         = useState("");
  const [pantsSize, setPantsSize]         = useState("");
  const [shoesSize, setShoesSize]         = useState("");
  const [savingUniforme, setSavingUniforme] = useState(false);

  // Histórico de devoluções (descartes do funcionário)
  const [descartes, setDescartes]         = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [empRes, saidasRes, itemsRes, armarioRes, descartesRes] = await Promise.all([
        api.get(`/employee/${id}`),
        api.get(`/getitemsout/${id}`),
        api.get("/getitems"),
        api.get("/getcabinets"),
        api.get("/getdiscarded"),
      ]);
      const emp: Employee = empRes.data;
      setFuncionario(emp);
      setSaidas(saidasRes.data);
      setItems(itemsRes.data);
      setShirtSize(emp.shirt_size || "");
      setPantsSize(emp.pants_size?.toString() || "");
      setShoesSize(emp.shoes_size?.toString() || "");

      // Busca armário vinculado pelo nome exato do funcionário
      const todos: Cabinet[] = armarioRes.data;
      const vinculado = todos.find(a =>
        a.situation === "Ocupado" &&
        a.name?.toUpperCase().trim() === (emp.name?.toUpperCase().trim() || "")
      ) || null;
      setArmario(vinculado);

      // Filtra descartes registrados em nome deste funcionário
      const nomeEmp = emp.name?.toUpperCase() || "";
      const primeiroNome = nomeEmp.split(" ")[0];
      setDescartes((descartesRes.data || []).filter((d: any) =>
        d.discardedBy?.toUpperCase().includes(primeiroNome) ||
        d.notes?.toUpperCase().includes(primeiroNome)
      ));

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
        withdrawalDate: `${withdrawalDate}T${new Date().toTimeString().slice(0, 8)}.000Z`,
      });
      if (res.data.success) {
        setSelectedItem(null); setItemSearch(""); setQuantity(0); setWithdrawalDate(format(new Date(), "yyyy-MM-dd"));
        fetchAll();
      } else {
        window.alert(res.data.error || "Erro ao cadastrar saída.");
      }
    } catch (e: any) {
      window.alert(e.response?.data?.error || "Erro ao cadastrar saída.");
    } finally { setSaving(false); }
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


  const handleDownloadHistorico = async () => {
    try {
      const res = await api.get(`/ficha/${id}`, {
        responseType: "blob",
        headers: { username: localStorage.getItem("name") || "" },
      });
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(new Blob([res.data]));
      a.download = `Historico_${funcionario?.name?.replace(/\s+/g, "_")}.xlsx`;
      a.click();
    } catch (e) { window.alert("Erro ao baixar histórico."); }
  };

  const handleDownloadHistoricoPDF = async () => {
    try {
      const res = await api.get(`/ficha/${id}/pdf`, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      a.download = `Historico_${funcionario?.name?.replace(/\s+/g, "_")}.pdf`;
      a.click();
    } catch (e) { window.alert("Erro ao baixar PDF."); }
  };
  
  const handleSalvarUniforme = async () => {
    try {
      setSavingUniforme(true);
      await api.put(`/employee/${id}`, {
        name: funcionario?.name,
        company: funcionario?.company,
        role: funcionario?.role,
        department: funcionario?.department,
        admissionDate: funcionario?.admissionDate,
        shirt_size: shirtSize.toUpperCase() || null,
        pants_size: parseInt(pantsSize) || null,
        shoes_size: parseInt(shoesSize) || null,
      });
      window.alert("Tamanhos de uniforme atualizados com sucesso!");
      fetchAll();
    } catch (e) { window.alert("Erro ao atualizar uniforme."); }
    finally { setSavingUniforme(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div className="spinner-border" role="status"/>
    </div>
  );

  const dataMinSaida = (() => { const d = new Date(); d.setDate(d.getDate() - 20); return d.toISOString().split("T")[0]; })();
  const dataMaxSaida = new Date().toISOString().split("T")[0];
  const totalItens  = saidas.reduce((acc, s) => acc + s.quantity, 0);
  const ultimaSaida = saidas.length > 0
    ? [...saidas].sort((a, b) => new Date(b.withdrawalDate).getTime() - new Date(a.withdrawalDate).getTime())[0]
    : null;

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" };
  const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 };
  const lbl: React.CSSProperties  = { fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 5, display: "block" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
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
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate(`/funcionarios/${id}/trocar-funcao`)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--info)", border: "none", borderRadius: 7, color: "#fff", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
            <IconRefreshCw size={13}/> Trocar Função
          </button>
          <button onClick={handleDownloadFicha} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
            <IconDownload size={13}/> Baixar Ficha
          </button>
          <button onClick={handleDownloadHistorico} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"var(--brand)", border:"none", borderRadius:7, color:"#fff", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>
            <IconDownload size={13}/> Histórico Excel
          </button>
          <button onClick={handleDownloadHistoricoPDF} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#1A5276", border:"none", borderRadius:7, color:"#fff", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>
            <IconDownload size={13}/> Histórico PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: "Total de Saídas", value: saidas.length, color: "var(--brand)",        icon: <IconArrowRight size={16}/> },
          { label: "Peças Entregues", value: totalItens,    color: "var(--info)",          icon: <IconPackage size={16}/> },
          { label: "Última Entrega",  value: ultimaSaida ? formatDate(ultimaSaida.withdrawalDate) : "—", color: "var(--text-primary)", icon: <IconCalendar size={16}/>, mono: false },
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

      {/* Armário + Uniforme */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Armário vinculado */}
        <div style={card}>
          <div style={head}>🗄️ Armário Vinculado</div>
          <div style={{ padding: "14px 18px" }}>
            {armario ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "2rem", fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}>
                    #{armario.number}
                  </span>
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{armario.sector} · {armario.size}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--danger)", fontWeight: 700 }}>🔴 Ocupado</div>
                  </div>
                </div>
                <div style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6, fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Ocupante registrado:</strong> {armario.name}
                  {armario.date && <div style={{ marginTop: 2 }}>Desde: {formatDate(armario.date)}</div>}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 0" }}>
                <span style={{ fontSize: "2rem" }}>🔓</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--success)" }}>Sem armário vinculado</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
                  Vincule um armário na página de Armários
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tamanhos de uniforme */}
        <div style={card}>
          <div style={head}>👕 Tamanhos de Uniforme</div>
          <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={lbl}>Camisa</label>
                <input className="form-control" value={shirtSize} onChange={e => setShirtSize(e.target.value)} placeholder="Ex: M, G, GG" style={{ textAlign: "center", fontWeight: 700 }}/>
              </div>
              <div>
                <label style={lbl}>Calça</label>
                <input type="number" className="form-control" value={pantsSize} onChange={e => setPantsSize(e.target.value)} placeholder="Ex: 42" style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}/>
              </div>
              <div>
                <label style={lbl}>Calçado</label>
                <input type="number" className="form-control" value={shoesSize} onChange={e => setShoesSize(e.target.value)} placeholder="Ex: 40" style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}/>
              </div>
            </div>
            <button onClick={handleSalvarUniforme} disabled={savingUniforme}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 7, border: "none", background: "var(--brand)", color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}>
              {savingUniforme ? <><span className="spinner-border spinner-border-sm"/>Salvando...</> : <><IconCheckCircle size={13}/> Salvar Tamanhos</>}
            </button>
          </div>
        </div>
      </div>

      {/* Layout principal: saída + histórico de saídas */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>

        {/* Registrar Saída */}
        <div style={{ ...card, display: "flex", flexDirection: "column" }}>
          <div style={head}>
            <IconPackage size={13} color="var(--brand)"/> Registrar Nova Saída
          </div>
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div>
              <label style={lbl}>Item</label>
              <SearchDropdown
                value={itemSearch}
                onChange={handleItemSearch}
                onSelect={selectItem}
                items={filteredItems}
                onClear={() => setFilteredItems([])}
                placeholder="Buscar item pelo nome..."
                getKey={i => i.id!}
                renderItem={(item, highlighted) => (
                  <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.78rem" }}>{item.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", fontWeight: 700, color: highlighted ? "#fff" : (item.quantity ?? 0) === 0 ? "var(--danger)" : (item.quantity ?? 0) <= 10 ? "var(--warning)" : "var(--success)" }}>
                      {item.quantity} un.
                    </span>
                  </div>
                )}
              />
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

            <div>
              <label style={lbl}>Data da Saída</label>
              <input
                type="date"
                className="form-control"
                value={withdrawalDate}
                min={format(subDays(new Date(), 20), "yyyy-MM-dd")}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={e => setWithdrawalDate(e.target.value)}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textAlign: "center" }}
                onKeyDown={e => e.preventDefault()}
              />
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                Limite: últimos 20 dias
              </p>
            </div>

            <div style={{ flex: 1 }}/>

            {selectedItem && quantity > 0 && quantity <= (selectedItem.quantity ?? 0) && (
              <div style={{ padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                Entregar <strong style={{ color: "var(--text-primary)" }}>{quantity}x {selectedItem.name}</strong> para <strong style={{ color: "var(--text-primary)" }}>{funcionario?.name}</strong>
              </div>
            )}

            <button onClick={handleCadastrarSaida} disabled={saving || !selectedItem || quantity <= 0 || quantity > (selectedItem?.quantity ?? 0)}
              className="btn btn-primary w-100"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px" }}>
              {saving ? <><span className="spinner-border spinner-border-sm"/>Registrando...</> : <><IconCheckCircle size={14}/> Confirmar Saída</>}
            </button>
          </div>
        </div>

        {/* Histórico de saídas */}
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
                            {/* O ÚNICO LUGAR QUE MEXI FOI AQUI: */}
                            <button
                              onClick={() => navigate(`/devolucao?empId=${id}&saidaId=${saida.id}`)}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--success)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
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

      {/* Histórico de devoluções (descartes do funcionário) */}
      {descartes.length > 0 && (
        <div style={card}>
          <div style={head}>
            🗑️ Histórico de Devoluções
            <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
              {descartes.length} registro{descartes.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table table-striped" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Tam.</th>
                  <th style={{ textAlign: "center" }}>Qtd</th>
                  <th>Motivo</th>
                  <th>Observações</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {descartes.map((d: any) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>{d.item?.name || "—"}</td>
                    <td style={{ fontSize: "0.76rem", color: "var(--brand)", fontWeight: 700 }}>{d.item?.size || "—"}</td>
                    <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{d.quantity}</td>
                    <td style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{d.reason || "—"}</td>
                    <td style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{d.notes || "—"}</td>
                    <td style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(d.discardDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default SaidaItens;