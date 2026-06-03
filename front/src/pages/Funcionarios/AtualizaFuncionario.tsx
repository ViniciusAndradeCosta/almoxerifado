import { useNavigate, useParams } from "react-router-dom";
import { Employee } from "../../types/Employee";
import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { formatDate } from "../../utils/dateFunctions";

const AtualizaFuncionario: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [formData, setFormData] = useState<Employee>({
        name: '',
        company: '',
        role: '',
        department: '',
        admissionDate: new Date().toISOString(),
        shirt_size: '',
        pants_size: 0,
        shoes_size: 0,
    });

    useEffect(() => {
        async function getEmployee() {
            try {
                const response = await api.get(`/employee/${id}`);
                setFormData(response.data);
                console.log(response.data);
            } catch (error) {
                console.log(error);
            }
        }
        getEmployee();
    }, [id]);

    const navigate = useNavigate();

    const handleAtualizaFuncionario = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            await api.put(`/employee/${id}`, formData);
            navigate('/funcionarios');
        }catch (error) {
            console.log(error);
        }
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;

        if(name === 'pants_size' || name === 'shoes_size') {
            setFormData({ ...formData, [name]: parseInt(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    }

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: new Date(value).toISOString() });
    }

    return (
        <div className="container">
            <div className="row">
                <div className="col-12">
                    <h1>Atualizar Funcionário</h1>
                </div>
                <div className="col-12">
                    <form onSubmit={handleAtualizaFuncionario}>
                        <div className="form-group">
                            <label htmlFor="name">Nome</label>
                            <input type="text" className="form-control" id="name" name="name" value={formData.name} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="company">Empresa</label>
                            <input type="text" className="form-control" id="company" name="company" value={formData.company} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="role">Cargo</label>
                            <input type="text" className="form-control" id="role" name="role" value={formData.role} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="department">Departamento</label>
                            <input type="text" className="form-control" id="department" name="department" value={formData.department} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="admissionDate">Data de Admissão</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                id="admissionDate" 
                                name="admissionDate" 
                                value={formData.admissionDate ? new Date(formData.admissionDate).toISOString().split('T')[0] : ''} 
                                onChange={handleDateChange} 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="shirt_size">Tamanho da Camisa</label>
                            <input type="text" className="form-control" id="shirt_size" name="shirt_size" value={formData.shirt_size} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="pants_size">Tamanho da Calça</label>
                            <input type="number" className="form-control" id="pants_size" name="pants_size" value={formData.pants_size} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="shoes_size">Tamanho do Sapato</label>
                            <input type="number" className="form-control" id="shoes_size" name="shoes_size" value={formData.shoes_size} onChange={handleInputChange} />
                        </div>
                        <button type="submit" className="btn btn-primary">Atualizar</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AtualizaFuncionario;
