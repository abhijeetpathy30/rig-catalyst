import React, { useState, useRef } from 'react';
import { FileText, Link as LinkIcon, UploadCloud, X, File as FileIcon, ChevronDown, Crosshair } from 'lucide-react';
import { Attachment } from '../types';

interface InputSectionProps {
  onAnalyze: (text: string, attachment: Attachment | null, link: string | null, mode: string) => void;
  buttonLabel: string;
  colorClass: string;
  initialText?: string;
  initialLink?: string;
}

export const InputSection: React.FC<InputSectionProps> = ({ 
  onAnalyze, 
  buttonLabel, 
  colorClass,
  initialText = '',
  initialLink = ''
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'link' | 'file'>('text');
  const [text, setText] = useState(initialText);
  const [link, setLink] = useState(initialLink);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisMode, setAnalysisMode] = useState('GENERAL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setActiveTab('file');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    let attachment: Attachment | null = null;
    
    if (activeTab === 'file' && file) {
      // Convert to Base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });
      attachment = { mimeType: file.type, data: base64 };
    }

    onAnalyze(
      activeTab === 'text' ? text : '', 
      attachment, 
      activeTab === 'link' ? link : null,
      analysisMode
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-visible border border-slate-100 dark:border-slate-700">
      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-all ${activeTab === 'text' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          <FileText size={16} className="mr-2" /> Text / Abstract
        </button>
        <button
          onClick={() => setActiveTab('link')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-all ${activeTab === 'link' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          <LinkIcon size={16} className="mr-2" /> Web Link
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-all ${activeTab === 'file' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          <UploadCloud size={16} className="mr-2" /> Upload PDF
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'text' && (
          <textarea
            className="w-full h-40 p-4 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100"
            placeholder="Paste your abstract, notes, or research hypothesis here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}

        {activeTab === 'link' && (
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Enter a URL to a paper, journal article, or news report. The AI will access it in real-time.</p>
            <input
              type="url"
              className="w-full p-4 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100"
              placeholder="https://nature.com/articles/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        )}

        {activeTab === 'file' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center transition-all ${
              isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 bg-slate-50 dark:bg-slate-900'
            }`}
          >
            {file ? (
              <div className="text-center p-4">
                <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileIcon size={24} />
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-xs">{file.name}</p>
                <button 
                  onClick={() => setFile(null)}
                  className="mt-3 text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Remove File
                </button>
              </div>
            ) : (
              <>
                <UploadCloud size={32} className="text-slate-400 mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Drag & Drop PDF here</p>
                <p className="text-slate-400 text-sm mb-3">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Browse Files
                </button>
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,image/*"
              onChange={handleFileChange}
            />
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
            {/* Analysis Mode Selector */}
            <div className="relative w-full sm:w-1/2">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                    <Crosshair size={18} />
                </div>
                <select 
                    value={analysisMode}
                    onChange={(e) => setAnalysisMode(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 font-medium appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <option value="GENERAL">General Summary</option>
                    <option value="GAPS">Gap Detector</option>
                    <option value="FUSION">Idea Fusion Lab</option>
                    <option value="PROPOSAL">Proposal Builder</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                    <ChevronDown size={18} />
                </div>
            </div>

            <button
            onClick={handleSubmit}
            disabled={
                (activeTab === 'text' && !text.trim()) ||
                (activeTab === 'link' && !link.trim()) ||
                (activeTab === 'file' && !file)
            }
            className={`w-full sm:w-1/2 py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`}
            >
            {buttonLabel}
            </button>
        </div>
      </div>
    </div>
  );
};