const express = require('express');
const mysql = require('mysql2');
const QRCode = require('qrcode');
const pdfkit = require('pdfkit');
const bodyParser = require('body-parser');
const path = require('path');
const router = express.Router();
const app = express();
const port = 3000;

// Configuración de la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Cambia esto por tu usuario de MySQL
    password: '', // Cambia esto por tu contraseña de MySQL
    database: 'qr_db'
});

db.connect(err => {
    if (err) throw err;
    console.log('Conectado a la base de datos MySQL');
});

// Endpoint para obtener el estado del código QR
router.get('/qr-codes/:code', (req, res) => {
    const qrCodeId = req.params.id;

    // Consulta SQL para obtener el estado del código QR
    const query = 'SELECT status FROM qr_codes WHERE code = ?';

    db.query(query, [qrCodeId], (err, results) => {
        if (err) {
            console.error('Error en la consulta SQL:', err);
            res.status(500).json({ error: 'Error del servidor.' });
            return;
        }

        if (results.length > 0) {
            // Devolver el estado del código QR si se encuentra
            res.json({ status: results[0].status });
        } else {
            // Si no se encuentra el código QR
            res.status(404).json({ error: 'Código no encontrado.' });
        }
    });
});

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
