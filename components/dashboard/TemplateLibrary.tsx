import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  FileText, 
  Download, 
  Trash2, 
  University,
  Search,
  Filter,
  Star,
  StarOff
} from 'lucide-react';
// import type { DriveFile } from '../services/GoogleDriveService';
import { GoogleDriveService } from '../services/GoogleDriveService';

interface Template {
  id: string;
  name: string;
  description: string;
  institution: string;
  category: 'thesis' | 'journal' | 'report' | 'proposal' | 'other';
  driveFileId: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  fileSize: number;
  fileType: 'pdf' | 'docx';
}

interface TemplateLibraryProps {
  driveService?: GoogleDriveService;
  onSelectTemplate?: (template: Template) => void;
}

export function TemplateLibrary({ driveService, onSelectTemplate }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  // const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // New template form
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    institution: '',
    category: 'thesis' as Template['category'],
    file: null as File | null
  });

  useEffect(() => {
    loadTemplates();
  }, [driveService]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, selectedInstitution]);

  const loadTemplates = async () => {
    if (!driveService) return;
    
    setIsLoading(true);
    try {
      // Load templates from Google Drive templates folder
      const templateFiles = await driveService.getTemplatesHistory();
      
      // Convert DriveFile to Template format
      const templatesData: Template[] = templateFiles.map(file => ({
        id: file.id,
        name: file.name.replace(/\.(pdf|docx)$/i, ''),
        description: `Template from ${file.modifiedTime}`,
        institution: 'Unknown', // This would be stored in file metadata
        category: 'other' as Template['category'],
        driveFileId: file.id,
        createdAt: file.createdTime,
        updatedAt: file.modifiedTime,
        isFavorite: false,
        fileSize: typeof file.size === 'string' ? parseInt(file.size, 10) || 0 : (file.size || 0),
        fileType: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx'
      }));
      
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Gagal memuat template');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filter by institution
    if (selectedInstitution !== 'all') {
      filtered = filtered.filter(template => template.institution === selectedInstitution);
    }

    setFilteredTemplates(filtered);
  };

  const handleAddTemplate = async () => {
    if (!driveService || !newTemplate.file) {
      toast.error('Pilih file template terlebih dahulu');
      return;
    }

    setIsAddingTemplate(true);
    try {
      // Upload template to Google Drive
      await driveService.saveTemplate(newTemplate.file);
      
      toast.success('Template berhasil disimpan');
      setNewTemplate({
        name: '',
        description: '',
        institution: '',
        category: 'thesis',
        file: null
      });
      
      // Reload templates
      await loadTemplates();
    } catch (error) {
      console.error('Error adding template:', error);
      toast.error('Gagal menyimpan template');
    } finally {
      setIsAddingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!driveService) return;
    
    try {
      await driveService.deleteFile(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
      toast.success('Template berhasil dihapus');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Gagal menghapus template');
    }
  };

  const handleToggleFavorite = async (templateId: string) => {
    setTemplates(templates.map(template =>
      template.id === templateId
        ? { ...template, isFavorite: !template.isFavorite }
        : template
    ));
  };

  const handleSelectTemplate = (template: Template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    toast.success(`Template "${template.name}" dipilih`);
  };

  const getUniqueInstitutions = () => {
    const institutions = templates.map(t => t.institution).filter(Boolean);
    return [...new Set(institutions)];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category: Template['category']) => {
    const labels = {
      thesis: 'Skripsi/Thesis',
      journal: 'Jurnal',
      report: 'Laporan',
      proposal: 'Proposal',
      other: 'Lainnya'
    } as const;
    return labels[category];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Perpustakaan Template</h2>
          <p className="text-gray-600">Kelola dan gunakan template laporan Anda</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Template Baru</DialogTitle>
              <DialogDescription>
                Unggah template laporan baru ke perpustakaan Anda
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Nama Template</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Template Skripsi ITB"
                />
              </div>
              
              <div>
                <Label htmlFor="template-institution">Institusi</Label>
                <Input
                  id="template-institution"
                  value={newTemplate.institution}
                  onChange={(e) => setNewTemplate({ ...newTemplate, institution: e.target.value })}
                  placeholder="Institut Teknologi Bandung"
                />
              </div>
              
              <div>
                <Label htmlFor="template-category">Kategori</Label>
                <select
                  id="template-category"
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as Template['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="thesis">Skripsi/Thesis</option>
                  <option value="journal">Jurnal</option>
                  <option value="report">Laporan</option>
                  <option value="proposal">Proposal</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="template-description">Deskripsi</Label>
                <Textarea
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Deskripsi template..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="template-file">File Template</Label>
                <Input
                  id="template-file"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setNewTemplate({ ...newTemplate, file: e.target.files?.[0] || null })}
                />
              </div>
              
              <Button 
                onClick={handleAddTemplate}
                disabled={isAddingTemplate || !newTemplate.file || !newTemplate.name}
                className="w-full"
              >
                {isAddingTemplate ? 'Menyimpan...' : 'Simpan Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Cari Template</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nama, institusi, deskripsi..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category-filter">Kategori</Label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Kategori</option>
                <option value="thesis">Skripsi/Thesis</option>
                <option value="journal">Jurnal</option>
                <option value="report">Laporan</option>
                <option value="proposal">Proposal</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="institution-filter">Institusi</Label>
              <select
                id="institution-filter"
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Institusi</option>
                {getUniqueInstitutions().map(institution => (
                  <option key={institution} value={institution}>{institution}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedInstitution('all');
                }}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat template...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada template</h3>
            <p className="text-gray-600">
              {templates.length === 0 
                ? 'Belum ada template yang disimpan. Tambah template pertama Anda!'
                : 'Tidak ada template yang sesuai dengan filter. Coba ubah kriteria pencarian.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="truncate">{template.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center space-x-2">
                        <University className="w-4 h-4" />
                        <span>{template.institution}</span>
                      </div>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFavorite(template.id)}
                  >
                    {template.isFavorite ? (
                      <Star className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <StarOff className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {getCategoryLabel(template.category)}
                  </Badge>
                  <Badge variant="outline">
                    {template.fileType.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {formatFileSize(template.fileSize)}
                  </Badge>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleSelectTemplate(template)}
                    className="flex-1"
                    size="sm"
                  >
                    Gunakan Template
                  </Button>
                  {/* Download button placeholder, implement if needed */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
