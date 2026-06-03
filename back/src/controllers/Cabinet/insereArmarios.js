import fs from 'fs';
import fetch from 'node-fetch';
import {parse} from 'csv-parse';

const apiUrl = 'http://192.168.11.95:3003/cabinet';

// Função para ler o arquivo CSV e enviar os dados para a API
async function sendCSVDataToAPI(filePath) {
    try {
        const fileData = fs.readFileSync(filePath, 'utf-8');

        // Parsing do CSV
        parse(fileData, {
            delimiter: ';',
            columns: true,
            skip_empty_lines: true
        }, async function(err, records) {
            if (err) {
                console.error('Erro ao fazer o parsing do CSV:', err);
                return;
            }

            // Iteração sobre os registros e envio para a API
            for (const record of records) {
                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(record)
                    });

                    if (!response.ok) {
                        console.error(`Falha ao enviar dados para a API: ${response.statusText}`);
                    } else {
                        console.log('Dados enviados com sucesso:', record);
                    }
                } catch (error) {
                    console.error('Erro ao enviar dados para a API:', error);
                }
            }
        });
    } catch (error) {
        console.error('Erro ao ler o arquivo CSV:', error);
    }
}

// Chamada da função com o caminho do arquivo CSV
const filePath = 'datas_convertidas.csv';
sendCSVDataToAPI(filePath);
