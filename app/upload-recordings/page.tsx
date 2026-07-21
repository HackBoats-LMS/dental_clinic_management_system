'use client';

import { useState } from 'react';

export default function UploadRecordingsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a file first.');
      return;
    }

    setLoading(true);
    setStatus('Uploading and processing...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/recordings/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setStatus(`Success! Uploaded ${result.successCount} recordings.`);
        if (result.errors) {
          setStatus((prev) => prev + ` However, ${result.errors.length} errors occurred. Check console for details.`);
          console.error(result.errors);
        }
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('An unexpected error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg mt-10">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Upload Recordings from Excel</h1>
        
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-2">Instructions:</p>
          <p>Please ensure your Excel file has the following column headers exactly as written:</p>
          <code className="block mt-2 bg-white dark:bg-gray-900 p-2 rounded">
            id | fileName | mimeType | driveLink | date | phoneNumber | Transcript
          </code>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Excel File (.xlsx, .xls, .csv)
            </label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                dark:file:bg-blue-900 dark:file:text-blue-200
                hover:file:bg-blue-100 dark:hover:file:bg-blue-800
                cursor-pointer"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading...' : 'Upload Excel Sheet'}
          </button>

          {status && (
            <div className={`mt-4 p-4 rounded-lg ${status.includes('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {status}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
