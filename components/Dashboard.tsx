import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { DocumentFormatter } from "./services/DocumentFormatter";
import { GoogleDriveService, type DriveFile } from "./services/GoogleDriveService";
import { CitationFormatter, type CitationStyle } from "./services/CitationFormatter";
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
  Settings, 
  LogOut,
  CheckCircle,
  Loader2,
  File,
  Folder,
  GitCompare,
  Library,
  Quote
} from "lucide-react";

interface ProcessingState {
  stage: 'idle' | 'uploading-template' | 'parsing-template' | 'uploading-draft' | 'parsing-draft' | 'formatting' | 'saving' | 'complete';
  progress: number;
  message: string;
}

export function Dashboard() {
  const { user, logout, getDriveAccessToken, refreshDriveAccessToken } = useAuth();
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

  useEffect(() => {
    const token = getDriveAccessToken();
    if (token) {
      const service = new GoogleDriveService(() => getDriveAccessToken(), refreshDriveAccessToken);
      setDriveService(service);
    }
  }, [getDriveAccessToken, refreshDriveAccessToken]);

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

    try {
      console.log('🚀 Mulai proses dokumen');

      // Stage 1: Upload template
      setProcessing({ stage: 'uploading-template', progress: 10, message: 'Mengunggah template ke Google Drive...' });
      console.log('⬆️ Upload template ke Drive...');
      await driveService.saveTemplate(templateFile);
      console.log('✅ Template terunggah');

      // Stage 1b: Parse template
      setProcessing({ stage: 'parsing-template', progress: 20, message: 'Menganalisis styling template...' });
      console.log('🧪 Parsing template...');
      await documentFormatter.parseTemplate(templateFile);
      console.log('✅ Template berhasil diparse');

      // Stage 2: Upload draft
      setProcessing({ stage: 'uploading-draft', progress: 40, message: 'Mengunggah draft ke Google Drive...' });
      console.log('⬆️ Upload draft ke Drive...');
      await driveService.saveDraft(draftFile);
      console.log('✅ Draft terunggah');

      // Stage 2b: Parse draft
      setProcessing({ stage: 'parsing-draft', progress: 50, message: 'Mengekstrak konten dari draft...' });
      console.log('🧪 Parsing draft...');
      const parsedContent: any = await documentFormatter.parseDraft(draftFile);
      if (!parsedContent || !parsedContent.sections) {
        throw new Error('Hasil parsing draft kosong atau tidak valid');
      }
      console.log('✅ Draft berhasil diparse');
  setOriginalText(documentFormatter.getPlainText(parsedContent));

      // Stage 3: Format document
      setProcessing({ stage: 'formatting', progress: 70, message: 'Menerapkan format template dan membuat daftar isi...' });
      console.log('🎨 Memformat dokumen...');
  const { docxBlob, pdfBlob, formattedText: finalText } = await documentFormatter.formatDocument(parsedContent);
      setFormattedDocBlob(docxBlob);
  setFormattedText(finalText);
      console.log('✅ Dokumen terformat');

      // Stage 4: Save formatted documents
      setProcessing({ stage: 'saving', progress: 90, message: 'Menyimpan dokumen yang diformat ke Google Drive...' });
      const baseName = draftFile.name.replace(/\.[^/.]+$/, "");
      console.log('💾 Menyimpan dokumen terformat ke Drive...');
      await driveService.saveFormattedReport(docxBlob, pdfBlob, baseName);
      console.log('✅ Dokumen terformat tersimpan');

      // Stage 5: Complete
      setProcessing({ stage: 'complete', progress: 100, message: 'Dokumen berhasil diformat dan disimpan!' });
      console.log('🎉 Proses selesai');

      // Download the formatted files otomatis
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

      URL.revokeObjectURL(docxUrl);
      URL.revokeObjectURL(pdfUrl);
  toast.success(`Dokumen "${baseName}" berhasil diformat & disimpan (DOCX + PDF)`);

      setTimeout(() => setActiveTab('compare'), 2000);
      setTimeout(() => {
        setProcessing({ stage: 'idle', progress: 0, message: 'Siap untuk memformat dokumen' });
        setTemplateFile(null);
        setDraftFile(null);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error processing documents:', error);
      const message = (error as any)?.message || 'Gagal memproses dokumen. Silakan coba lagi.';
      toast.error(`Gagal memproses dokumen: ${message}`);
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

  const formatFileSize = (bytes?: number | string) => {
    if (bytes === undefined || bytes === null) return 'Unknown size';
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(num)) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(1024));
    return Math.round(num / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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
          <TabsList className="grid w-full grid-cols-6 bg-white/60 backdrop-blur-sm">
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
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Pengaturan</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Bantuan</span>
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

            {/* Format Document */}
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    {getStageIcon()}
                  </div>
                  <span>3. Format Dokumen</span>
                </CardTitle>
                <CardDescription>
                  Terapkan styling template dan buat daftar isi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {processing.stage !== 'idle' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{processing.message}</span>
                      <span className="text-sm text-gray-500">{processing.progress}%</span>
                    </div>
                    <Progress value={processing.progress} className="w-full" />
                  </div>
                )}
                
                <Button 
                  onClick={processDocuments}
                  disabled={!templateFile || !draftFile || processing.stage !== 'idle'}
                  className="w-full"
                  size="lg"
                >
                  {processing.stage === 'idle' ? (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Mulai Format
                    </>
                  ) : processing.stage === 'complete' ? (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Dokumen Siap
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compare Changes Tab */}
          <TabsContent value="compare" className="space-y-6">
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
                                {formatDate(file.modifiedTime)} • {formatFileSize(file.size)}
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

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Format</CardTitle>
                <CardDescription>Konfigurasi pengaturan format dokumen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Gaya Sitasi
                    </label>
                    <select
                      defaultValue="APA"
                      onChange={(e) => citationFormatter.setStyle(e.target.value as CitationStyle)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="APA">APA (American Psychological Association)</option>
                      <option value="IEEE">IEEE</option>
                      <option value="Chicago">Chicago</option>
                      <option value="Harvard">Harvard</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="auto-toc" 
                      defaultChecked 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label htmlFor="auto-toc" className="text-sm text-gray-700">
                      Otomatis buat Daftar Isi
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="auto-lot" 
                      defaultChecked 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label htmlFor="auto-lot" className="text-sm text-gray-700">
                      Otomatis buat Daftar Tabel
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="auto-lof" 
                      defaultChecked 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label htmlFor="auto-lof" className="text-sm text-gray-700">
                      Otomatis buat Daftar Gambar
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="auto-numbering" 
                      defaultChecked 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label htmlFor="auto-numbering" className="text-sm text-gray-700">
                      Otomatis perbaiki penomoran (BAB, sub-bab, tabel, gambar)
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integrasi Google Drive</CardTitle>
                <CardDescription>Kelola koneksi Google Drive Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Terhubung ke Google Drive</p>
                      <p className="text-sm text-gray-500">File otomatis disimpan ke folder AutoReportFormatter</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informasi Akun</CardTitle>
                <CardDescription>Detail akun Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nama</label>
                    <p className="text-sm text-gray-900">{user?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cara Menggunakan Auto Report Formatter</CardTitle>
                <CardDescription>Panduan langkah demi langkah untuk memformat laporan akademik Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold">1. Unggah Template</h3>
                    <p className="text-sm text-gray-600">
                      Unggah template laporan yang sudah diformat dengan benar (PDF atau DOCX) yang berisi aturan styling yang ingin diterapkan. 
                      Sistem akan menganalisis font, margin, gaya heading, dan panduan format.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">2. Unggah Draft</h3>
                    <p className="text-sm text-gray-600">
                      Unggah draft laporan Anda (PDF atau DOCX) yang perlu diformat. Konten akan diekstrak dan 
                      direorganisasi sesuai standar akademik.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">3. Pemrosesan Otomatis</h3>
                    <p className="text-sm text-gray-600">
                      Sistem akan secara otomatis:
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside ml-4 space-y-1">
                      <li>Menerapkan format konsisten dari template Anda</li>
                      <li>Memperbaiki penomoran (BAB I, BAB II, 1.1, 1.1.1, dll.)</li>
                      <li>Membuat Daftar Isi</li>
                      <li>Membuat Daftar Tabel</li>
                      <li>Membuat Daftar Gambar</li>
                      <li>Menyimpan file asli dan yang sudah diformat ke Google Drive</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">4. Bandingkan Perubahan</h3>
                    <p className="text-sm text-gray-600">
                      Gunakan tab "Bandingkan" untuk melihat perubahan yang dilakukan pada dokumen Anda. 
                      Teks yang dihapus ditandai dengan latar belakang merah, dan teks yang ditambah dengan latar belakang hijau.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">5. Unduh & Akses</h3>
                    <p className="text-sm text-gray-600">
                      Unduh dokumen yang sudah diformat dalam format DOCX dan PDF. Semua file otomatis 
                      disimpan ke Google Drive Anda dalam folder terorganisir untuk akses di masa depan.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fitur Sitasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Auto Report Formatter mendukung berbagai gaya sitasi akademik:
                  </p>
                  <div className="grid gap-4">
                    <div className="flex items-start space-x-3">
                      <Quote className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">APA (American Psychological Association)</h4>
                        <p className="text-sm text-gray-600">Standar untuk psikologi, pendidikan, dan ilmu sosial</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Quote className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">IEEE</h4>
                        <p className="text-sm text-gray-600">Standar untuk teknik dan komputer</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Quote className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Chicago</h4>
                        <p className="text-sm text-gray-600">Standar untuk sejarah dan sastra</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Quote className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Harvard</h4>
                        <p className="text-sm text-gray-600">Standar untuk berbagai disiplin ilmu</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Format File yang Didukung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Format Input</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• PDF (.pdf)</li>
                      <li>• Microsoft Word (.docx)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Format Output</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Microsoft Word (.docx)</li>
                      <li>• PDF (.pdf)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
