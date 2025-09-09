import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { GoogleDriveService, DriveFile } from "./services/GoogleDriveService";
import { DocumentFormatter } from "./services/DocumentFormatter";
import { CitationFormatter, CitationStyle } from "./services/CitationFormatter";
import { CompareChanges } from "./dashboard/CompareChanges";
import { TemplateLibrary } from "./dashboard/TemplateLibrary";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  Download, 
  History, 
  LogOut,
  CheckCircle,
  AlertCircle,
  Loader2,
  File,
  Folder,
  Calendar,
  GitCompare,
  Library
} from "lucide-react";

interface ProcessingState {
  stage: 'idle' | 'uploading-template' | 'parsing-template' | 'uploading-draft' | 'parsing-draft' | 'formatting' | 'saving' | 'complete';
  progress: number;
  message: string;
}

export function Dashboard() {
  const { user, logout, getDriveAccessToken } = useAuth();
  const [driveService, setDriveService] = useState<GoogleDriveService | null>(null);
  const [documentFormatter] = useState(new DocumentFormatter());
  const [citationFormatter] = useState(new CitationFormatter());
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [originalText, setOriginalText] = useState<string>('');
  const [formattedText, setFormattedText] = useState<string>('');
  const [formattedDocBlob, setFormattedDocBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({
    stage: 'idle',
    progress: 0,
    message: 'Siap untuk memformat dokumen'
  });
  const [formattedReports, setFormattedReports] = useState<DriveFile[]>([]);
  const [templateHistory, setTemplateHistory] = useState<DriveFile[]>([]);
  const [draftHistory, setDraftHistory] = useState<DriveFile[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    studentId: '',
    program: '',
    university: '',
    year: new Date().getFullYear().toString(),
  });
  const [changeSummary, setChangeSummary] = useState<{
    addedChapters: string[];
    renumberedSubsections: number;
    tableCaptions: number;
    figureCaptions: number;
    referencesCount: number;
    tocGenerated?: boolean;
    coverPageAdded?: boolean;
    appendicesAdded?: boolean;
    technicalContentMoved?: number;
    cleanTocEntries?: number;
  } | null>(null);
  const [originalParsed, setOriginalParsed] = useState<any | null>(null);
  const [rawReferences, setRawReferences] = useState<string>('');
  const [parsedReferencesPreview, setParsedReferencesPreview] = useState<string[]>([]);

  // Prefill author from user when available
  useEffect(()=>{
    setMetadata(m => ({ ...m, author: m.author || (user?.name || '') }));
  },[user]);

  useEffect(() => {
    const token = getDriveAccessToken();
    if (token) {
      const service = new GoogleDriveService(() => getDriveAccessToken());
      setDriveService(service);
    }
  }, [getDriveAccessToken]);

  useEffect(() => {
    if (driveService && activeTab === 'history') {
      loadHistory();
    }
  }, [driveService, activeTab]);

  const loadHistory = async () => {
    if (!driveService) return;
    
    try {
      const [formatted, templates, drafts] = await Promise.all([
        driveService.getFormattedReportsHistory(),
        driveService.getTemplatesHistory(),
        driveService.getDraftsHistory(),
      ]);
      
      setFormattedReports(formatted);
      setTemplateHistory(templates);
      setDraftHistory(drafts);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Gagal memuat riwayat dokumen');
    }
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setTemplateFile(file);
        toast.success(`Template "${file.name}" berhasil diunggah`);
      } else {
        toast.error('Harap unggah file PDF atau DOCX untuk template');
      }
    }
  };

  const handleDraftUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setDraftFile(file);
        toast.success(`Draft "${file.name}" berhasil diunggah`);
      } else {
        toast.error('Harap unggah file PDF atau DOCX untuk draft');
      }
    }
  };

  const processDocuments = async () => {
    if (!templateFile || !draftFile || !driveService) {
      toast.error('Harap unggah template dan draft terlebih dahulu');
      return;
    }

    if (!metadata.title.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }
    if (!metadata.author.trim()) {
      toast.error('Nama penulis wajib diisi');
      return;
    }

    try {
      // Stage 1: Upload and parse template
      setProcessing({ stage: 'uploading-template', progress: 10, message: 'Mengunggah template ke Google Drive...' });
      await driveService.saveTemplate(templateFile);
      
      setProcessing({ stage: 'parsing-template', progress: 20, message: 'Menganalisis styling template...' });
      await documentFormatter.parseTemplate(templateFile);
      
      // Stage 2: Upload and parse draft
      setProcessing({ stage: 'uploading-draft', progress: 40, message: 'Mengunggah draft ke Google Drive...' });
      await driveService.saveDraft(draftFile);
      
      setProcessing({ stage: 'parsing-draft', progress: 50, message: 'Mengekstrak konten dari draft...' });
  const parsedContent = await documentFormatter.parseDraft(draftFile);
  setOriginalParsed(parsedContent);
  setOriginalText(documentFormatter.getPlainText(parsedContent));
      
      // Stage 3: Format document
      setProcessing({ stage: 'formatting', progress: 70, message: 'Menerapkan format template dan membuat daftar isi...' });
  // Integrate references (optional) BEFORE formatting
  // Enhanced reference processing with better formatting
  try {
    if (rawReferences.trim()) {
      const citations = parseRawReferences(rawReferences);
      // Generate formatted bibliography using selected style
      const formattedBiblio = citations.map(c => citationFormatter.formatFullReference(c));
      parsedContent.references = formattedBiblio.map(line => ({ text: line, type: 'other' }));
      setParsedReferencesPreview(formattedBiblio.slice(0,5));
      toast.success(`${citations.length} referensi berhasil diformat`);
    } else {
      // Add placeholder bibliography if no references provided
      parsedContent.references = [{ text: 'Daftar Pustaka (belum diisi)', type: 'other' }];
    }
  } catch (refErr) {
    console.warn('Gagal memproses referensi, menggunakan teks mentah.', refErr);
    if (rawReferences.trim()) {
      parsedContent.references = rawReferences.split(/\n+/).map(l=>({ text: l.trim(), type:'other'})).filter(r=>r.text.length>0);
    } else {
      parsedContent.references = [{ text: 'Daftar Pustaka (belum diisi)', type: 'other' }];
    }
  }

  // Enhanced document formatting with full academic structure
  const { docxBlob, pdfBlob, formattedText: finalText, structured } = await documentFormatter.formatDocument(parsedContent, {
    title: metadata.title || undefined,
    author: metadata.author || undefined,
    studentId: metadata.studentId || undefined,
    program: metadata.program || undefined,
    university: metadata.university || undefined,
    year: metadata.year || undefined,
  });
  setFormattedDocBlob(docxBlob);
  setFormattedText(finalText);
  
  // Enhanced change summary with detailed tracking
  try {
    const summary = (() => {
      const addedChapters: string[] = [];
      const origTitles = new Set((parsedContent.sections || []).map((s:any)=> s.title.toUpperCase().replace(/\s+/g,' ').trim()));
      
      // Track added chapters (standard BAB structure)
      (structured.sections || []).forEach((s:any)=>{
        const base = s.title.toUpperCase().replace(/\s+/g,' ').trim();
        if (!origTitles.has(base)) {
          // Only count standard BAB pattern additions
          if (/^BAB\s+[IVX]+/.test(base)) addedChapters.push(s.title);
        }
      });
      
      // Track renumbered subsections
      let renumbered = 0;
      (structured.sections || []).forEach((sec:any, idx:number)=>{
        const originalSec = (parsedContent.sections||[])[idx];
        if (!originalSec) return;
        const origSubs = originalSec.subsections || [];
        const newSubs = sec.subsections || [];
        newSubs.forEach((sub:any, i:number)=>{
          const o = origSubs[i];
          if (!o) return;
          const origPrefix = (o.title.match(/^(\d+(?:\.\d+)*)/)||[])[1];
          const newPrefix = (sub.title.match(/^(\d+(?:\.\d+)*)/)||[])[1];
          if (origPrefix && newPrefix && origPrefix !== newPrefix) renumbered++;
          if (!origPrefix && newPrefix) renumbered++;
        });
      });
      
      // Count formatted elements
      const tableCaptions = (structured.tables||[]).length;
      const figureCaptions = (structured.figures||[]).length;
      const referencesCount = (structured.references||[]).length;
      
      // Count technical content moved to appendices
      const technicalContentMoved = (structured.appendices || []).reduce((acc, app) => 
        acc + (app.type === 'sql' || app.type === 'code' ? app.content.length : 0), 0
      );
      
      // Count clean TOC entries (only proper headings)
      const cleanTocEntries = (structured.sections || [])
        .filter((s:any) => s.title.startsWith('BAB') && s.level === 1)
        .reduce((acc:number, s:any) => {
          const subsectionCount = (s.subsections || [])
            .filter((sub:any) => /^\d+\.\d+\s+/.test(sub.title)).length;
          return acc + 1 + subsectionCount; // 1 for section + subsections
        }, 0) + 2; // +2 for DAFTAR PUSTAKA and LAMPIRAN
      
      // Additional tracking
      const tocGenerated = cleanTocEntries > 2; // More than just bibliography and appendices
      const coverPageAdded = !!(structured.metadata?.title && structured.metadata?.author);
      const appendicesAdded = (structured.appendices || []).length > 0;
      
      return { 
        addedChapters, 
        renumberedSubsections: renumbered, 
        tableCaptions, 
        figureCaptions, 
        referencesCount,
        tocGenerated,
        coverPageAdded,
        appendicesAdded,
        technicalContentMoved,
        cleanTocEntries
      };
    })();
    setChangeSummary(summary);
    
    // Success notifications for each major formatting achievement
    if (summary.coverPageAdded) toast.success('Halaman sampul berhasil dibuat');
    if (summary.tocGenerated) toast.success(`Daftar isi bersih dengan ${summary.cleanTocEntries} entri berhasil dibuat`);
    if (summary.tableCaptions > 0) toast.success(`${summary.tableCaptions} caption tabel diterapkan`);
    if (summary.figureCaptions > 0) toast.success(`${summary.figureCaptions} caption gambar diterapkan`);
    if (summary.referencesCount > 0) toast.success(`Daftar pustaka dengan ${summary.referencesCount} referensi berhasil diformat`);
    if (summary.technicalContentMoved > 0) toast.success(`${summary.technicalContentMoved} baris kode/query dipindah ke lampiran`);
    if (summary.appendicesAdded) toast.success('Bagian lampiran berhasil ditambahkan');
    
  } catch (e) {
    console.warn('Gagal membuat ringkasan perubahan', e);
  }
      
      // Stage 4: Save formatted documents
      setProcessing({ stage: 'saving', progress: 90, message: 'Menyimpan dokumen yang diformat ke Google Drive...' });
      const baseName = draftFile.name.replace(/\.[^/.]+$/, "");
      await driveService.saveFormattedReport(docxBlob, pdfBlob, baseName);
      
      // Stage 5: Complete
      setProcessing({ stage: 'complete', progress: 100, message: 'Dokumen berhasil diformat dan disimpan!' });
      
      // Download the formatted files
      const docxUrl = URL.createObjectURL(docxBlob);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      const docxLink = document.createElement('a');
      docxLink.href = docxUrl;
      docxLink.download = `formatted_${baseName}.docx`;
      docxLink.click();
      
      const pdfLink = document.createElement('a');
      pdfLink.href = pdfUrl;
      pdfLink.download = `formatted_${baseName}.pdf`;
      pdfLink.click();
      
      // Clean up
      URL.revokeObjectURL(docxUrl);
      URL.revokeObjectURL(pdfUrl);
      
      toast.success('Dokumen berhasil diformat dan disimpan ke Google Drive!');
      
      // Switch to compare tab to show results
      setTimeout(() => {
        setActiveTab('compare');
      }, 2000);
      
      // Reset for next processing
      setTimeout(() => {
        setProcessing({ stage: 'idle', progress: 0, message: 'Siap untuk memformat dokumen' });
        setTemplateFile(null);
        setDraftFile(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error processing documents:', error);
      toast.error('Gagal memproses dokumen. Silakan coba lagi.');
      setProcessing({ stage: 'idle', progress: 0, message: 'Siap untuk memformat dokumen' });
    }
  };

  const downloadFile = async (file: DriveFile) => {
    if (!driveService) return;
    
    try {
      const blob = await driveService.downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`File "${file.name}" berhasil diunduh`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Gagal mengunduh file');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStageIcon = () => {
    switch (processing.stage) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'idle':
        return <Upload className="w-5 h-5" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Auto Report Formatter</h1>
              <p className="text-sm text-gray-600">Selamat datang kembali, {user?.name}</p>
            </div>
            <Button 
              onClick={logout}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Unggah & Format</span>
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center space-x-2">
              <GitCompare className="w-4 h-4" />
              <span>Bandingkan</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <Library className="w-4 h-4" />
              <span>Template</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Riwayat</span>
            </TabsTrigger>
          </TabsList>

          {/* Upload & Format Tab */}
          <TabsContent value="upload" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Template Upload */}
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Upload className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>1. Unggah Template</span>
                  </CardTitle>
                  <CardDescription>
                    Unggah template laporan Anda (PDF/DOCX) untuk mengekstrak aturan styling
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleTemplateUpload}
                      className="hidden"
                      id="template-upload"
                    />
                    <label htmlFor="template-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Klik untuk unggah template atau seret file ke sini
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF atau DOCX, maks 10MB</p>
                    </label>
                  </div>
                  {templateFile && (
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-blue-800">{templateFile.name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Draft Upload */}
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-green-600" />
                    </div>
                    <span>2. Unggah Draft</span>
                  </CardTitle>
                  <CardDescription>
                    Unggah draft laporan Anda yang perlu diformat
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleDraftUpload}
                      className="hidden"
                      id="draft-upload"
                    />
                    <label htmlFor="draft-upload" className="cursor-pointer">
                      <FileText className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Klik untuk unggah draft atau seret file ke sini
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF atau DOCX, maks 10MB</p>
                    </label>
                  </div>
                  {draftFile && (
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-800">{draftFile.name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Metadata Form with Academic Focus */}
            <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-orange-600" />
                  </div>
                  <span>3. Informasi Halaman Sampul (Wajib)</span>
                </CardTitle>
                <CardDescription>
                  Data ini akan digunakan untuk membuat halaman sampul resmi sesuai standar universitas
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="p-4 bg-orange-100 rounded-md mb-4">
                    <h4 className="font-semibold text-orange-800 mb-2">📋 Komponen Halaman Sampul</h4>
                    <p className="text-sm text-orange-700">
                      Sistem akan membuat halaman sampul resmi dengan logo universitas (placeholder), 
                      nama fakultas, judul penelitian, data penulis, dan tahun pembuatan.
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Judul Laporan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={metadata.title}
                      onChange={e=>setMetadata(m=>({...m,title:e.target.value}))}
                      placeholder="Contoh: SISTEM INFORMASI MANAJEMEN PERPUSTAKAAN BERBASIS WEB"
                      className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                    {!metadata.title.trim() && (
                      <p className="text-xs text-red-500 mt-1">Judul wajib diisi untuk halaman sampul</p>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Nama Lengkap Penulis <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={metadata.author}
                        onChange={e=>setMetadata(m=>({...m,author:e.target.value}))}
                        placeholder="Nama Lengkap Mahasiswa"
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                      {!metadata.author.trim() && (
                        <p className="text-xs text-red-500 mt-1">Nama penulis wajib diisi</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        NIM (Nomor Induk Mahasiswa)
                      </label>
                      <input
                        type="text"
                        value={metadata.studentId}
                        onChange={e=>setMetadata(m=>({...m,studentId:e.target.value}))}
                        placeholder="Contoh: 20210001"
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Program Studi
                      </label>
                      <input
                        type="text"
                        value={metadata.program}
                        onChange={e=>setMetadata(m=>({...m,program:e.target.value}))}
                        placeholder="Contoh: Teknik Informatika / Sistem Informasi"
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Tahun
                      </label>
                      <input
                        type="text"
                        value={metadata.year}
                        onChange={e=>setMetadata(m=>({...m,year:e.target.value}))}
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Nama Universitas
                    </label>
                    <input
                      type="text"
                      value={metadata.university}
                      onChange={e=>setMetadata(m=>({...m,university:e.target.value}))}
                      placeholder="Contoh: Universitas Indonesia"
                      className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-md border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-3">Preview Halaman Sampul</h4>
                    <div className="text-xs text-gray-600 space-y-2 text-center">
                      <div className="border border-gray-200 p-3 rounded">
                        <div className="text-xs text-gray-400 mb-2">[LOGO UNIVERSITAS]</div>
                        <div className="font-bold text-xs">{metadata.university || 'UNIVERSITAS'}</div>
                        <div className="text-xs mt-1">FAKULTAS/PROGRAM STUDI</div>
                        <div className="text-xs">{metadata.program || 'PROGRAM STUDI'}</div>
                        <div className="mt-3 font-bold text-xs">{metadata.title || 'JUDUL LAPORAN'}</div>
                        <div className="mt-3">
                          <div className="text-xs">Disusun oleh:</div>
                          <div className="font-bold text-xs">{metadata.author || 'NAMA PENULIS'}</div>
                          {metadata.studentId && <div className="text-xs">NIM: {metadata.studentId}</div>}
                        </div>
                        <div className="mt-3 font-bold text-xs">{metadata.year}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-orange-50 p-4 rounded-md text-sm text-gray-700">
                    <p className="font-medium text-orange-800">📌 Catatan Penting:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Judul & Nama Penulis wajib diisi</li>
                      <li>Data ini akan tampil di halaman sampul resmi</li>
                      <li>Format sesuai standar akademik universitas</li>
                      <li>Logo universitas akan ditambahkan secara otomatis</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced References Input */}
            <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-teal-600" />
                  </div>
                  <span>4. Daftar Pustaka (Opsional)</span>
                </CardTitle>
                <CardDescription>
                  Masukkan referensi untuk diformat otomatis sesuai standar akademik. Jika kosong, placeholder akan ditambahkan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div className="p-4 bg-teal-100 rounded-md">
                      <h4 className="font-semibold text-teal-800 mb-2">📚 Tentang Daftar Pustaka</h4>
                      <p className="text-sm text-teal-700 mb-2">
                        Sistem akan secara otomatis memformat referensi sesuai gaya sitasi yang dipilih (APA, IEEE, Chicago, Harvard).
                        Jika tidak ada referensi, placeholder akan ditambahkan yang bisa diisi kemudian.
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Referensi (satu per baris)
                      </label>
                      <textarea
                        value={rawReferences}
                        onChange={e=>setRawReferences(e.target.value)}
                        placeholder={`Contoh format yang dapat dikenali:

Smith, J. (2020). Machine Learning Basics. Springer.
Doe, A. & Roe, B. (2022). Deep Learning Advances. IEEE Transactions on AI, 15(2), 123-145.
Johnson, M. (2021). Data Science Fundamentals. MIT Press.
Brown, K. et al. (2023). Neural Networks in Practice. Nature Computing, 8, 45-67.

Tips:
- Gunakan format: Penulis (Tahun). Judul. Penerbit/Journal.
- Pisahkan penulis dengan & atau koma
- Tahun dalam kurung setelah nama penulis`}
                        rows={8}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">
                          Maksimal 200 referensi. Sistem akan memformat saat dokumen diproses.
                        </p>
                        <span className="text-xs text-gray-500">
                          {rawReferences.split('\n').filter(l => l.trim().length > 0).length} referensi
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-md border border-teal-200">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Gaya Sitasi
                      </label>
                      <select
                        defaultValue="APA"
                        onChange={(e) => citationFormatter.setStyle(e.target.value as CitationStyle)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      >
                        <option value="APA">APA (American Psychological Association)</option>
                        <option value="IEEE">IEEE (Institute of Electrical and Electronics Engineers)</option>
                        <option value="Chicago">Chicago Manual of Style</option>
                        <option value="Harvard">Harvard Referencing</option>
                      </select>
                      
                      <div className="mt-3 text-xs text-gray-600">
                        <strong>Contoh format APA:</strong><br/>
                        Smith, J. (2020). <em>Machine Learning Basics</em>. Springer.
                      </div>
                    </div>
                    
                    {parsedReferencesPreview.length > 0 && (
                      <div className="bg-white p-4 rounded-md border border-teal-200">
                        <p className="text-sm font-medium mb-2 text-gray-700">
                          Preview Formatted (5 pertama):
                        </p>
                        <ul className="text-xs space-y-2 max-h-40 overflow-auto">
                          {parsedReferencesPreview.map((r,i)=>(
                            <li key={i} className="p-2 bg-gray-50 rounded text-gray-700">
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="bg-teal-50 p-4 rounded-md text-sm">
                      <p className="font-medium text-teal-800 mb-2">✨ Fitur Otomatis:</p>
                      <ul className="list-disc list-inside space-y-1 text-teal-700 text-xs">
                        <li>Format sesuai gaya sitasi standar</li>
                        <li>Urutkan alfabetis otomatis</li>
                        <li>Deteksi format penulis-tahun</li>
                        <li>Placeholder jika kosong</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Format Document Section */}
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    {getStageIcon()}
                  </div>
                  <span>5. Format Laporan Akademik</span>
                </CardTitle>
                <CardDescription>
                  Terapkan format standar universitas lengkap dengan halaman sampul, daftar isi, penomoran, dan bibliography
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-purple-800">🎯 Yang Akan Dibuat Otomatis:</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Halaman Sampul</strong> - Logo, judul, penulis, NIM, universitas</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Daftar Isi</strong> - Otomatis dengan nomor halaman</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Daftar Tabel & Gambar</strong> - Jika ada elemen tersebut</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>BAB Standar</strong> - I. Pendahuluan, II. Landasan Teori, dll</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Penomoran Hierarkis</strong> - 1.1, 1.2, 2.1, 2.2, dst</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Caption Otomatis</strong> - Tabel 2.1, Gambar 3.1, dst</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Daftar Pustaka</strong> - Format sesuai gaya sitasi</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Bagian Lampiran</strong> - Siap untuk material pendukung</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-purple-800">📐 Standar Format:</h4>
                    <div className="bg-white p-4 rounded-md border border-purple-200">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li><strong>Font:</strong> Times New Roman 12pt</li>
                        <li><strong>Spasi:</strong> 1.5 (standar akademik)</li>
                        <li><strong>Margin:</strong> 1 inci semua sisi</li>
                        <li><strong>Penomoran:</strong> BAB I, II, III (Roman)</li>
                        <li><strong>Sub-bab:</strong> 1.1, 1.2, 1.1.1 (hierarkis)</li>
                        <li><strong>Tabel:</strong> Tabel 2.1, 2.2 (per BAB)</li>
                        <li><strong>Gambar:</strong> Gambar 3.1, 3.2 (per BAB)</li>
                        <li><strong>Referensi:</strong> Sesuai gaya sitasi</li>
                      </ul>
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded-md">
                      <p className="text-sm text-purple-700">
                        <strong>💡 Tips:</strong> Sistem akan secara otomatis menambahkan BAB yang hilang, 
                        memperbaiki penomoran, dan memastikan struktur sesuai standar universitas.
                      </p>
                    </div>
                  </div>
                </div>

                {processing.stage !== 'idle' && (
                  <div className="space-y-3 bg-white p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{processing.message}</span>
                      </span>
                      <span className="text-sm text-gray-500">{processing.progress}%</span>
                    </div>
                    <Progress value={processing.progress} className="w-full" />
                    <p className="text-xs text-gray-500">
                      Proses ini akan menghasilkan dokumen DOCX dan PDF dengan format akademik lengkap
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={processDocuments}
                  disabled={!templateFile || !draftFile || processing.stage !== 'idle'}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  size="lg"
                >
                  {processing.stage === 'idle' ? (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      🚀 Mulai Format Akademik Lengkap
                    </>
                  ) : processing.stage === 'complete' ? (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      ✅ Dokumen Siap Diunduh
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses Format Akademik...
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compare Changes Tab */}
          <TabsContent value="compare" className="space-y-6">
      {changeSummary && (
              <Card className="border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-emerald-700">Ringkasan Perubahan Format Akademik</CardTitle>
                  <CardDescription>Laporan otomatis standar universitas yang telah diterapkan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800">Struktur Dokumen</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        <li className={changeSummary.coverPageAdded ? "text-green-700" : "text-gray-500"}>
                          <span className="font-medium">Halaman Sampul:</span> {changeSummary.coverPageAdded ? '✓ Dibuat dengan metadata lengkap' : 'Tidak dibuat'}
                        </li>
                        <li className={changeSummary.tocGenerated ? "text-green-700" : "text-gray-500"}>
                          <span className="font-medium">Daftar Isi:</span> {changeSummary.tocGenerated ? `✓ Bersih dengan ${changeSummary.cleanTocEntries} entri` : 'Tidak dibuat'}
                        </li>
                        <li className={changeSummary.addedChapters.length > 0 ? "text-green-700" : "text-blue-700"}>
                          <span className="font-medium">BAB ditambahkan:</span> {changeSummary.addedChapters.length > 0 ? changeSummary.addedChapters.join(', ') : 'Semua BAB sudah ada'} 
                        </li>
                        <li className={changeSummary.appendicesAdded ? "text-green-700" : "text-gray-500"}>
                          <span className="font-medium">Lampiran:</span> {changeSummary.appendicesAdded ? '✓ Bagian lampiran ditambahkan' : 'Tidak ditambahkan'}
                        </li>
                        {changeSummary.technicalContentMoved && changeSummary.technicalContentMoved > 0 && (
                          <li className="text-orange-700">
                            <span className="font-medium">Konten Teknis:</span> {changeSummary.technicalContentMoved} baris kode/query dipindah ke lampiran
                          </li>
                        )}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800">Format & Penomoran</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        <li><span className="font-medium">Sub-bab dinomori ulang:</span> {changeSummary.renumberedSubsections} subsection</li>
                        <li><span className="font-medium">Caption tabel diterapkan:</span> {changeSummary.tableCaptions} tabel</li>
                        <li><span className="font-medium">Caption gambar diterapkan:</span> {changeSummary.figureCaptions} gambar</li>
                        <li className={changeSummary.referencesCount > 0 ? "text-green-700" : "text-orange-600"}>
                          <span className="font-medium">Daftar Pustaka:</span> {changeSummary.referencesCount > 0 ? `${changeSummary.referencesCount} referensi diformat` : 'Placeholder ditambahkan'}
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-800">
                      <strong>Format Standar:</strong> Times New Roman 12pt, spasi 1.5, margin 1 inci, penomoran otomatis, dan struktur sesuai standar akademik universitas.
                    </p>
                    <p className="text-sm text-emerald-700 mt-2">
                      <strong>🎯 Hasil Otomatis:</strong> Daftar isi hanya berisi heading yang sesuai (tidak ada query/kode), 
                      konten teknis dipindah ke Lampiran, dan struktur BAB sesuai standar penelitian Indonesia.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {originalText && formattedText ? (
              <CompareChanges
                originalText={originalText}
                formattedText={formattedText}
                templateName={templateFile?.name}
                draftName={draftFile?.name}
                driveService={driveService || undefined}
                onSaveToDrive={async () => {
                  if (formattedDocBlob && draftFile) {
                    const blob = formattedDocBlob;
                    const fileName = `Formatted_${draftFile.name}`;
                    await driveService?.saveFormattedReport(blob, blob, fileName);
                  }
                }}
                onDownloadDocx={() => {
                  if (formattedDocBlob && draftFile) {
                    const url = URL.createObjectURL(formattedDocBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Formatted_${draftFile.name.replace(/\.[^/.]+$/, "")}.docx`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                onDownloadPdf={() => {
                  toast.info('Fitur konversi PDF akan segera tersedia');
                }}
              />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <GitCompare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Perbandingan</h3>
                  <p className="text-gray-600 mb-4">
                    Unggah template dan draft, lalu format dokumen untuk melihat perbandingan perubahan.
                  </p>
                  <Button onClick={() => setActiveTab('upload')}>
                    <Upload className="w-4 h-4 mr-2" />
                    Mulai Upload
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Template Library Tab */}
          <TabsContent value="templates" className="space-y-6">
            <TemplateLibrary
              driveService={driveService || undefined}
              onSelectTemplate={(template) => {
                toast.success(`Template "${template.name}" dipilih untuk digunakan`);
                setActiveTab('upload');
              }}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="space-y-6">
              {/* Formatted Reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Folder className="w-5 h-5 text-blue-600" />
                    <span>Laporan yang Diformat</span>
                    <Badge variant="secondary">{formattedReports.length}</Badge>
                  </CardTitle>
                  <CardDescription>Dokumen yang telah selesai diformat</CardDescription>
                </CardHeader>
                <CardContent>
                  {formattedReports.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Belum ada laporan yang diformat</p>
                      <p className="text-sm">Unggah dokumen untuk memulai</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {formattedReports.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <File className="w-8 h-8 text-blue-600" />
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(file.modifiedTime)} • {formatFileSize(file.size ? parseInt(file.size, 10) : undefined)}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => downloadFile(file)}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Unduh
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Templates and Drafts */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Folder className="w-5 h-5 text-green-600" />
                      <span>Template</span>
                      <Badge variant="secondary">{templateHistory.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {templateHistory.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Belum ada template yang diunggah</p>
                    ) : (
                      <div className="space-y-3">
                        {templateHistory.slice(0, 5).map((file) => (
                          <div key={file.id} className="flex items-center justify-between text-sm">
                            <span className="truncate">{file.name}</span>
                            <span className="text-gray-500">{formatDate(file.modifiedTime)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Folder className="w-5 h-5 text-orange-600" />
                      <span>Draft</span>
                      <Badge variant="secondary">{draftHistory.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {draftHistory.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Belum ada draft yang diunggah</p>
                    ) : (
                      <div className="space-y-3">
                        {draftHistory.slice(0, 5).map((file) => (
                          <div key={file.id} className="flex items-center justify-between text-sm">
                            <span className="truncate">{file.name}</span>
                            <span className="text-gray-500">{formatDate(file.modifiedTime)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

// Heuristic parser for raw references -> Citation objects
function parseRawReferences(raw: string) {
  const lines = raw.split(/\n+/).map(l=>l.trim()).filter(l=>l.length>0).slice(0,200);
  let idCounter = 1;
  const citations = lines.map(line => {
    // Pattern: Authors. (Year). Title. Publisher.
    let authors: string[] = [];
    let year = new Date().getFullYear();
    let title = line;
    const m = line.match(/^(.+?)\s*\((\d{4})\)\.\s*(.+)$/);
    if (m) {
      const authorsRaw = m[1];
      year = parseInt(m[2],10);
      title = m[3].replace(/\s+$/,'');
      authors = authorsRaw.split(/;|,\s+&|,\s+and|,| & | and /i).map(a=>a.trim()).filter(a=>a.length>0);
    }
    return {
      id: String(idCounter++),
      type: 'book',
      title: title.replace(/\s+$/,'').replace(/\.$/,'').trim(),
      authors,
      year,
    };
  });
  return citations;
}
