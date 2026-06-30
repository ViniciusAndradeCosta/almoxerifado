import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";
import { matchPrefixo } from "../../utils/search";
import { SearchDropdown } from "../../components/SearchDropdown";

interface LaundryRecord {
    id: number;
    itemId: number;
    quantity: number;
    status: string;
    sendDate: string;
    expectedReturn: string | null;
    returnDate: string | null;
    laundryName: string | null;
    sentBy: string | null;
    notes: string | null;
    atrasado?: boolean;
    diasNaLavanderia?: number;
    item: { name: string; type: string; sector: string; size: string };
}

const lbl: React.CSSProperties = {
    fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 5, display: "block"
};

const Lavanderia = () => {
    const [activeTab, setActiveTab] = useState<"enviar" | "pendentes" | "historico">("pendentes");
    const [pendentes, setPendentes] = useState<LaundryRecord[]>([]);
    const [historico, setHistorico] = useState<LaundryRecord[]>([]);
    const [items, setItems]         = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [loading, setLoading]     = useState(true);

    // Formulário envio
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [itemSearch, setItemSearch] = useState("");
    const [quantity, setQuantity]     = useState<number>(0);
    const [sendDate, setSendDate]     = useState(() => new Date().toISOString().split("T")[0]);
    const [expectedReturn, setExpectedReturn] = useState("");
    const [sentBy, setSentBy]         = useState("");
    const [notes, setNotes]           = useState("");
    const [tipoEnvio, setTipoEnvio]   = useState("ESTOQUE");
    // Ajuste 4: campo de nome do funcionário
    const [nomeFuncionario, setNomeFuncionario] = useState("");

    // Modal retorno
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnRecord, setReturnRecord]       = useState<LaundryRecord | null>(null);
    const [returnQty, setReturnQty]             = useState<number>(0);
    const [showFaltantesModal, setShowFaltantesModal] = useState(false);
    const [faltamQtd, setFaltamQtd]             = useState(0);
    const [returnDate, setReturnDate]           = useState(() => new Date().toISOString().split("T")[0]);
    const [returnNotes, setReturnNotes]         = useState("");

    // Resumo
    const [totalPecas, setTotalPecas]           = useState(0);
    const [totalAtrasados, setTotalAtrasados]   = useState(0);

    const [funcionarios, setFuncionarios]               = useState<{id: number; name: string; role: string; department: string}[]>([]);
    const [filteredFuncs, setFilteredFuncs]             = useState<{id: number; name: string; role: string; department: string}[]>([]);
    const [showFuncDropdown, setShowFuncDropdown]       = useState(false);
    const [highlightedFuncIndex, setHighlightedFuncIndex] = useState(-1);

    useEffect(() => {
        fetchPendentes();
        fetchHistorico();
        fetchItems();
        fetchFuncionarios();
    }, []);

    const fetchPendentes = async () => {
        try {
            setLoading(true);
            const res = await api.get("/laundry/pending");
            setPendentes(res.data.registros || []);
            setTotalPecas(res.data.totalPecas || 0);
            setTotalAtrasados(res.data.totalAtrasados || 0);
        } catch (error) { console.log(error); }
        finally { setLoading(false); }
    };

    const fetchHistorico = async () => {
        try {
            const res = await api.get("/laundry/all");
            setHistorico(res.data.registros || []);
        } catch (error) { console.log(error); }
    };

    const fetchItems = async () => {
        try {
            const res = await api.get("/getitems");
            setItems(res.data);
        } catch (error) { console.log(error); }
    };

    const fetchFuncionarios = async () => {
    try {
        const res = await api.get("/getemployees");
        setFuncionarios(res.data || []);
    } catch (e) { console.log(e); }
    };

    const handleItemSearch = (value: string) => {
        setItemSearch(value.toUpperCase());
        setSelectedItemId(null);
        setFilteredItems(value.length > 0
            ? items.filter(item => matchPrefixo(item.name, value))
            : []);
    };

    const handleSelectItem = (item: Item) => {
        setSelectedItemId(item.id!);
        setItemSearch(item.size ? `${item.name} (${item.size})` : item.name);
        setFilteredItems([]);
    };

    const handleSend = async (e?: React.FormEvent | React.MouseEvent) => {
        e?.preventDefault();
        if (!selectedItemId) { window.alert("Selecione um item!"); return; }
        if (quantity <= 0)   { window.alert("Quantidade inválida!"); return; }
        // Ajuste 4: valida nome do funcionário quando tipo for FUNCIONARIO
        if (tipoEnvio === "FUNCIONARIO" && !nomeFuncionario.trim()) {
            window.alert("Informe o nome do funcionário responsável pelas peças.");
            return;
        }

        try {
            const data = {
                itemId: selectedItemId,
                quantity,
                sendDate: new Date(sendDate).toISOString(),
                expectedReturn: expectedReturn ? new Date(expectedReturn).toISOString() : null,
                // Ajuste 4: salva nome do funcionário no campo sentBy
                sentBy: tipoEnvio === "FUNCIONARIO" ? nomeFuncionario.trim() : (sentBy || null),
                notes: notes || null,
                tipo: tipoEnvio,
            };

            const res = await api.post("/laundry/send", data);

            if (res.data.success) {
                const msg = tipoEnvio === "ESTOQUE"
                    ? "Peças do estoque enviadas para a lavanderia (estoque atualizado)!"
                    : `Peças de ${nomeFuncionario} registradas para lavanderia (estoque não afetado).`;
                window.alert(msg);
                // Reset
                setSelectedItemId(null); setItemSearch(""); setQuantity(0);
                setExpectedReturn(""); setSentBy(""); setNotes("");
                setNomeFuncionario(""); // Ajuste 4: limpa o campo
                fetchPendentes(); fetchHistorico(); fetchItems();
                setActiveTab("pendentes");
            }
        } catch (error: any) {
            window.alert(error.response?.data?.error || "Erro ao enviar para lavanderia.");
        }
    };

    const handleOpenReturn = (record: LaundryRecord) => {
        setReturnRecord(record);
        setReturnQty(record.quantity);
        setReturnDate(new Date().toISOString().split("T")[0]);
        setReturnNotes("");
        setShowReturnModal(true);
    };

    // Valida e decide: se faltarem peças, abre o modal estilizado de escolha;
    // senão, registra o retorno direto.
    const handleReturn = () => {
        if (!returnRecord) return;
        if (returnQty <= 0) { window.alert("Quantidade inválida!"); return; }
        const faltam = returnRecord.quantity - returnQty;
        if (faltam > 0) {
            setFaltamQtd(faltam);
            setShowFaltantesModal(true);
        } else {
            executarRetorno(false);
        }
    };

    // Efetua o retorno na API. descartarFaltantes define o destino das peças
    // que não voltaram (descartar agora x manter pendentes para outra data).
    const executarRetorno = async (descartarFaltantes: boolean) => {
        if (!returnRecord) return;
        try {
            const res = await api.post(`/laundry/return/${returnRecord.id}`, {
                quantityReturned: returnQty,
                returnDate: new Date(returnDate).toISOString(),
                notes: returnNotes || null,
                descartarFaltantes,
            });
            if (res.data.success) {
                window.alert(res.data.message);
                setShowFaltantesModal(false);
                setShowReturnModal(false); setReturnRecord(null);
                fetchPendentes(); fetchHistorico(); fetchItems();
            }
        } catch (error: any) {
            window.alert(error.response?.data?.error || "Erro ao registrar retorno.");
        }
    };

    const getTipoLabel = (tipo: string | null) => {
        if (tipo === "ESTOQUE")     return "Estoque";
        if (tipo === "FUNCIONARIO") return "Funcionário";
        return tipo || "—";
    };
    const getTipoBadge = (tipo: string | null) => {
        if (tipo === "ESTOQUE")     return "bg-primary";
        if (tipo === "FUNCIONARIO") return "bg-secondary";
        return "bg-secondary";
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div className="spinner-border" role="status"/>
        </div>
    );

    const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" };
    const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", fontSize: "0.75rem", fontWeight: 700 };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Header */}
            <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                <h1 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 2px" }}>Controle de Lavanderia</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.73rem", margin: 0 }}>Gerencie o envio e retorno de peças para lavagem</p>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                    { label: "Lotes Pendentes",      value: pendentes.length, color: "var(--text-primary)" },
                    { label: "Peças na Lavanderia",  value: totalPecas,       color: "var(--info)" },
                    { label: "Atrasados",            value: totalAtrasados,   color: totalAtrasados > 0 ? "var(--danger)" : "var(--success)" },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ ...card, padding: "14px 18px" }}>
                        <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.6rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Abas */}
            <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
                {([
                    { id: "pendentes", label: `Pendentes${pendentes.length > 0 ? ` (${pendentes.length})` : ""}` },
                    { id: "enviar",    label: "Enviar para Lavanderia" },
                    { id: "historico", label: "Histórico" },
                ] as { id: "pendentes"|"enviar"|"historico", label: string }[]).map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        padding: "8px 16px", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                        borderBottom: activeTab === tab.id ? "2px solid var(--brand)" : "2px solid transparent",
                        color: activeTab === tab.id ? "var(--brand)" : "var(--text-secondary)",
                        background: "none",
                    }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* === ABA: PENDENTES === */}
            {activeTab === "pendentes" && (
                <div style={card}>
                    <div style={head}>Peças na Lavanderia</div>
                    {pendentes.length === 0 ? (
                        <div style={{ padding: 32, textAlign: "center", color: "var(--success)", fontSize: "0.82rem", fontWeight: 600 }}>
                            Nenhuma peça na lavanderia no momento.
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table className="table table-striped" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>ID</th><th>Item</th><th>Tam.</th><th>Tipo</th><th>Origem</th>
                                        <th>Funcionário</th>
                                        <th style={{ textAlign: "center" }}>Qtd</th>
                                        <th>Enviado em</th><th>Retorno Previsto</th><th>Dias</th><th>Status</th><th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendentes.map(r => (
                                        <tr key={r.id} style={r.atrasado ? { background: "var(--danger-subtle)" } : {}}>
                                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.74rem" }}>{r.id}</td>
                                            <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>{r.item.name}</td>
                                            <td style={{ fontSize: "0.76rem", color: "var(--brand)", fontWeight: 700 }}>{r.item.size || "—"}</td>
                                            <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{r.item.type}</td>
                                            <td>
                                                <span className={`badge ${getTipoBadge(r.laundryName)}`}>
                                                    {getTipoLabel(r.laundryName)}
                                                </span>
                                            </td>
                                            {/* Ajuste 4: mostra nome do funcionário na tabela */}
                                            <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                                                {r.laundryName === "FUNCIONARIO" ? (r.sentBy || "—") : "—"}
                                            </td>
                                            <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{r.quantity}</td>
                                            <td style={{ fontSize: "0.76rem", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(r.sendDate)}</td>
                                            <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{r.expectedReturn ? formatDate(r.expectedReturn) : "—"}</td>
                                            <td style={{ fontSize: "0.76rem", fontFamily: "'JetBrains Mono', monospace" }}>{r.diasNaLavanderia} dias</td>
                                            <td>
                                                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: r.atrasado ? "var(--danger-subtle)" : "var(--brand-subtle)", color: r.atrasado ? "var(--danger)" : "var(--brand)" }}>
                                                    {r.atrasado ? "Atrasado" : "Na Lavanderia"}
                                                </span>
                                            </td>
                                            <td>
                                                <button onClick={() => handleOpenReturn(r)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--success)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                                                    Registrar Retorno
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* === ABA: ENVIAR === */}
            {activeTab === "enviar" && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={head}>Enviar Peças para Lavanderia</div>
                    <div style={{ padding: 20 }}>

                        {/* Seletor de tipo */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                            <div>
                                <label style={lbl}>Origem das Peças</label>
                                <select className="form-select" value={tipoEnvio} onChange={e => { setTipoEnvio(e.target.value); setNomeFuncionario(""); }}>
                                    <option value="ESTOQUE">Estoque — sai do estoque temporariamente</option>
                                    <option value="FUNCIONARIO">Funcionário — não afeta o estoque</option>
                                </select>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-end" }}>
                                <div style={{
                                    padding: "10px 14px", borderRadius: 7, fontSize: "0.78rem", width: "100%",
                                    background: tipoEnvio === "ESTOQUE" ? "var(--info-subtle, #e0f0ff)" : "var(--surface-2)",
                                    border: `1px solid ${tipoEnvio === "ESTOQUE" ? "var(--info, #0d6efd)" : "var(--border)"}`,
                                    color: tipoEnvio === "ESTOQUE" ? "var(--info, #0d6efd)" : "var(--text-secondary)",
                                }}>
                                    {tipoEnvio === "ESTOQUE"
                                        ? "As peças serão retiradas do estoque e devolvidas no retorno."
                                        : "Registro apenas para controle. Estoque não será alterado."}
                                </div>
                            </div>
                        </div>

                        {/* Ajuste 4: campo de nome do funcionário aparece condicionalmente */}
                        {tipoEnvio === "FUNCIONARIO" && (
                            <div style={{ marginBottom: 16, padding: "14px 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
                                <label style={lbl}>
                                    Nome do Funcionário <span style={{ color: "var(--danger)", fontSize: "0.7rem" }}>* obrigatório</span>
                                </label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={nomeFuncionario}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setNomeFuncionario(val);
                                            setHighlightedFuncIndex(-1);
                                            if (val.length > 0) {
                                                const termo = val.toLowerCase().trim();
                                                const f = funcionarios.filter(f => {
                                                    const nome = f.name.toLowerCase();
                                                    return nome.startsWith(termo) ||
                                                    nome.split(" ").some(palavra => palavra.startsWith(termo));
                                                }).slice(0, 6);
                                                setFilteredFuncs(f);
                                                setShowFuncDropdown(f.length > 0);
                                            } else {
                                                setFilteredFuncs([]);
                                                setShowFuncDropdown(false);
                                            }
                                        }}
                                        onKeyDown={e => {
                                            if (!showFuncDropdown || filteredFuncs.length === 0) {
                                                if (e.key === "Escape") setShowFuncDropdown(false);
                                                return;
                                            }
                                            if (e.key === "ArrowDown") {
                                                e.preventDefault();
                                                setHighlightedFuncIndex(prev => Math.min(prev + 1, filteredFuncs.length - 1));
                                            } else if (e.key === "ArrowUp") {
                                                e.preventDefault();
                                                setHighlightedFuncIndex(prev => Math.max(prev - 1, 0));
                                            } else if (e.key === "Enter") {
                                                e.preventDefault();
                                                if (highlightedFuncIndex >= 0) {
                                                    const f = filteredFuncs[highlightedFuncIndex];
                                                    setNomeFuncionario(f.name);
                                                    setShowFuncDropdown(false);
                                                    setFilteredFuncs([]);
                                                    setHighlightedFuncIndex(-1);
                                                }
                                            } else if (e.key === "Escape") {
                                                setShowFuncDropdown(false);
                                                setHighlightedFuncIndex(-1);
                                            }
                                        }}
                                        placeholder="Digite o nome do funcionário..."
                                        autoComplete="off"
                                        autoFocus
                                    />
                                    {showFuncDropdown && filteredFuncs.length > 0 && (
                                        <ul style={{
                                            position: "absolute", width: "100%", zIndex: 30, marginTop: 4,
                                            padding: 0, listStyle: "none",
                                            background: "var(--surface)", border: "1px solid var(--border)",
                                            borderRadius: 6, overflow: "hidden",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                        }}>
                                            {filteredFuncs.map((f, idx) => (
                                                <li
                                                    key={f.id}
                                                    onMouseDown={e => {
                                                        e.preventDefault();
                                                        setNomeFuncionario(f.name);
                                                        setShowFuncDropdown(false);
                                                        setFilteredFuncs([]);
                                                        setHighlightedFuncIndex(-1);
                                                    }}
                                                    onMouseEnter={() => setHighlightedFuncIndex(idx)}
                                                    style={{
                                                        padding: "8px 12px", cursor: "pointer",
                                                        borderBottom: "1px solid var(--border)",
                                                        transition: "background 0.1s",
                                                        background: idx === highlightedFuncIndex ? "var(--brand)" : "transparent",
                                                        color: idx === highlightedFuncIndex ? "#fff" : "var(--text-primary)",
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 600, fontSize: "0.78rem" }}>{f.name}</div>
                                                    <div style={{ fontSize: "0.68rem", color: "inherit", opacity: 0.75 }}>
                                                        {f.role} · {f.department}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: "6px 0 0" }}>
                                    Funcionário responsável pelas peças sendo enviadas para lavagem.
                                </p>
                            </div>
                        )}

                        <div>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                                <div>
                                    <label style={lbl}>Item</label>
                                    <SearchDropdown
                                        value={itemSearch}
                                        onChange={handleItemSearch}
                                        onSelect={handleSelectItem}
                                        items={filteredItems}
                                        onClear={() => setFilteredItems([])}
                                        placeholder="Digite o nome do item..."
                                        getKey={i => i.id!}
                                        renderItem={(item, highlighted) => (
                                            <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: "0.78rem" }}>{item.name}</div>
                                                    <div style={{ fontSize: "0.68rem", color: highlighted ? "rgba(255,255,255,0.8)" : "var(--text-muted)" }}>
                                                        {item.type}{item.size ? ` · Tam. ${item.size}` : ""} · Estoque: {item.quantity}
                                                    </div>
                                                </div>
                                                {item.size && (
                                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: highlighted ? "rgba(255,255,255,0.2)" : "var(--brand-subtle)", color: highlighted ? "#fff" : "var(--brand)", flexShrink: 0 }}>
                                                        {item.size}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    />
                                </div>
                                <div>
                                    <label style={lbl}>Quantidade</label>
                                    <input type="number" className="form-control" value={quantity || ""} onChange={e => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))} min={1}/>
                                </div>
                                <div>
                                    <label style={lbl}>Data Envio</label>
                                    <input type="date" className="form-control" value={sendDate} onChange={e => setSendDate(e.target.value)}/>
                                </div>
                                <div>
                                    <label style={lbl}>Retorno Previsto</label>
                                    <input type="date" className="form-control" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)}/>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                                {tipoEnvio === "ESTOQUE" && (
                                    <div>
                                        <label style={lbl}>Enviado por <span style={{ fontWeight: 400, textTransform: "lowercase" }}>(opcional)</span></label>
                                        <input type="text" className="form-control" value={sentBy} onChange={e => setSentBy(e.target.value)} placeholder="Nome de quem realizou o envio"/>
                                    </div>
                                )}
                                <div style={{ gridColumn: tipoEnvio === "ESTOQUE" ? "auto" : "1 / -1" }}>
                                    <label style={lbl}>Observações <span style={{ fontWeight: 400, textTransform: "lowercase" }}>(opcional)</span></label>
                                    <input type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informações adicionais"/>
                                </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={(e) => handleSend(e as any)}
                                    className="btn btn-primary"
                                    style={{ padding: "8px 28px", position: "relative", zIndex: 1 }}
                                >
                                    Enviar para Lavanderia
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* === ABA: HISTÓRICO === */}
            {activeTab === "historico" && (
                <div style={card}>
                    <div style={head}>Histórico Completo</div>
                    {historico.length === 0 ? (
                        <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                            Nenhum registro encontrado.
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table className="table table-striped" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>ID</th><th>Item</th><th>Tam.</th><th>Origem</th>
                                        <th>Funcionário</th>
                                        <th style={{ textAlign: "center" }}>Qtd</th>
                                        <th>Status</th><th>Enviado em</th><th>Retornou em</th>
                                        <th>Enviado por</th><th>Observações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historico.map(r => (
                                        <tr key={r.id}>
                                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.74rem" }}>{r.id}</td>
                                            <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>{r.item.name}</td>
                                            <td style={{ fontSize: "0.76rem", color: "var(--brand)", fontWeight: 700 }}>{r.item.size || "—"}</td>
                                            <td>
                                                <span className={`badge ${getTipoBadge(r.laundryName)}`}>
                                                    {getTipoLabel(r.laundryName)}
                                                </span>
                                            </td>
                                            {/* Ajuste 4: nome do funcionário no histórico */}
                                            <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                                                {r.laundryName === "FUNCIONARIO" ? (r.sentBy || "—") : "—"}
                                            </td>
                                            <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{r.quantity}</td>
                                            <td>
                                                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: r.status === "RETORNADA" ? "var(--success-subtle)" : "var(--brand-subtle)", color: r.status === "RETORNADA" ? "var(--success)" : "var(--brand)" }}>
                                                    {r.status === "RETORNADA" ? "Retornada" : "Na Lavanderia"}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "0.74rem", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(r.sendDate)}</td>
                                            <td style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{r.returnDate ? formatDate(r.returnDate) : "—"}</td>
                                            <td style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                                                {r.laundryName === "FUNCIONARIO" ? "—" : (r.sentBy || "—")}
                                            </td>
                                            <td style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{r.notes || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de retorno */}
            {showReturnModal && returnRecord && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, width: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>
                                Retorno — {returnRecord.item.name} (Lote #{returnRecord.id})
                            </div>
                            <button onClick={() => setShowReturnModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem" }}>×</button>
                        </div>
                        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                            <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 7, fontSize: "0.78rem" }}>
                                <strong>{returnRecord.quantity} peças</strong> enviadas em {formatDate(returnRecord.sendDate)}
                                {" · "}
                                <span className={`badge ${getTipoBadge(returnRecord.laundryName)}`}>{getTipoLabel(returnRecord.laundryName)}</span>
                                {returnRecord.laundryName === "FUNCIONARIO" && returnRecord.sentBy && (
                                    <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>({returnRecord.sentBy})</span>
                                )}
                                {returnRecord.laundryName === "FUNCIONARIO" && (
                                    <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: "0.7rem" }}>Estoque não será alterado no retorno.</div>
                                )}
                            </div>
                            <div>
                                <label style={lbl}>Quantidade que Retornou</label>
                                <input type="number" className="form-control" value={returnQty || ""}
                                    onChange={e => setReturnQty(e.target.value === "" ? 0 : Number(e.target.value))}
                                    min={1} max={returnRecord.quantity}/>
                            </div>
                            <div>
                                <label style={lbl}>Data do Retorno</label>
                                <input type="date" className="form-control" value={returnDate} onChange={e => setReturnDate(e.target.value)}/>
                            </div>
                            <div>
                                <label style={lbl}>Observações <span style={{ fontWeight: 400, textTransform: "lowercase" }}>(opcional)</span></label>
                                <input type="text" className="form-control" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="Opcional"/>
                            </div>
                        </div>
                        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button onClick={() => setShowReturnModal(false)} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer" }}>
                                Cancelar
                            </button>
                            <button onClick={handleReturn} style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: "var(--success)", color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}>
                                Confirmar Retorno
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de escolha quando faltam peças no retorno */}
            {showFaltantesModal && returnRecord && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, width: 430, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontWeight: 800, fontSize: "0.9rem" }}>
                            Faltaram {faltamQtd} peça(s) no retorno
                        </div>
                        <div style={{ padding: "16px 20px 6px", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                            {faltamQtd} de {returnRecord.quantity} peça(s) não voltaram nesta data. O que deseja fazer com elas?
                        </div>
                        <div style={{ padding: "10px 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                            <button onClick={() => executarRetorno(false)}
                                style={{ textAlign: "left", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--success)", background: "var(--success-subtle, #eef9f1)", cursor: "pointer" }}>
                                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--success)" }}>Manter pendentes</div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>Ainda podem voltar em outra data (continuam na lavanderia).</div>
                            </button>
                            <button onClick={() => executarRetorno(true)}
                                style={{ textAlign: "left", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--danger)", background: "var(--danger-subtle, #fdeeee)", cursor: "pointer" }}>
                                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--danger)" }}>Descartar as {faltamQtd} peça(s)</div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>Consideradas perdidas; registra um descarte.</div>
                            </button>
                        </div>
                        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={() => setShowFaltantesModal(false)} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer" }}>
                                Voltar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lavanderia;