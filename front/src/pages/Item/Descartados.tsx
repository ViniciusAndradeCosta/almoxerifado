import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";
import { IconSearch, IconTrash, IconAlertTriangle } from "../../components/Icons";

interface DiscardedItem {
    id: number;
    itemId: number;
    quantity: number;
    reason: string;
    notes: string | null;
    discardedBy: string | null;
    discardDate: string;
    item: { name: string; type: string; sector: string; size: string };
}

const Descartados = () => {
    const [discards, setDiscards] = useState<DiscardedItem[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    // Formulário
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [itemSearch, setItemSearch] = useState("");
    const [quantity, setQuantity] = useState<number>(1);
    const [reason, setReason] = useState("DESGASTE");
    const [notes, setNotes] = useState("");
    const [discardedBy, setDiscardedBy] = useState("");
    const [discardDate, setDiscardDate] = useState(() => new Date().toISOString().split("T")[0]);

    // Filtros
    const [filtroMotivo, setFiltroMotivo] = useState("");
    const [filtroNome, setFiltroNome] = useState("");

    useEffect(() => {
        fetchDiscards();
        fetchItems();
    }, []);

    const fetchDiscards = async () => {
        try {
            setLoading(true);
            const res = await api.get("/getdiscarded");
            setDiscards(res.data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchItems = async () => {
        try {
            const res = await api.get("/getitems");
            setItems(res.data);
        } catch (error) {
            console.log(error);
        }
    };

    const handleItemSearch = (value: string) => {
        setItemSearch(value.toUpperCase());
        setSelectedItemId(null);
        if (value.length > 0) {
            const filtered = items.filter((item) =>
                item.name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredItems(filtered);
        } else {
            setFilteredItems([]);
        }
    };

    const handleSelectItem = (item: Item) => {
        setSelectedItemId(item.id!);
        setItemSearch(item.name);
        setFilteredItems([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedItemId) {
            window.alert("Selecione um item da lista!");
            return;
        }
        if (quantity <= 0) {
            window.alert("Quantidade inválida!");
            return;
        }

        try {
            const data = {
                itemId: selectedItemId,
                quantity,
                reason,
                notes: notes || null,
                discardedBy: discardedBy || null,
                discardDate: new Date(discardDate).toISOString(),
            };

            const res = await api.post("/discard", data);

            if (res.data.success) {
                window.alert("Descarte registrado com sucesso!");
                setSelectedItemId(null);
                setItemSearch("");
                setQuantity(1);
                setReason("DESGASTE");
                setNotes("");
                setDiscardedBy("");
                fetchDiscards();
                fetchItems();
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || "Erro ao registrar descarte.";
            window.alert(msg);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Deseja excluir este registro de descarte?")) return;

        try {
            await api.delete(`/deletediscard/${id}`);
            fetchDiscards();
        } catch (error) {
            console.log(error);
            window.alert("Erro ao excluir registro.");
        }
    };

    const getReasonLabel = (reason: string) => {
        const labels: { [key: string]: string } = {
            DESGASTE: "Desgaste",
            DANO: "Dano",
            EXTRAVIO: "Extravio",
            VENCIDO: "Vencido",
            OUTRO: "Outro",
        };
        return labels[reason] || reason;
    };

    const getReasonBadge = (reason: string) => {
        const badges: { [key: string]: string } = {
            DESGASTE: "var(--text-secondary)", // Cor mais neutra
            DANO: "var(--danger)",
            EXTRAVIO: "var(--warning)",
            VENCIDO: "var(--brand)",
            OUTRO: "var(--text-muted)",
        };
        return badges[reason] || "var(--text-secondary)";
    };

    // Filtros
    const filteredDiscards = discards.filter((d) => {
        if (filtroMotivo && d.reason !== filtroMotivo) return false;
        if (filtroNome && !d.item.name.toLowerCase().includes(filtroNome.toLowerCase())) return false;
        return true;
    });

    // Resumo
    const totalDescartado = filteredDiscards.reduce((acc, d) => acc + d.quantity, 0);
    const porMotivo: { [key: string]: number } = {};
    filteredDiscards.forEach((d) => {
        porMotivo[d.reason] = (porMotivo[d.reason] || 0) + d.quantity;
    });

    // === ESTILOS INLINE ===
    const cardStyle: React.CSSProperties = {
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 24
    };
    const headStyle: React.CSSProperties = {
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "14px 18px", 
        borderBottom: "1px solid var(--border)", background: "var(--surface-2)"
    };
    const lblStyle: React.CSSProperties = {
        fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", 
        color: "var(--text-secondary)", marginBottom: 5, display: "block"
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
                <div className="spinner-border text-primary" role="status" />
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 40 }}>
            
            {/* Header da Página */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <div>
                    <h1 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 2px" }}>Peças Descartadas</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.73rem", margin: 0 }}>
                        Controle e histórico de itens retirados definitivamente do estoque.
                    </p>
                </div>
            </div>

            {/* Linha de Métricas */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
                <div style={{ ...cardStyle, flex: 1, minWidth: 150, marginBottom: 0, padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Descartado</span>
                    <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--danger)", lineHeight: 1.2 }}>{totalDescartado}</span>
                </div>
                {Object.entries(porMotivo).map(([motivo, qty]) => (
                    <div key={motivo} style={{ ...cardStyle, flex: 1, minWidth: 120, marginBottom: 0, padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{getReasonLabel(motivo)}</span>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{qty}</span>
                    </div>
                ))}
            </div>

            {/* Formulário de Registro */}
            <div style={cardStyle}>
                <div style={headStyle}>
                    <div style={{ fontWeight: 800, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                        <IconAlertTriangle size={14} color="var(--danger)" />
                        Registrar Novo Descarte
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} style={{ padding: "16px 18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1.5fr", gap: 14, marginBottom: 14 }}>
                        {/* Item */}
                        <div style={{ position: "relative" }}>
                            <label style={lblStyle}>Item</label>
                            <input
                                type="text"
                                className="form-control"
                                value={itemSearch}
                                onChange={(e) => handleItemSearch(e.target.value)}
                                placeholder="Buscar item..."
                                autoComplete="off"
                                style={{ fontSize: "0.82rem" }}
                            />
                            {filteredItems.length > 0 && (
                                <ul className="list-group position-absolute w-100" style={{ zIndex: 1000, maxHeight: "200px", overflowY: "auto", marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                                    {filteredItems.map((item) => (
                                        <li
                                            key={item.id}
                                            className="list-group-item list-group-item-action"
                                            style={{ cursor: "pointer", fontSize: "0.8rem", padding: "8px 12px" }}
                                            onClick={() => handleSelectItem(item)}
                                        >
                                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Estoque atual: {item.quantity}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {/* Quantidade */}
                        <div>
                            <label style={lblStyle}>Quantidade</label>
                            <input
                                type="number"
                                className="form-control"
                                value={quantity || ""}
                                onChange={(e) => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))}
                                onFocus={(e) => { if (quantity === 0) e.target.value = ""; }}
                                min={1}
                                style={{ fontSize: "0.82rem" }}
                            />
                        </div>
                        {/* Motivo */}
                        <div>
                            <label style={lblStyle}>Motivo</label>
                            <select className="form-select" value={reason} onChange={(e) => setReason(e.target.value)} style={{ fontSize: "0.82rem" }}>
                                <option value="DESGASTE">Desgaste</option>
                                <option value="DANO">Dano</option>
                                <option value="EXTRAVIO">Extravio</option>
                                <option value="VENCIDO">Vencido</option>
                                <option value="OUTRO">Outro</option>
                            </select>
                        </div>
                        {/* Data */}
                        <div>
                            <label style={lblStyle}>Data</label>
                            <input
                                type="date"
                                className="form-control"
                                value={discardDate}
                                onChange={(e) => setDiscardDate(e.target.value)}
                                style={{ fontSize: "0.82rem" }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 3fr", gap: 14 }}>
                        <div>
                            <label style={lblStyle}>Responsável <span style={{ fontWeight: 400, textTransform: "lowercase" }}>(opcional)</span></label>
                            <input type="text" className="form-control" value={discardedBy} onChange={(e) => setDiscardedBy(e.target.value)} placeholder="Nome do responsável" style={{ fontSize: "0.82rem" }} />
                        </div>
                        <div>
                            <label style={lblStyle}>Observações <span style={{ fontWeight: 400, textTransform: "lowercase" }}>(opcional)</span></label>
                            <input type="text" className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes adicionais sobre o descarte" style={{ fontSize: "0.82rem" }} />
                        </div>
                    </div>

                    {/* Botão alinhado à direita num footer */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--border)" }}>
                        <button type="submit" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 24px", borderRadius: 7, border: "none", background: "var(--danger)", color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                            Registrar Descarte
                        </button>
                    </div>
                </form>
            </div>

            {/* Histórico / Tabela */}
            <div style={cardStyle}>
                
                {/* Header da Tabela COM FILTROS EMBUTIDOS */}
                <div style={{ ...headStyle, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.85rem" }}>
                        Histórico de Descartes
                    </div>
                    
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ position: "relative", width: 220 }}>
                            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
                                <IconSearch size={13}/>
                            </div>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Filtrar por item..."
                                value={filtroNome}
                                onChange={(e) => setFiltroNome(e.target.value)}
                                style={{ paddingLeft: 30, fontSize: "0.75rem", height: 32 }}
                            />
                        </div>
                        <select
                            className="form-select"
                            value={filtroMotivo}
                            onChange={(e) => setFiltroMotivo(e.target.value)}
                            style={{ fontSize: "0.75rem", width: 160, height: 32 }}
                        >
                            <option value="">Todos os motivos</option>
                            <option value="DESGASTE">Desgaste</option>
                            <option value="DANO">Dano</option>
                            <option value="EXTRAVIO">Extravio</option>
                            <option value="VENCIDO">Vencido</option>
                            <option value="OUTRO">Outro</option>
                        </select>
                    </div>
                </div>

                {filteredDiscards.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Nenhum descarte encontrado com estes filtros.
                    </div>
                ) : (
                    <table className="table table-hover" style={{ margin: 0 }}>
                        <thead style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                            <tr>
                                <th style={{ paddingLeft: 18 }}>Item</th>
                                <th>Tipo</th>
                                <th>Qtd</th>
                                <th>Motivo</th>
                                <th>Data</th>
                                <th>Responsável</th>
                                <th>Observações</th>
                                <th style={{ textAlign: "right", paddingRight: 18 }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDiscards.map((d) => (
                                <tr key={d.id}>
                                    <td style={{ paddingLeft: 18, fontSize: "0.78rem", fontWeight: 600 }}>{d.item.name}</td>
                                    <td style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{d.item.type}</td>
                                    <td style={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{d.quantity}</td>
                                    <td>
                                        <span style={{ 
                                            fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: 4, 
                                            background: `${getReasonBadge(d.reason)}20`, /* 20 é opacidade em hex */
                                            color: getReasonBadge(d.reason) 
                                        }}>
                                            {getReasonLabel(d.reason).toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(d.discardDate)}</td>
                                    <td style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>{d.discardedBy || "—"}</td>
                                    <td style={{ fontSize: "0.74rem", color: "var(--text-secondary)", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={d.notes || ""}>
                                        {d.notes || "—"}
                                    </td>
                                    <td style={{ textAlign: "right", paddingRight: 18 }}>
                                        <button
                                            onClick={() => handleDelete(d.id)}
                                            style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 4 }}
                                            title="Excluir Registro"
                                        >
                                            <IconTrash size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Descartados;