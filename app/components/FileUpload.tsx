"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function FileUpload({ onFileSelect, isLoading = false }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'], 
      'application/pdf': ['.pdf'], // Just in case, can remove
      'text/csv': ['.csv'] // For backtests
    },
    disabled: isLoading
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={twMerge(
          "relative border-2 border-dashed rounded-xl p-10 transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center text-center",
          isDragActive 
            ? "border-blue-500 bg-blue-50/10 scale-[1.02]" 
            : "border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50/5 dark:hover:bg-slate-800/50",
          isLoading && "opacity-50 cursor-not-allowed pointer-events-none",
          error && "border-red-500 bg-red-50/10"
        )}
      >
        <input {...getInputProps()} />
        
        {file ? (
          <div className="flex items-center gap-4 w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-lg relative group">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
            <div className="flex-1 text-left truncate">
              <p className="font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isLoading && (
              <button
                onClick={removeFile}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 hover:text-red-500 transition-colors" />
              </button>
            )}
            {isLoading && (
               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
              <Upload className={twMerge("w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors", isDragActive && "text-blue-500")} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              {isDragActive ? "Drop file here" : "Drag & Drop file"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              or click to browse
            </p>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Supports Images, PDF, CSV (Max 10MB)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
