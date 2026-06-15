import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { StockEntry } from "../../types/StockEntry";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";

const EntradaEstoque = () => {
    const [entries, setEntries] = useState<StockEntry[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    // Formulário
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [itemSearch, setItemSearch] = useState("");
    const [quantity, setQuantity] = useState<number>(0);
    const [entryDate, setEntryDate] = useState(() => {
        const now = new Date();
        return now.toISOString().split("T")[0];
    });
    const [supplier, setSupplier] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        fetchEntries();
        fetchItems();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const res = await api.get("/getstockentries");
            setEntries(res.data);
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
                entryDate: new Date(entryDate).toISOString(),
                supplier: supplier || null,
                invoiceNumber: invoiceNumber || null,
                notes: notes || null,
            };

            const res = await api.post("/stockentry", data);

            if (res.data.success) {
                window.alert("Entrada registrada com sucesso!");
                // Limpa o formulário
                setSelectedItemId(null);
                setItemSearch("");
                setQuantity(1);
                setSupplier("");
                setInvoiceNumber("");
                setNotes("");
                fetchEntries();
                fetchItems();
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || "Erro ao registrar entrada.";
            window.alert(msg);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Deseja realmente excluir esta entrada?")) return;

        try {
            await api.delete(`/deletestockentry/${id}`);
            window.alert("Entrada excluída com sucesso!");
            fetchEntries();
        } catch (error) {
            console.log(error);
            window.alert("Erro ao excluir entrada.");
        }
    };

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
            <h1 className="text-center mb-4">Entrada de Estoque</h1>

            {/* Formulário de entrada */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">Registrar Nova Entrada</h5>
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-6 position-relative">
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
                                                {item.name} — {item.type} — Estoque: {item.quantity}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="col-md-3">
                                <label htmlFor="quantity" className="form-label">Quantidade</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="quantity"
                                    value={quantity || ""}
                                    onChange={(e) => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))}
                                    min={1}
                                />
                            </div>
                            <div className="col-md-3">
                                <label htmlFor="entryDate" className="form-label">Data da Entrada</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="entryDate"
                                    value={entryDate}
                                    onChange={(e) => setEntryDate(e.target.value)}
                                />
                            </div>
                            <div className="col-md-4">
                                <label htmlFor="supplier" className="form-label">Fornecedor</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="supplier"
                                    value={supplier}
                                    onChange={(e) => setSupplier(e.target.value)}
                                    placeholder="Opcional"
                                />
                            </div>
                            <div className="col-md-4">
                                <label htmlFor="invoiceNumber" className="form-label">Nota Fiscal</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="invoiceNumber"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    placeholder="Opcional"
                                />
                            </div>
                            <div className="col-md-4">
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
                                <button type="submit" className="btn btn-success col-3">Registrar Entrada</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Tabela de entradas */}
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Histórico de Entradas</h5>
                    {entries.length === 0 ? (
                        <p>Nenhuma entrada registrada.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Item</th>
                                        <th>Tipo</th>
                                        <th>Setor</th>
                                        <th>Quantidade</th>
                                        <th>Data</th>
                                        <th>Fornecedor</th>
                                        <th>Nota Fiscal</th>
                                        <th>Observações</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((entry) => (
                                        <tr key={entry.id}>
                                            <td>{entry.id}</td>
                                            <td>{entry.item?.name || "—"}</td>
                                            <td>{entry.item?.type || "—"}</td>
                                            <td>{entry.item?.sector || "—"}</td>
                                            <td>{entry.quantity}</td>
                                            <td>{formatDate(entry.entryDate)}</td>
                                            <td>{entry.supplier || "—"}</td>
                                            <td>{entry.invoiceNumber || "—"}</td>
                                            <td>{entry.notes || "—"}</td>
                                            <td>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(entry.id!)}
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

export default EntradaEstoque;