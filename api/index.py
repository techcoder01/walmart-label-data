from flask import Flask, request, jsonify, render_template
import pandas as pd
import io
import base64
from flask_cors import CORS
import os

# Get the absolute path to the parent directory of the current file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Initialize Flask app with explicit template and static folders
app = Flask(__name__, 
           static_folder=os.path.join(BASE_DIR, 'static'),
           template_folder=os.path.join(BASE_DIR, 'templates'))

CORS(app)

@app.route('/', methods=['GET'])
def home():
    return render_template('index.html')

@app.route('/api/process', methods=['POST'])
def process():
    # Check if file exists in request
    if 'file' not in request.files:
        return jsonify({"error": "No file part", "details": "Please upload a file"}), 400
    
    file = request.files['file']
    
    # Check if file is selected
    if file.filename == '':
        return jsonify({"error": "No file selected", "details": "Please choose a file to upload"}), 400
    
    # Validate file extension
    allowed_extensions = {'xlsx', 'xls', 'csv', 'txt'}
    file_ext = file.filename.rsplit('.', 1)[-1].lower()
    if file_ext not in allowed_extensions:
        return jsonify({
            "error": "Invalid file type",
            "details": "Please upload Excel (.xlsx, .xls), CSV (.csv), or text (.txt) files",
            "allowed_types": list(allowed_extensions)
        }), 400
    
    try:
        # Read file based on extension
        if file_ext in ('xlsx', 'xls'):
            df = pd.read_excel(file)
        elif file_ext == 'csv':
            df = pd.read_csv(file)
        else:  # txt
            df = pd.read_csv(file, delimiter='\t')
        
        # Process the data
        shipping_data = process_shipping_data(df)
        
        # Create CSV in memory
        output = io.StringIO()
        shipping_data.to_csv(output, index=False)
        csv_content = output.getvalue()
        
        # Return as base64 encoded string
        return jsonify({
            "status": "success",
            "filename": f"{os.path.splitext(file.filename)[0]}_processed.csv",
            "data": base64.b64encode(csv_content.encode()).decode('utf-8')
        })
    
    except pd.errors.EmptyDataError:
        return jsonify({"error": "Empty file", "details": "The uploaded file contains no data"}), 400
    except Exception as e:
        return jsonify({
            "error": "Processing error",
            "details": str(e),
            "type": type(e).__name__
        }), 500

def process_shipping_data(df):
    """Process raw data into shipping format with robust column matching."""
    # Column mapping with flexible matching
    column_map = {
        'ToName': ['Customer Name', 'Name', 'Recipient'],
        'ToStreet': ['Ship to Address 1', 'Address 1', 'Street'],
        'ToStreet2': ['Ship to Address 2', 'Address 2'],
        'ToCity': ['City'],
        'ToState': ['State', 'Province'],
        'ToZip': ['Zip', 'Postal Code', 'Zip Code'],
        'ToPhone': ['Customer Phone Number', 'Phone', 'Contact Number'],
        'Description': ['Item Description', 'Product Description'],
        'order num': ['Order#', 'Order Number', 'Order ID']
    }
    
    # Create empty shipping dataframe with all required columns
    shipping_columns = [
        'FromName', 'FromCompany', 'FromStreet', 'FromStreet2', 'FromCity', 
        'FromState', 'FromZip', 'FromPhone', 'ToName', 'ToCompany', 
        'ToStreet', 'ToStreet2', 'ToCity', 'ToState', 'ToZip', 'ToPhone',
        'Weight', 'Length', 'Width', 'Height', 'Description', 'order num', 
        'Reference2', 'Signature', 'Saturday'
    ]
    
    shipping_df = pd.DataFrame(columns=shipping_columns)
    
    # Find matching columns in input data
    matched_columns = {}
    for target_col, possible_sources in column_map.items():
        for source_col in possible_sources:
            if source_col in df.columns:
                matched_columns[target_col] = source_col
                break
    
    # Process each row
    for _, row in df.iterrows():
        new_row = {col: "" for col in shipping_columns}  # Initialize with empty strings
        
        # Map values from source to target columns
        for target_col, source_col in matched_columns.items():
            if pd.notna(row[source_col]):
                new_row[target_col] = str(row[source_col]).strip()
        
        # Use pandas concat instead of append (which is deprecated)
        shipping_df = pd.concat([shipping_df, pd.DataFrame([new_row])], ignore_index=True)
    
    return shipping_df

# For local development
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)