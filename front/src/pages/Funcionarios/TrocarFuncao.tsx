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

interface PecaAtual {
  nome: string;
  nomeNovo: string;
  usadoNaNova: boolean;
  motivo: string;
  decisao: Decisao;
  destinoAntiga: "ESTOQUE" | "DESCARTE";
  qtde: number;
  tamanho: string;
  itemVinculado: ItemEstoque | null;
}

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
        const [empRes, itemsRes] = await Promise.all([api.get("/employee/" + id), api.get("/getitems")]);
        const e: Employee = empRes.data;
        setEmp(e);
        setEstoque(itemsRes.data || []);
        setNovoDepartamento(e.department || "");
        setNovoCargo(e.role || "");
      } catch {
        window.alert("Não foi possível carregar o colaborador.");
        navigate("/funcionarios");
      } finally { setCarregando(false); }
    })();
  }, [id]);

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

  const resumo = useMemo(() => ({
    manter: pecas.filter(p => p.decisao === "MANTER").length,
    trocar: pecas.filter(p => p.decisao === "TROCAR").length,
    devolver: pecas.filter(p => p.decisao === "DEVOLVER").length,
    descartar: pecas.filter(p => p.decisao === "DESCARTAR").length,
    entregar: pecas.filter(p => p.decisao === "TROCAR" && p.itemVinculado).length + itensNovos.filter(i => i.itemVinculado).length,
  }), [pecas, itensNovos]);

  const confirmar = async () => {
    if (!emp || !novoDepartamento) { window.alert("Selecione o novo departamento."); return; }
    if (!window.confirm(`Confirmar troca de função de ${emp.name}?\n\nDe: ${emp.department} → ${emp.role}\nPara: ${novoDepartamento} → ${novoCargo || emp.role}`)) return;
    try {
      setSalvando(true);
      await api.put("/employee/" + emp.id, {
        name: emp.name, company: emp.company, role: novoCargo || emp.role, department: novoDepartamento,
        admissionDate: emp.admissionDate, shirt_size: emp.shirt_size, pants_size: emp.pants_size, shoes_size: emp.shoes_size,
      });
      const saidasRes = await api.get("/getitemsout/" + emp.id);
      const saidasAtivas = saidasRes.data || [];
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
      const entregar = [
        ...pecas.filter(p => p.decisao === "TROCAR" && p.itemVinculado).map(p => ({ item: p.itemVinculado!, qtde: p.qtde })),
        ...itensNovos.filter(i => i.itemVinculado).map(i => ({ item: i.itemVinculado!, qtde: i.qtde })),
      ];
      for (const e of entregar) {
        if (e.item.quantity > 0) await api.post("/giveitem", { employeeId: emp.id, itemId: e.item.id, quantity: e.qtde, withdrawalDate: new Date().toISOString() });
      }
      window.alert("Troca de função registrada!");
      navigate("/funcionarios");
    } catch (e: any) {
      window.alert(e.response?.data?.error || "Erro ao registrar troca de função.");
    } finally { setSalvando(false); }
  };

  if (carregando) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Carregando…</div>;
  if (!emp) return null;

  const usadas = pecas.filter(p => p.usadoNaNova);
  const naoUsadas = pecas.filter(p => !p.usadoNaNova);
  const semKit = !!novoDepartamento && pecas.length === 0 && itensNovos.length === 0;

  // Card de uma peça atual (manter/trocar ou devolver/descartar).
  const cardPeca = (p: PecaAtual) => (
    <div key={p.nome} style={cardBase(p.usadoNaNova ? TINT.verde : TINT.ambar, p.usadoNaNova ? "var(--success)" : "var(--warning)")}>
      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.25 }}>
        {p.nome}{p.nomeNovo !== p.nome && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> → {p.nomeNovo}</span>}
      </div>
      <div style={{ fontSize: "0.63rem", color: "var(--text-muted)", marginBottom: 8 }}>{p.motivo}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {p.usadoNaNova ? (
          <>
            <button type="button" onClick={() => setDecisao(p.nome, "MANTER")} style={seg(p.decisao === "MANTER", "var(--success)")}><IconCheckCircle size={11} /> Manter</button>
            <button type="button" onClick={() => setDecisao(p.nome, "TROCAR")} style={seg(p.decisao === "TROCAR", "var(--info)")}><IconRefreshCw size={11} /> Trocar</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setDecisao(p.nome, "DEVOLVER")} style={seg(p.decisao === "DEVOLVER", "var(--success)")}><IconCornerDownLeft size={11} /> Devolver</button>
            <button type="button" onClick={() => setDecisao(p.nome, "DESCARTAR")} style={seg(p.decisao === "DESCARTAR", "var(--danger)")}><IconTrash size={11} /> Descartar</button>
          </>
        )}
      </div>
      {p.decisao === "TROCAR" && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 600 }}>Antiga:</span>
            <button type="button" onClick={() => setDestino(p.nome, "ESTOQUE")} style={segSm(p.destinoAntiga === "ESTOQUE", "var(--success)")}>Estoque</button>
            <button type="button" onClick={() => setDestino(p.nome, "DESCARTE")} style={segSm(p.destinoAntiga === "DESCARTE", "var(--danger)")}>Descartar</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input className="form-control" value={p.tamanho} onChange={e => setTamanhoPeca(p.nome, e.target.value)} placeholder="Tam. nova" style={{ width: 86, textAlign: "center", fontWeight: 700, fontSize: "0.72rem", padding: "4px 6px" }} />
            <span style={{ fontSize: "0.62rem" }}>{statusEstoque(p.tamanho, p.itemVinculado, p.qtde)}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", minHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate("/funcionarios")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer" }}>
          <IconCornerDownLeft size={13} /> Voltar
        </button>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>Trocar de função</h2>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{emp.name} · {emp.department} → {emp.role}</div>
        </div>
      </div>

      {/* Nova função */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20, maxWidth: 720 }}>
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
          <datalist id="cargos-troca">{(FUNCOES_POR_SETOR[novoDepartamento] || []).map(f => <option key={f} value={f} />)}</datalist>
        </div>
      </div>

      {semKit && (
        <div style={{ padding: 14, background: "var(--surface-2)", borderRadius: 10, fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
          Kit não mapeado — a troca atualizará o departamento sem análise automática de uniformes.
        </div>
      )}

      {/* Seção: a nova função usa */}
      {usadas.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          {secHead("A nova função usa", usadas.length, "var(--success)", <IconCheckCircle size={13} />, "Avalie a condição de cada peça: manter (boa) ou trocar (desgastada).")}
          <div style={gradeCards}>{usadas.map(cardPeca)}</div>
        </section>
      )}

      {/* Seção: não usada na nova função */}
      {naoUsadas.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          {secHead("Não usada na nova função", naoUsadas.length, "var(--warning)", <IconCornerDownLeft size={13} />, "Estas peças saem do colaborador: devolva ao estoque ou descarte.")}
          <div style={gradeCards}>{naoUsadas.map(cardPeca)}</div>
        </section>
      )}

      {/* Seção: itens novos */}
      {itensNovos.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          {secHead("Itens novos da função", itensNovos.length, "var(--info)", <IconPackage size={13} />, "Informe o tamanho. Sem tamanho/estoque, o item não é entregue automaticamente.")}
          <div style={gradeCards}>
            {itensNovos.map(i => (
              <div key={i.nome} style={cardBase(TINT.azul, "var(--info)")}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.25 }}>{i.nome} <span style={{ color: "var(--text-muted)", fontWeight: 400, fontFamily: "monospace" }}>×{i.qtde}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input className="form-control" value={i.tamanho} onChange={e => setTamanhoNovo(i.nome, e.target.value)} placeholder="Tamanho" style={{ width: 96, textAlign: "center", fontWeight: 700, fontSize: "0.74rem", padding: "4px 6px" }} />
                  <span style={{ fontSize: "0.62rem" }}>{statusEstoque(i.tamanho, i.itemVinculado, i.qtde)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Barra fixa de resumo + ações */}
      <div style={{ position: "sticky", bottom: -1, marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "12px 18px", background: "var(--surface-2)", borderTop: "1px solid var(--border)", borderRadius: "12px 12px 0 0", boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: "0.78rem" }}>
          {chip("Manter", resumo.manter, "var(--success)")}
          {chip("Trocar", resumo.trocar, "var(--info)")}
          {chip("Devolver", resumo.devolver, "var(--warning)")}
          {chip("Descartar", resumo.descartar, "var(--danger)")}
          <span style={{ color: "var(--text-muted)" }}>|</span>
          {chip("Novos a entregar", resumo.entregar, "var(--text-primary)")}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/funcionarios")} style={{ padding: "9px 18px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
          <button onClick={confirmar} disabled={salvando || !novoDepartamento}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 7, border: "none", background: (!novoDepartamento || salvando) ? "var(--surface)" : "var(--info)", color: (!novoDepartamento || salvando) ? "var(--text-muted)" : "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: (!novoDepartamento || salvando) ? "not-allowed" : "pointer" }}>
            {salvando ? <><span className="spinner-border spinner-border-sm" /> Registrando…</> : <><IconRefreshCw size={13} /> Confirmar troca</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── estilos/helpers ──
const TINT = { verde: "var(--success-subtle, #eef9f1)", ambar: "var(--warning-subtle, #fff8ec)", azul: "var(--info-subtle, #eef4fc)" };
const lbl: React.CSSProperties = { display: "block", fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 5, letterSpacing: "0.04em" };
const gradeCards: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, alignItems: "start" };

function cardBase(bg: string, accent: string): React.CSSProperties {
  return { background: bg, border: "1px solid var(--border)", borderLeft: `3px solid ${accent}`, borderRadius: 10, padding: "11px 13px" };
}
function secHead(titulo: string, count: number, cor: string, icone: React.ReactNode, hint: string) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.82rem", fontWeight: 800, color: cor, textTransform: "uppercase", letterSpacing: "0.03em" }}>{icone} {titulo}</span>
        <span style={{ background: cor, color: "#fff", fontSize: "0.66rem", fontWeight: 800, padding: "1px 8px", borderRadius: 10, minWidth: 20, textAlign: "center" }}>{count}</span>
      </div>
      <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", marginTop: 3 }}>{hint}</div>
    </div>
  );
}
function chip(label: string, valor: number, cor: string) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor, display: "inline-block" }} />
      <span style={{ fontWeight: 800, color: cor }}>{valor}</span>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
    </span>
  );
}
function seg(ativo: boolean, cor: string): React.CSSProperties {
  return { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 8px", borderRadius: 6, cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, border: `1px solid ${ativo ? cor : "var(--border)"}`, background: ativo ? cor : "var(--surface)", color: ativo ? "#fff" : "var(--text-secondary)" };
}
function segSm(ativo: boolean, cor: string): React.CSSProperties {
  return { padding: "3px 9px", borderRadius: 5, cursor: "pointer", fontSize: "0.64rem", fontWeight: 700, border: `1px solid ${ativo ? cor : "var(--border)"}`, background: ativo ? cor : "var(--surface)", color: ativo ? "#fff" : "var(--text-secondary)" };
}
function statusEstoque(tam: string, vinc: ItemEstoque | null, qtde: number) {
  if (!tam.trim()) return <span style={{ color: "var(--text-muted)" }}>Digite o tamanho</span>;
  if (!vinc) return <span style={{ color: "var(--danger)", fontWeight: 600 }}>✕ Sem estoque</span>;
  if (vinc.quantity < qtde) return <span style={{ color: "var(--warning)", fontWeight: 600 }}>⚠ Só {vinc.quantity}</span>;
  return <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ {vinc.quantity} em estoque</span>;
}