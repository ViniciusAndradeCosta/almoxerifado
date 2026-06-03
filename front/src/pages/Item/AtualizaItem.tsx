import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Item } from "../../types/Item";

const AtualizaItem = () => {
	const { id } = useParams<{ id: string }>();
	const [searchParams] = useSearchParams();
	const [formData, setFormData] = useState<Item>({
		name: '',
		ean: '',
		quantity: 0,
		type: '',
		sector: '',
		size: '',
	});
	const [uniqueTypes, setUniqueTypes] = useState<string[]>([]);
	const [uniqueSectors, setUniqueSectors] = useState<string[]>([]);
	const navigate = useNavigate();

	const handleVoltarEstoque = () => {
		// Voltar para o estoque preservando os filtros
		const params = searchParams.toString();
		const url = params ? `/estoque?${params}` : '/estoque';
		navigate(url);
	};

	useEffect(() => {
		async function getItem() {
			try {
				const response = await api.get(`/item/${id}`);
				setFormData(response.data);
			} catch (error) {
				console.log(error);
			}
		}
		getItem();
	}, [id]);

	useEffect(() => {
		async function fetchItems() {
			try {
				const res = await api.get('/getitems');
				const itemsList: Item[] = res.data || [];
				const types = Array.from(new Set(
					itemsList.map(i => (i.type || '').trim()).filter(t => t)
				));
				const sectors = Array.from(new Set(
					itemsList.map(i => (i.sector || '').trim()).filter(s => s)
				));
				setUniqueTypes(types);
				setUniqueSectors(sectors);
			} catch (error) {
				console.log(error);
			}
		}
		fetchItems();
	}, []);


	const handleAtualizaItem = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		console.log(formData);

		try {
			await api.put(`/item/${id}`, formData);
			const params = searchParams.toString();
			const url = params ? `/estoque?${params}` : '/estoque';
			navigate(url);
		} catch (error) {
			console.log(error);
		}
	}

	return (
		<div className="container">
			<div className="row">
				<div className="col-12">
					<h1>Atualizar Item</h1>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={handleVoltarEstoque}
					>
						← Voltar ao Estoque
					</button>
				</div>
				<div className="col-12">
					<form onSubmit={handleAtualizaItem}>
						<div className="mb-3">
							<label htmlFor="name" className="form-label">Nome</label>
							<input type="text" className="form-control" id="name" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
						</div>
						<div className="mb-3">
							<label htmlFor="ean" className="form-label">EAN</label>
							<input type="text" className="form-control" id="ean" name="ean" value={formData.ean} onChange={(e) => setFormData({ ...formData, ean: e.target.value })} />
						</div>
						<div className="mb-3">
							<label htmlFor="quantity" className="form-label">Quantidade</label>
							<input type="number" className="form-control" id="quantity" name="quantity" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
						</div>
						<div className="mb-3">
							<label htmlFor="type" className="form-label">Tipo</label>
							<input type="text" className="form-control" id="type" name="type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} list="type-list" autoComplete="off" />
							<datalist id="type-list">
								{uniqueTypes.map((t) => (
									<option key={t} value={t} />
								))}
							</datalist>
						</div>
						<div className="mb-3">
							<label htmlFor="sector" className="form-label">Setor</label>
							<input type="text" className="form-control" id="sector" name="sector" value={formData.sector} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} list="sector-list" autoComplete="off" />
							<datalist id="sector-list">
								{uniqueSectors.map((s) => (
									<option key={s} value={s} />
								))}
							</datalist>
						</div>
						<div className="mb-3">
							<label htmlFor="size" className="form-label">Tamanho</label>
							<input type="text" className="form-control" id="size" name="size" value={formData.size} onChange={(e) => setFormData({
								...formData,
								size: e.target.value
							})} />
						</div>
						<button type="submit" className="btn btn-primary">Atualizar</button>
					</form>
				</div>
			</div>
		</div>
	);
}

export default AtualizaItem;