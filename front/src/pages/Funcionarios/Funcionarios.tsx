import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import api from "../../services/useApi";
import Papa from "papaparse";
import { Employee } from "../../types/Employee";
import { formatDate } from "../../utils/dateFunctions";
import { UNIFORMES_POR_SETOR, SETORES_DISPONIVEIS } from "../../constants/uniformesPorSetor";
import { company } from "./EmployeeTypes";
import { Link, useLocation } from "react-router-dom";
import {
  IconUsers, IconPlus, IconEdit, IconTrash, IconSearch,
  IconX, IconDownload, IconCheckCircle, IconArrowRight, IconPackage
} from "../../components/Icons";

type Modo = "cadastro" | "edicao" | "saidas";

interface ItemEstoque {
  id: number; name: string; type: string; sector: string; size: string; quantity: number;
}

interface WithdrawalItem {
  id: number; withdrawalDate: string; quantity: number;
  item: { name: string; type: string; sector: string };
}

interface EntregaItem {
  item: ItemEstoque;
  qty: number;
}

// Item do kit pré-carregado — aguarda tamanho do usuário para vincular ao estoque
interface KitItemForm {
  nomeKit: string;       // nome da planilha (ex: "CAMISA")
  ca?: string;           // CA do EPI (se aplicável)
  tipo: "uniforme" | "epi";
  qtde: number;          // quantidade padrão do kit
  tamanho: string;       // preenchido pelo usuário
  itemVinculado: ItemEstoque | null;  // item encontrado no estoque com aquele nome+tamanho
}

const emptyForm = {
  name: "", company: "", role: "", department: "",
  admissionDate: "", shirt_size: "", pants_size: "", shoes_size: "",
};

const Funcionarios = () => {
  const [funcionarios, setFuncionarios]   = useState<Employee[]>([]);
  const [filtered, setFiltered]           = useState<Employee[]>([]);
  const [loading, setLoading]             = useState(true);
  const [roles, setRoles]                 = useState<string[]>([]);
  // departments removido — departamento agora usa SETORES_DISPONIVEIS
  const [todosItems, setTodosItems]       = useState<ItemEstoque[]>([]);

  // Filtros lista
  const [filtro, setFiltro]               = useState("");
  const [soNovos, setSoNovos]             = useState(false);

  // Painel lateral
  const [panelOpen, setPanelOpen]         = useState(false);
  const [modo, setModo]                   = useState<Modo>("cadastro");
  const [selected, setSelected]           = useState<Employee | null>(null);
  const [form, setForm]                   = useState(emptyForm);
  const [saidas, setSaidas]               = useState<WithdrawalItem[]>([]);
  const [saving, setSaving]               = useState(false);
  const panelRef                          = useRef<HTMLDivElement>(null);

  // Primeira entrega — múltiplos itens
  const [primeiroItemSearch, setPrimeiroItemSearch]       = useState("");
  const [filteredPrimeiroItem, setFilteredPrimeiroItem]   = useState<ItemEstoque[]>([]);
  // primeiroItemQty removido — quantidade vem do kit
  const [entregaItens, setEntregaItens]                   = useState<EntregaItem[]>([]);
  const [kitItensForm, setKitItensForm]                   = useState<KitItemForm[]>([]);
  const [dropdownPos, setDropdownPos]                     = useState<{ top: number; left: number; width: number } | null>(null);
  const [highlightedIndex, setHighlightedIndex]           = useState<number>(-1);
  const primeiroItemInputRef                              = useRef<HTMLInputElement>(null);
  const dropdownListRef                                   = useRef<HTMLUListElement>(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const todayStr = new Date().toDateString();
    let list = funcionarios;
    if (soNovos) list = list.filter(f => new Date(f.admissionDate).toDateString() === todayStr);
    if (filtro) list = list.filter(f =>
      f.name.toLowerCase().includes(filtro.toLowerCase()) ||
      f.department?.toLowerCase().includes(filtro.toLowerCase()) ||
      f.company?.toLowerCase().includes(filtro.toLowerCase())
    );
    setFiltered(list);
  }, [filtro, soNovos, funcionarios]);

  // Scroll automático no item destacado do dropdown
  useEffect(() => {
    if (highlightedIndex < 0 || !dropdownListRef.current) return;
    const item = dropdownListRef.current.children[highlightedIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  // Abre modal de cadastro automaticamente se vier de ?novo=true
    useEffect(() => {
      const params = new URLSearchParams(location.search);
      if (params.get("novo") === "true") {
        setModo("cadastro");
        setPanelOpen(true);
      }
    }, [location.search]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [empRes, itemsRes] = await Promise.all([
        api.get("/getemployees"),
        api.get("/getitems"),
      ]);
      const data: Employee[] = empRes.data || [];
      setFuncionarios(data);
      setFiltered(data);
      // setDepartments não mais necessário
      setRoles([...new Set(data.map(e => (e.role || "").trim()).filter(Boolean))] as string[]);
      setTodosItems(itemsRes.data || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  // ── Painel handlers ──
  const openCadastro = () => {
    setForm(emptyForm);
    setSelected(null);
    setEntregaItens([]);
    setPrimeiroItemSearch("");
    // qty resetada pelo kit
    setFilteredPrimeiroItem([]);
    setDropdownPos(null);
    setModo("cadastro");
    setPanelOpen(true);
  };

  const openEdicao = (emp: Employee) => {
    setSelected(emp);
    setForm({
      name: emp.name || "",
      company: emp.company || "",
      role: emp.role || "",
      department: emp.department || "",
      admissionDate: emp.admissionDate ? new Date(emp.admissionDate).toISOString().split("T")[0] : "",
      shirt_size: emp.shirt_size || "",
      pants_size: emp.pants_size?.toString() || "",
      shoes_size: emp.shoes_size?.toString() || "",
    });
    setModo("edicao");
    setPanelOpen(true);
  };

  const openSaidas = async (emp: Employee) => {
    setSelected(emp);
    setModo("saidas");
    setPanelOpen(true);
    try {
      const res = await api.get("/getwithdrawalsout");
      const filtradas = (res.data || []).filter((s: any) =>
        s.employee?.id === emp.id || s.employeeId === emp.id
      );
      setSaidas(filtradas);
    } catch (e) { setSaidas([]); }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelected(null);
    setSaidas([]);
    setEntregaItens([]); setKitItensForm([]);
    setPrimeiroItemSearch("");
    // qty resetada pelo kit
    setFilteredPrimeiroItem([]);
    setDropdownPos(null);
  };

  const setField = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));

    if (k === "department" && modo === "cadastro") {
      if (v && UNIFORMES_POR_SETOR[v]) {
        const kit = UNIFORMES_POR_SETOR[v];
        const novosItens: KitItemForm[] = [
          ...kit.uniformes.map(u => ({ nomeKit: u.nome, ca: undefined, tipo: "uniforme" as const, qtde: u.qtde, tamanho: "", itemVinculado: null })),
          ...kit.epis.map(e => ({ nomeKit: e.nome, ca: e.ca, tipo: "epi" as const, qtde: e.qtde, tamanho: "", itemVinculado: null })),
        ];
        setKitItensForm(novosItens);
        setEntregaItens([]); // limpa entrega anterior
      } else {
        setKitItensForm([]);
        setEntregaItens([]);
      }
    }
  };

  // Atualiza o tamanho de um item do kit e vincula ao estoque se encontrar
  const atualizarTamanhoKit = (idx: number, tamanho: string) => {
    setKitItensForm(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const tam = tamanho.toUpperCase().trim();
      // Busca exata: nome do item no estoque contém o nome do kit E o tamanho bate
      const encontrado = tam
        ? todosItems.find(est =>
            est.name.toUpperCase().includes(item.nomeKit.toUpperCase()) &&
            est.size?.toUpperCase().trim() === tam
          ) || null
        : null;
      return { ...item, tamanho, itemVinculado: encontrado };
    }));
  };

  // Sincroniza kitItensForm → entregaItens (apenas itens vinculados)
  const sincronizarEntrega = () => {
    const vinculados: EntregaItem[] = kitItensForm
      .filter(k => k.itemVinculado !== null)
      .map(k => ({ item: k.itemVinculado as ItemEstoque, qty: k.qtde }));
    setEntregaItens(vinculados);
  };

  // Busca primeira entrega — com cálculo de posição para portal
  const handlePrimeiroItemSearch = (val: string) => {
    setPrimeiroItemSearch(val);
    if (val.length > 0) {
      const rect = primeiroItemInputRef.current?.getBoundingClientRect();
      if (rect) {
        setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
      }
      setFilteredPrimeiroItem(
        todosItems.filter(i => i.name.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
      );
      setHighlightedIndex(-1);
    } else {
      setFilteredPrimeiroItem([]);
      setDropdownPos(null);
      setHighlightedIndex(-1);
    }
  };

  const selecionarPrimeiroItem = (item: ItemEstoque) => {
    // Limpa o campo de busca imediatamente
    setPrimeiroItemSearch("");
    setFilteredPrimeiroItem([]);
    setDropdownPos(null);
    setHighlightedIndex(-1);

    // Adiciona à lista ou incrementa quantidade se já existe
    setEntregaItens(prev => {
      const exists = prev.find(e => e.item.id === item.id);
      if (exists) {
        return prev.map(e =>
          e.item.id === item.id
            ? { ...e, qty: e.qty + 1 }
            : e
        );
      }
      return [...prev, { item, qty: 1 }];
    });

    // Reseta qty para a próxima seleção
    // qty resetada pelo kit
  };

  const removerEntregaItem = (itemId: number) => {
    setEntregaItens(prev => prev.filter(e => e.item.id !== itemId));
  };

  const atualizarEntregaQty = (itemId: number, qty: number) => {
    setEntregaItens(prev =>
      prev.map(e => e.item.id === itemId ? { ...e, qty } : e)
    );
  };

  // ── CRUD ──
  const handleCadastrar = async () => {
    if (!form.name.trim()) { window.alert("Informe o nome."); return; }
    if (!form.company) { window.alert("Selecione a empresa."); return; }
    try {
      setSaving(true);
      const date = form.admissionDate ? new Date(form.admissionDate) : new Date();
      const res = await api.post("/employee", {
        name: form.name.toUpperCase(),
        company: form.company,
        role: form.role,
        department: form.department,
        admissionDate: date.toISOString(),
        shirt_size: form.shirt_size.toUpperCase(),
        pants_size: parseInt(form.pants_size) || 0,
        shoes_size: parseInt(form.shoes_size) || 0,
      });

      const novoId = res.data?.id;

      // Registrar todos os itens da lista de entrega
      if (novoId && entregaItens.length > 0) {
        await Promise.all(
          entregaItens
            .filter(e => e.qty > 0)
            .map(e =>
              api.post("/giveitem", {
                employeeId: novoId,
                itemId: e.item.id,
                quantity: e.qty,
                withdrawalDate: new Date().toISOString(),
              }).catch(err => console.log("Erro ao registrar entrega:", err))
            )
        );
      }

      window.alert("Funcionário cadastrado com sucesso!");
      closePanel();
      fetchAll();
    } catch (e) { window.alert("Erro ao cadastrar."); }
    finally { setSaving(false); }
  };

  const handleAtualizar = async () => {
    if (!selected?.id) return;
    try {
      setSaving(true);
      const date = form.admissionDate ? new Date(form.admissionDate) : new Date(selected.admissionDate);
      await api.put(`/employee/${selected.id}`, {
        name: form.name.toUpperCase(),
        company: form.company,
        role: form.role,
        department: form.department,
        admissionDate: date.toISOString(),
        shirt_size: form.shirt_size.toUpperCase(),
        pants_size: parseInt(form.pants_size) || 0,
        shoes_size: parseInt(form.shoes_size) || 0,
      });
      window.alert("Funcionário atualizado com sucesso!");
      closePanel();
      fetchAll();
    } catch (e) { window.alert("Erro ao atualizar."); }
    finally { setSaving(false); }
  };

  const handleExcluir = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir este funcionário?\n\nAtenção: todas as saídas registradas para este funcionário também serão removidas.")) return;
    try {
      const res = await api.delete(`/employee/${id}`);
      if (res.data?.error) {
        window.alert("Erro ao excluir: " + res.data.error);
        return;
      }
      fetchAll();
      if (selected?.id === id) closePanel();
    } catch (e: any) {
      window.alert("Erro ao excluir: " + (e.response?.data?.error || "Tente novamente."));
    }
  };
  const handleExportCSV = () => {
    const csv = Papa.unparse(funcionarios.map(({ name, company: c, role, department, admissionDate, shirt_size, pants_size, shoes_size }) => ({
      NOME: name, EMPRESA: c, DEPARTAMENTO: department, CARGO: role,
      ADMISSAO: formatDate(admissionDate), CAMISA: shirt_size, CALÇA: pants_size, CALÇADO: shoes_size,
    })), { delimiter: ";" });
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "funcionarios.csv"; a.click();
  };

  const handleExportWithdrawals = async () => {
    try {
      const res = await api.get("/getwithdrawalsoutplus");
      const csv = Papa.unparse((res.data || []).map((w: any) => ({
        ITEM: w.item?.name, TIPO: w.item?.type, SETOR: w.item?.sector,
        QUANTIDADE: w.quantity, FUNCIONARIO: w.employee?.name,
        DEPARTAMENTO: w.employee?.department, DATA: formatDate(w.withdrawalDate),
      })), { delimiter: ";" });
      const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "consumo_almoxarifado.csv"; a.click();
    } catch (e) { window.alert("Erro ao exportar."); }
  };

  const todayCount = funcionarios.filter(f =>
    new Date(f.admissionDate).toDateString() === new Date().toDateString()
  ).length;

  // ── Styles ──
  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
  };
  const head: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
    borderBottom: "1px solid var(--border)", background: "var(--surface-2)",
    fontSize: "0.75rem", fontWeight: 700,
  };
  const lbl: React.CSSProperties = {
    fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 5, display: "block",
  };
  const fieldRow = (cols: string) => ({
    display: "grid", gridTemplateColumns: cols, gap: 12, marginBottom: 14,
  } as React.CSSProperties);

  return (
    <div style={{ display: "flex", gap: 0, position: "relative" }}>

      {/* ══════════════ LISTA PRINCIPAL ══════════════ */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
          <div>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 2px" }}>Funcionários</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.73rem", margin: 0 }}>
              {filtered.length} colaborador{filtered.length !== 1 ? "es" : ""}
              {todayCount > 0 && <span style={{ marginLeft: 8, color: "var(--success)", fontWeight: 600 }}>· {todayCount} novo{todayCount > 1 ? "s" : ""} hoje</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleExportWithdrawals} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
              <IconDownload size={13}/> Consumo CSV
            </button>
            <button onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
              <IconDownload size={13}/> Funcionários CSV
            </button>
            <button onClick={openCadastro} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: "var(--brand)", border: "none", borderRadius: 7, color: "#fff", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
              <IconPlus size={13}/> Novo Funcionário
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
              <IconSearch size={13}/>
            </div>
            <input className="form-control" value={filtro} onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar por nome, departamento ou empresa..." style={{ paddingRight: 32, fontSize: "0.8rem" }}/>
          </div>
          <button onClick={() => setSoNovos(!soNovos)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7,
            cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap",
            background: soNovos ? "var(--success-subtle)" : "var(--surface)",
            border: `1px solid ${soNovos ? "var(--success)" : "var(--border)"}`,
            color: soNovos ? "var(--success)" : "var(--text-secondary)",
          }}>
            {soNovos ? <IconCheckCircle size={13}/> : <IconUsers size={13}/>}
            Novos hoje {todayCount > 0 && `(${todayCount})`}
          </button>
        </div>

        {/* Tabela */}
        <div style={card}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}><div className="spinner-border" role="status"/></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Nenhum funcionário encontrado.
            </div>
          ) : (
            <table className="table table-striped" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Empresa</th>
                  <th>Departamento</th>
                  <th>Cargo</th>
                  <th>Admissão</th>
                  <th>Camisa</th>
                  <th style={{ textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => {
                  const isNew = new Date(emp.admissionDate).toDateString() === new Date().toDateString();
                  return (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--brand-subtle)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, flexShrink: 0 }}>
                            {emp.name?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <Link to={`/saida/${emp.id}`} style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--brand)", textDecoration: "none" }}>
                              {emp.name}
                            </Link>
                            {isNew && <span style={{ marginLeft: 6, fontSize: "0.6rem", fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "var(--success-subtle)", color: "var(--success)" }}>NOVO</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{emp.company}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{emp.department}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{emp.role}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(emp.admissionDate)}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{emp.shirt_size || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                          <Link to={`/saida/${emp.id}`} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", fontSize: "0.7rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                            <IconArrowRight size={11}/> Saídas
                          </Link>
                          <button onClick={() => openEdicao(emp)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "none", background: "#2563EB", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                            <IconEdit size={11}/> Editar
                          </button>
                          <button onClick={() => handleExcluir(emp.id!)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--danger)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                            <IconTrash size={11}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ══════════════ PAINEL LATERAL ══════════════ */}
      {panelOpen && (
        <>
          {/* Overlay */}
          <div onClick={closePanel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 99 }}/>

          {/* Modal centralizado */}
          <div ref={panelRef} style={{
            position: "fixed",
            top: "44%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(92vw, 1160px)",
            maxHeight: "92vh",
            marginLeft: "100px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            display: "flex", flexDirection: "column",
            zIndex: 100,
            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
          }}>

            {/* Header modal */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: "12px 12px 0 0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--brand-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)" }}>
                  <IconUsers size={15}/>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>
                    {modo === "cadastro" ? "Novo Funcionário" : modo === "edicao" ? "Editar Funcionário" : "Histórico de Saídas"}
                  </div>
                  {selected && modo !== "cadastro" && (
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 1 }}>{selected.name}</div>
                  )}
                </div>
              </div>
              <button onClick={closePanel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 }}>
                <IconX size={18}/>
              </button>
            </div>

            {/* Corpo modal com scroll */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

              {/* ── CADASTRO / EDIÇÃO ── */}
              {(modo === "cadastro" || modo === "edicao") && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

                  {/* ── COLUNA ESQUERDA: dados + tamanhos ── */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Dados pessoais */}
                  <div style={card}>
                    <div style={head}><IconUsers size={13} color="var(--brand)"/> Dados Pessoais</div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={fieldRow("1fr")}>
                        <div>
                          <label style={lbl}>Nome Completo</label>
                          <input className="form-control" value={form.name} onChange={e => setField("name", e.target.value)} placeholder="Nome completo"/>
                        </div>
                      </div>
                      <div style={fieldRow("1fr 1fr")}>
                        <div>
                          <label style={lbl}>Empresa</label>
                          <select className="form-select" value={form.company} onChange={e => setField("company", e.target.value)}
                            style={{ fontSize: "0.82rem" }}>
                            <option value="">Selecione a empresa...</option>
                            {company.map((c, i) => (
                              <option key={i} value={c.name}>
                                {c.loja ? `${c.label} — ${c.loja}` : c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={lbl}>Data de Admissão</label>
                          <input type="date" className="form-control" value={form.admissionDate} onChange={e => setField("admissionDate", e.target.value)}/>
                        </div>
                      </div>
                      <div style={{ ...fieldRow("1fr 1fr"), marginBottom: 0 }}>
                        <div>
                          <label style={lbl}>Departamento</label>
                          <select
                            className="form-select"
                            value={form.department}
                            onChange={e => setField("department", e.target.value)}
                          >
                            <option value="">Selecione o departamento...</option>
                            {SETORES_DISPONIVEIS.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            <option value="OUTRO">OUTRO (não listado)</option>
                          </select>
                          {form.department === "OUTRO" && (
                            <input
                              className="form-control"
                              style={{ marginTop: 6 }}
                              placeholder="Digite o departamento..."
                              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                              autoComplete="off"
                            />
                          )}
                        </div>
                        <div>
                          <label style={lbl}>Cargo</label>
                          <input className="form-control" value={form.role} onChange={e => setField("role", e.target.value)} placeholder="Ex: Auxiliar" list="role-list" autoComplete="off"/>
                          <datalist id="role-list">{roles.map(r => <option key={r} value={r}/>)}</datalist>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tamanhos */}
                  <div style={card}>
                    <div style={head}>
                      Tamanhos de Uniforme
                      <span style={{ color: "var(--text-muted)", fontWeight: 500, marginLeft: 4, fontSize: "0.68rem" }}>opcional</span>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ ...fieldRow("1fr 1fr 1fr"), marginBottom: 0 }}>
                        <div>
                          <label style={lbl}>Camisa</label>
                          <input className="form-control" value={form.shirt_size} onChange={e => setField("shirt_size", e.target.value)} placeholder="M, G, GG"/>
                        </div>
                        <div>
                          <label style={lbl}>Calça</label>
                          <input type="number" className="form-control" value={form.pants_size} onChange={e => setField("pants_size", e.target.value)} placeholder="42"/>
                        </div>
                        <div>
                          <label style={lbl}>Calçado</label>
                          <input type="number" className="form-control" value={form.shoes_size} onChange={e => setField("shoes_size", e.target.value)} placeholder="40"/>
                        </div>
                      </div>
                    </div>
                  </div>

                  </div>

                  {/* ── COLUNA DIREITA: kit + primeira entrega ── */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Primeira entrega — kit pré-carregado + busca manual */}
                  {modo === "cadastro" && (
                    <div style={card}>
                      <div style={head}>
                        <IconPackage size={13} color="var(--brand)"/>
                        Registrar Primeira Entrega
                        <span style={{ color: "var(--text-muted)", fontWeight: 500, marginLeft: 4, fontSize: "0.68rem" }}>opcional</span>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
                          {kitItensForm.length > 0
                            ? "Informe o tamanho de cada item do kit. Itens sem tamanho ou sem estoque não serão entregues."
                            : "Registre já na admissão os uniformes entregues ao colaborador."}
                        </p>

                        {/* Kit pré-carregado do setor */}
                        {kitItensForm.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                            <label style={lbl}>Kit do setor — informe os tamanhos</label>
                            {kitItensForm.map((kItem, idx) => {
                              const temTamanho = kItem.tamanho.trim() !== "";
                              const vinculado = kItem.itemVinculado;
                              const semEstoque = temTamanho && !vinculado;
                              const estoqueBaixo = vinculado && vinculado.quantity < kItem.qtde;
                              return (
                                <div key={idx} style={{
                                  display: "grid", gridTemplateColumns: "1fr 80px 56px auto",
                                  gap: 8, alignItems: "center",
                                  padding: "8px 10px",
                                  border: `1px solid ${semEstoque ? "var(--danger)" : vinculado ? "var(--success)" : "var(--border)"}`,
                                  borderRadius: 6,
                                  background: semEstoque ? "var(--danger-subtle, #fff0f0)" : vinculado ? "var(--success-subtle, #f0fff4)" : "var(--surface-2)",
                                }}>
                                  {/* Nome + status */}
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: "0.76rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {kItem.nomeKit}
                                      {kItem.ca && <span style={{ marginLeft: 6, fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 400 }}>CA {kItem.ca}</span>}
                                    </div>
                                    <div style={{ fontSize: "0.65rem", marginTop: 2 }}>
                                      {semEstoque && <span style={{ color: "var(--danger)", fontWeight: 600 }}>❌ Não encontrado no estoque com este tamanho</span>}
                                      {vinculado && !estoqueBaixo && <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ {vinculado.quantity} em estoque</span>}
                                      {vinculado && estoqueBaixo && <span style={{ color: "var(--warning)", fontWeight: 600 }}>⚠ Apenas {vinculado.quantity} disponível</span>}
                                      {!temTamanho && <span style={{ color: "var(--text-muted)" }}>Digite o tamanho →</span>}
                                    </div>
                                  </div>
                                  {/* Tamanho — editável */}
                                  <input
                                    className="form-control"
                                    value={kItem.tamanho}
                                    onChange={e => atualizarTamanhoKit(idx, e.target.value)}
                                    onBlur={sincronizarEntrega}
                                    placeholder="Ex: G, 42"
                                    style={{ textAlign: "center", fontWeight: 700, fontSize: "0.78rem", padding: "4px 6px" }}
                                  />
                                  {/* Quantidade — fixada pelo kit, somente leitura */}
                                  <div style={{
                                    textAlign: "center", fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 800, fontSize: "0.82rem",
                                    padding: "4px 6px", borderRadius: 5,
                                    background: "var(--surface)", border: "1px solid var(--border)",
                                    color: "var(--text-primary)",
                                  }}>
                                    ×{kItem.qtde}
                                  </div>
                                  {/* Remover */}
                                  <button
                                    onClick={() => { setKitItensForm(prev => prev.filter((_, i) => i !== idx)); sincronizarEntrega(); }}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 2 }}
                                  >
                                    <IconX size={13}/>
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={sincronizarEntrega}
                              style={{ alignSelf: "flex-end", padding: "5px 14px", borderRadius: 6, border: "none", background: "var(--brand)", color: "#fff", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Atualizar Entrega
                            </button>
                          </div>
                        )}

                        {/* Busca manual para adicionar itens extras */}
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Adicionar item extra</label>
                          <div style={{ position: "relative" }}>
                            <input
                              ref={primeiroItemInputRef}
                              className="form-control"
                              value={primeiroItemSearch}
                              onChange={e => handlePrimeiroItemSearch(e.target.value)}
                              onKeyDown={e => {
                                if (filteredPrimeiroItem.length === 0) return;
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  setHighlightedIndex(i => Math.min(i + 1, filteredPrimeiroItem.length - 1));
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  setHighlightedIndex(i => Math.max(i - 1, 0));
                                } else if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (highlightedIndex >= 0) {
                                    selecionarPrimeiroItem(filteredPrimeiroItem[highlightedIndex]);
                                  }
                                } else if (e.key === "Escape") {
                                  setFilteredPrimeiroItem([]);
                                  setDropdownPos(null);
                                  setHighlightedIndex(-1);
                                }
                              }}
                              placeholder="Buscar e adicionar item..."
                              autoComplete="off"
                              style={{ paddingRight: 30, fontSize: "0.78rem" }}
                            />
                            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
                              <IconSearch size={13}/>
                            </div>
                          </div>
                        </div>

                        {/* Lista de itens adicionados manualmente + sincronizados do kit */}
                        {entregaItens.length > 0 && (
                          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={lbl}>Itens a entregar ({entregaItens.length})</label>
                            {entregaItens.map(({ item, qty }) => (
                              <div
                                key={item.id}
                                style={{
                                  display: "flex", alignItems: "center", gap: 8,
                                  padding: "7px 10px",
                                  background: "var(--brand-subtle)",
                                  border: "1px solid var(--brand)",
                                  borderRadius: 6,
                                }}
                              >
                                <span style={{ flex: 1, fontSize: "0.76rem", fontWeight: 600, color: "var(--text)" }}>
                                  {item.name}{item.size ? ` (${item.size})` : ""}
                                </span>
                                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", flexShrink: 0 }}>
                                  Disp: {item.quantity}
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  value={qty}
                                  onChange={e => atualizarEntregaQty(item.id, Number(e.target.value))}
                                  style={{
                                    width: 54, textAlign: "center",
                                    border: "1px solid var(--brand)",
                                    borderRadius: 5, padding: "2px 4px",
                                    fontSize: "0.78rem",
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 700,
                                    background: "transparent",
                                    color: "var(--text)",
                                  }}
                                />
                                <button
                                  onClick={() => removerEntregaItem(item.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 2, flexShrink: 0 }}
                                >
                                  <IconX size={13}/>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  </div>
                </div>
              )}

              {/* ── SAÍDAS ── */}
              {modo === "saidas" && (
                <div>
                  {saidas.length === 0 ? (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      <IconPackage size={32} color="var(--border)"/>
                      <p style={{ marginTop: 10 }}>Nenhuma saída registrada.</p>
                    </div>
                  ) : (
                    <div style={card}>
                      <table className="table table-striped" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Tipo</th>
                            <th style={{ textAlign: "center" }}>Qtd</th>
                            <th>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saidas.map((s: any) => (
                            <tr key={s.id}>
                              <td style={{ fontSize: "0.78rem", fontWeight: 600 }}>{s.item?.name || "—"}</td>
                              <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{s.item?.type || "—"}</td>
                              <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.78rem" }}>{s.quantity}</td>
                              <td style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(s.withdrawalDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer modal */}
            {(modo === "cadastro" || modo === "edicao") && (
              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0, background: "var(--surface-2)", borderRadius: "0 0 12px 12px" }}>
                <button onClick={closePanel} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer" }}>
                  Cancelar
                </button>
                {modo === "edicao" && (
                  <button onClick={() => handleExcluir(selected!.id!)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 7, border: "none", background: "var(--danger)", color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}>
                    <IconTrash size={13}/> Excluir
                  </button>
                )}
                <button
                  onClick={modo === "cadastro" ? handleCadastrar : handleAtualizar}
                  disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 20px", borderRadius: 7, border: "none", background: "var(--brand)", color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}
                >
                  {saving
                    ? <><span className="spinner-border spinner-border-sm"/>Salvando...</>
                    : <><IconCheckCircle size={13}/>{modo === "cadastro" ? "Cadastrar" : "Salvar Alterações"}</>
                  }
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ DROPDOWN PORTAL ══════════════ */}
      {filteredPrimeiroItem.length > 0 && dropdownPos && ReactDOM.createPortal(
        <ul
          ref={dropdownListRef}
          className="list-group"
          onMouseDown={e => e.preventDefault()}
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            borderRadius: 6,
            overflow: "hidden",
            margin: 0,
            padding: 0,
          }}
        >
          {filteredPrimeiroItem.map((item, index) => (
            <li
              key={item.id}
              onMouseDown={() => selecionarPrimeiroItem(item)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border)",
                backgroundColor: index === highlightedIndex ? "var(--brand)" : "var(--surface)",
                color: index === highlightedIndex ? "#fff" : "var(--text)",
                transition: "background-color 0.1s ease",
              }}
            >
              <span style={{ fontSize: "0.76rem", fontWeight: 600 }}>{item.name}</span>
              <span style={{
                fontSize: "0.7rem",
                fontFamily: "'JetBrains Mono', monospace",
                color: index === highlightedIndex ? "rgba(255,255,255,0.85)" : item.quantity > 0 ? "var(--success)" : "var(--danger)",
              }}>
                {item.quantity}
              </span>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
};

export default Funcionarios;