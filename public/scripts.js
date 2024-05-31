document.getElementById('uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData();
    const files = document.getElementById('folderInput').files;

    if (files.length !== 10) {
        alert('Por favor, sube exactamente 10 archivos PDF.');
        return;
    }

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
            displayTxtFiles();
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
                            if (sentences[i + 1] && sentences[i + 1].trim().length > 1) {
                                followingSentences.push(sentences[i + 1].trim());
                                i++;
                            }
                            if (sentences[i + 1] && sentences[i + 1].trim().length > 1) {
                                if (sentences[i + 1].trim().startsWith('http')) {
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

function countFrequencies(content) {
    const { filteredWords, specialWords, followingSentences, editorial } = extractFirstWordAfterParenthesis(content);

    // Unir todas las palabras/frases en una cadena de texto grande para hacer las búsquedas
    const allText = content;

    // Función para escapar caracteres especiales en una cadena
    const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    }

    // Función para contar las ocurrencias de una palabra o frase en el texto
    const countOccurrences = (text, searchTerm) => {
        const regex = new RegExp(escapeRegExp(searchTerm), 'gi'); // Busca la palabra o frase en el texto sin distinguir mayúsculas y minúsculas
        return (text.match(regex) || []).length; // Cuenta el número de ocurrencias de la palabra o frase en el texto
    }

    const getFrequencies = (textArray) => {
        const frequencies = {};
        textArray.forEach(item => {
            if (item.trim() !== '') {
                frequencies[item] = countOccurrences(allText, item);
            }
        });
        return frequencies;
    }

    const authorFrequencies = getFrequencies(filteredWords.split('\n'));
    const titleFrequencies = getFrequencies(followingSentences.split('\n'));
    const yearFrequencies = getFrequencies(specialWords.split('\n'));
    const editorialFrequencies = getFrequencies(editorial.split('\n'));

    return {
        authorFrequencies,
        titleFrequencies,
        yearFrequencies,
        editorialFrequencies
    };
}


function generateTable(title, frequencies, articleCounts) {
    let tableHtml = `<h3>${title}</h3>`;
    tableHtml += '<table class="table">';
    tableHtml += '<tr><th>Item</th><th>Articulo 1</th><th>Articulo 2</th><th>Articulo 3</th><th>Articulo 4</th><th>Articulo 5</th><th>Articulo 6</th><th>Articulo 7</th><th>Articulo 8</th><th>Articulo 9</th><th>Articulo 10</th><th>Frecuencia</th></tr>';

    Object.entries(frequencies).forEach(([item, counts]) => {
        tableHtml += `<tr><td>${item}</td>`;
        for (let i = 0; i < 10; i++) {
            tableHtml += `<td>${counts[i] || 0}</td>`;
        }
        const totalFrequency = counts.reduce((acc, val) => acc + val, 0);
        tableHtml += `<td>${totalFrequency}</td></tr>`;
    });

    tableHtml += '</table>';
    return tableHtml;
}

async function displayTxtFiles() {
    const response = await fetch('/check-txt-files');
    const data = await response.json();

    if (!data.success) {
        alert(data.message || 'Error al obtener los archivos TXT.');
        return;
    }

    const filesContent = data.filesContent;

    const allFrequencies = filesContent.map(countFrequencies);

    const combinedFrequencies = {
        authorFrequencies: {},
        yearFrequencies: {},
        titleFrequencies: {},
        editorialFrequencies: {}
    };

    allFrequencies.forEach((freq, index) => {
        Object.entries(freq.authorFrequencies).forEach(([author, count]) => {
            if (!combinedFrequencies.authorFrequencies[author]) {
                combinedFrequencies.authorFrequencies[author] = Array(10).fill(0);
            }
            combinedFrequencies.authorFrequencies[author][index] = count;
        });
        Object.entries(freq.yearFrequencies).forEach(([year, count]) => {
            if (!combinedFrequencies.yearFrequencies[year]) {
                combinedFrequencies.yearFrequencies[year] = Array(10).fill(0);
            }
            combinedFrequencies.yearFrequencies[year][index] = count;
        });
        Object.entries(freq.titleFrequencies).forEach(([title, count]) => {
            if (!combinedFrequencies.titleFrequencies[title]) {
                combinedFrequencies.titleFrequencies[title] = Array(10).fill(0);
            }
            combinedFrequencies.titleFrequencies[title][index] = count;
        });
        Object.entries(freq.editorialFrequencies).forEach(([editorial, count]) => {
            if (!combinedFrequencies.editorialFrequencies[editorial]) {
                combinedFrequencies.editorialFrequencies[editorial] = Array(10).fill(0);
            }
            combinedFrequencies.editorialFrequencies[editorial][index] = count;
        });
    });

    let content = '';
    content += generateTable('Autores', combinedFrequencies.authorFrequencies);
    content += generateTable('Años', combinedFrequencies.yearFrequencies);
    content += generateTable('Títulos', combinedFrequencies.titleFrequencies);
    content += generateTable('Editoriales', combinedFrequencies.editorialFrequencies);

    document.getElementById('resultados').innerHTML = content;
    document.getElementById('resultados').style.display = 'block';

    drawCombinedChart(combinedFrequencies);
}

function drawCombinedChart(combinedFrequencies) {
    const allFrequencies = {};

    Object.entries(combinedFrequencies.authorFrequencies).forEach(([item, counts]) => {
        allFrequencies[item] = (allFrequencies[item] || 0) + counts.reduce((a, b) => a + b, 0);
    });
    Object.entries(combinedFrequencies.yearFrequencies).forEach(([item, counts]) => {
        allFrequencies[item] = (allFrequencies[item] || 0) + counts.reduce((a, b) => a + b, 0);
    });
    Object.entries(combinedFrequencies.titleFrequencies).forEach(([item, counts]) => {
        allFrequencies[item] = (allFrequencies[item] || 0) + counts.reduce((a, b) => a + b, 0);
    });
    Object.entries(combinedFrequencies.editorialFrequencies).forEach(([item, counts]) => {
        allFrequencies[item] = (allFrequencies[item] || 0) + counts.reduce((a, b) => a + b, 0);
    });

    const labels = Object.keys(allFrequencies);
    const data = Object.values(allFrequencies);

    const ctx = document.createElement('canvas');
    document.getElementById('resultados').appendChild(ctx);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frecuencia de Elementos',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


document.getElementById('processBtn').addEventListener('click', displayTxtFiles);
