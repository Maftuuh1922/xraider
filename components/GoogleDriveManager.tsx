import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleDrive, type DriveFile, formatFileSize, formatDate } from './GoogleDriveService';
import { useAuth } from './AuthContext';
import { useDocuments } from './DocumentContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import {
  Download,
  Trash2,
  Search,
  FolderPlus,
  File,
  Folder,
  RefreshCw,
  ExternalLink,
  CloudUpload,
  AlertTriangle,
  Library,
  ChevronRight,
  ArrowLeft,
  Layers,
  Clock,
  Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Switch } from './ui/switch';

export function GoogleDriveManager() {
  const { user, loginWithGoogle, reconnectDrive, getDriveAccessToken } = useAuth();
  const { listFiles, uploadFile, downloadFile, deleteFile, createFolder } = useGoogleDrive();
  const { addDocument, documents } = useDocuments();
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  // Sync states
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0); // 0-1
  const [syncInfo, setSyncInfo] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'My Drive' }
  ]);
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Check Google Drive connection status
  useEffect(() => {
    if (user) {
      verifyConnection();
    } else {
      setIsDriveConnected(false);
      setFiles([]);
    }
  }, [user]);

  const verifyConnection = useCallback(async () => {
    const token = getDriveAccessToken();
    if (!token) {
      setIsDriveConnected(false);
      return;
    }
    setTestingConnection(true);
  setError(null);
  setErrorDetail(null);
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setIsDriveConnected(true);
        await loadFiles();
      } else {
        const status = response.status;
        let bodyText = '';
        try { bodyText = await response.text(); } catch {}
        // Attempt to parse JSON error
        let parsedMsg: string | undefined;
        try {
          const json = JSON.parse(bodyText);
          parsedMsg = json?.error?.message;
        } catch {}
        console.warn('Drive verify failed', { status, bodyText, parsedMsg });
        if (bodyText) setErrorDetail(parsedMsg || bodyText.slice(0, 300));
        setIsDriveConnected(false);
        if (status === 401) {
          setError('Token kadaluarsa / tidak valid. Klik hubungkan ulang.');
          localStorage.removeItem('google_access_token');
        } else if (status === 403) {
          setError('Akses ditolak (403). Aktifkan Google Drive API di Google Cloud Console & pastikan scope diterima.');
          // Trigger background diagnostics
          diagnoseToken();
        } else {
          setError(`Verifikasi gagal (status ${status}).`);
        }
      }
    } catch (e: any) {
      console.error('Drive verify error:', e);
      setError('Terjadi kesalahan koneksi Google Drive.');
      setIsDriveConnected(false);
    } finally {
      setTestingConnection(false);
    }
  }, [getDriveAccessToken]);

  const connectToGoogleDrive = async () => {
    setError(null);
    try {
      await (getDriveAccessToken() ? reconnectDrive() : loginWithGoogle());
      await verifyConnection();
    } catch (e: any) {
      console.error('Connect drive error:', e);
      setError('Gagal menghubungkan Google Drive.');
    }
  };

  // Sync current folder files into library (skip folders & duplicates)
  const handleSyncToLibrary = async () => {
    if (!isDriveConnected) return toast.error('Belum terhubung ke Google Drive');
    try {
      setLoading(true);
      const currentFiles = await listFiles(currentFolderId || undefined, 200);
      let imported = 0;
      for (const f of currentFiles) {
        if (f.mimeType === 'application/vnd.google-apps.folder') continue;
        // Skip if already imported (match by driveFileId OR same title & source)
        const already = documents.some(d => d.driveFileId === f.id || (d.title === f.name && d.source === 'Google Drive'));
        if (already) continue;
        let category: string = 'General';
        const lower = f.name.toLowerCase();
        if (/(computer|programming|algorithm|code|data)/.test(lower)) category = 'Computer Science';
        else if (/(physics|quantum)/.test(lower)) category = 'Physics';
        else if (/(medical|health|clinic|bio)/.test(lower)) category = 'Medical Science';
        else if (/(climate|environment|eco)/.test(lower)) category = 'Environmental Science';
        await addDocument({
          title: f.name.replace(/\.[^./]+$/, ''),
          authors: ['Google Drive'],
          abstract: 'Imported from Google Drive sync.',
          source: 'Google Drive',
          url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
            tags: ['google-drive', 'synced'],
          category,
          fileSize: f.size ? formatFileSize(f.size) : undefined,
          driveFileId: f.id,
          mimeType: f.mimeType
        });
        imported++;
      }
      toast.success(imported ? `${imported} file disinkronkan ke Library` : 'Tidak ada file baru untuk disinkronkan');
    } catch (err) {
      console.error('Sync error', err);
      toast.error('Gagal sinkronisasi Drive');
    } finally {
      setLoading(false);
    }
  };

  // Recursive sync (limited by single-page listFiles per folder)
  const handleRecursiveSync = async () => {
    if (!isDriveConnected) return toast.error('Belum terhubung ke Google Drive');
    if (syncing) return;
    setSyncing(true);
    setSyncProgress(0);
    setSyncInfo(null);
    try {
      const collected: DriveFile[] = [];
      const traverse = async (folderId: string | null) => {
        const entries = await listFiles(folderId || undefined, 100);
        for (const f of entries) {
          if (f.mimeType === 'application/vnd.google-apps.folder') {
            // breadth-first style
            await traverse(f.id);
          } else {
            collected.push(f);
            setSyncProgress(p => Math.min(0.95, p + 0.002));
          }
        }
      };
      await traverse(currentFolderId);
      // De-duplicate vs existing documents
      let imported = 0, skipped = 0, total = collected.length;
      for (let i = 0; i < collected.length; i++) {
        const f = collected[i];
        const already = documents.some(d => d.driveFileId === f.id || (d.title === f.name && d.source === 'Google Drive'));
        if (already) { skipped++; continue; }
        let category: string = 'General';
        const lower = f.name.toLowerCase();
        if (/(computer|program|algorithm|code|data)/.test(lower)) category = 'Computer Science';
        else if (/(physics|quantum)/.test(lower)) category = 'Physics';
        else if (/(medical|health|clinic|bio)/.test(lower)) category = 'Medical Science';
        else if (/(climate|environment|eco)/.test(lower)) category = 'Environmental Science';
        await addDocument({
          title: f.name.replace(/\.[^./]+$/, ''),
          authors: ['Google Drive'],
          abstract: 'Imported via recursive sync.',
          source: 'Google Drive',
          url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
          tags: ['google-drive', 'synced', 'recursive'],
          category,
          fileSize: f.size ? formatFileSize(f.size) : undefined,
          driveFileId: f.id,
          mimeType: f.mimeType
        });
        imported++;
        setSyncProgress(0.95 + (imported / Math.max(1, total)) * 0.05);
      }
      setSyncInfo({ imported, skipped, total });
      setSyncProgress(1);
      toast.success(`Recursive sync selesai: ${imported} baru, ${skipped} dilewati.`);
    } catch (e) {
      console.error('Recursive sync error', e);
      toast.error('Gagal recursive sync');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncProgress(0), 3000);
    }
  };

  // Auto sync effect (interval 5 menit)
  useEffect(() => {
    if (!autoSync || !isDriveConnected) return;
    const id = setInterval(() => {
      handleSyncToLibrary();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [autoSync, isDriveConnected, currentFolderId]);

  const diagnoseToken = useCallback(async () => {
    const token = getDriveAccessToken();
    if (!token) return;
    setDiagnosing(true);
    try {
      const r = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
      if (r.ok) {
        const info = await r.json();
        setTokenInfo(info);
        console.log('🔎 Token info', info);
      } else {
        console.warn('Token info fetch failed', r.status);
      }
    } catch (err) {
      console.error('Token info error', err);
    } finally {
      setDiagnosing(false);
    }
  }, [getDriveAccessToken]);

  // Unified loadFiles with folder navigation support
  const loadFiles = useCallback(async (
    folderId: string | null = null,
    options?: { pushPath?: boolean; folderName?: string }
  ) => {
    if (!getDriveAccessToken()) return;
    try {
      setLoading(true);
      const result = await listFiles(folderId || undefined, 100);
      setFiles(result);
      setCurrentFolderId(folderId);
      if (options?.pushPath && folderId) {
        setFolderPath(prev => {
          if (prev[prev.length - 1]?.id === folderId) return prev;
          return [...prev, { id: folderId, name: options.folderName || 'Folder' }];
        });
      }
      if (!folderId) {
        setFolderPath([{ id: null, name: 'My Drive' }]);
      }
    } catch (e: any) {
      console.error('List files error:', e);
      setError('Gagal memuat file.');
    } finally {
      setLoading(false);
    }
  }, [listFiles, getDriveAccessToken]);

  // Upload file (respect current folder)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isDriveConnected) return alert('Silakan hubungkan ke Google Drive terlebih dahulu');
    try {
      setUploading(true);
      const uploadedFile = await uploadFile(file, currentFolderId || undefined);
      setFiles(prev => [uploadedFile, ...prev]);
      event.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      alert('Gagal mengupload file');
    } finally {
      setUploading(false);
    }
  };

  // Download file
  const handleDownload = async (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') return;
    try {
      const blob = await downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Gagal mendownload file');
    }
  };

  // Delete file
  const handleDelete = async (file: DriveFile) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${file.name}"?`)) return;
    try {
      await deleteFile(file.id);
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Gagal menghapus file');
    }
  };

  // Open folder
  const handleOpenFolder = (file: DriveFile) => {
    if (file.mimeType !== 'application/vnd.google-apps.folder') return;
    loadFiles(file.id, { pushPath: true, folderName: file.name });
  };

  // Breadcrumb click
  const handleBreadcrumbClick = (index: number) => {
    const target = folderPath[index];
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    loadFiles(target.id, { pushPath: false });
  };

  // Go back one folder
  const handleGoBack = () => {
    if (folderPath.length <= 1) return;
    const newPath = folderPath.slice(0, -1);
    setFolderPath(newPath);
    const target = newPath[newPath.length - 1];
    loadFiles(target.id, { pushPath: false });
  };

  // Search inside current folder
  const handleSearch = async () => {
    if (!searchQuery.trim()) return loadFiles(currentFolderId);
    try {
      setLoading(true);
      const all = await listFiles(currentFolderId || undefined, 200);
      const filtered = all.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
      setFiles(filtered);
    } catch (error) {
      console.error('Search error:', error);
      alert('Gagal mencari file');
    } finally {
      setLoading(false);
    }
  };

  // Create folder (in current folder)
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Nama folder tidak boleh kosong');
      return;
    }
    try {
      const createdFolder = await createFolder(newFolderName, currentFolderId || undefined);
      setFiles(prev => [createdFolder, ...prev]);
      setNewFolderName('');
    } catch (error) {
      console.error('Create folder error:', error);
      alert('Gagal membuat folder');
    }
  };

  const handleAddToLibrary = async (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      toast.error('Tidak dapat menambahkan folder ke library');
      return;
    }

    try {
      // Determine category based on file name and type
      let category = 'General';
      const fileName = file.name.toLowerCase();
      
      if (fileName.includes('computer') || fileName.includes('programming') || fileName.includes('algorithm')) {
        category = 'Computer Science';
      } else if (fileName.includes('physics') || fileName.includes('quantum')) {
        category = 'Physics';
      } else if (fileName.includes('medical') || fileName.includes('health') || fileName.includes('biology')) {
        category = 'Medical Science';
      } else if (fileName.includes('environment') || fileName.includes('climate') || fileName.includes('ecology')) {
        category = 'Environmental Science';
      }

      // Create document object
      const documentData = {
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        authors: ['Google Drive'],
        category,
        tags: ['google-drive', 'imported'],
        url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        source: 'Google Drive',
        pages: 0, // Will be determined when opened
        abstract: `Document imported from Google Drive. Original file: ${file.name}`,
        fileId: file.id,
        mimeType: file.mimeType
      };

      await addDocument(documentData);
      toast.success(`${file.name} berhasil ditambahkan ke library!`);
    } catch (error) {
      console.error('Failed to add to library:', error);
      toast.error('Gagal menambahkan ke library');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="h-5 w-5 text-blue-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  // Preview handler
  const handlePreview = async (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') return;
    setPreviewFile(file);
    setPreviewUrl(null);
    setPreviewText(null);
    setPreviewError(null);
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      // Google Docs / Sheets / Slides: use webViewLink directly in iframe
      if (file.mimeType.startsWith('application/vnd.google-apps.')) {
        if (file.webViewLink) setPreviewUrl(file.webViewLink);
        else setPreviewError('Tidak ada tautan pratinjau.');
      } else if (file.mimeType === 'application/pdf') {
        // Gunakan embed viewer Google Drive agar multi-page + navigasi muncul
        const embedUrl = `https://drive.google.com/file/d/${file.id}/preview`;
        setPreviewUrl(embedUrl);
        // Tidak langsung download blob; sediakan tombol fallback nanti
      } else if (file.mimeType.startsWith('image/')) {
        const blob = await downloadFile(file.id);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else if (file.mimeType.startsWith('text/') || file.mimeType === 'application/json') {
        const blob = await downloadFile(file.id);
        const text = await blob.text();
        setPreviewText(text.slice(0, 20000)); // limit to 20k chars
      } else {
        // Fallback: try webViewLink
        if (file.webViewLink) setPreviewUrl(file.webViewLink);
        else setPreviewError('Tipe file belum didukung untuk mode baca.');
      }
    } catch (e: any) {
      console.error('Preview error', e);
      setPreviewError('Gagal memuat pratinjau.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Cleanup object URLs on close
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" />
            Google Drive Manager
          </CardTitle>
          <CardDescription>
            Silakan login terlebih dahulu untuk mengakses Google Drive
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" />
            Google Drive Manager
          </CardTitle>
          <CardDescription>
            Kelola file Anda di Google Drive langsung dari XRAIDER
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          {!isDriveConnected ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                {testingConnection ? (
                  <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                ) : (
                  <CloudUpload className="h-8 w-8 text-blue-600" />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Hubungkan ke Google Drive</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Klik tombol di bawah untuk menghubungkan akun Google Drive Anda dan mulai mengelola file secara langsung.
                </p>
              </div>
              {error && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-red-600 justify-center">
                    <AlertTriangle className="h-4 w-4" /> {error}
                  </div>
                  {errorDetail && (
                    <div className="text-xs max-w-md mx-auto p-2 rounded bg-red-50 text-left text-red-700 whitespace-pre-wrap">
                      {errorDetail}
                    </div>
                  )}
                  {tokenInfo && (
                    <div className="text-xs max-w-md mx-auto p-2 rounded bg-blue-50 text-left text-blue-800 whitespace-pre-wrap">
                      <strong>aud:</strong> {tokenInfo.aud}\n
                      <strong>scope:</strong> {tokenInfo.scope}\n
                      <strong>expires_in:</strong> {tokenInfo.expires_in}s
                    </div>
                  )}
                  <div className="flex justify-center">
                    <Button type="button" variant="outline" size="sm" onClick={diagnoseToken} disabled={diagnosing}>
                      {diagnosing ? 'Mendiagnosa...' : 'Diagnosa Token'}
                    </Button>
                  </div>
                </div>
              )}
              <Button onClick={connectToGoogleDrive} className="bg-blue-600 hover:bg-blue-700" disabled={testingConnection}>
                <CloudUpload className="h-4 w-4 mr-2" />
                {testingConnection ? 'Memeriksa...' : 'Hubungkan Google Drive'}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Pastikan Anda mengizinkan akses scope Drive saat popup Google muncul.
              </p>
            </div>
          ) : (
            <>
              {/* Upload Section */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                   <Button 
                    onClick={() => loadFiles(currentFolderId)} 
                    variant="outline" 
                    size="sm"
                    disabled={loading}
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button 
                    onClick={verifyConnection} 
                    variant="outline" 
                    size="sm"
                    disabled={testingConnection}
                    title="Tes koneksi"
                  >
                    <CloudUpload className={`h-4 w-4 ${testingConnection ? 'animate-pulse' : ''}`} />
                  </Button>
                  <Button 
                    onClick={handleSyncToLibrary}
                    variant="outline"
                    size="sm"
                    disabled={loading || syncing}
                    title="Sinkronkan semua file di folder ini ke Library"
                  >
                    <Library className="h-4 w-4" /> Sync
                  </Button>
                  <Button 
                    onClick={handleRecursiveSync}
                    variant="outline"
                    size="sm"
                    disabled={loading || syncing}
                    title="Recursive sync (folder & subfolder)"
                  >
                    <Layers className="h-4 w-4" /> Deep Sync
                  </Button>
                  <div className="flex items-center gap-1 pl-2 border-l">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                    <span className="text-xs text-muted-foreground">Auto</span>
                  </div>
                </div>
              </div>

              { (syncing || syncProgress > 0) && (
                <div className="space-y-1">
                  <div className="h-2 w-full bg-muted rounded overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.min(100, Math.round(syncProgress*100))}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{syncing ? 'Menyinkronkan...' : syncProgress === 1 ? 'Selesai' : 'Menunggu'}</span>
                    {syncInfo && <span>{syncInfo.imported} baru / {syncInfo.skipped} lewati / {syncInfo.total} total</span>}
                  </div>
                </div>
              )}

              {uploading && (
                <div className="text-center py-4">
                  <div className="animate-pulse text-blue-600">
                    📤 Mengupload file ke Google Drive...
                  </div>
                </div>
              )}

              <Separator />

              {/* Search and Create Folder Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Cari file..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} size="sm" variant="outline">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Nama folder baru..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <Button onClick={handleCreateFolder} size="sm" variant="outline">
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

               {/* Breadcrumb */}
               <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                 <div className="flex items-center flex-wrap gap-1">
                   {folderPath.map((seg, idx) => (
                     <span key={seg.id || 'root'} className="flex items-center">
                       <button
                         onClick={() => handleBreadcrumbClick(idx)}
                         className={`hover:underline ${idx === folderPath.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                       >
                         {seg.name}
                       </button>
                       {idx < folderPath.length - 1 && <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground" />}
                     </span>
                   ))}
                 </div>
                 {folderPath.length > 1 && (
                   <Button size="sm" variant="ghost" onClick={handleGoBack} className="h-7 px-2">
                     <ArrowLeft className="h-4 w-4 mr-1" /> Up
                   </Button>
                 )}
               </div>

               {/* Files List */}
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    File di Google Drive <Badge variant="outline">{files.length}</Badge>
                  </h3>
                  <div className="flex items-center gap-2">
                    {searchQuery && (
                      <Badge variant="secondary">
                        Hasil pencarian: "{searchQuery}"
                      </Badge>
                    )}
                    {error && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Error
                      </Badge>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-gray-600">Memuat file...</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'Tidak ada file yang ditemukan' : 'Belum ada file di Google Drive'}
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {files.map((file) => (
                        <Card key={file.id} className="p-4 group">
                          <div className="flex items-center justify-between">
                            <div 
                              className={`flex items-center gap-3 flex-1 min-w-0 ${file.mimeType === 'application/vnd.google-apps.folder' ? 'cursor-pointer hover:bg-muted/40 rounded-md p-1 -m-1 transition-colors' : ''}`}
                              onClick={() => file.mimeType === 'application/vnd.google-apps.folder' && handleOpenFolder(file)}
                            >
                              {getFileIcon(file.mimeType)}
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate flex items-center gap-2">
                                  {file.name}
                                  {file.mimeType === 'application/vnd.google-apps.folder' && (
                                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Buka</span>
                                  )}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  {file.size && (
                                    <span>{formatFileSize(file.size)}</span>
                                  )}
                                  <span>{formatDate(file.modifiedTime)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {file.mimeType !== 'application/vnd.google-apps.folder' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePreview(file)}
                                  title="Baca / Pratinjau"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {file.mimeType !== 'application/vnd.google-apps.folder' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAddToLibrary(file)}
                                  title="Tambahkan ke Library"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Library className="h-4 w-4" />
                                </Button>
                              )}

                              {file.webViewLink && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(file.webViewLink, '_blank')}
                                  title="Buka di Google Drive"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {file.mimeType !== 'application/vnd.google-apps.folder' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownload(file)}
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(file)}
                                title="Hapus"
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={(o) => { if (!o) { setPreviewOpen(false); setPreviewFile(null); if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl); } }}>
          <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewFile && getFileIcon(previewFile.mimeType)}
                {previewFile?.name || 'Preview'}
              </DialogTitle>
              <DialogDescription>
                Mode baca untuk file Google Drive. {previewFile?.mimeType}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden rounded-md border bg-muted/30 relative">
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  Memuat pratinjau...
                </div>
              )}
              {!previewLoading && previewError && (
                <div className="p-4 text-sm text-red-600 space-y-2">
                  <div>{previewError}</div>
                  {previewFile?.mimeType === 'application/pdf' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!previewFile) return;
                        setPreviewError(null);
                        setPreviewLoading(true);
                        try {
                          const blob = await downloadFile(previewFile.id);
                          const url = URL.createObjectURL(blob);
                          setPreviewUrl(url);
                        } catch (e:any) {
                          setPreviewError('Fallback download juga gagal.');
                        } finally {
                          setPreviewLoading(false);
                        }
                      }}
                    >Coba Fallback Download</Button>
                  )}
                </div>
              )}
              {!previewLoading && !previewError && previewUrl && previewFile?.mimeType === 'application/pdf' && (
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full" 
                  title="PDF Preview"
                  allow="autoplay"
                />
              )}
              {!previewLoading && !previewError && previewUrl && previewFile?.mimeType.startsWith('image/') && (
                <div className="w-full h-full flex items-center justify-center bg-black/5">
                  <img src={previewUrl} alt={previewFile.name} className="max-h-full max-w-full object-contain" />
                </div>
              )}
              {!previewLoading && !previewError && previewText && (
                <pre className="w-full h-full overflow-auto p-4 text-xs bg-black/5 whitespace-pre-wrap">{previewText}</pre>
              )}
              {!previewLoading && !previewError && previewUrl && previewFile && !previewFile.mimeType.startsWith('image/') && previewFile.mimeType !== 'application/pdf' && !previewFile.mimeType.startsWith('text/') && previewFile.mimeType !== 'application/json' && (
                <iframe src={previewUrl} className="w-full h-full" title="File Preview" />
              )}
            </div>
            <div className="flex justify-between pt-3 text-xs text-muted-foreground">
              <span>{previewFile?.size ? formatFileSize(previewFile.size) : ''}</span>
              {previewFile?.webViewLink && (
                <Button size="sm" variant="outline" onClick={() => window.open(previewFile.webViewLink!, '_blank')}>Buka di Tab Baru</Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
