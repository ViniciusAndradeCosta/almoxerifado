import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/useApi";
import Papa from "papaparse";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";
import { IconEdit, IconTrash, IconPlus, IconSearch, IconDownload, IconX, IconPackage } from "../../components/Icons";

const Estoque = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [estoque, setEstoque]           = useState<Item[]>([]);
  const [filtered, setFiltered]         = useState<Item[]>([]);
  const [loading, setLoading]           = useState(true);
  const [uniqueTypes, setUniqueTypes]   = useState<string[]>([]);
  const [uniqueSectors, setUniqueSectors] = useState<string[]>([]);

  // Filtros
  const [filtroName, setFiltroName]     = useState(searchParams.get("name") || "");
  const [filtroType, setFiltroType]     = useState(searchParams.get("type") || "");
  const [filtroSector, setFiltroSector] = useState(searchParams.get("sector") || "");

  // Novo item
  const [showForm, setShowForm]         = useState(false);
  const [itemName, setItemName]         = useState("");
  const [itemQuantity, setItemQuantity] = useState<number>(0);
  const [itemType, setItemType]         = useState("");
  const [itemSector, setItemSector]     = useState("");
  const [itemEan, setItemEan]           = useState("");
  const [itemSize, setItemSize]         = useState("");

  // Modal saídas
  const [showModal, setShowModal]       = useState(false);
  const [modalItem, setModalItem]       = useState<Item | null>(null);
  const [modalWithdrawals, setModalWithdrawals] = useState<any[]>([]);

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const f = estoque.filter(i =>
      i.name?.toLowerCase().includes(filtroName.toLowerCase()) &&
      i.type?.toLowerCase().includes(filtroType.toLowerCase()) &&
      i.sector?.toLowerCase().includes(filtroSector.toLowerCase())
    );
    setFiltered(f);
  }, [filtroName, filtroType, filtroSector, estoque]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get("/getitems");
      setEstoque(res.data);
      setFiltered(res.data);
      const types   = [...new Set(res.data.map((i: Item) => i.type).filter(Boolean))] as string[];
      const sectors = [...new Set(res.data.map((i: Item) => i.sector).filter(Boolean))] as string[];
      setUniqueTypes(types);
      setUniqueSectors(sectors);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const handleCreateItem = async () => {
    if (!itemName.trim()) { window.alert("Informe o nome do item."); return; }
    const exists = estoque.find(i => i.name === itemName);
    if (exists) { window.alert("Item já cadastrado!"); return; }
    try {
      await api.post("/item", { name: itemName, quantity: itemQuantity, type: itemType, sector: itemSector, ean: itemEan, size: itemSize });
      setItemName(""); setItemQuantity(0); setItemType(""); setItemSector(""); setItemEan(""); setItemSize("");
      setShowForm(false);
      fetchItems();
      window.alert("Item cadastrado com sucesso!");
    } catch (e) { window.alert("Erro ao cadastrar item."); }
  };

  const handleEdit = (itemId: number) => {
    const params = new URLSearchParams();
    if (filtroName) params.set("name", filtroName);
    if (filtroType) params.set("type", filtroType);
    if (filtroSector) params.set("sector", filtroSector);
    navigate(`/item/${itemId}?${params.toString()}`);
  };

  const handleDelete = async (id: number) => {
    try {
      const wRes = await api.get(`/getwithdrawalsbyitem/${id}`);
      const withdrawals = wRes.data || [];
      const msg = withdrawals.length > 0
        ? `Este item possui ${withdrawals.length} saída(s) vinculada(s). Excluir irá apagar todas elas também. Confirma?`
        : "Deseja realmente excluir este item?";
      if (!window.confirm(msg)) return;
      if (withdrawals.length > 0) await api.delete(`/deleteitemwithwithdrawals/${id}`);
      else await api.delete(`/item/${id}`);
      fetchItems();
    } catch (e) { window.alert("Erro ao excluir o item."); }
  };

  const handleItemClick = async (item: Item) => {
    try {
      const res = await api.get(`/getwithdrawalsbyitem/${item.id}`);
      setModalWithdrawals(res.data);
      setModalItem(item);
      setShowModal(true);
    } catch (e) { console.log(e); }
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(estoque.map(({ name, quantity, type, sector, size, ean }) => ({
      NOME: name, QUANTIDADE: quantity, TIPO: type, SETOR: sector, TAMANHO: size, EAN: ean
    })), { delimiter: ";" });
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "estoque.csv"; a.click();
  };

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
  };
  const head: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
    borderBottom: "1px solid var(--border)", background: "var(--surface-2)",
    fontSize: "0.75rem", fontWeight: 700,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 2px" }}>Estoque</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.73rem", margin: 0 }}>{filtered.length} itens cadastrados</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleExportCSV} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7,
            color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer",
          }}>
            <IconDownload size={14}/> Exportar CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            background: "var(--brand)", border: "none", borderRadius: 7,
            color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer",
          }}>
            <IconPlus size={14}/> Novo Item
          </button>
        </div>
      </div>

      {/* ── Formulário novo item (colapsável) ── */}
      {showForm && (
        <div style={card}>
          <div style={head}>
            <IconPackage size={14} color="var(--brand)"/> Cadastrar Novo Item
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label className="form-label">Nome</label>
                <input className="form-control" value={itemName} onChange={e => setItemName(e.target.value.toUpperCase())} placeholder="Ex: CAMISA POLO BRANCA"/>
              </div>
              <div>
                <label className="form-label">Tipo</label>
                <input className="form-control" value={itemType} onChange={e => setItemType(e.target.value.toUpperCase())} placeholder="Ex: UNIFORME" list="type-list" autoComplete="off"/>
                <datalist id="type-list">{uniqueTypes.map(t => <option key={t} value={t}/>)}</datalist>
              </div>
              <div>
                <label className="form-label">Setor</label>
                <input className="form-control" value={itemSector} onChange={e => setItemSector(e.target.value.toUpperCase())} placeholder="Ex: LIMPEZA" list="sector-list" autoComplete="off"/>
                <datalist id="sector-list">{uniqueSectors.map(s => <option key={s} value={s}/>)}</datalist>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label className="form-label">Quantidade</label>
                <input type="number" className="form-control" value={itemQuantity || ""} onChange={e => setItemQuantity(e.target.value === "" ? 0 : Number(e.target.value))} min={0}/>
              </div>
              <div>
                <label className="form-label">Tamanho</label>
                <input className="form-control" value={itemSize} onChange={e => setItemSize(e.target.value.toUpperCase())} placeholder="Ex: M, G, 42"/>
              </div>
              <div>
                <label className="form-label">Código de Barras (EAN)</label>
                <input className="form-control" value={itemEan} onChange={e => setItemEan(e.target.value)} placeholder="Opcional"/>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{
                padding: "7px 16px", borderRadius: 7, border: "1px solid var(--border)",
                background: "var(--surface-2)", color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              }}>
                Cancelar
              </button>
              <button onClick={handleCreateItem} style={{
                padding: "7px 20px", borderRadius: 7, border: "none",
                background: "var(--brand)", color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <IconPlus size={13}/> Cadastrar Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { placeholder: "Filtrar por nome...", value: filtroName, set: setFiltroName },
          { placeholder: "Filtrar por tipo...", value: filtroType, set: setFiltroType },
          { placeholder: "Filtrar por setor...", value: filtroSector, set: setFiltroSector },
        ].map(({ placeholder, value, set }) => (
          <div key={placeholder} style={{ position: "relative" }}>
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
              <IconSearch size={13}/>
            </div>
            <input className="form-control" value={value} onChange={e => set(e.target.value)}
              placeholder={placeholder} style={{ paddingRight: 32, fontSize: "0.8rem" }}/>
          </div>
        ))}
      </div>

      {/* ── Tabela ── */}
      <div style={card}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div className="spinner-border" role="status"/>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
            Nenhum item encontrado.
          </div>
        ) : (
          <table className="table table-striped" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Setor</th>
                <th>Tamanho</th>
                <th style={{ textAlign: "center" }}>Quantidade</th>
                <th>EAN</th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <button onClick={() => handleItemClick(item)} style={{
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      color: "var(--brand)", fontWeight: 600, fontSize: "0.82rem", textAlign: "left",
                    }}>
                      {item.name}
                    </button>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{item.type || "—"}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{item.sector || "—"}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{item.size || "—"}</td>
                  <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.82rem",
                    color: (item.quantity ?? 0) === 0 ? "var(--danger)" : (item.quantity ?? 0) <= 10 ? "var(--warning)" : "var(--text-primary)"
                  }}>
                    {item.quantity ?? 0}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>{item.ean || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button onClick={() => handleEdit(item.id!)} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 5, border: "none",
                        background: "#2563EB", color: "#fff",
                        fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                      }}>
                        <IconEdit size={12}/> Editar
                      </button>
                      <button onClick={() => handleDelete(item.id!)} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 5, border: "none",
                        background: "var(--danger)", color: "#fff",
                        fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                      }}>
                        <IconTrash size={12}/> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal de saídas do item ── */}
      {showModal && modalItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, width: "100%", maxWidth: 640, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-md)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{modalItem.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: 2 }}>
                  {modalItem.type} · {modalItem.sector} · Estoque: {modalItem.quantity}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <IconX size={18}/>
              </button>
            </div>
            <div style={{ overflow: "auto", flex: 1 }}>
              {modalWithdrawals.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Nenhuma saída registrada para este item.
                </div>
              ) : (
                <table className="table table-striped" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Funcionário</th>
                      <th>Departamento</th>
                      <th style={{ textAlign: "center" }}>Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalWithdrawals.map((w: any) => (
                      <tr key={w.id}>
                        <td style={{ fontSize: "0.78rem" }}>{formatDate(w.withdrawalDate)}</td>
                        <td style={{ fontSize: "0.78rem", fontWeight: 600 }}>{w.employee?.name || "—"}</td>
                        <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{w.employee?.department || "—"}</td>
                        <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.78rem" }}>{w.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <button onClick={() => handleEdit(modalItem.id!)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 16px",
                borderRadius: 7, border: "none", background: "#2563EB", color: "#fff",
                fontSize: "0.76rem", fontWeight: 700, cursor: "pointer",
              }}>
                <IconEdit size={13}/> Editar Item
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowModal(false)} style={{
                  padding: "7px 16px", borderRadius: 7, border: "1px solid var(--border)",
                  background: "var(--surface-2)", color: "var(--text-secondary)",
                  fontSize: "0.76rem", fontWeight: 600, cursor: "pointer",
                }}>
                  Fechar
                </button>
                <button onClick={async () => { await handleDelete(modalItem.id!); setShowModal(false); }} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 16px",
                  borderRadius: 7, border: "none", background: "var(--danger)", color: "#fff",
                  fontSize: "0.76rem", fontWeight: 700, cursor: "pointer",
                }}>
                  <IconTrash size={13}/> Excluir Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estoque;