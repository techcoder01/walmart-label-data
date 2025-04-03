const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const { createObjectCsvWriter } = require('csv-writer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure upload & output directories exist
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
ensureDirExists(uploadsDir);
ensureDirExists(outputDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// ✅ API: Upload & Convert Excel to CSV
app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const excelData = xlsx.utils.sheet_to_json(worksheet);
    if (excelData.length === 0) return res.status(400).json({ error: 'Excel file is empty' });

    // Define CSV file path
    const outputFileName = `converted-${Date.now()}.csv`;
    const outputFilePath = path.join(outputDir, outputFileName);

    // Define CSV writer
    const csvWriter = createObjectCsvWriter({
      path: outputFilePath,
      header: [
        { id: 'FromName', title: 'FromName' },
        { id: 'FromCompany', title: 'FromCompany' },
        { id: 'FromStreet', title: 'FromStreet' },
        { id: 'FromStreet2', title: 'FromStreet2' },
        { id: 'FromCity', title: 'FromCity' },
        { id: 'FromState', title: 'FromState' },
        { id: 'FromZip', title: 'FromZip' },
        { id: 'FromPhone', title: 'FromPhone' },
        { id: 'ToName', title: 'ToName' },
        { id: 'ToCompany', title: 'ToCompany' },
        { id: 'ToStreet', title: 'ToStreet' },
        { id: 'ToStreet2', title: 'ToStreet2' },
        { id: 'ToCity', title: 'ToCity' },
        { id: 'ToState', title: 'ToState' },
        { id: 'ToZip', title: 'ToZip' },
        { id: 'ToPhone', title: 'ToPhone' },
        { id: 'Weight', title: 'Weight' },
        { id: 'Length', title: 'Length' },
        { id: 'Width', title: 'Width' },
        { id: 'Height', title: 'Height' },
        { id: 'Description', title: 'Description' },
        { id: 'order num', title: 'order num' },
        { id: 'Reference2', title: 'Reference2' },
        { id: 'Signature', title: 'Signature' },
        { id: 'Saturday', title: 'Saturday' }
      ]
    });

    // Map data
    const csvData = excelData.map(row => ({
      FromName: 'Imagine Swimming, Inc',
      FromCompany: null,
      FromStreet: '41 Union Square West,',
      FromStreet2: null,
      FromCity: 'New York',
      FromState: 'NY',
      FromZip: 10003,
      FromPhone: 5858618765,
      ToName: row['Customer Name'] || '',
      ToCompany: null,
      ToStreet: row['Ship to Address 1'] || '',
      ToStreet2: row['Ship to Address 2'] || null,
      ToCity: row['City'] || '',
      ToState: row['State'] || '',
      ToZip: row['Zip'] ? parseInt(row['Zip']) : null,
      ToPhone: row['Customer Phone Number'] ? parseInt(String(row['Customer Phone Number']).replace(/\D/g, '')) : null,
      Weight: row['Qty'] ? parseFloat(row['Qty']) : null,
      Length: 3,
      Width: 3,
      Height: 5,
      Description: row['Item Description'] || '',
      'order num': row['PO#'] || null,
      Reference2: null,
      Signature: null,
      Saturday: null
    }));

    // Write CSV
    await csvWriter.writeRecords(csvData);

    res.json({ success: true, message: 'File converted successfully', filePath: `/api/download/${outputFileName}` });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert file' });
  }
});

// ✅ API: Download CSV File
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(outputDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath);
});

// ✅ Serve React Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// ✅ Start Server
app.listen(port, '0.0.0.0', () => console.log(`🚀 Server running on port ${port}`));
