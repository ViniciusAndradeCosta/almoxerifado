import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/useApi";
import { formatDate } from "../../utils/dateFunctions";
import {
  IconSearch, IconX, IconCheckCircle, IconTrash, IconUsers, IconPackage, IconArrowRight
} from "../../components/Icons";

interface Employee { id: number; name: string; role: string; department: string; company: string; }
interface Saida {
  id: number; quantity: number; withdrawalDate: string;
  item: { id: number; name: string; type: string; size: string; quantity: number };
}

type Destino = "ESTOQUE" | "DESCARTE";

interface ItemDevolucao {
  saidaId: number; itemId: number; itemName: string; itemSize: string;
  quantidadeOriginal: number; quantidadeDevolucao: number;
  destino: Destino; motivo: string; observacao: string;
}

const Devolucao = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [employees, setEmployees]           = useState<Employee[]>([]);
  const [filteredEmps, setFilteredEmps]     = useState<Employee[]>([]);
  const [empSearch, setEmpSearch]           = useState("");
  const [selectedEmp, setSelectedEmp]       = useState<Employee | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  const [saidas, setSaidas]                 = useState<Saida[]>([]);
  const [loadingSaidas, setLoadingSaidas]   = useState(false);

  // Item selecionado para devolução — exibido inline, sem modal
  const [itemSelecionado, setItemSelecionado] = useState<ItemDevolucao | null>(null);
  const [saving, setSaving]                   = useState(false);

  const [todosDescartes, setTodosDescartes] = useState<any[]>([]);
  const [loadingHist, setLoadingHist]       = useState(true);

  useEffect(() => { fetchEmployees(); fetchHistorico(); }, []);

  // Auto-seleciona funcionário vindo da URL (ex: ficha do funcionário)
  useEffect(() => {
    const empIdUrl = searchParams.get("empId");
    const saidaIdUrl = searchParams.get("saidaId");
    if (empIdUrl && employees.length > 0 && !selectedEmp) {
      const emp = employees.find(e => e.id === Number(empIdUrl));
      // Se tem saidaId, mantém a URL para o próximo useEffect processar
      if (emp) selectEmp(emp, !!saidaIdUrl);
    }
  }, [employees, searchParams]);

  // Auto-seleciona o item específico quando as saídas carregarem e houver saidaId na URL
  useEffect(() => {
    const saidaIdUrl = searchParams.get("saidaId");
    if (!saidaIdUrl || saidas.length === 0 || itemSelecionado) return;

    const saida = saidas.find(s => s.id === Number(saidaIdUrl));
    if (saida) {
      selecionarItem(saida);
      // Limpa a URL após selecionar
      searchParams.delete("empId");
      searchParams.delete("saidaId");
      setSearchParams(searchParams, { replace: true });
    }
  }, [saidas, searchParams]);

  const fetchEmployees = async () => {
    try { const res = await api.get("/getemployees"); setEmployees(res.data); }
    catch (e) { console.log(e); }
  };

  const fetchHistorico = async () => {
    try {
      setLoadingHist(true);
      const res = await api.get("/getdiscarded");
      setTodosDescartes(res.data);
    } catch (e) { console.log(e); }
    finally { setLoadingHist(false); }
  };

  const historico = selectedEmp
  ? todosDescartes.filter((d: any) => d.discardedBy?.toUpperCase().trim() === selectedEmp.name.toUpperCase().trim())
  : todosDescartes;

  const fetchSaidasFuncionario = async (empId: number) => {
    try { setLoadingSaidas(true); const res = await api.get(`/getitemsout/${empId}`); setSaidas(res.data || []); }
    catch (e) { console.log(e); }
    finally { setLoadingSaidas(false); }
  };

  const handleEmpSearch = (val: string) => {
    setEmpSearch(val); setHighlightedIdx(-1);
    setFilteredEmps(val.length > 0 ? employees.filter(e => e.name.toLowerCase().includes(val.toLowerCase()) || e.department.toLowerCase().includes(val.toLowerCase())).slice(0, 6) : []);
  };

  const selectEmp = (emp: Employee, manterUrl = false) => {
    setSelectedEmp(emp); setEmpSearch(emp.name);
    setFilteredEmps([]); setHighlightedIdx(-1);
    setItemSelecionado(null);
    fetchSaidasFuncionario(emp.id);
    // Só limpa a URL se não precisar manter o saidaId para auto-seleção
    if (!manterUrl) {
      searchParams.delete("empId");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const clearEmp = () => { setSelectedEmp(null); setEmpSearch(""); setSaidas([]); setItemSelecionado(null); };

  // Seleciona item para devolução (inline, sem modal)
  const selecionarItem = (saida: Saida) => {
    setItemSelecionado({
      saidaId: saida.id, itemId: saida.item.id,
      itemName: saida.item.name, itemSize: saida.item.size || "",
      quantidadeOriginal: saida.quantity, quantidadeDevolucao: saida.quantity,
      destino: "ESTOQUE", motivo: "DESGASTE", observacao: "",
    });
  };

  const handleConfirmar = async () => {
    if (!selectedEmp || !itemSelecionado) return;
    if (itemSelecionado.quantidadeDevolucao <= 0 || itemSelecionado.quantidadeDevolucao > itemSelecionado.quantidadeOriginal) {
      window.alert("Informe uma quantidade válida."); return;
    }

    if (!window.confirm(
      `Confirmar devolução de ${itemSelecionado.quantidadeDevolucao}x ${itemSelecionado.itemName}${itemSelecionado.itemSize ? ` (${itemSelecionado.itemSize})` : ""} de ${selectedEmp.name}?\n\nDestino: ${itemSelecionado.destino === "ESTOQUE" ? "✅ Voltar ao Estoque" : "🗑️ Descarte"}`
    )) return;

    try {
      setSaving(true);
      await api.delete(`/returnitemandaddquantity/${itemSelecionado.saidaId}`, {
        data: { quantityToReturn: itemSelecionado.quantidadeDevolucao, destino: itemSelecionado.destino }
      });

      if (itemSelecionado.destino === "DESCARTE") {
        const nota = itemSelecionado.observacao
          ? `${itemSelecionado.observacao} (Devolvido por ${selectedEmp.name} - ${selectedEmp.department})`
          : `Devolvido por ${selectedEmp.name} (${selectedEmp.department})`;
        await api.post("/discard", {
          itemId: itemSelecionado.itemId, quantity: itemSelecionado.quantidadeDevolucao,
          reason: itemSelecionado.motivo, notes: nota,
          discardedBy: selectedEmp.name, discardDate: new Date().toISOString(),
        });
      }

      window.alert("Devolução registrada com sucesso!");
      setItemSelecionado(null);
      fetchSaidasFuncionario(selectedEmp.id);
      fetchHistorico();
    } catch (e: any) {
      window.alert(e.response?.data?.message || e.response?.data?.error || "Erro ao registrar devolução.");
    } finally { setSaving(false); }
  };

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" };
  const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", fontSize: "0.75rem", fontWeight: 700 };
  const lbl: React.CSSProperties  = { fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 5, display: "block" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 2px" }}>Devolução de Uniforme</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.73rem", margin: 0 }}>Registre devoluções — retorno ao estoque ou descarte</p>
        </div>
        <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
          ← Voltar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: itemSelecionado ? "1fr 1fr 1fr" : "420px 1fr", gap: 16, alignItems: "start" }}>

        {/* ── COLUNA 1: Funcionário + Lista de uniformes ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Seleção de funcionário */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <div style={head}><IconUsers size={13} color="var(--brand)"/> Funcionário</div>
            <div style={{ padding: "14px 16px" }}>
              <label style={lbl}>Buscar funcionário</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}><IconSearch size={13}/></div>
                <input className="form-control" value={empSearch}
                  onChange={e => handleEmpSearch(e.target.value)}
                  onKeyDown={e => {
                    if (!filteredEmps.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIdx(p => Math.min(p+1, filteredEmps.length-1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIdx(p => Math.max(p-1, 0)); }
                    else if (e.key === "Enter") { e.preventDefault(); if (highlightedIdx >= 0) selectEmp(filteredEmps[highlightedIdx]); }
                    else if (e.key === "Escape") { setFilteredEmps([]); }
                  }}
                  placeholder="Buscar por nome ou departamento..." autoComplete="off"
                  style={{ paddingRight: 32 }} disabled={!!selectedEmp}/>
                {filteredEmps.length > 0 && (
                  <ul style={{ position: "absolute", width: "100%", zIndex: 30, marginTop: 4, padding: 0, listStyle: "none", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                    {filteredEmps.map((emp, idx) => (
                      <li key={emp.id} onMouseDown={e => { e.preventDefault(); selectEmp(emp); }} onMouseEnter={() => setHighlightedIdx(idx)}
                        style={{ padding: "8px 12px", cursor: "pointer", background: idx === highlightedIdx ? "var(--brand)" : "transparent", color: idx === highlightedIdx ? "#fff" : "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.78rem" }}>{emp.name}</div>
                        <div style={{ fontSize: "0.68rem", opacity: 0.75 }}>{emp.role} · {emp.department}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedEmp && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--brand-subtle)", border: "1px solid var(--brand)", borderRadius: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{selectedEmp.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{selectedEmp.role} · {selectedEmp.department}</div>
                  </div>
                  <button onClick={clearEmp} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><IconX size={14}/></button>
                </div>
              )}
            </div>
          </div>

          {/* Lista de uniformes retidos */}
          {selectedEmp && (
            <div style={card}>
              <div style={head}>
                <IconPackage size={13} color="var(--text-muted)"/>
                Uniformes retidos
                <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontWeight: 500, fontSize: "0.68rem" }}>{saidas.length} registro{saidas.length !== 1 ? "s" : ""}</span>
              </div>
              {loadingSaidas ? (
                <div style={{ padding: 24, textAlign: "center" }}><div className="spinner-border spinner-border-sm" role="status"/></div>
              ) : saidas.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Nenhum uniforme registrado para este funcionário.
                </div>
              ) : (
                <div style={{ maxHeight: 380, overflowY: "auto" }}>
                  {saidas.map(s => {
                    const selecionado = itemSelecionado?.saidaId === s.id;
                    return (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border)", background: selecionado ? "var(--brand-subtle)" : "transparent", borderLeft: selecionado ? "3px solid var(--brand)" : "3px solid transparent" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                            {s.item?.name}
                            {s.item?.size && <span style={{ marginLeft: 6, padding: "2px 6px", borderRadius: 4, background: "var(--brand)", color: "#fff", fontSize: "0.62rem", fontWeight: 800 }}>{s.item.size}</span>}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
                            Retirado em {formatDate(s.withdrawalDate)} · <strong>{s.quantity} un.</strong>
                          </div>
                        </div>
                        <button onClick={() => selecionado ? setItemSelecionado(null) : selecionarItem(s)}
                          style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: selecionado ? "var(--brand)" : "var(--success)", color: "#fff", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                          {selecionado ? <><IconX size={12}/> Cancelar</> : <><IconArrowRight size={12}/> Devolver</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── COLUNA 2: Formulário de devolução inline (só aparece quando item selecionado) ── */}
        {itemSelecionado && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--surface)", border: "2px solid var(--brand)", borderRadius: 8 }}>
              <div style={{ ...head, background: "var(--brand)", color: "#fff", borderBottom: "none" }}>
                <IconCheckCircle size={13}/> Confirmar Devolução
                <button onClick={() => setItemSelecionado(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", display: "flex" }}><IconX size={14}/></button>
              </div>
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Resumo do item */}
                <div style={{ padding: "12px 14px", background: "var(--brand-subtle)", border: "1px solid var(--brand)", borderRadius: 7 }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 2 }}>Funcionário</div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 8 }}>{selectedEmp?.name}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 2 }}>Item</div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                    {itemSelecionado.itemName}
                    {itemSelecionado.itemSize && <span style={{ padding: "2px 6px", borderRadius: 4, background: "var(--brand)", color: "#fff", fontSize: "0.62rem", fontWeight: 800 }}>{itemSelecionado.itemSize}</span>}
                  </div>
                </div>

                {/* Quantidade + Destino */}
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 14 }}>
                  <div>
                    <label style={lbl}>Quantidade</label>
                    <input type="number" className="form-control"
                      value={itemSelecionado.quantidadeDevolucao || ""}
                      onChange={e => setItemSelecionado({...itemSelecionado, quantidadeDevolucao: e.target.value === "" ? 0 : Number(e.target.value)})}
                      min={1} max={itemSelecionado.quantidadeOriginal}
                      style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}/>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center", marginTop: 4 }}>Máx: {itemSelecionado.quantidadeOriginal}</div>
                  </div>
                  <div>
                    <label style={lbl}>Destino</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {(["ESTOQUE", "DESCARTE"] as Destino[]).map(d => (
                        <button key={d} onClick={() => setItemSelecionado({...itemSelecionado, destino: d})}
                          style={{ padding: "9px 6px", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, transition: "all 0.15s",
                            border: `1px solid ${itemSelecionado.destino === d ? (d === "ESTOQUE" ? "var(--success)" : "var(--danger)") : "var(--border)"}`,
                            background: itemSelecionado.destino === d ? (d === "ESTOQUE" ? "var(--success)" : "var(--danger)") : "var(--surface)",
                            color: itemSelecionado.destino === d ? "#fff" : "var(--text-secondary)" }}>
                          {d === "ESTOQUE" ? "✅ Estoque" : "🗑️ Descarte"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Campos extras para descarte */}
                {itemSelecionado.destino === "DESCARTE" && (
                  <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 8, border: "1px dashed var(--danger)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ ...lbl, color: "var(--danger)" }}>Motivo do Descarte *</label>
                      <select className="form-select" value={itemSelecionado.motivo}
                        onChange={e => setItemSelecionado({...itemSelecionado, motivo: e.target.value})}
                        style={{ fontSize: "0.8rem", borderColor: "var(--danger)" }}>
                        <option value="DESGASTE">Desgaste Natural</option>
                        <option value="DANO">Danificado / Rasgado</option>
                        <option value="EXTRAVIO">Extravio / Perdido</option>
                        <option value="VENCIDO">Vencido</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Observação (opcional)</label>
                      <input type="text" className="form-control" value={itemSelecionado.observacao}
                        onChange={e => setItemSelecionado({...itemSelecionado, observacao: e.target.value})}
                        placeholder="Detalhes adicionais..." style={{ fontSize: "0.8rem" }}/>
                    </div>
                  </div>
                )}

                <button onClick={handleConfirmar} disabled={saving}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 7, border: "none",
                    background: itemSelecionado.destino === "ESTOQUE" ? "var(--success)" : "var(--danger)", color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                  {saving ? <><span className="spinner-border spinner-border-sm"/> Registrando...</> : <><IconCheckCircle size={15}/> Confirmar Devolução</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── COLUNA 3 (ou 2 quando sem item): Histórico ── */}
        <div style={card}>
          <div style={head}>
            <IconTrash size={13} color="var(--text-muted)"/>
            Histórico de Devoluções — Descartes
            <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>{historico.length} registro{historico.length !== 1 ? "s" : ""}</span>
          </div>
          {loadingHist ? (
            <div style={{ padding: 32, textAlign: "center" }}><div className="spinner-border spinner-border-sm" role="status"/></div>
          ) : historico.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>Nenhum descarte registrado.</div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: 600, overflowY: "auto" }}>
              <table className="table table-striped" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Item</th><th>Tam.</th>
                    <th style={{ textAlign: "center" }}>Qtd</th>
                    <th>Motivo</th><th>Devolvido por</th><th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((d: any) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>{d.item?.name || "—"}</td>
                      <td style={{ fontSize: "0.76rem", color: "var(--brand)", fontWeight: 700 }}>
                        {d.item?.size ? <span style={{ padding: "2px 6px", borderRadius: 4, background: "var(--brand)", color: "#fff", fontSize: "0.62rem", fontWeight: 800 }}>{d.item.size}</span> : "—"}
                      </td>
                      <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{d.quantity}</td>
                      <td style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{d.reason || "—"}</td>
                      <td style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{d.discardedBy || "—"}</td>
                      <td style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(d.discardDate)}</td>
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

export default Devolucao;