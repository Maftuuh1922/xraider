import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { GoogleDriveService, DriveFile } from "./services/GoogleDriveService";
import { DocumentFormatter } from "./services/DocumentFormatter";
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
  AlertCircle,
  Loader2,
  File,
  Folder,
  Calendar
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
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to format documents'
  });
  const [formattedReports, setFormattedReports] = useState<DriveFile[]>([]);
  const [templateHistory, setTemplateHistory] = useState<DriveFile[]>([]);
  const [draftHistory, setDraftHistory] = useState<DriveFile[]>([]);
  const [activeTab, setActiveTab] = useState('upload');

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
      toast.error('Failed to load document history');
    }
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setTemplateFile(file);
        toast.success(`Template "${file.name}" uploaded successfully`);
      } else {
        toast.error('Please upload a PDF or DOCX file for the template');
      }
    }
  };

  const handleDraftUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setDraftFile(file);
        toast.success(`Draft "${file.name}" uploaded successfully`);
      } else {
        toast.error('Please upload a PDF or DOCX file for the draft');
      }
    }
  };

  const processDocuments = async () => {
    if (!templateFile || !draftFile || !driveService) {
      toast.error('Please upload both template and draft files');
      return;
    }

    try {
      // Stage 1: Upload and parse template
      setProcessing({ stage: 'uploading-template', progress: 10, message: 'Uploading template to Google Drive...' });
      await driveService.saveTemplate(templateFile);
      
      setProcessing({ stage: 'parsing-template', progress: 20, message: 'Analyzing template styling...' });
      await documentFormatter.parseTemplate(templateFile);
      
      // Stage 2: Upload and parse draft
      setProcessing({ stage: 'uploading-draft', progress: 40, message: 'Uploading draft to Google Drive...' });
      await driveService.saveDraft(draftFile);
      
      setProcessing({ stage: 'parsing-draft', progress: 50, message: 'Extracting content from draft...' });
      const parsedContent = await documentFormatter.parseDraft(draftFile);
      
      // Stage 3: Format document
      setProcessing({ stage: 'formatting', progress: 70, message: 'Applying template formatting and generating TOC...' });
      const { docxBlob, pdfBlob } = await documentFormatter.formatDocument(parsedContent);
      
      // Stage 4: Save formatted documents
      setProcessing({ stage: 'saving', progress: 90, message: 'Saving formatted documents to Google Drive...' });
      const baseName = draftFile.name.replace(/\.[^/.]+$/, "");
      await driveService.saveFormattedReport(docxBlob, pdfBlob, baseName);
      
      // Stage 5: Complete
      setProcessing({ stage: 'complete', progress: 100, message: 'Documents formatted and saved successfully!' });
      
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
      
      toast.success('Documents formatted successfully and saved to Google Drive!');
      
      // Reset for next processing
      setTimeout(() => {
        setProcessing({ stage: 'idle', progress: 0, message: 'Ready to format documents' });
        setTemplateFile(null);
        setDraftFile(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error processing documents:', error);
      toast.error('Failed to process documents. Please try again.');
      setProcessing({ stage: 'idle', progress: 0, message: 'Ready to format documents' });
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
      toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return 'Unknown size';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Auto Report Formatter</h1>
                <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
              </div>
            </div>
            <Button 
              onClick={logout}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
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
              <span>Upload & Format</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Help</span>
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
                    <span>1. Upload Template</span>
                  </CardTitle>
                  <CardDescription>
                    Upload your report template (PDF/DOCX) to extract styling rules
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
                      disabled={processing.stage !== 'idle'}
                    />
                    <label htmlFor="template-upload" className="cursor-pointer">
                      {templateFile ? (
                        <div className="space-y-2">
                          <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                          <p className="font-medium text-green-800">{templateFile.name}</p>
                          <p className="text-sm text-gray-600">Click to change template</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-12 h-12 text-blue-400 mx-auto" />
                          <p className="font-medium text-gray-700">Choose template file</p>
                          <p className="text-sm text-gray-500">PDF or DOCX format</p>
                        </div>
                      )}
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Draft Upload */}
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-green-600" />
                    </div>
                    <span>2. Upload Draft</span>
                  </CardTitle>
                  <CardDescription>
                    Upload your draft report that needs formatting
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
                      disabled={processing.stage !== 'idle'}
                    />
                    <label htmlFor="draft-upload" className="cursor-pointer">
                      {draftFile ? (
                        <div className="space-y-2">
                          <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                          <p className="font-medium text-green-800">{draftFile.name}</p>
                          <p className="text-sm text-gray-600">Click to change draft</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-12 h-12 text-green-400 mx-auto" />
                          <p className="font-medium text-gray-700">Choose draft file</p>
                          <p className="text-sm text-gray-500">PDF or DOCX format</p>
                        </div>
                      )}
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Processing Section */}
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    {processing.stage === 'idle' ? (
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                    ) : processing.stage === 'complete' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                    )}
                  </div>
                  <span>3. Format Document</span>
                </CardTitle>
                <CardDescription>
                  Apply template styling and generate table of contents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{processing.message}</span>
                    <span className="text-sm text-gray-500">{processing.progress}%</span>
                  </div>
                  <Progress value={processing.progress} className="h-2" />
                </div>
                
                <Button 
                  onClick={processDocuments}
                  disabled={!templateFile || !draftFile || processing.stage !== 'idle'}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {processing.stage === 'idle' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Start Formatting
                    </>
                  ) : processing.stage === 'complete' ? (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Documents Ready
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="space-y-6">
              {/* Formatted Reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Folder className="w-5 h-5 text-blue-600" />
                    <span>Formatted Reports</span>
                    <Badge variant="secondary">{formattedReports.length}</Badge>
                  </CardTitle>
                  <CardDescription>Your completed formatted documents</CardDescription>
                </CardHeader>
                <CardContent>
                  {formattedReports.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No formatted reports yet</p>
                      <p className="text-sm">Upload documents to get started</p>
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
                            Download
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
                      <span>Templates</span>
                      <Badge variant="secondary">{templateHistory.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {templateHistory.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No templates uploaded</p>
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
                      <span>Drafts</span>
                      <Badge variant="secondary">{draftHistory.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {draftHistory.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No drafts uploaded</p>
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
                <CardTitle>Google Drive Integration</CardTitle>
                <CardDescription>Manage your Google Drive connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Connected to Google Drive</p>
                      <p className="text-sm text-gray-500">Files are automatically saved to AutoReportFormatter folder</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
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
                <CardTitle>How to Use Auto Report Formatter</CardTitle>
                <CardDescription>Step-by-step guide to format your academic reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold">1. Upload Template</h3>
                    <p className="text-sm text-gray-600">
                      Upload a properly formatted report template (PDF or DOCX) that contains the styling rules you want to apply. 
                      The system will analyze fonts, margins, heading styles, and formatting guidelines.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">2. Upload Draft</h3>
                    <p className="text-sm text-gray-600">
                      Upload your draft report (PDF or DOCX) that needs formatting. The content will be extracted and 
                      reorganized according to academic standards.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">3. Automatic Processing</h3>
                    <p className="text-sm text-gray-600">
                      The system will automatically:
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside ml-4 space-y-1">
                      <li>Apply consistent formatting from your template</li>
                      <li>Fix numbering (BAB I, BAB II, 1.1, 1.1.1, etc.)</li>
                      <li>Generate Table of Contents (Daftar Isi)</li>
                      <li>Generate List of Tables (Daftar Tabel)</li>
                      <li>Generate List of Figures (Daftar Gambar)</li>
                      <li>Save original and formatted files to Google Drive</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">4. Download & Access</h3>
                    <p className="text-sm text-gray-600">
                      Download your formatted documents in both DOCX and PDF formats. All files are automatically 
                      saved to your Google Drive in organized folders for future access.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supported File Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Input Formats</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• PDF (.pdf)</li>
                      <li>• Microsoft Word (.docx)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Output Formats</h4>
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
