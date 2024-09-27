const express = require('express');
const mysql = require('mysql2');
const QRCode = require('qrcode');
const pdfkit = require('pdfkit');
const router = express.Router();

// Configuración de la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'qr_db'
});

// Verificar conexión a la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
    } else {
        console.log('Conectado a la base de datos');
    }
});

// Ruta para generar y almacenar un código QR
// Ruta para generar y almacenar un código QR
router.post('/generate-qr', async (req, res) => {
    const { data } = req.body;

    try {
        const qrCode = await QRCode.toDataURL(data);

        // Guarda el código aleatorio y el solicitado en la base de datos
        db.query('INSERT INTO qr_codes (code, requested, status) VALUES (?, ?, ?)', [JSON.parse(data).code, JSON.parse(data).solicitado, 'Habilitado'], (error, results) => {
            if (error) return res.status(500).send(error);
            res.status(201).json({ id: results.insertId, code: JSON.parse(data).code, qrCode });
        });
    } catch (error) {
        res.status(500).send(error);
    }
});


// Ruta para obtener los códigos QR
router.get('/qr-codes', (req, res) => {
    db.query('SELECT * FROM qr_codes', (error, results) => {
        if (error) return res.status(500).send(error);
        res.json(results);
    });
});

// Ruta para obtener el estado actual de un código QR por ID
router.get('/qr-codes/:code', (req, res) => {
    const { code } = req.params; // Cambia 'id' a 'code'
    
    db.query('SELECT * FROM qr_codes WHERE code = ?', [code], (error, results) => {
        if (error) return res.status(500).send(error);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Código QR no encontrado' });
        }

        res.json(results[0]); // Retorna el primer resultado
    });
});
// Ruta para cambiar el estado de un código QR
// Ruta para cambiar el estado de un código QR por code
router.patch('/qr-codes/:code', (req, res) => {
    const { code } = req.params;
    const { status } = req.body;

    db.query('UPDATE qr_codes SET status = ? WHERE code = ?', [status, code], (error, results) => {
        if (error) return res.status(500).send(error);

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Código QR no encontrado' });
        }

        res.json({ message: 'Estado actualizado con éxito' });
    });
});


// Ruta para generar un PDF con códigos QR
router.get('/generate-pdf', async (req, res) => {
    const doc = new pdfkit();
    let filename = 'qrcodes.pdf';
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    db.query('SELECT * FROM qr_codes', async (error, results) => {
        if (error) return res.status(500).send(error);

        const qrPromises = results.map(async (qr) => {
            const qrCode = await QRCode.toDataURL(qr.code);
            doc.image(qrCode, {
                fit: [100, 100],
                align: 'center',
                valign: 'center'
            });
            doc.text(`ID: ${qr.id} - Estado: ${qr.status} - Creado: ${qr.created_at} - Actualizado: ${qr.updated_at}`, { align: 'center' });
            doc.moveDown();
        });

        // Esperar a que todas las imágenes QR se generen antes de finalizar el PDF
        await Promise.all(qrPromises);

        doc.end();
    });
});

module.exports = router;
