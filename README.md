# Backend Documentation

## Overview
The backend of the Excel to CSV Converter application is built with Node.js and Express. It provides API endpoints for file upload, Excel-to-CSV conversion, and file download.

## Technologies Used
- Node.js
- Express.js
- multer (for file uploads)
- xlsx (for Excel parsing)
- csv-writer (for CSV generation)
- cors (for cross-origin resource sharing)

## API Endpoints

### POST /api/convert
Uploads an Excel file and converts it to CSV format according to the specified mapping rules.

**Request:**
- Content-Type: multipart/form-data
- Body: file (Excel file)

**Response:**
```json
{
  "success": true,
  "message": "File converted successfully",
  "filePath": "/api/download/converted-1234567890.csv"
}
```

### GET /api/download/:filename
Downloads a converted CSV file.

**Parameters:**
- filename: Name of the converted CSV file

**Response:**
- CSV file download

## Data Mapping Logic
The backend implements the following mapping logic:

### Static "From" Values
```javascript
FromName: 'Imagine Swimming, Inc',
FromCompany: null,
FromStreet: '41 Union Square West,',
FromStreet2: null,
FromCity: 'New York',
FromState: 'NY',
FromZip: 10003,
FromPhone: 5858618765,
```

### Dynamic "To" Values from Excel
```javascript
ToName: row['Customer Name'] || '',
ToCompany: null,
ToStreet: row['Ship to Address 1'] || '',
ToStreet2: row['Ship to Address 2'] || null,
ToCity: row['City'] || '',
ToState: row['State'] || '',
ToZip: row['Zip'] ? parseInt(row['Zip']) : null,
ToPhone: row['Customer Phone Number'] ? parseInt(String(row['Customer Phone Number']).replace(/\D/g, '')) : null,
```

### Product & Order Details
```javascript
Weight: row['Qty'] ? parseFloat(row['Qty']) : null,
Length: 3,
Width: 3,
Height: 5,
Description: row['Item Description'] || '',
'order num': row['PO#'] || null,
Reference2: null,
Signature: null,
Saturday: null
```

## File Structure
```
backend/
├── server.js           # Main server file
├── package.json        # Dependencies and scripts
├── Procfile            # Heroku deployment configuration
├── uploads/            # Directory for uploaded Excel files
└── output/             # Directory for generated CSV files
```

## Error Handling
The backend includes error handling for:
- Missing files
- Invalid file types
- Empty Excel files
- CSV generation errors

## Deployment
The backend is configured for deployment to platforms like Heroku with:
- Procfile for process management
- Environment variable for port configuration
- Static file serving for the frontend
