import React, { useEffect, useState } from "react";
import { Withdrawal } from "../../types/Withdrawal";
import { Employee } from "../../types/Employee";
import api from "../../services/useApi";
import { useNavigate, useParams } from "react-router-dom";
import { Item } from "../../types/Item";
import { getLocalDateISO } from "../../utils/dateFunctions";
import { formatDate } from "../../utils/dateFunctions";

const SaidaItens = () => {
	const [saidas, setSaidas] = useState<Withdrawal[]>([]);
	const [funcionario, setFuncionario] = useState<Employee | null>(null);
	const { id } = useParams<{ id: string }>();
	const [itemName, setItemName] = useState('');
	const [filteredItems, setFilteredItems] = useState<Item[]>([]);
	const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [loadingItems, setLoadingItems] = useState(false);
	const [items, setItems] = useState<Item[]>([])

	useEffect(() => {
		fetchSaidas();
		fetchFuncionario();
		fetchItems();
	}, []);

	const navigate = useNavigate();

	const fetchItems = async () => {
		try {
			const res = await api.get('/getitems');
			setItems(res.data);
		} catch (error) {
			console.log(error);
		}
	}

	const fetchSaidas = async () => {
		try {
			const res = await api.get(`/getitemsout/${id}`);
			setSaidas(res.data);
		} catch (error) {
			console.log(error);
		}
	}

	const fetchFuncionario = async () => {
		try {
			const resFunc = await api.get(`/employee/${id}`);
			setFuncionario(resFunc.data);
		} catch (error) {
			console.log(error);
		}
	}

	const handleCadastraSaida = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);

		if (!selectedItemId) {
			window.alert("O item não está cadastrado!");
			return;
		}

		// Buscar o item selecionado
		const selectedItem = filteredItems.find(item => item.id === selectedItemId);
		if (!selectedItem) {
			window.alert("Item selecionado não encontrado!");
			return;
		}

		// Validar funcionário
		if (!funcionario) {
			window.alert("Dados do funcionário não carregados!");
			return;
		}

		const quantity = parseInt(formData.get('quantity') as string);
		if (isNaN(quantity) || quantity <= 0) {
			window.alert("Quantidade inválida!");
			return;
		}

		const dataForGiveItem = {
			employeeId: parseInt(id as string),
			itemId: selectedItemId,
			quantity,
			withdrawalDate: getLocalDateISO(),
		};

		console.log('Dados para /giveitem:', dataForGiveItem);

		try {
			// Cadastrar saída em /giveitem
			const response = await api.post('/giveitem', dataForGiveItem);
			
			console.log('Resposta do servidor:', response.data);
			
			if (response.data.success) {
				window.alert(`Saída cadastrada com sucesso!\n\n${response.data.message}`);
			} else {
				window.alert(`Erro: ${response.data.error || 'Erro desconhecido'}`);
			}
			
			fetchSaidas();
		} catch (error: any) {
			console.error('Erro ao cadastrar saída:', error);
			
			let errorMessage = "Erro ao cadastrar saída!";
			
			if (error.response?.data?.error) {
				errorMessage = `Erro: ${error.response.data.error}`;
			} else if (error.response?.data?.message) {
				errorMessage = `Erro: ${error.response.data.message}`;
			} else if (error.message) {
				errorMessage = `Erro: ${error.message}`;
			}
			
			window.alert(errorMessage);
		}
	};

	const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = event.target;
		setItemName(value.toUpperCase());
		setLoadingItems(true);
		
		if (value.length > 0) {
            const lowercasedFilter = value.toLowerCase();
            const filtered = items.filter(item =>
                item.name.toLowerCase().includes(lowercasedFilter)
            );
            setFilteredItems(filtered);
        } else {
            setFilteredItems([]); // Limpa a lista se a busca estiver vazia
        }
		setLoadingItems(false);
	}

	const handleReturnItem = async (id: number) => {
		const itemId = id;
		const confirmReturn = window.confirm('Deseja realmente devolver este item?' + itemId);

		if (!confirmReturn) {
			return;
		}

		try {
			await api.delete(`/returnitemandaddquantity/${id}`);
			fetchSaidas();
		} catch (error) {
			console.log(error);
		}
	}

	const handleDeleteItem = async (id: number) => {
		const itemid = id;
		const confirmDelete = window.confirm('Deseja realmente excluir este item?' + itemid);

		if (!confirmDelete) {
			return;
		}

		try {
			await api.delete(`/returnitem/${id}`);
			fetchSaidas();
		} catch (error) {
			console.log(error);
		}
	}

	const handleDownloadFicha = async () => {
		try {
			const username = localStorage.getItem('name');
			const response = await api.get(`/downloadnewemployee/${id}`, {
				responseType: 'blob',
				headers: {
					'username': username
				}
			});

			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', 'funcionario.xlsx');
			document.body.appendChild(link);
			link.click();
		} catch (error) {
			console.error('Erro ao baixar a planilha:', error);
		}
	};

	const handleSelectItemFromModal = (item: Item) => {
		setItemName(item.name);
		setSelectedItemId(item.id ?? null);
		setShowModal(false);
	};

	return (
		<>
			{showModal && (
				<div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)' }}>
					<div className="modal-dialog modal-dialog-centered modal-lg">
						<div className="modal-content shadow">
							<div className="modal-header border-0">
								<h5 className="modal-title">Selecione um item</h5>
								<button type="button" className="btn-close" aria-label="Close" onClick={() => setShowModal(false)}></button>
							</div>
							<div className="modal-body">
								<input
									type="text"
									className="form-control mb-3"
									placeholder="Buscar item"
									value={itemName}
									onChange={handleInputChange}
									autoFocus
								/>
								<div style={{ maxHeight: 250, overflowY: 'auto' }}>
									{loadingItems ? (
										<div className="d-flex justify-content-center align-items-center py-4">
											<div className="spinner-border text-primary" role="status">
												<span className="visually-hidden">Carregando...</span>
											</div>
										</div>
									) : (
										filteredItems.length > 0 ? (
											filteredItems.map(item => (
												<div
													key={item.id}
													className="list-group-item list-group-item-action"
													style={{ cursor: 'pointer' }}
													onClick={() => handleSelectItemFromModal(item)}
												>
													{item.name}
												</div>
											))
										) : (
											<div className="text-muted text-center py-3">
												{items.length > 0 ? 'Nenhum item encontrado para esta busca' : 'Nenhum item cadastrado'}
											</div>
										)
									)}
								</div>
							</div>
							<div className="modal-footer border-0">
								<button className="btn btn-secondary" onClick={() => setShowModal(false)}>Fechar</button>
							</div>
						</div>
					</div>
				</div>
			)}
			<div className="container">
				<h1 className="m-3 text-center">Funcionario: {funcionario?.name}</h1>
				<div className="text-center mb-4">
					<button className="btn btn-primary" onClick={handleDownloadFicha}>Baixar Ficha</button>
				</div>
				<div className="border border rounded d-flex flex-column p-3 align-items-center gap-3">
					<h3>Cadastro de saída</h3>
					<form onSubmit={handleCadastraSaida} className="d-flex gap-5">
						<div className="form-floating d-flex align-items-center gap-2">
							<input
								type="text"
								className="form-control"
								id="floatingInput"
								placeholder="Selecione o item"
								value={itemName}
								readOnly
								style={{ background: '#f9f9f9', cursor: 'pointer' }}
								onClick={() => setShowModal(true)}
							/>
							<button type="button" className="btn btn-outline-primary" onClick={() => setShowModal(true)}>
								Buscar
							</button>
							<label htmlFor="floatingInput">Selecione o item</label>
						</div>
						<div className="form-floating">
							<input type="number"
								className="form-control"
								id="floatingQuantity"
								placeholder="Quantidade"
								name="quantity" />
							<label htmlFor="floatingQuantity">Digite a quantidade</label>
						</div>
						<button type="submit" className="btn btn-primary align-self-center">Cadastrar Saída</button>
					</form>
				</div>
				<h1 className="text-center m-3">Histórico de saída</h1>
				<div style={{ height: '600px' }}>
					<div className="h-100 overflow-y-auto">
						<table className="table table-striped table-bordered table-hover " style={{ width: '100%', borderCollapse: 'collapse', margin: '0' }}>
							<thead>
								<tr>
									<th scope="col">Nome</th>
									<th scope="col">Quantidade</th>
									<th scope="col">Data</th>
									<th scope="col">Entrega</th>
									<th scope="col">Entrega</th>
									<th scope="col">...</th>
								</tr>
							</thead>
							<tbody>
								{saidas
									.sort((a, b) => new Date(b.withdrawalDate).getTime() - new Date(a.withdrawalDate).getTime())
									.map((saida) => (
										<tr key={saida.id} className="align-middle">
											<td>{saida.item.name}</td>
											<td>{saida.quantity}</td>
											<td>{formatDate(saida.withdrawalDate)}</td>
											<td><button className="btn btn-success" onClick={() => handleReturnItem(saida.id)}>Devolver</button></td>
											<td><button className="btn btn-danger" onClick={() => handleDeleteItem(saida.id)}>Excluir</button></td>
											<td><button className="btn btn-primary" onClick={() => navigate(`/atualizarsaida/${saida.id}`)}>Atualizar</button></td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</>
	);
}

export default SaidaItens;
