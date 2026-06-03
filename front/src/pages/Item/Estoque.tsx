import { useEffect, useState } from "react";
import Papa from 'papaparse';
import { Item } from "../../types/Item";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/useApi";

const Estoque: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [estoque, setEstoque] = useState<Item[]>([]);
    const [filtroName, setFiltroName] = useState(searchParams.get('name') || '');
    const [filtroType, setFiltroType] = useState(searchParams.get('type') || '');
    const [filtroSector, setFiltroSector] = useState(searchParams.get('sector') || '');
    const [sortOrder] = useState('asc');
    const navigate = useNavigate();
    
    const [uniqueTypes, setUniqueTypes] = useState<string[]>([]);
    const [uniqueSectors, setUniqueSectors] = useState<string[]>([]);
    
    const [showWithdrawals, setShowWithdrawals] = useState(false);
    const [selectedItemWithdrawals, setSelectedItemWithdrawals] = useState<any[]>([]);
    const [selectedItemName, setSelectedItemName] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    

    useEffect(() => {
        const params = new URLSearchParams();
        if (filtroName) params.set('name', filtroName);
        if (filtroType) params.set('type', filtroType);
        if (filtroSector) params.set('sector', filtroSector);
        setSearchParams(params);
        fetchItems();
    }, [filtroName, filtroType, filtroSector, setSearchParams]);
    
    
    const fetchItems = async () => {
        try {
            const res = await api.get(`/getitems?nocache=${Date.now()}`);
            setEstoque(res.data);

            const itemsList: Item[] = res.data || [];
            const types = Array.from(new Set(
                itemsList
                    .map((i) => (i.type || '').trim())
                    .filter((t) => t && t.length > 0)
            ));
            const sectors = Array.from(new Set(
                itemsList
                    .map((i) => (i.sector || '').trim())
                    .filter((s) => s && s.length > 0)
            ));
            setUniqueTypes(types);
            setUniqueSectors(sectors);
        } catch (error) {
            console.log(error);
        }
    };

    const handleFilterNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFiltroName(event.target.value)
    }
    const handleFilterTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFiltroType(event.target.value)
    }
    const handleFilterSectorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFiltroSector(event.target.value)
    }

    const handleEditItem = (itemId: number) => {
        // Preservar filtros na navegação
        const params = new URLSearchParams();
        if (filtroName) params.set('name', filtroName);
        if (filtroType) params.set('type', filtroType);
        if (filtroSector) params.set('sector', filtroSector);
        
        navigate(`/item/${itemId}?${params.toString()}`);
    }

    const sortedEstoque = [...estoque].sort((a: Item, b: Item) => {
        const nameA = (a.name && a.name.toLowerCase()) ?? '';
        const nameB = (b.name && b.name.toLowerCase()) ?? '';

        const validateSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

        if (validateSortOrder === 'asc') {
            return nameA.localeCompare(nameB);
        } else {
            return nameB.localeCompare(nameA);
        }
    });

    const handleDeleteItem = async (id: number) => {
    try {
        // Busca as saídas vinculadas ao item
        const withdrawalsResponse = await api.get(`/getwithdrawalsbyitem/${id}`);
        const withdrawals = withdrawalsResponse.data || [];

        if (withdrawals.length > 0) {
            // Item tem saídas vinculadas
            const confirmDelete = window.confirm(
                `Este item possui ${withdrawals.length} saída(s) vinculada(s).\n\n` +
                `Excluí-lo irá apagar TAMBÉM todas essas saídas do histórico.\n\n` +
                `Deseja realmente excluir o item e suas saídas?`
            );

            if (!confirmDelete) return;

            await api.delete(`/deleteitemwithwithdrawals/${id}`);
        } else {
            // Item sem saídas, exclusão simples
            const confirmDelete = window.confirm('Deseja realmente excluir este item?');

            if (!confirmDelete) return;

            await api.delete(`/item/${id}`);
        }

        fetchItems();
    } catch (error) {
        console.log(error);
        window.alert('Erro ao excluir o item.');
    }
}

    const [itemName, setItemName] = useState('');
    const [itemQuantity, setItemQuantity] = useState(0);
    const [itemType, setItemType] = useState('');
    const [itemSector, setItemSector] = useState('');
    const [itemEan, setItemEan] = useState('');
    const [itemSize, setItemSize] = useState('');


    const handleCreateItem = async () => {
        try {
            const verifyItem = estoque.find((item: Item) => item.name === itemName);
            if (verifyItem) {
                window.alert('Item já cadastrado!');
                return;
            }
            const data = {
                name: itemName,
                quantity: itemQuantity,
                type: itemType,
                sector: itemSector,
                ean: itemEan,
                size: itemSize
            }
            await api.post('/item', data);
            fetchItems();
            window.alert('Item cadastrado com sucesso!');
            setItemName('');
            setItemQuantity(0);
            setItemType('');
            setItemSector('');
            setItemEan('');
            setItemSize('');
        } catch (error) {
            console.log(error);
            window.alert('Erro ao cadastrar item!');
        }
    }

    const handleExportCSV = () => {
        // Extract only the needed columns
        const csvData = estoque.map(({ name, quantity, type, sector, size, ean }) => ({
            NOME: name,
            QUANTIDADE: quantity,
            TIPO: type,
            SETOR: sector,
            TAMANHO: size,
            EAN: ean
        }));

        // Create CSV string manually
        const csv = Papa.unparse(csvData, {
            columns: ['NOME', 'QUANTIDADE', 'TIPO', 'SETOR', 'TAMANHO', 'EAN'],
            delimiter: ';',
        });

        const csvBlob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });

        // Create a link and trigger a click to download the file
        const csvURL = window.URL.createObjectURL(csvBlob);
        const tempLink = document.createElement('a');
        tempLink.href = csvURL;
        tempLink.setAttribute('download', 'estoque.csv');
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
    }

    const handleItemNameClick = async (itemId: number, itemName: string) => {
        try {
            const response = await api.get(`/getwithdrawalsbyitem/${itemId}`);
            setSelectedItemWithdrawals(response.data);
            setSelectedItemName(itemName);
            setSelectedItemId(itemId);
            setShowWithdrawals(true);
        } catch (error) {
            console.log(error);
        }
    };

    const closeWithdrawalsModal = () => {
        setShowWithdrawals(false);
        setSelectedItemWithdrawals([]);
        setSelectedItemName('');
        setSelectedItemId(null);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const handleDeleteItemWithWithdrawals = async () => {
        if (!selectedItemId) return;

        const confirmDelete = window.confirm(
            `Deseja realmente excluir o item "${selectedItemName}" e todas as suas saídas? Esta ação não pode ser desfeita.`
        );

        if (!confirmDelete) {
            return;
        }

        try {
            await api.delete(`/deleteitemwithwithdrawals/${selectedItemId}`);
            window.alert('Item e todas as suas saídas foram deletados com sucesso!');
            closeWithdrawalsModal();
            fetchItems(); // Recarregar a lista de itens
        } catch (error) {
            console.log(error);
            window.alert('Erro ao deletar o item. Tente novamente.');
        }
    };

    return (
        <div className="container">
            <div className="row g-3 mt-3 border rounded p-4">
                <h1 className="text-center m-0">Cadastrar Item</h1>
                <div className="col-sm-6">
                    <label htmlFor="name" className="form-label">Nome</label>
                    <input type="text" className="form-control" id="name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
                </div>
                <div className="col-sm-3">
                    <label htmlFor="type" className="form-label">Tipo</label>
                    <input type="text" className="form-control" id="type" value={itemType} onChange={(e) => setItemType(e.target.value)} list="type-list" autoComplete="off"/>
                    <datalist id="type-list">
                        {uniqueTypes.map((t) => (
                            <option key={t} value={t} />
                        ))}
                    </datalist>
                </div>
                <div className="col-sm-3">
                    <label htmlFor="sector" className="form-label">Setor</label>
                    <input type="text" className="form-control" id="sector" value={itemSector} onChange={(e) => setItemSector(e.target.value)} list="sector-list" autoComplete="off"/>
                    <datalist id="sector-list">
                        {uniqueSectors.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                </div>
                <div className="col-sm-2">
                    <label htmlFor="quantity" className="form-label">Quantidade</label>
                    <input type="number" className="form-control" id="quantity" value={itemQuantity} onChange={(e) => setItemQuantity(parseInt(e.target.value))} />
                </div>
                <div className="col-sm-2">
                    <label htmlFor="size" className="form-label">Tamanho (Se tiver)</label>
                    <input type="text" className="form-control" id="size" value={itemSize} onChange={(e) => setItemSize(e.target.value)} />
                </div>
                <div className="col">
                    <label htmlFor="ean" className="form-label">Código de barras (se tiver)</label>
                    <input type="text" className="form-control" id="ean" value={itemEan} onChange={(e) => setItemEan(e.target.value)} />
                </div>
                <div className="col-sm-1 align-self-end">
                    <button type="button" className="btn btn-primary" onClick={handleCreateItem}>Cadastrar</button>
                </div>
            </div>

            <div className="mt-3 row justify-content-center">
                <h1 className="text-center my-3">Estoque</h1>
                <div className="row gap-5 mb-4">
                    <input type="text" className="form-control col" placeholder="Filtrar por nome" onChange={handleFilterNameChange} />
                    <input type="text" className="form-control col" placeholder="Filtrar por tipo" onChange={handleFilterTypeChange} />
                    <input type="text" className="form-control col" placeholder="Filtrar por setor" onChange={handleFilterSectorChange} />
                </div>
                <div style={{ height: '600px' }}>
                    <div className="h-100 overflow-y-auto border ">
                        <table className="table table-striped table-bordered table-hover m-0">
                            <thead>
                                <tr>
                                    <th className="col">Nome</th>
                                    <th className="col">EAN</th>
                                    <th className="col">Setor</th>
                                    <th className="col">Tipo</th>
                                    <th className="col" style={{ width: "95px"}}>Tamanho</th>
                                    <th className="col">Quantidade</th>
                                    <th className="col" style={{ width: "175px"}}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/*Filter by name, type and sector*/}
                                {sortedEstoque.filter((item: Item) => item.name.toLowerCase().includes(filtroName.toLowerCase()) &&
                                    item.type.toLowerCase().includes(filtroType.toLowerCase()) &&
                                    item.sector.toLowerCase().includes(filtroSector.toLowerCase()))
                                    .map((item: Item) => (
                                        <tr key={item.id} className="align-middle">
                                            <td>
                                                <button 
                                                    className="btn btn-link p-0 text-decoration-none" 
                                                    onClick={() => handleItemNameClick(item.id ?? 0, item.name)}
                                                    style={{ border: 'none', background: 'none', color: '#0d6efd' }}
                                                >
                                                    {item.name}
                                                </button>
                                            </td>
                                            <td>{item.ean}</td>
                                            <td>{item.sector}</td>
                                            <td>{item.type}</td>
                                            <td className="text-center">{item.size}</td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td>
                                                <button className="btn btn-primary me-3" onClick={() => handleEditItem(item.id ?? 0)}>Editar</button>
                                                <button className="btn btn-danger" onClick={() => handleDeleteItem(item.id ?? 0)}>Excluir</button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="d-flex justify-content-evenly text-center">
                <div className='border rounded p-3 m-3'>
                    <h4>Fazer o Download do Estoque</h4>
                    <button className="btn btn-primary" onClick={handleExportCSV}>Exportar CSV</button>
                </div>
            </div>
            
            {showWithdrawals && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Saídas do Item: {selectedItemName}</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={closeWithdrawalsModal}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {selectedItemWithdrawals.length === 0 ? (
                                    <p>Nenhuma saída encontrada para este item.</p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>Funcionário</th>
                                                    <th>Departamento</th>
                                                    <th>Quantidade</th>
                                                    <th>Data da Saída</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedItemWithdrawals.map((withdrawal: any) => (
                                                    <tr key={withdrawal.id}>
                                                        <td>{withdrawal.employee?.name || 'N/A'}</td>
                                                        <td>{withdrawal.employee?.department || 'N/A'}</td>
                                                        <td>{withdrawal.quantity}</td>
                                                        <td>{formatDate(withdrawal.withdrawalDate)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-danger me-2" 
                                    onClick={handleDeleteItemWithWithdrawals}
                                >
                                    Deletar Item e Todas as Saídas
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={closeWithdrawalsModal}
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Estoque;