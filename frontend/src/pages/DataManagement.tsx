import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Upload, FileText, CheckCircle, Database } from 'lucide-react';
import Papa from 'papaparse';

export const DataManagement: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [parsedRows, setParsedRows] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setUploadStatus('uploading');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        setTimeout(() => {
          setParsedRows(results.data.length);
          setUploadStatus('success');
        }, 1500); // Simulate network
      },
      error: () => {
        setUploadStatus('error');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
        <p className="text-slate-500">Manage synthetic patient datasets and CSV uploads.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Current Dataset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Source</span>
              <span className="font-medium text-sm">Synthetic Demo Generator</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Number of Records</span>
              <span className="font-medium text-sm">150</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Number of Features</span>
              <span className="font-medium text-sm">18</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Last Updated</span>
              <span className="font-medium text-sm">Today, 08:00 AM</span>
            </div>

            <div className="pt-4 flex gap-3">
              <Button variant="outline" className="w-full"><Database size={16} className="mr-2"/> Refresh Data</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Upload Custom Dataset</CardTitle>
            <CardDescription>Upload a CSV with patient features.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center bg-slate-50 transition-colors hover:bg-slate-100">
              {uploadStatus === 'success' ? (
                <div className="flex flex-col items-center space-y-2 text-success">
                  <CheckCircle size={40} />
                  <p className="font-medium text-slate-900">Upload Successful</p>
                  <p className="text-sm text-slate-500">{parsedRows} records processed</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <Upload size={24} className="text-primary" />
                  </div>
                  <div>
                    <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
                      Click to browse
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                    </label>
                    <p className="text-xs text-slate-500 mt-1">{file ? file.name : "or drag and drop CSV here"}</p>
                  </div>
                </div>
              )}
            </div>

            {uploadStatus !== 'success' && (
              <div className="mt-4">
                <Button 
                  className="w-full" 
                  disabled={!file || uploadStatus === 'uploading'}
                  onClick={handleUpload}
                >
                  {uploadStatus === 'uploading' ? 'Processing...' : 'Upload Data'}
                </Button>
              </div>
            )}
            {uploadStatus === 'success' && (
              <div className="mt-4">
                <Button className="w-full" variant="outline" onClick={() => {setFile(null); setUploadStatus('idle');}}>Upload Another</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
