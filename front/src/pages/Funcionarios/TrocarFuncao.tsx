import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/useApi";
import { Employee } from "../../types/Employee";
import { UNIFORMES_POR_SETOR, SETORES_DISPONIVEIS, FUNCOES_POR_SETOR } from "../../constants/uniformesPorSetor";
import { IconRefreshCw, IconCheckCircle, IconPackage, IconTrash, IconCornerDownLeft } from "../../components/Icons";

interface ItemEstoque {
  id: number; name: string; type: string; sector: string; size: string; quantity: number;
}

type Decisao = "MANTER" | "TROCAR" | "DEVOLVER" | "DESCARTAR";

// Peça que o colaborador já possui (vinda do kit da função atual).
interface PecaAtual {
  nome: string;                 // peça da função atual
  nomeNovo: string;             // peça correspondente na nova função (= nome quando idêntica)
  usadoNaNova: boolean;         // a nova função também usa esta peça (idêntica ou mesma categoria)?
  motivo: string;
  decisao: Decisao;             // MANTER/TROCAR (usadoNaNova) | DEVOLVER/DESCARTAR (não usada)
  destinoAntiga: "ESTOQUE" | "DESCARTE"; // destino da peça antiga ao TROCAR
  qtde: number;
  tamanho: string;              // tamanho da peça nova (apenas ao TROCAR)
  itemVinculado: ItemEstoque | null;
}

// Item que a nova função exige e o colaborador ainda não tem.
interface ItemNovo {
  nome: string; qtde: number; tamanho: string; itemVinculado: ItemEstoque | null;
}

const CATEGORIAS = ["CAMISA", "CALÇA", "MOLETOM", "CALÇADO"];
const categoriaDe = (nome: string) => CATEGORIAS.find(c => nome.toUpperCase().includes(c)) || null;

export default function TrocarFuncao() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [emp, setEmp] = useState<Employee | null>(null);
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [novoDepartamento, setNovoDepartamento] = useState("");
  const [novoCargo, setNovoCargo] = useState("");
  const [pecas, setPecas] = useState<PecaAtual[]>([]);
  const [itensNovos, setItensNovos] = useState<ItemNovo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [empRes, itemsRes] = await Promise.all([
          api.get("/employee/" + id),
          api.get("/getitems"),
        ]);
        const e: Employee = empRes.data;
        setEmp(e);
        setEstoque(itemsRes.data || []);
        setNovoDepartamento(e.department || "");
        setNovoCargo(e.role || "");
      } catch {
        window.alert("Não foi possível carregar o colaborador.");
        navigate("/funcionarios");
      } finally {
        setCarregando(false);
      }
    })();
  }, [id]);

  // Recalcula as listas quando o destino muda (ou ao carregar).
  const recalcular = (deptNovo: string) => {
    if (!emp?.department || !deptNovo) { setPecas([]); setItensNovos([]); return; }
    const kitAntigo = UNIFORMES_POR_SETOR[emp.department];
    const kitNovo = UNIFORMES_POR_SETOR[deptNovo];
    const itensAntigos = [...(kitAntigo?.uniformes || []), ...(kitAntigo?.epis || [])];
    const itensDoNovo = [...(kitNovo?.uniformes || []), ...(kitNovo?.epis || [])];
    const pareados = new Set<string>();
    const pa: PecaAtual[] = [];

    itensAntigos.forEach(item => {
      const exato = itensDoNovo.find(n => n.nome.toUpperCase() === item.nome.toUpperCase());
      if (exato) {
        pareados.add(exato.nome.toUpperCase());
        pa.push({ nome: item.nome, nomeNovo: item.nome, usadoNaNova: true, motivo: "usada nas duas funções", decisao: "MANTER", destinoAntiga: "ESTOQUE", qtde: item.qtde || 1, tamanho: "", itemVinculado: null });
        return;
      }
      const cat = categoriaDe(item.nome);
      const corresp = cat ? itensDoNovo.find(n => categoriaDe(n.nome) === cat && !pareados.has(n.nome.toUpperCase())) : null;
      if (corresp) {
        pareados.add(corresp.nome.toUpperCase());
        pa.push({ nome: item.nome, nomeNovo: corresp.nome, usadoNaNova: true, motivo: "categoria diferente no novo setor", decisao: "MANTER", destinoAntiga: "ESTOQUE", qtde: corresp.qtde || 1, tamanho: "", itemVinculado: null });
      } else {
        pa.push({ nome: item.nome, nomeNovo: item.nome, usadoNaNova: false, motivo: "não usada na nova função", decisao: "DEVOLVER", destinoAntiga: "ESTOQUE", qtde: item.qtde || 1, tamanho: "", itemVinculado: null });
      }
    });

    const novos: ItemNovo[] = itensDoNovo
      .filter(n => !pareados.has(n.nome.toUpperCase()))
      .map(n => ({ nome: n.nome, qtde: n.qtde || 1, tamanho: "", itemVinculado: null }));

    setPecas(pa);
    setItensNovos(novos);
  };

  useEffect(() => { if (emp) recalcular(novoDepartamento); /* eslint-disable-next-line */ }, [emp, novoDepartamento]);

  const buscarEstoque = (nome: string, tam: string): ItemEstoque | null => {
    const t = tam.toUpperCase().trim();
    if (!t) return null;
    return estoque.find(e => e.name.toUpperCase().includes(nome.toUpperCase()) && e.size?.toUpperCase().trim() === t) || null;
  };

  const setDecisao = (nome: string, decisao: Decisao) =>
    setPecas(prev => prev.map(p => p.nome === nome ? { ...p, decisao, tamanho: decisao === "TROCAR" ? p.tamanho : "", itemVinculado: decisao === "TROCAR" ? p.itemVinculado : null } : p));

  const setDestino = (nome: string, destinoAntiga: "ESTOQUE" | "DESCARTE") =>
    setPecas(prev => prev.map(p => p.nome === nome ? { ...p, destinoAntiga } : p));

  const setTamanhoPeca = (nome: string, tamanho: string) =>
    setPecas(prev => prev.map(p => p.nome === nome ? { ...p, tamanho, itemVinculado: buscarEstoque(p.nomeNovo, tamanho) } : p));

  const setTamanhoNovo = (nome: string, tamanho: string) =>
    setItensNovos(prev => prev.map(i => i.nome === nome ? { ...i, tamanho, itemVinculado: buscarEstoque(i.nome, tamanho) } : i));

  const resumo = useMemo(() => {
    const manter = pecas.filter(p => p.decisao === "MANTER").length;
    const trocar = pecas.filter(p => p.decisao === "TROCAR").length;
    const devolver = pecas.filter(p => p.decisao === "DEVOLVER").length;
    const descartar = pecas.filter(p => p.decisao === "DESCARTAR").length;
    const entregar = pecas.filter(p => p.decisao === "TROCAR" && p.itemVinculado).length + itensNovos.filter(i => i.itemVinculado).length;
    return { manter, trocar, devolver, descartar, entregar };
  }, [pecas, itensNovos]);

  const confirmar = async () => {
    if (!emp || !novoDepartamento) { window.alert("Selecione o novo departamento."); return; }
    if (!window.confirm(
      `Confirmar troca de função de ${emp.name}?\n\nDe: ${emp.department} → ${emp.role}\nPara: ${novoDepartamento} → ${novoCargo || emp.role}`
    )) return;

    try {
      setSalvando(true);
      await api.put("/employee/" + emp.id, {
        name: emp.name, company: emp.company,
        role: novoCargo || emp.role, department: novoDepartamento,
        admissionDate: emp.admissionDate,
        shirt_size: emp.shirt_size, pants_size: emp.pants_size, shoes_size: emp.shoes_size,
      });

      const saidasRes = await api.get("/getitemsout/" + emp.id);
      const saidasAtivas = saidasRes.data || [];

      // Peças que saem do colaborador (trocar/devolver/descartar)
      const removidas = pecas.filter(p => p.decisao === "TROCAR" || p.decisao === "DEVOLVER" || p.decisao === "DESCARTAR");
      for (const p of removidas) {
        const primeira = p.nome.split(" ")[0].toUpperCase();
        const saida = saidasAtivas.find((s: any) => s.item?.name?.toUpperCase().includes(primeira));
        if (!saida) continue;
        const descartar = p.decisao === "DESCARTAR" || (p.decisao === "TROCAR" && p.destinoAntiga === "DESCARTE");
        if (descartar) {
          await api.delete("/returnitem/" + saida.id);
          await api.post("/discard", { itemId: saida.item.id, quantity: saida.quantity, reason: "TROCA_FUNCAO", notes: `Descarte por troca de função: ${emp.department} → ${novoDepartamento}`, discardedBy: emp.name, discardDate: new Date().toISOString() });
        } else {
          await api.delete("/returnitemandaddquantity/" + saida.id);
        }
      }

      // Peças novas a entregar: as trocadas (peça nova) + os itens novos da função
      const entregar = [
        ...pecas.filter(p => p.decisao === "TROCAR" && p.itemVinculado).map(p => ({ item: p.itemVinculado!, qtde: p.qtde })),
        ...itensNovos.filter(i => i.itemVinculado).map(i => ({ item: i.itemVinculado!, qtde: i.qtde })),
      ];
      for (const e of entregar) {
        if (e.item.quantity > 0) {
          await api.post("/giveitem", { employeeId: emp.id, itemId: e.item.id, quantity: e.qtde, withdrawalDate: new Date().toISOString() });
        }
      }

      window.alert("Troca de função registrada!");
      navigate("/funcionarios");
    } catch (e: any) {
      window.alert(e.response?.data?.error || "Erro ao registrar troca de função.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Carregando…</div>;
  if (!emp) return null;

  const semKit = !!novoDepartamento && pecas.length === 0 && itensNovos.length === 0;

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button onClick={() => navigate("/funcionarios")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer" }}>
            <IconCornerDownLeft size={13} /> Voltar
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>Trocar de função</h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {emp.name} · {emp.department} → {emp.role}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 240px", gap: 18, alignItems: "start" }}>
        {/* Coluna principal */}
        <div>
          {/* Nova função */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <div>
              <label style={lbl}>Novo departamento *</label>
              <select className="form-select" value={novoDepartamento} onChange={e => setNovoDepartamento(e.target.value)}>
                <option value="">Selecione…</option>
                {SETORES_DISPONIVEIS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Novo cargo</label>
              <input className="form-control" list="cargos-troca" value={novoCargo} onChange={e => setNovoCargo(e.target.value)} placeholder="Ex: Operador de Caixa" />
              <datalist id="cargos-troca">
                {(FUNCOES_POR_SETOR[novoDepartamento] || []).map(f => <option key={f} value={f} />)}
              </datalist>
            </div>
          </div>

          {semKit && (
            <div style={{ padding: 14, background: "var(--surface-2)", borderRadius: 8, fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
              Kit não mapeado — a troca atualizará o departamento sem análise automática de uniformes.
            </div>
          )}

          {/* Peças atuais */}
          {pecas.length > 0 && (
            <>
              <div style={secTitle}>Peças que o colaborador já tem</div>
              <p style={secHint}>Para cada peça, diga a condição: manter (boa) ou trocar (desgastada). Itens que a nova função não usa: devolver ou descartar.</p>
              <div style={listaCard}>
                {pecas.map((p, idx) => (
                  <div key={p.nome} style={{ padding: "11px 14px", borderBottom: idx < pecas.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {p.nome}{p.nomeNovo !== p.nome && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> → {p.nomeNovo}</span>}
                        </div>
                        <div style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>{p.motivo}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {p.usadoNaNova ? (
                          <>
                            <button type="button" onClick={() => setDecisao(p.nome, "MANTER")} style={seg(p.decisao === "MANTER", "var(--success)")}>
                              <IconCheckCircle size={11} /> Manter
                            </button>
                            <button type="button" onClick={() => setDecisao(p.nome, "TROCAR")} style={seg(p.decisao === "TROCAR", "var(--info)")}>
                              <IconRefreshCw size={11} /> Trocar
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => setDecisao(p.nome, "DEVOLVER")} style={seg(p.decisao === "DEVOLVER", "var(--success)")}>
                              <IconCornerDownLeft size={11} /> Devolver
                            </button>
                            <button type="button" onClick={() => setDecisao(p.nome, "DESCARTAR")} style={seg(p.decisao === "DESCARTAR", "var(--danger)")}>
                              <IconTrash size={11} /> Descartar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {p.decisao === "TROCAR" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.66rem", color: "var(--text-muted)", fontWeight: 600 }}>Peça antiga:</span>
                        <button type="button" onClick={() => setDestino(p.nome, "ESTOQUE")} style={segSm(p.destinoAntiga === "ESTOQUE", "var(--success)")}>Estoque</button>
                        <button type="button" onClick={() => setDestino(p.nome, "DESCARTE")} style={segSm(p.destinoAntiga === "DESCARTE", "var(--danger)")}>Descartar</button>
                        <span style={{ fontSize: "0.66rem", color: "var(--text-muted)", fontWeight: 600, marginLeft: 6 }}>Tamanho da nova:</span>
                        <input className="form-control" value={p.tamanho} onChange={e => setTamanhoPeca(p.nome, e.target.value)} placeholder="Ex: G, 42" style={{ width: 70, textAlign: "center", fontWeight: 700, fontSize: "0.74rem", padding: "4px 6px" }} />
                        <span style={{ fontSize: "0.66rem" }}>{statusEstoque(p.tamanho, p.itemVinculado, p.qtde)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Itens novos */}
          {itensNovos.length > 0 && (
            <>
              <div style={secTitle}><IconPackage size={12} /> Itens novos da função</div>
              <p style={secHint}>Informe o tamanho de cada item. Sem tamanho/estoque, o item não é entregue automaticamente.</p>
              <div style={listaCard}>
                {itensNovos.map((i, idx) => (
                  <div key={i.nome} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 14px", borderBottom: idx < itensNovos.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{i.nome}</div>
                      <div style={{ fontSize: "0.66rem" }}>{statusEstoque(i.tamanho, i.itemVinculado, i.qtde)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <input className="form-control" value={i.tamanho} onChange={e => setTamanhoNovo(i.nome, e.target.value)} placeholder="Ex: G, 42" style={{ width: 70, textAlign: "center", fontWeight: 700, fontSize: "0.76rem", padding: "4px 6px" }} />
                      <span style={{ fontSize: "0.74rem", fontFamily: "monospace", fontWeight: 700, color: "var(--text-secondary)" }}>×{i.qtde}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Resumo lateral */}
        <div style={{ position: "sticky", top: 16, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Resumo</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.78rem" }}>
            {linhaResumo("Manter", resumo.manter)}
            {linhaResumo("Trocar", resumo.trocar)}
            {linhaResumo("Devolver", resumo.devolver)}
            {linhaResumo("Descartar", resumo.descartar)}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>{linhaResumo("Novos a entregar", resumo.entregar)}</div>
          </div>
          <button onClick={confirmar} disabled={salvando || !novoDepartamento}
            style={{ width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 7, border: "none", background: (!novoDepartamento || salvando) ? "var(--surface)" : "var(--info)", color: (!novoDepartamento || salvando) ? "var(--text-muted)" : "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: (!novoDepartamento || salvando) ? "not-allowed" : "pointer" }}>
            {salvando ? <><span className="spinner-border spinner-border-sm" /> Registrando…</> : <><IconRefreshCw size={13} /> Confirmar troca</>}
          </button>
          <button onClick={() => navigate("/funcionarios")} style={{ width: "100%", marginTop: 8, padding: "8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── estilos/helpers ──
const lbl: React.CSSProperties = { display: "block", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 5, letterSpacing: "0.04em" };
const secTitle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", margin: "18px 0 6px" };
const secHint: React.CSSProperties = { fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 10px" };
const listaCard: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" };

function seg(ativo: boolean, cor: string): React.CSSProperties {
  return { display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, border: `1px solid ${ativo ? cor : "var(--border)"}`, background: ativo ? cor : "var(--surface)", color: ativo ? "#fff" : "var(--text-secondary)" };
}
function segSm(ativo: boolean, cor: string): React.CSSProperties {
  return { padding: "3px 9px", borderRadius: 5, cursor: "pointer", fontSize: "0.66rem", fontWeight: 700, border: `1px solid ${ativo ? cor : "var(--border)"}`, background: ativo ? cor : "var(--surface)", color: ativo ? "#fff" : "var(--text-secondary)" };
}
function statusEstoque(tam: string, vinc: ItemEstoque | null, qtde: number) {
  if (!tam.trim()) return <span style={{ color: "var(--text-muted)" }}>Digite o tamanho →</span>;
  if (!vinc) return <span style={{ color: "var(--danger)", fontWeight: 600 }}>✕ Sem estoque neste tamanho</span>;
  if (vinc.quantity < qtde) return <span style={{ color: "var(--warning)", fontWeight: 600 }}>⚠ Apenas {vinc.quantity} disponível</span>;
  return <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ {vinc.quantity} em estoque</span>;
}
function linhaResumo(label: string, valor: number) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{valor}</span>
    </div>
  );
}
