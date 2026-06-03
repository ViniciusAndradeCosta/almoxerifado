import { Employee } from "../../types/Employee";
import api from "../../services/useApi";
import { useNavigate } from "react-router-dom";
import { company } from "./EmployeeTypes";
import { useEffect, useState } from "react";

const CadastraFuncionario: React.FC = () => {
	const [ roles, setRoles ] = useState<string[]>([]);
	const [ departments, setDepartments ] = useState<string[]>([]);
	const navigate = useNavigate();

	const handleCadastraFuncionario = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);

		const admissionDate = formData.get('admissionDate') as string;
		let adjustedAdmissionDate = admissionDate ? new Date(admissionDate) : new Date(); // Se não houver data, use a data atual
		adjustedAdmissionDate.setHours(adjustedAdmissionDate.getHours()); // Adiciona uma hora à data

		const adjustedAdmissionDateISO = adjustedAdmissionDate.toISOString(); // Formata a data para ISO8601     

		const data: Employee = {
			name: formData.get('name') as string,
			company: formData.get('company') as string,
			role: formData.get('role') as string,
			department: formData.get('department') as string,
			admissionDate: adjustedAdmissionDateISO,
			shirt_size: (formData.get('shirt_size') as string).toUpperCase(),
			pants_size: parseInt(formData.get('pants_size') as string),
			shoes_size: parseInt(formData.get('shoes_size') as string),
		}

		console.log(data);

		try {
			await api.post('/employee', data);
			console.log('Funcionário cadastrado com sucesso!');
			window.alert("Funcionario Cadastrado com Sucesso");
			navigate('/funcionarios/new');
		} catch (error) {
			console.log(error);
		}

	}

	const fetchFuncionarios = async () => {
		try {
			const res = await api.get('/getemployees');
			const employees: Employee[] = res.data || [];

			const uniqueDepartments = Array.from(new Set(
				employees
					.map((e) => (e.department || '').trim())
					.filter((d) => d && d.length > 0)
			));
			const uniqueRoles = Array.from(new Set(
				employees
					.map((e) => (e.role || '').trim())
					.filter((r) => r && r.length > 0)
			));

			setDepartments(uniqueDepartments);
			setRoles(uniqueRoles);

		} catch (error) {
			console.log(error);
		}
	};

	useEffect(() => {
		fetchFuncionarios();
	}, []);

	return (
		<div className="container">
			<h1 className="text-center m-3">Cadastrar Funcionário</h1>
			<form onSubmit={handleCadastraFuncionario}>
				<div className="d-flex gap-3">
					<div className="mb-3 form-floating col-6">
						<input type="text" className="form-control" placeholder="nome" id="name" name="name" />
						<label htmlFor="name" className="form-label">Nome</label>
					</div>
					<div className="mb-3 form-floating col-3">
						<input type="date" className="form-control" placeholder="admissão" id="admissionDate" name="admissionDate" />
						<label htmlFor="admissionDate" className="form-label">Data de Admissão</label>
					</div>

				</div>
				<div className="d-flex gap-3">
					<div className="mb-3 form-floating col-5">
						<select className="form-select" id="company" name="company" defaultValue="">
							<option value="" disabled>Selecione a Empresa</option>
							{company.map((comp, index) => (
								<option key={index} value={comp.name}>{comp.name}</option>
							))}
						</select>
						<label htmlFor="company" className="form-label">Empresa</label>
					</div>
					<div className="mb-3 form-floating col-3">
						<input type="text" className="form-control" placeholder="Departamento" id="department" name="department" list="department-list" autoComplete="off"/>
						<label htmlFor="department" className="form-label">Departamento</label>
						<datalist id="department-list">
							{departments.map((dep) => (
								<option key={dep} value={dep} />
							))}
						</datalist>
					</div>
					<div className="mb-3 form-floating col-4">
						<input type="text" className="form-control" placeholder="Cargo" id="role" name="role" list="role-list" autoComplete="off"/>
						<label htmlFor="role" className="form-label">Cargo</label>
						<datalist id="role-list">
							{roles.map((r) => (
								<option key={r} value={r} />
							))}
						</datalist>
					</div>
				</div>
				<div className="d-flex gap-3">

				<div className="mb-3 form-floating col-3">
					<input type="text" className="form-control" placeholder="camisa" id="shirt_size" name="shirt_size" />
					<label htmlFor="shirt_size" className="form-label">Tamanho da Camisa (opcional)</label>
				</div>
				<div className="mb-3 form-floating col-3">
					<input type="number" className="form-control" placeholder="Calça" id="pants_size" name="pants_size" />
					<label htmlFor="pants_size" className="form-label">Tamanho da Calça (opcional)</label>
				</div>
				<div className="mb-3 form-floating col-3">
					<input type="number" className="form-control" placeholder="Sapato" id="shoes_size" name="shoes_size" />
					<label htmlFor="shoes_size" className="form-label">Tamanho do Sapato (opcional)</label>
				</div>
				</div>
				<div className="text-center">
				<button type="submit" className="btn btn-success col-2">Cadastrar</button>
				</div>
			</form>
		</div>
	)

}

export default CadastraFuncionario;