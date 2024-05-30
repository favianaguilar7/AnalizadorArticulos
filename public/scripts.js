document.getElementById('uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData();
    const files = document.getElementById('folderInput').files;

    for (let i = 0; i < files.length; i++) {
        formData.append('pdfs', files[i]);
    }

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('Archivos convertidos exitosamente.');
        } else {
            alert(result.message || 'Error en el proceso de conversión.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error en el proceso de conversión.');
    }
});

function extractFirstWordAfterParenthesis(content) {
    const lines = content.split('\n');
    const result = [];
    const capturedWords = [];
    const followingSentences = [];
    const editorial = [];

    lines.forEach(line => {
        const match = line.match(/\(\d{2}/);  
        if (match && /[A-Za-z]{4,},\s[A-Za-z]\./.test(line)) {  
            const words = line.split(' ');
            const firstWord = words[0];
            if (firstWord.length > 3) {
                result.push(firstWord.slice(0, -1));  
                
                const specialMatch = line.match(/\((\d{4})\)|\((\d{4}),\s[A-Za-z0-9]/);
                if (specialMatch) {
                    
                    const fourDigits = specialMatch[1] || specialMatch[2];
                    capturedWords.push(fourDigits);

                    const sentences = line.split('.');
                    for (let i = 0; i < sentences.length - 1; i++) {
                        if (sentences[i].trim().endsWith(')')) {
                            if(sentences[i + 1].trim().length > 1){
                                followingSentences.push(sentences[i + 1].trim());
                                i ++;
                            }
                            if(sentences[i + 1].trim().length > 1) {
                                if(sentences[i + 1].trim().startsWith('http')) {
                                    let nextSentenceIndex = i + 1;
                                    let concatenatedSentences = '';
                                    while (nextSentenceIndex < sentences.length && sentences[nextSentenceIndex].trim().length > 1) {
                                        concatenatedSentences += sentences[nextSentenceIndex].trim(); 
                                        if (nextSentenceIndex < sentences.length - 1 && sentences[nextSentenceIndex + 1].trim().length > 1) {
                                            concatenatedSentences += '.'; 
                                        }
                                        nextSentenceIndex++;
                                    }                                    
                                    editorial.push(concatenatedSentences);
                                } else {
                                    const sentenceParts = sentences[i + 1].trim().split(',');
                                    if (sentenceParts.length > 1) {
                                        editorial.push(sentenceParts[0].trim());
                                    } else {
                                        if (sentences[i + 1].trim().includes('(')) {
                                            const sentencePartsParts = sentences[i + 1].trim().split('(');
                                            editorial.push(sentencePartsParts[0].trim());
                                        } else {
                                            editorial.push(sentences[i + 1].trim());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    
    return {
        filteredWords: result.join('\n'),
        specialWords: capturedWords.join('\n'),
        followingSentences: followingSentences.join('\n'),
        editorial: editorial.join('\n')
    };
}

function printFrequencies(frequencies) {
    let output = '<pre>';
    for (const [item, count] of Object.entries(frequencies)) {
        output += `${item}: ${count}\n`;
    }
    output += '</pre>';
    return output;
}

function generateCSV(content) {
    let csvContent = 'data:text/csv;charset=utf-8,';
    // Agregar encabezados
    csvContent += 'Tipo,Item,Frecuencia\n';
    // Agregar datos
    Object.entries(content).forEach(([type, frequencies]) => {
        Object.entries(frequencies).forEach(([item, frequency]) => {
            csvContent += `${type},${item},${frequency}\n`;
        });
    });
    // Codificar el contenido en formato URI
    return encodeURI(csvContent);
}

async function displayTxtFiles() {
    const response = await fetch('/check-txt-files');
    const data = await response.json();

    if (!data.success) {
        alert(data.message || 'Error al obtener los archivos TXT.');
        return;
    }

    let content = '';
    const filesContent = data.filesContent;
    filesContent.forEach((fileContent, index) => {
        const frequencies = countFrequencies(fileContent);
        const chartDivId = `chart_${index}`;
        content += `<h2>Resultados para archivo ${index + 1}</h2>`;
        content += `<div id="${chartDivId}" class="chart"></div>`;

        // Generar una tabla para cada aspecto por artículo
        content += generateTable('Autores', frequencies.authorFrequencies);
        content += generateTable('Años', frequencies.yearFrequencies);
        content += generateTable('Títulos', frequencies.titleFrequencies);
        content += generateTable('Editoriales', frequencies.editorialFrequencies);

        content += '<hr>'; // Agregar una línea divisoria entre cada artículo

        // Generar la gráfica combinada para el artículo actual
        drawCombinedChart(chartDivId, frequencies);

        // Generar el contenido CSV
        const csvContent = generateCSV({
            'Autores': frequencies.authorFrequencies,
            'Años': frequencies.yearFrequencies,
            'Títulos': frequencies.titleFrequencies,
            'Editoriales': frequencies.editorialFrequencies
        });

        // Crear un enlace de descarga
        const downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', csvContent);
        downloadLink.setAttribute('download', `frequencies_${index + 1}.csv`);
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);

        // Simular clic en el enlace para iniciar la descarga
        downloadLink.click();

        // Eliminar el enlace después de la descarga
        document.body.removeChild(downloadLink);
    });

    document.getElementById('resultados').innerHTML = content;
    document.getElementById('resultados').style.display = 'block';
}
function generateTable(title, frequencies) {
    let tableHtml = `<h3>${title}</h3>`;
    tableHtml += '<table class="table">';
    tableHtml += '<tr><th>Item</th><th>Frecuencia</th></tr>';
    Object.entries(frequencies).forEach(([item, frequency]) => {
        tableHtml += `<tr><td>${item}</td><td>${frequency}</td></tr>`;
    });
    tableHtml += '</table>';
    return tableHtml;
}

function countFrequencies(content) {
    const { filteredWords, specialWords, followingSentences, editorial } = extractFirstWordAfterParenthesis(content);

    const authorFrequencies = {};
    const titleFrequencies = {};
    const yearFrequencies = {};
    const editorialFrequencies = {};

    const authors = filteredWords.split('\n');
    authors.forEach(author => {
        authorFrequencies[author] = (authorFrequencies[author] || 0) + 1;
    });
    const titles = followingSentences.split('\n');
    titles.forEach(title => {
        titleFrequencies[title] = (titleFrequencies[title] || 0) + 1;
    });
    const years = specialWords.split('\n');
    years.forEach(year => {
        yearFrequencies[year] = (yearFrequencies[year] || 0) + 1;
    });
    const editorials = editorial.split('\n');
    editorials.forEach(ed => {
        editorialFrequencies[ed] = (editorialFrequencies[ed] || 0) + 1;
    });

    return {
        authorFrequencies,
        titleFrequencies,
        yearFrequencies,
        editorialFrequencies
    };
}

function drawCombinedChart(chartDivId, frequencies) {
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => {
        const data = new google.visualization.DataTable();
        data.addColumn('string', 'Elemento');
        data.addColumn('number', 'Autores');
        data.addColumn('number', 'Años');
        data.addColumn('number', 'Títulos');
        data.addColumn('number', 'Editoriales');

        const uniqueKeys = new Set([
            ...Object.keys(frequencies.authorFrequencies),
            ...Object.keys(frequencies.yearFrequencies),
            ...Object.keys(frequencies.titleFrequencies),
            ...Object.keys(frequencies.editorialFrequencies)
        ]);

        uniqueKeys.forEach(key => {
            data.addRow([
                key,
                frequencies.authorFrequencies[key] || 0,
                frequencies.yearFrequencies[key] || 0,
                frequencies.titleFrequencies[key] || 0,
                frequencies.editorialFrequencies[key] || 0
            ]);
        });

        const options = {
            title: 'Frecuencia de Elementos',
            legend: { position: 'bottom' },
            hAxis: {
                title: 'Elemento'
            },
            vAxis: {
                title: '',
                textPosition: 'none' 
            },
            series: {
                0: { lineDashStyle: [4, 4] },
                1: { lineDashStyle: [2, 2] },
                2: { lineDashStyle: [1, 1] },
                3: { lineDashStyle: [5, 1] }
            }
        };

        const chart = new google.visualization.LineChart(document.getElementById(chartDivId));
        chart.draw(data, options);
    });
}

document.getElementById('processBtn').addEventListener('click', displayTxtFiles);