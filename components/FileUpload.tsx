'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  requestId?: string;
  onUpload?: (file: UploadedFile) => void;
  onAnalysis?: (analysis: any) => void;
}

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  aiAnalysis?: any;
}

export default function FileUpload({ requestId, onUpload, onAnalysis }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    setError(null);
    setUploading(true);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (requestId) formData.append('requestId', requestId);
        formData.append('analyze', 'true');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error('Upload failed');
        }

        const data = await res.json();
        const uploadedFile: UploadedFile = {
          id: data.id,
          filename: data.filename,
          originalName: data.originalName,
          mimeType: data.mimeType,
          size: data.size,
          aiAnalysis: data.aiAnalysis,
        };

        setUploadedFiles((prev) => [...prev, uploadedFile]);
        onUpload?.(uploadedFile);

        if (data.aiAnalysis) {
          onAnalysis?.(data.aiAnalysis);
        }
      } catch (err) {
        setError(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
  };

  const removeFile = async (fileId: string) => {
    try {
      await fetch(`/api/upload?id=${fileId}`, { method: 'DELETE' });
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />
        
        <div className="text-3xl mb-2">📎</div>
        <p className="text-surface-300 mb-1">
          {isDragging ? 'Drop files here' : 'Drag & drop files or click to upload'}
        </p>
        <p className="text-xs text-surface-500">
          Supports: Images, PDFs, Documents, Spreadsheets
        </p>
        
        {uploading && (
          <div className="mt-3 flex items-center justify-center gap-2 text-primary-400">
            <span className="animate-spin">⏳</span>
            <span className="text-sm">Uploading & analyzing...</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Uploaded Files */}
      <AnimatePresence>
        {uploadedFiles.map((file) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 bg-surface-800/30 border border-surface-700/50 rounded-lg"
          >
            <span className="text-2xl">
              {file.mimeType.startsWith('image/') ? '🖼️' :
               file.mimeType === 'application/pdf' ? '📄' :
               file.mimeType.includes('spreadsheet') || file.mimeType.includes('excel') ? '📊' :
               '📁'}
            </span>
            
            <div className="flex-1 min-w-0">
              <div className="text-sm text-surface-200 truncate">{file.originalName}</div>
              <div className="text-xs text-surface-500">{formatFileSize(file.size)}</div>
            </div>

            {file.aiAnalysis && (
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                ✓ Analyzed
              </span>
            )}

            <button
              onClick={() => removeFile(file.id)}
              className="p-1.5 text-surface-500 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* AI Analysis Results */}
      {uploadedFiles.some((f) => f.aiAnalysis) && (
        <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span>🤖</span>
            <span className="text-sm font-medium text-primary-400">AI Analysis</span>
          </div>
          {uploadedFiles.filter((f) => f.aiAnalysis).map((file) => (
            <div key={file.id} className="text-sm text-surface-300">
              {file.aiAnalysis.documentType && (
                <p>Document Type: <span className="text-surface-200 capitalize">{file.aiAnalysis.documentType}</span></p>
              )}
              {file.aiAnalysis.vendor && (
                <p>Vendor: <span className="text-surface-200">{file.aiAnalysis.vendor}</span></p>
              )}
              {file.aiAnalysis.totalAmount && (
                <p>Amount: <span className="text-emerald-400 font-medium">${file.aiAnalysis.totalAmount.toLocaleString()}</span></p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
