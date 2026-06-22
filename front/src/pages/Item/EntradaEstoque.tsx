import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { StockEntry } from "../../types/StockEntry";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";
import { SearchDropdown } from "../../components/SearchDropdown";
import { IconTrash } from "../../components/Icons";

const EntradaEstoque = () => {
    const [entries, setEntries]             = useState<StockEntry[]>([]);
    const [items, setItems]                 = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [loading, setLoading]             = useState(true);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [itemSearch, setItemSearch]       = useState("");
    const [quantity, setQuantity]           = useState<number>(0);
    const [entryDate, setEntryDate]         = useState(() => new Date().toISOString().split("T")[0]);
    const [supplier, setSupplier]           = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [notes, setNotes]                 = useState("");
    const [dateError, setDateError]         = useState("");

    useEffect(() => { fetchEntries(); fetchItems(); }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const res = await api.get("/getstockentries");
            setEntries(res.data);
        } catch (e) { console.log(e); }
        finally { setLoading(false); }
    };

    const fetchItems = async () => {
        try {
            const res = await api.get("/getitems");
            setItems(res.data);
        } catch (e) { console.log(e); }
    };

    // Ajuste 3: dropdown com tamanho visível
    const handleItemSearch = (value: string) => {
        setItemSearch(value.toUpperCase());
        setSelectedItemId(null);
        setFilteredItems(value.length > 0
            ? items.filter(i => i.name.toLowerCase().includes(value.toLowerCase()))
            : []);
    };

    const handleSelectItem = (item: Item) => {
        setSelectedItemId(item.id!);
        // Ajuste 2: exibe nome + tamanho no campo selecionado
        setItemSearch(item.size ? `${item.name} (${item.size})` : item.name);
        setFilteredItems([]);
    };

    // Ajuste 1: validação de data futura
    const handleDateChange = (value: string) => {
        const today = new Date().toISOString().split("T")[0];
        if (value > today) {
            setDateError("A data de entrada não pode ser uma data futura.");
        } else {
            setDateError("");
        }
        setEntryDate(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId) { window.alert("Selecione um item da lista!"); return; }
        if (quantity <= 0) { window.alert("Quantidade inválida!"); return; }
        // Ajuste 1: bloqueia submit com data futura
        const today = new Date().toISOString().split("T")[0];
        if (entryDate > today) {
            window.alert("A data de entrada não pode ser uma data futura.");
            return;
        }
        try {
            const res = await api.post("/stockentry", {
                itemId: selectedItemId, quantity,
                entryDate: new Date(entryDate).toISOString(),
                supplier: supplier || null,
                invoiceNumber: invoiceNumber || null,
                notes: notes || null,
            });
            if (res.data.success) {
                window.alert("Entrada registrada com sucesso!");
                setSelectedItemId(null); setItemSearch(""); setQuantity(0);
                setSupplier(""); setInvoiceNumber(""); setNotes(""); setDateError("");
                fetchEntries(); fetchItems();
            }
        } catch (error: any) {
            window.alert(error.response?.data?.error || "Erro ao registrar entrada.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Deseja excluir esta entrada?")) return;
        try {
            await api.delete(`/deletestockentry/${id}`);
            fetchEntries();
        } catch (e) { window.alert("Erro ao excluir."); }
    };

    const card: React.CSSProperties     = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" };
    const cardForm: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 };
    const head: React.CSSProperties     = { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", fontSize: "0.75rem", fontWeight: 700 };
    const lbl: React.CSSProperties      = { fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 5, display: "block" };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div className="spinner-border" role="status"/>
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                <h1 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 2px" }}>Entrada de Estoque</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.73rem", margin: 0 }}>Registre chegada de uniformes e EPIs</p>
            </div>

            {/* Formulário */}
            <div style={cardForm}>
                <div style={head}>Registrar Nova Entrada</div>
                <div style={{ padding: 20 }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={lbl}>Item</label>
                                {/* Ajuste 2+3: dropdown mostra nome + tamanho */}
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
                                                    {item.type}
                                                    {/* Ajuste 2: tamanho sempre visível */}
                                                    {item.size ? <span style={{ marginLeft: 6, fontWeight: 700, color: highlighted ? "#fff" : "var(--brand)" }}>TAM {item.size}</span> : ""}
                                                    {" · "}Estoque: {item.quantity}
                                                </div>
                                            </div>
                                            {item.size && (
                                                <span style={{ fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: highlighted ? "rgba(255,255,255,0.2)" : "var(--brand-subtle)", color: highlighted ? "#fff" : "var(--brand)", flexShrink: 0 }}>
                                                    {item.size}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                />
                            </div>
                            <div>
                                <label style={lbl}>Quantidade</label>
                                <input type="number" className="form-control" value={quantity || ""}
                                    onChange={e => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))} min={1}/>
                            </div>
                            <div>
                                <label style={lbl}>Data da Entrada</label>
                                {/* Ajuste 1: max=hoje, validação visual */}
                                <input
                                    type="date"
                                    className={`form-control ${dateError ? "is-invalid" : ""}`}
                                    value={entryDate}
                                    max={new Date().toISOString().split("T")[0]}
                                    onChange={e => handleDateChange(e.target.value)}
                                />
                                {dateError && (
                                    <div style={{ color: "var(--danger)", fontSize: "0.68rem", marginTop: 4, fontWeight: 600 }}>
                                        {dateError}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                            <div>
                                <label style={lbl}>Fornecedor</label>
                                <input type="text" className="form-control" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Opcional"/>
                            </div>
                            <div>
                                <label style={lbl}>Nota Fiscal</label>
                                <input type="text" className="form-control" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Opcional"/>
                            </div>
                            <div>
                                <label style={lbl}>Observações</label>
                                <input type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional"/>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button type="submit" className="btn btn-primary" style={{ padding: "8px 28px" }}
                                disabled={!!dateError}>
                                Registrar Entrada
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Histórico */}
            <div style={card}>
                <div style={head}>Histórico de Entradas</div>
                {entries.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Nenhuma entrada registrada.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table className="table table-striped" style={{ margin: 0 }}>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    {/* Ajuste 2: coluna tamanho no histórico */}
                                    <th>Tam.</th>
                                    <th>Tipo</th>
                                    <th>Setor</th>
                                    <th style={{ textAlign: "center" }}>Qtd</th>
                                    <th>Data</th><th>Fornecedor</th><th>NF</th><th>Obs</th>
                                    <th style={{ textAlign: "center" }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...entries].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()).map(entry => (
                                    <tr key={entry.id}>
                                        <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>{entry.item?.name || "—"}</td>
                                        <td style={{ fontSize: "0.76rem", color: "var(--brand)", fontWeight: 700 }}>{entry.item?.size || "—"}</td>
                                        <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{entry.item?.type || "—"}</td>
                                        <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{entry.item?.sector || "—"}</td>
                                        <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{entry.quantity}</td>
                                        <td style={{ fontSize: "0.76rem", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(entry.entryDate)}</td>
                                        <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{entry.supplier || "—"}</td>
                                        <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{entry.invoiceNumber || "—"}</td>
                                        <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{entry.notes || "—"}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <button onClick={() => handleDelete(entry.id!)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--danger)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", margin: "0 auto" }}>
                                                <IconTrash size={11}/> Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EntradaEstoque;