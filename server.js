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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// API endpoint for file upload and conversion
app.post('/api/convert', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the Excel file
    const workbook = xlsx.readFile(req.file.path);
    
    // Get the first sheet (Po Details)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const excelData = xlsx.utils.sheet_to_json(worksheet);
    
    if (excelData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Define the output CSV file path
    const outputFileName = `converted-${Date.now()}.csv`;
    const outputFilePath = path.join(outputDir, outputFileName);

    // Define CSV writer with the required headers
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

    // Map Excel data to CSV format according to requirements
    const csvData = excelData.map(row => {
      // Create the data object with proper types to match sample CSV
      const data = {
        // Static "From" values - using exact format from sample CSV
        FromName: 'Imagine Swimming, Inc',
        FromCompany: null,  // Use null for empty values to match NaN in sample
        FromStreet: '41 Union Square West,',
        FromStreet2: null,
        FromCity: 'New York',
        FromState: 'NY',
        FromZip: 10003,     // Integer as in sample
        FromPhone: 5858618765, // Integer as in sample
        
        // Dynamic "To" values from Excel
        ToName: row['Customer Name'] || '',
        ToCompany: null,
        ToStreet: row['Ship to Address 1'] || '',
        ToStreet2: row['Ship to Address 2'] || null,
        ToCity: row['City'] || '',
        ToState: row['State'] || '',
        ToZip: row['Zip'] ? parseInt(row['Zip']) : null, // Integer as in sample
        ToPhone: row['Customer Phone Number'] ? parseInt(String(row['Customer Phone Number']).replace(/\D/g, '')) : null, // Integer as in sample
        
        // Product & Order Details
        Weight: row['Qty'] ? parseFloat(row['Qty']) : null, // Float as in sample
        Length: 3,          // Integer as in sample
        Width: 3,           // Integer as in sample
        Height: 5,          // Integer as in sample
        Description: row['Item Description'] || '',
        'order num': row['PO#'] || null,
        
        // Empty fields
        Reference2: null,
        Signature: null,
        Saturday: null
      };
      
      return data;
    });

    // Write data to CSV file
    csvWriter.writeRecords(csvData)
      .then(() => {
        // Return success response with file path
        res.json({
          success: true,
          message: 'File converted successfully',
          filePath: `/api/download/${outputFileName}`
        });
      })
      .catch(error => {
        console.error('Error writing CSV:', error);
        res.status(500).json({ error: 'Failed to write CSV file' });
      });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert file' });
  }
});

// API endpoint to download the converted CSV file
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(outputDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath);
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
