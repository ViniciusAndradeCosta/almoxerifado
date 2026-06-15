import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";

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
            window.alert("Registro excluído!");
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
            DESGASTE: "bg-secondary",
            DANO: "bg-danger",
            EXTRAVIO: "bg-warning text-dark",
            VENCIDO: "bg-info text-dark",
            OUTRO: "bg-dark",
        };
        return badges[reason] || "bg-secondary";
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

    if (loading) {
        return (
            <div className="container d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                    <h4>Carregando dados...</h4>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-3">
            <h1 className="text-center mb-4">Peças Descartadas</h1>

            {/* Formulário de descarte */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">Registrar Descarte</h5>
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-4 position-relative">
                                <label htmlFor="itemSearch" className="form-label">Item</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="itemSearch"
                                    value={itemSearch}
                                    onChange={(e) => handleItemSearch(e.target.value)}
                                    placeholder="Digite o nome do item..."
                                    autoComplete="off"
                                />
                                {filteredItems.length > 0 && (
                                    <ul className="list-group position-absolute w-100" style={{ zIndex: 1000, maxHeight: "200px", overflowY: "auto" }}>
                                        {filteredItems.map((item) => (
                                            <li
                                                key={item.id}
                                                className="list-group-item list-group-item-action"
                                                style={{ cursor: "pointer" }}
                                                onClick={() => handleSelectItem(item)}
                                            >
                                                {item.name} — Estoque: {item.quantity}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="col-md-2">
                                <label htmlFor="quantity" className="form-label">Quantidade</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="quantity"
                                    value={quantity || ""}
                                    onChange={(e) => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))}
                                    onFocus={(e) => { if (quantity === 0) e.target.value = ""; }}
                                    min={1}
                                />
                            </div>
                            <div className="col-md-3">
                                <label htmlFor="reason" className="form-label">Motivo</label>
                                <select
                                    className="form-select"
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                >
                                    <option value="DESGASTE">Desgaste</option>
                                    <option value="DANO">Dano</option>
                                    <option value="EXTRAVIO">Extravio</option>
                                    <option value="VENCIDO">Vencido</option>
                                    <option value="OUTRO">Outro</option>
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label htmlFor="discardDate" className="form-label">Data</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="discardDate"
                                    value={discardDate}
                                    onChange={(e) => setDiscardDate(e.target.value)}
                                />
                            </div>
                            <div className="col-md-4">
                                <label htmlFor="discardedBy" className="form-label">Responsável</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="discardedBy"
                                    value={discardedBy}
                                    onChange={(e) => setDiscardedBy(e.target.value)}
                                    placeholder="Opcional"
                                />
                            </div>
                            <div className="col-md-8">
                                <label htmlFor="notes" className="form-label">Observações</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Opcional"
                                />
                            </div>
                            <div className="col-12 text-center">
                                <button type="submit" className="btn btn-danger col-3">Registrar Descarte</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Resumo */}
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="text-muted">Total Descartado</h6>
                            <h3 className="text-danger">{totalDescartado}</h3>
                        </div>
                    </div>
                </div>
                {Object.entries(porMotivo).map(([motivo, qty]) => (
                    <div className="col-md-3" key={motivo}>
                        <div className="card text-center">
                            <div className="card-body">
                                <h6 className="text-muted">{getReasonLabel(motivo)}</h6>
                                <h3>{qty}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="row g-3 mb-3">
                <div className="col-md-4">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Filtrar por nome do item..."
                        value={filtroNome}
                        onChange={(e) => setFiltroNome(e.target.value)}
                    />
                </div>
                <div className="col-md-3">
                    <select
                        className="form-select"
                        value={filtroMotivo}
                        onChange={(e) => setFiltroMotivo(e.target.value)}
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

            {/* Tabela */}
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Histórico de Descartes</h5>
                    {filteredDiscards.length === 0 ? (
                        <p>Nenhum descarte registrado.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Item</th>
                                        <th>Tipo</th>
                                        <th>Setor</th>
                                        <th>Qtd</th>
                                        <th>Motivo</th>
                                        <th>Data</th>
                                        <th>Responsável</th>
                                        <th>Observações</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDiscards.map((d) => (
                                        <tr key={d.id}>
                                            <td>{d.id}</td>
                                            <td>{d.item.name}</td>
                                            <td>{d.item.type}</td>
                                            <td>{d.item.sector}</td>
                                            <td>{d.quantity}</td>
                                            <td>
                                                <span className={`badge ${getReasonBadge(d.reason)}`}>
                                                    {getReasonLabel(d.reason)}
                                                </span>
                                            </td>
                                            <td>{formatDate(d.discardDate)}</td>
                                            <td>{d.discardedBy || "—"}</td>
                                            <td>{d.notes || "—"}</td>
                                            <td>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(d.id)}
                                                >
                                                    Excluir
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
        </div>
    );
};

export default Descartados;