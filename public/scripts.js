document.getElementById('uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
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
            displayFrequencies(result.frequencies);
        } else {
            alert(result.message || 'Error en el proceso de conversión.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error en el proceso de conversión.');
    }
});

function displayFrequencies(frequencies) {
    clearResults();
    const { authorFrequencies, titleFrequencies, yearFrequencies, publisherFrequencies } = frequencies;

    displayList('Autores', authorFrequencies);
    displayList('Títulos', titleFrequencies);
    displayList('Años', yearFrequencies);
    displayList('Editoriales', publisherFrequencies);
}

function displayList(title, frequencies) {
    const container = document.createElement('div');
    container.innerHTML = `<h3>${title}</h3>`;
    const list = document.createElement('ul');

    for (const [key, count] of Object.entries(frequencies)) {
        const listItem = document.createElement('li');
        listItem.textContent = `${key}: ${count}`;
        list.appendChild(listItem);
    }

    container.appendChild(list);
    document.getElementById('result').appendChild(container);
}

function clearResults() {
    const existingResults = document.querySelectorAll('#result > div');
    existingResults.forEach(result => result.remove());
}
document.getElementById('uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            displayFrequencies(result.frequencies);
        } else {
            alert(result.message || 'Error en el proceso de conversión.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error en el proceso de conversión.');
    }
});

document.getElementById('processBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/processTxtFiles');
        const result = await response.text();

        document.getElementById('resultados').innerHTML = result;
        document.getElementById('resultados').style.display = 'block'; // Mostrar resultados
    } catch (error) {
        console.error('Error:', error);
        alert('Error en el proceso de análisis de frecuencias.');
    }
});
