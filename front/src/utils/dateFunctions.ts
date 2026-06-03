const dateToISO = (date: Date) => {
    return new Date(date).toISOString();
}

const formatDate = (dateString: string) => {
    const [data] = dateString.split('T');
    const [year, month, day] = data.split('-');
    return `${day}/${month}/${year}`;
};

// Função para gerar data local sem timezone (ignora UTC)
const getLocalDateISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
};

export { dateToISO, formatDate, getLocalDateISO };