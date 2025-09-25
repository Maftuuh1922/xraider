import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  Download, 
  Save, 
  Eye, 
  FileText, 
  // RotateCcw,
  CheckCircle,
  // AlertTriangle
} from 'lucide-react';
import { GoogleDriveService } from '../services/GoogleDriveService';

interface CompareChangesProps {
  originalText: string;
  formattedText: string;
  templateName?: string;
  draftName?: string;
  driveService?: GoogleDriveService;
  onSaveToDrive?: () => void;
  onDownloadDocx?: () => void;
  onDownloadPdf?: () => void;
}

interface ChangesSummary {
  totalChanges: number;
  headingsFixed: number;
  tablesRenumbered: number;
  figuresRenumbered: number;
  citationsFormatted: number;
  tocGenerated: boolean;
  listOfTablesGenerated: boolean;
  listOfFiguresGenerated: boolean;
}

export function CompareChanges({
  originalText,
  formattedText,
  templateName = 'Template',
  draftName = 'Draft',
  driveService,
  onSaveToDrive,
  onDownloadDocx,
  onDownloadPdf
}: CompareChangesProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [changesSummary, setChangesSummary] = useState<ChangesSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    generateChangesSummary();
  }, [originalText, formattedText]);

  const generateChangesSummary = () => {
    // Analyze changes between original and formatted text
  // const originalLines = originalText.split('\n');
    const formattedLines = formattedText.split('\n');
    
    let headingsFixed = 0;
    let tablesRenumbered = 0;
    let figuresRenumbered = 0;
    let citationsFormatted = 0;
    let tocGenerated = false;
    let listOfTablesGenerated = false;
    let listOfFiguresGenerated = false;

    // Count heading changes (BAB I, BAB II, etc.)
    formattedLines.forEach(line => {
      if (line.match(/^BAB\s+[IVX]+/i)) headingsFixed++;
      if (line.match(/Tabel\s+\d+\.\d+/i)) tablesRenumbered++;
      if (line.match(/Gambar\s+\d+\.\d+/i)) figuresRenumbered++;
      if (line.includes('DAFTAR ISI')) tocGenerated = true;
      if (line.includes('DAFTAR TABEL')) listOfTablesGenerated = true;
      if (line.includes('DAFTAR GAMBAR')) listOfFiguresGenerated = true;
    });

    // Count citation changes (basic detection)
    const citationPattern = /\([A-Za-z]+,?\s*\d{4}\)/g;
    const originalCitations = originalText.match(citationPattern)?.length || 0;
    const formattedCitations = formattedText.match(citationPattern)?.length || 0;
    citationsFormatted = Math.abs(formattedCitations - originalCitations);

    const totalChanges = headingsFixed + tablesRenumbered + figuresRenumbered + citationsFormatted;

    setChangesSummary({
      totalChanges,
      headingsFixed,
      tablesRenumbered,
      figuresRenumbered,
      citationsFormatted,
      tocGenerated,
      listOfTablesGenerated,
      listOfFiguresGenerated
    });
  };

  const handleSaveToDrive = async () => {
    if (!driveService) {
      toast.error('Google Drive service not available');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveToDrive?.();
      toast.success('Dokumen berhasil disimpan ke Google Drive');
    } catch (error) {
      console.error('Error saving to Drive:', error);
      toast.error('Gagal menyimpan ke Google Drive');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with summary */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Perbandingan Perubahan</h2>
            <p className="text-gray-600">
              Membandingkan "{draftName}" dengan hasil format menggunakan "{templateName}"
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'split' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('split')}
            >
              Split View
            </Button>
            <Button
              variant={viewMode === 'unified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('unified')}
            >
              Unified View
            </Button>
          </div>
        </div>

        {/* Changes Summary */}
        {changesSummary && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Ringkasan Perubahan</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{changesSummary.totalChanges}</div>
                  <div className="text-sm text-gray-600">Total Perubahan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{changesSummary.headingsFixed}</div>
                  <div className="text-sm text-gray-600">Heading Diperbaiki</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{changesSummary.tablesRenumbered}</div>
                  <div className="text-sm text-gray-600">Tabel Dinomori Ulang</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{changesSummary.figuresRenumbered}</div>
                  <div className="text-sm text-gray-600">Gambar Dinomori Ulang</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {changesSummary.tocGenerated && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Daftar Isi Dibuat
                  </Badge>
                )}
                {changesSummary.listOfTablesGenerated && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Daftar Tabel Dibuat
                  </Badge>
                )}
                {changesSummary.listOfFiguresGenerated && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Daftar Gambar Dibuat
                  </Badge>
                )}
                {changesSummary.citationsFormatted > 0 && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {changesSummary.citationsFormatted} Sitasi Diformat
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Diff Viewer */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Perbandingan Dokumen</span>
            </CardTitle>
            <CardDescription>
              Merah = teks dihapus, Hijau = teks ditambah
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
            >
              {showLineNumbers ? 'Sembunyikan' : 'Tampilkan'} Nomor Baris
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border">
              {/* Original Text */}
              <div className="border-r">
                <div className="bg-red-50 border-b px-4 py-2 font-medium text-red-800">
                  Draft Asli
                </div>
                <div className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {originalText.split('\n').map((line, index) => (
                      <div key={index} className="flex">
                        {showLineNumbers && (
                          <span className="text-gray-400 mr-4 w-8 text-right">{index + 1}</span>
                        )}
                        <span className="bg-red-100 text-red-800 px-1">{line}</span>
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
              
              {/* Formatted Text */}
              <div>
                <div className="bg-green-50 border-b px-4 py-2 font-medium text-green-800">
                  Hasil Format
                </div>
                <div className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {formattedText.split('\n').map((line, index) => (
                      <div key={index} className="flex">
                        {showLineNumbers && (
                          <span className="text-gray-400 mr-4 w-8 text-right">{index + 1}</span>
                        )}
                        <span className="bg-green-100 text-green-800 px-1">{line}</span>
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Aksi</span>
          </CardTitle>
          <CardDescription>
            Simpan atau unduh dokumen yang telah diformat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleSaveToDrive}
              disabled={isSaving || !driveService}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Menyimpan...' : 'Simpan ke Drive'}
            </Button>
            <Button 
              onClick={onDownloadDocx}
              variant="outline"
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Unduh DOCX
            </Button>
            <Button 
              onClick={onDownloadPdf}
              variant="outline"
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Unduh PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
