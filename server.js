const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const favicon = require('serve-favicon');

const app = express();
const PORT = 3000;

// Servir favicon desde la carpeta public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

// Funciones de filtrado, extracción y conteo
function filterApaCitations(text) {
    const apa7Pattern = /\(([\w\s,.&-]+),\s*(\d{4})\)/g;
    return text.replace(apa7Pattern, '');
}

function extractAuthors(text) {
    const authors = new Set();
    const pattern = /\(([\w\s,.&-]+),\s*(\d{4})\)/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        authors.add(match[1].trim());
    }
    return Array.from(authors);
}

function extractTitles(text) {
    const titles = new Set();
    const pattern = /^([\w\s,.&-]+)\.[\r\n]/gm;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        titles.add(match[1].trim());
    }
    return Array.from(titles);
}

function extractYears(text) {
    const years = new Set();
    const pattern = /\(([\w\s,.&-]+),\s*(\d{4})\)/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        years.add(match[2].trim());
    }
    return Array.from(years);
}

function extractPublishers(text) {
    const publishers = new Set();
    const pattern = /\(([\w\s,.&-]+),\s*(\d{4})\)/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        publishers.add(match[1].trim());
    }
    return Array.from(publishers);
}

function countFrequencies(texts) {
    const authorFrequencies = {};
    const authorFrequenciesPerArticle = {};
    const titleFrequencies = {};
    const yearFrequencies = {};
    const publisherFrequencies = {};

    texts.forEach((text, index) => {
        const filteredText = filterApaCitations(text);

        extractAuthors(filteredText).forEach(author => {
            authorFrequencies[author] = (authorFrequencies[author] || 0) + 1;
            if (!authorFrequenciesPerArticle[author]) {
                authorFrequenciesPerArticle[author] = Array(texts.length).fill(0);
            }
            authorFrequenciesPerArticle[author][index]++;
        });

        extractTitles(filteredText).forEach(title => {
            titleFrequencies[title] = (titleFrequencies[title] || 0) + 1;
        });

        extractYears(filteredText).forEach(year => {
            yearFrequencies[year] = (yearFrequencies[year] || 0) + 1;
        });

        extractPublishers(filteredText).forEach(publisher => {
            publisherFrequencies[publisher] = (publisherFrequencies[publisher] || 0) + 1;
        });
    });

    return {
        authorFrequencies,
        authorFrequenciesPerArticle,
        titleFrequencies,
        yearFrequencies,
        publisherFrequencies,
    };
}
function escapeHTML(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Función para generar la tabla HTML con los resultados del análisis de frecuencias
function generateResultsHTML(frequencies) {
    let resultsHTML = '<h2>Resultados del Análisis de Frecuencias</h2>';
    resultsHTML += '<table>';
    resultsHTML += '<tr><th>ID</th><th>Autor</th><th>Frecuencia Total</th>';
    for (let i = 1; i <= 10; i++) {
        resultsHTML += '<th>Artículo ' + i + '</th>';
    }
    resultsHTML += '</tr>';

    let authorIndex = 1;
    for (const [author, frequency] of Object.entries(frequencies.authorFrequencies)) {
        resultsHTML += '<tr>';
        resultsHTML += '<td>' + authorIndex + '</td>';
        resultsHTML += '<td>' + escapeHTML(author) + '</td>';
        resultsHTML += '<td>' + escapeHTML(frequency) + '</td>';
        for (const articleFrequency of frequencies.authorFrequenciesPerArticle[author]) {
            resultsHTML += '<td>' + escapeHTML(articleFrequency) + '</td>';
        }
        resultsHTML += '</tr>';
        authorIndex++;
    }

    resultsHTML += '</table>';
    return resultsHTML;
}

// Función para generar el archivo CSV
// Continuación de server.js

function generateCSV(frequencies, filename) {
    const file = fs.createWriteStream(filename);
    file.write('ID,Autor,Frecuencia Total');
    for (let i = 1; i <= 10; i++) {
        file.write(',Artículo ' + i);
    }
    file.write('\n');

    let authorIndex = 1;
    for (const [author, frequency] of Object.entries(frequencies.authorFrequencies)) {
        file.write(authorIndex + ',' + author + ',' + frequency);
        for (const articleFrequency of frequencies.authorFrequenciesPerArticle[author]) {
            file.write(',' + articleFrequency);
        }
        file.write('\n');
        authorIndex++;
    }

    file.end();
    console.log('El archivo CSV se ha generado correctamente: ' + filename);
}

let textFiles = []; // Definir textFiles en el ámbito global

// Ruta para procesar los archivos TXT
app.get('/processTxtFiles', async (req, res) => {
    try {
        // Implementa el procesamiento de los archivos TXT aquí
        // Generar el CSV y los resultados HTML
        const frequencies = countFrequencies(textFiles);
        const resultsHTML = generateResultsHTML(frequencies);
        const csvFilename = path.join(__dirname, 'resultados_frecuencias_por_articulo.csv');
        generateCSV(frequencies, csvFilename);

        res.send(resultsHTML);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error en el procesamiento de archivos TXT.');
    }
});

// Ruta para cargar archivos
app.post('/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send({ success: false, message: 'Ningun archivo cargado.' });
    }

    const files = Array.isArray(req.files.pdfs) ? req.files.pdfs : [req.files.pdfs];
    const txtFolder = path.join(__dirname, 'txt');

    if (!fs.existsSync(txtFolder)) {
        fs.mkdirSync(txtFolder);
    }

    textFiles = []; // Reiniciar textFiles

    try {
        for (const file of files) {
            const fileContent = fs.readFileSync(file.tempFilePath);
            const base64FileContent = fileContent.toString('base64');
            const data = {
                "Parameters": [
                    {
                        "Name": "File",
                        "FileValue": {
                            "Name": file.name,
                            "Data": base64FileContent
                        }
                    },
                    {
                        "Name": "StoreFile",
                        "Value": true
                    }
                ]
            };

            const response = await fetch('https://v2.convertapi.com/convert/pdf/to/txt?Secret=kCocT5pfICHz5GQa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.Files && result.Files.length > 0) {
                const txtFileUrl = result.Files[0].Url;
                const txtResponse = await fetch(txtFileUrl);
                const txtContent = await txtResponse.text();
                const txtFilePath = path.join(txtFolder, file.name.replace('.pdf', '.txt'));
                fs.writeFileSync(txtFilePath, txtContent);
                textFiles.push(txtContent);
            }
        }

        if (textFiles.length > 0) {
            const frequencies = countFrequencies(textFiles);
            res.send({ success: true, frequencies });
        } else {
            res.send({ success: false, message: 'No se encontrar archivos para procesar.' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ success: false, message: 'Error en el proceso de conversion.' });
    }
});

app.listen(PORT, () => {
    console.log(`El servidor está funcionando en http://localhost:${PORT}`);
});

