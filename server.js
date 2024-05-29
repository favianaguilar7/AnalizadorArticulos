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

// Ruta para cargar archivos
app.post('/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send({ success: false, message: 'Ningún archivo cargado.' });
    }

    const files = Array.isArray(req.files.pdfs) ? req.files.pdfs : [req.files.pdfs];
    const txtFolder = path.join(__dirname, 'txt');

    if (!fs.existsSync(txtFolder)) {
        fs.mkdirSync(txtFolder);
    }

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
            }
        }
        res.send({ success: true, message: 'Archivos convertidos exitosamente.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ success: false, message: 'Error en el proceso de conversión.' });
    }
});

// Ruta para verificar archivos en la carpeta txt y devolver su contenido
app.get('/check-txt-files', (req, res) => {
    const txtFolder = path.join(__dirname, 'txt');

    try {
        if (fs.existsSync(txtFolder)) {
            const files = fs.readdirSync(txtFolder);
            const filesContent = files.map(file => fs.readFileSync(path.join(txtFolder, file), 'utf8'));
            res.send({ success: true, filesContent });
        } else {
            res.send({ success: true, filesContent: [] });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ success: false, message: 'Error al verificar los archivos TXT.' });
    }
});

app.listen(PORT, () => {
    console.log(`El servidor está funcionando en http://localhost:${PORT}`);
});
