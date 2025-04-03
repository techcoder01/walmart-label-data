document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('file');
    const submitBtn = document.getElementById('submit-btn');
    const loading = document.getElementById('loading');
    const alertContainer = document.getElementById('alert-container');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!fileInput.files.length) {
            showAlert('Please select a file to upload', 'error');
            return;
        }
        
        const file = fileInput.files[0];
        const allowedExtensions = ['.xlsx', '.xls', '.csv', '.txt'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            showAlert('Invalid file type. Please upload an Excel, CSV, or TXT file.', 'error');
            return;
        }
        
        // Show loading spinner
        submitBtn.disabled = true;
        loading.classList.remove('hidden');
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'An error occurred while processing the file');
            }
            
            // Decode base64 data and create download link
            const decodedData = atob(result.data);
            const blob = new Blob([decodedData], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            showAlert('File processed successfully! Downloading...', 'success');
            fileInput.value = '';
            
        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            // Hide loading spinner
            submitBtn.disabled = false;
            loading.classList.add('hidden');
        }
    });
    
    function showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        
        alert.innerHTML = `
            <span>${message}</span>
            <button class="alert-close">&times;</button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Add event listener to close button
        alert.querySelector('.alert-close').addEventListener('click', function() {
            alert.remove();
        });
        
        // Auto-close success alerts after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        }
    }
});