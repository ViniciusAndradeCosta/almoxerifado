import { useEffect, useState } from "react";
import { AllWithdrawal } from "../../types/AllWithdrawal";
import api from "../../services/useApi";
import SortableTable from "../../components/SortedTable";
import { formatDate } from "../../utils/dateFunctions";
import { useNavigate } from "react-router-dom";
import { get } from "http";
import SortableTableLow from "../../components/SortedTableLow";
import Papa from 'papaparse'

const TodasSaidas = () => {
    const [allWithdrawals, setAllWithdrawals] = useState<AllWithdrawal[]>([]);
    const [filteredWithdrawals, setFilteredWithdrawals] = useState<AllWithdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    // Filtros
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [itemFilter, setItemFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const getCurrentPageData = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredWithdrawals.slice(startIndex, endIndex);
    }

    const navigate = useNavigate();

    const fetchAllWithdrawals = async () => {
        try {
            setLoading(true);
            const res = await api.get('/getallwithdrawals');

            const data = res.data;

            const formattedData = data.map((withdrawal: AllWithdrawal) => ({
                ...withdrawal,
                //withdrawalDate: formatDate(withdrawal.withdrawalDate),
                // Armazenar a data original para filtragem
                rawWithdrawalDate: withdrawal.withdrawalDate
            }));

            setAllWithdrawals(formattedData);
            setFilteredWithdrawals(formattedData);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: number) => {
        navigate(`/atualizarsaida/${id}`);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este registro?')) {
            try {
                await api.delete(`/deleteallwithdrawal/${id}`);
                alert('Registro excluído com sucesso!');
                // Atualizar a lista após exclusão
                fetchAllWithdrawals();
            } catch (error) {
                console.log(error);
                alert('Erro ao excluir o registro');
            }
        }
    };

    // Aplicar todos os filtros de uma vez
    const applyFilters = () => {
        setTableLoading(true);

        setTimeout(() => {
            let results = [...allWithdrawals];

            // Filtro por nome de funcionário
            if (employeeFilter) {
                results = results.filter(item =>
                    item.employeeName.toLowerCase().includes(employeeFilter.toLowerCase())
                );
            }

            // Filtro por nome do item
            if (itemFilter) {
                results = results.filter(item =>
                    item.itemName.toLowerCase().includes(itemFilter.toLowerCase())
                );
            }

            // Filtro por período (data)
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59); // Definir para o final do dia

                results = results.filter(item => {
                    const itemDate = new Date(item.withdrawalDate);
                    return itemDate >= start && itemDate <= end;
                });
            } else if (startDate) {
                const start = new Date(startDate);

                results = results.filter(item => {
                    const itemDate = new Date(item.withdrawalDate);
                    return itemDate >= start;
                });
            } else if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59); // Definir para o final do dia

                results = results.filter(item => {
                    const itemDate = new Date(item.withdrawalDate);
                    return itemDate <= end;
                });
            }
            setCurrentPage(1); // Resetar a página atual para 1 após aplicar os filtros
            setFilteredWithdrawals(results);
            setTableLoading(false);
        }); // Pequeno delay para mostrar o indicador de carregamento
    };

    // Limpar todos os filtros
    const clearFilters = () => {
        setEmployeeFilter("");
        setItemFilter("");
        setStartDate("");
        setEndDate("");
        setFilteredWithdrawals(allWithdrawals);
    };

    useEffect(() => {
        fetchAllWithdrawals();
    }, []);

    const columns = ['id', 'idWithdrawal', 'withdrawalDate', 'itemId', 'itemName', 'itemType', 'itemSector', 'itemSize', 'itemEan', 'quantity',
        'employeeName', 'employeeId', 'employeeRole', 'employeeCompany', 'employeeDepartment'];

    const columnDisplayNames = {
        id: 'ID',
        idWithdrawal: 'id saida',
        withdrawalDate: 'Data de Saída',
        itemId: 'Item ID',
        itemName: 'Nome do Item',
        itemType: 'Tipo do Item',
        itemSector: 'Setor do Item',
        itemSize: 'Tamanho do Item',
        itemEan: 'EAN do Item',
        quantity: 'Quantidade',
        employeeName: 'Nome do Funcionário',
        employeeId: 'Funcionário ID',
        employeeRole: 'Cargo do Funcionário',
        employeeCompany: 'Empresa do Funcionário',
        employeeDepartment: 'Departamento do Funcionário'
    };

    if (loading) {
        return (
            <div className="container-fluid d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                    <h4>Carregando dados...</h4>
                </div>
            </div>
        );
    }

    const handleExportAllWithdrawals = () => {
        // Extrai os dados relevantes para o CSV
        const csvData = allWithdrawals.map((withdrawal) => {
            // Converter data para formato dia/mês/ano
            const date = new Date(withdrawal.withdrawalDate);
            const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            
            return {
                ID: withdrawal.id,
                idWithdrawal: withdrawal.idWithdrawal,
                'Data de Saída': formattedDate,
                'Item ID': withdrawal.itemId,
                'Nome do Item': withdrawal.itemName,
                'Tipo do Item': withdrawal.itemType,
                'Setor do Item': withdrawal.itemSector,
                'Tamanho do Item': withdrawal.itemSize,
                'EAN do Item': withdrawal.itemEan,
                Quantidade: withdrawal.quantity,
                'Nome do Funcionário': withdrawal.employeeName,
                'Funcionário ID': withdrawal.employeeId,
                'Cargo do Funcionário': withdrawal.employeeRole,
                'Empresa do Funcionário': withdrawal.employeeCompany,
                'Departamento do Funcionário': withdrawal.employeeDepartment,
            };
        });

        const csv = Papa.unparse(csvData, {
            columns: [
                'ID',
                'Data de Saída',
                'Item ID',
                'Nome do Item',
                'Tipo do Item',
                'Setor do Item',
                'Tamanho do Item',
                'EAN do Item',
                'Quantidade',
                'Nome do Funcionário',
                'Funcionário ID',
                'Cargo do Funcionário',
                'Empresa do Funcionário',
                'Departamento do Funcionário'
            ],
            delimiter: ';',
        });

        const csvBlob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const csvURL = window.URL.createObjectURL(csvBlob);
        const tempLink = document.createElement('a');
        tempLink.href = csvURL;
        tempLink.setAttribute('download', 'saidas_almoxarifado.csv');
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
    };

    return (
        <div className="container-fluid mt-3">
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="mb-0">Filtros</h5>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-6 col-lg-3">
                            <label htmlFor="employeeFilter" className="form-label">Nome do Funcionário</label>
                            <input
                                type="text"
                                className="form-control"
                                id="employeeFilter"
                                value={employeeFilter}
                                onChange={(e) => setEmployeeFilter(e.target.value)}
                                placeholder="Buscar por funcionário"
                            />
                        </div>
                        <div className="col-md-6 col-lg-3">
                            <label htmlFor="itemFilter" className="form-label">Nome do Item</label>
                            <input
                                type="text"
                                className="form-control"
                                id="itemFilter"
                                value={itemFilter}
                                onChange={(e) => setItemFilter(e.target.value)}
                                placeholder="Buscar por item"
                            />
                        </div>
                        <div className="col-md-6 col-lg-3">
                            <label htmlFor="startDate" className="form-label">Data Inicial</label>
                            <input
                                type="date"
                                className="form-control"
                                id="startDate"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6 col-lg-3">
                            <label htmlFor="endDate" className="form-label">Data Final</label>
                            <input
                                type="date"
                                className="form-control"
                                id="endDate"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="row mt-3">
                        <div className="col-12 d-flex justify-content-end gap-2">
                            <button
                                className="btn btn-secondary"
                                onClick={clearFilters}
                            >
                                Limpar Filtros
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={applyFilters}
                                disabled={tableLoading}
                            >
                                {tableLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Filtrando...
                                    </>
                                ) : 'Aplicar Filtros'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {tableLoading ? (
                <div className="position-relative">
                    <div className="position-absolute bg-white bg-opacity-75 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 5 }}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Carregando...</span>
                        </div>
                    </div>
                    <SortableTableLow
                        data={getCurrentPageData()}
                        columns={columns}
                        columnDisplayNames={columnDisplayNames}
                        renderActions={(row) => (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(row.id as number)}
                                title="Excluir registro"
                            >
                                Excluir
                            </button>
                        )}
                    />
                </div>
            ) : (
                <SortableTableLow
                    data={getCurrentPageData()}
                    columns={columns}
                    columnDisplayNames={columnDisplayNames}
                    renderActions={(row) => (
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(row.id as number)}
                            title="Excluir registro"
                        >
                            Excluir
                        </button>
                    )}
                />
            )}

            <div className="mt-3">
                <p className="text-muted">Total de registros: {filteredWithdrawals.length}</p>
                {filteredWithdrawals.length === 0 && !loading && !tableLoading && (
                    <div className="alert alert-info">
                        Nenhum registro encontrado com os filtros aplicados.
                    </div>
                )}
            </div>
            <div className="d-flex justify-content-between align-items-center mt-3">
                <p className="text-muted">Mostrando {getCurrentPageData().length} de {filteredWithdrawals.length} registros</p>
                <nav>
                    <ul className="pagination">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                                Anterior
                            </button>
                        </li>
                        {Array.from({ length: Math.ceil(filteredWithdrawals.length / itemsPerPage) }, (_, i) => (
                            <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                                    {i + 1}
                                </button>
                            </li>
                        )).slice(Math.max(0, currentPage - 3), Math.min(currentPage + 2, Math.ceil(filteredWithdrawals.length / itemsPerPage)))}
                        <li className={`page-item ${currentPage === Math.ceil(filteredWithdrawals.length / itemsPerPage) ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(filteredWithdrawals.length / itemsPerPage)}>
                                Próximo
                            </button>
                        </li>
                    </ul>
                </nav>
                <div className="form-inline">
                    <label className="me-2">Itens por página:</label>
                    <select
                        className="form-select"
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>
            <div className="d-flex justify-content-evenly text-center">
                {

                    <div className="border rounded p-3 text-center">
                        <h4>Tirar relatório de consumo do almoxarifado</h4>
                        <button className="btn btn-primary" onClick={handleExportAllWithdrawals}>BAIXAR</button>
                    </div>

                }

            </div>
        </div>
    );
};

export default TodasSaidas;