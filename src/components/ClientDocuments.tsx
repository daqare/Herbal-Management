import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  ExternalLink, 
  FileIcon,
  Search,
  Filter,
  X,
  Upload,
  Sparkles,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useDocuments } from '../hooks/useDocuments';
import { MedicalDocument } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeMedicalDocument } from '../services/geminiService';
import { toast } from 'sonner';

interface ClientDocumentsProps {
  clientId: string;
}

const ClientDocuments: React.FC<ClientDocumentsProps> = ({ clientId }) => {
  const { documents, loading, addDocument, deleteDocument } = useDocuments(clientId);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MedicalDocument['type']>('Lab Report');
  const [url, setUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) resolve(base64String);
        else reject('Failed to convert file');
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (!url && !selectedFile) {
      toast.error('Please provide a URL or upload a file');
      return;
    }

    let summary = '';
    setIsProcessing(true);

    try {
      if (selectedFile) {
        const base64 = await fileToBase64(selectedFile);
        summary = await analyzeMedicalDocument(base64, selectedFile.type);
      }

      await addDocument({
        clientId,
        title,
        type,
        fileUrl: url || (selectedFile ? `Uploaded Analysis: ${selectedFile.name}` : ''),
        contentSummary: summary || undefined,
        date: new Date(date)
      });

      setTitle('');
      setUrl('');
      setSelectedFile(null);
      setIsAdding(false);
      toast.success('Document added and analyzed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to process document');
    } finally {
      setIsProcessing(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Lab Report': return <FileText className="w-5 h-5" />;
      case 'Prescription': return <FileIcon className="w-5 h-5 text-blue-500" />;
      case 'Image': return <FileIcon className="w-5 h-5 text-orange-500" />;
      default: return <FileText className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Medical Documents</h3>
          <p className="text-xs text-zinc-500">Manage lab reports, prescriptions, and images.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-emerald-800 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Link Document
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">New Document Link</h4>
              <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-zinc-100 rounded-full">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Blood Test Results"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Document Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Lab Report">Lab Report</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Image">Image</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">File/Drive URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  disabled={!!selectedFile}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">OR Upload from PC (AI Analysis Only)</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    className="hidden"
                    id="file-upload"
                    disabled={!!url}
                  />
                  <label
                    htmlFor="file-upload"
                    className={cn(
                      "flex items-center gap-2 w-full px-4 py-2 bg-zinc-50 border border-zinc-200 border-dashed rounded-lg text-sm cursor-pointer hover:bg-zinc-100 transition-colors",
                      url && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Upload className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-600 truncate">
                      {selectedFile ? selectedFile.name : 'Select Image or PDF'}
                    </span>
                  </label>
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 text-zinc-500 font-bold text-sm hover:bg-zinc-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-emerald-800 transition-all shadow-md shadow-emerald-100 disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Save & Analyze
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-zinc-400">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
            <FileText className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
            <p className="text-zinc-400 italic">No documents linked for this client.</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:border-primary/30 transition-all group relative">
              <button
                onClick={() => deleteDocument(doc.id)}
                className="absolute top-4 right-4 p-1.5 text-zinc-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
                  {getIcon(doc.type)}
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 leading-tight mb-1 truncate max-w-[150px]">{doc.title}</h4>
                  <p className="text-[10px] uppercase font-black text-zinc-400 tracking-wider bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 inline-block">
                    {doc.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                <span className="text-[10px] font-bold text-zinc-400">{format(doc.date.toDate(), 'PP')}</span>
                {doc.fileUrl?.startsWith('http') ? (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
                  >
                    View File
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    AI Summary Only
                  </span>
                )}
              </div>
              {doc.contentSummary && (
                <div className="mt-3 p-2 bg-emerald-50/50 rounded-lg border border-emerald-100/50">
                  <p className="text-[10px] text-emerald-800 leading-relaxed line-clamp-3 italic">
                    "{doc.contentSummary}"
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientDocuments;
