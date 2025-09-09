import { useState } from 'react';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { DocumentInput } from './dashboard/DocumentInput';
import { FileUpload } from './dashboard/FileUpload';
import { DocumentGrid } from './dashboard/DocumentGrid';
import { PDFViewer } from './dashboard/PDFViewer';
import { LibraryPopup } from './dashboard/LibraryPopup';
import { GoogleDriveWidget } from './dashboard/GoogleDriveWidget';
import { Dock } from './Dock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { FileText, CloudUpload } from 'lucide-react';
import { useDocuments } from './DocumentContext';
import { toast } from 'sonner';

export type DocumentCategory = 'Computer Science' | 'Physics' | 'Environmental Science' | 'Medical Science' | 'General';

export interface Document {
  id: string;
  title: string;
  author: string;
  pageCount: number;
  category: DocumentCategory;
  thumbnail: string;
  url: string;
  createdAt: Date;
  tags: string[];
}

// Helper function to generate thumbnail URLs from document content
function generateThumbnailUrl(document: any): string {
  // Use document thumbnail if available from extraction
  if (document.thumbnail) {
    return document.thumbnail;
  }
  
  // Generate category-based thumbnails only as fallback
  const categoryThumbnails = {
    'Computer Science': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=250&fit=crop',
    'Physics': 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=200&h=250&fit=crop',
    'Environmental Science': 'https://images.unsplash.com/photo-1569163139394-de4e4f43e4e5?w=200&h=250&fit=crop',
    'Medical Science': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=250&fit=crop',
    'General': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=250&fit=crop'
  };
  
  return categoryThumbnails[document.category as keyof typeof categoryThumbnails] || categoryThumbnails['General'];
}

export function Dashboard() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('Computer Science');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const { documents: contextDocuments, addDocument } = useDocuments();
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render trigger

  // Convert DocumentContext documents to Dashboard Document format - REAL DATA ONLY
  const documents: Document[] = contextDocuments
    .filter(doc => doc.category === activeCategory) // only show selected category
    .map(doc => ({
      id: doc.id,
      title: doc.title,
      author: doc.authors.join(', ') || 'Unknown Author',
      pageCount: doc.pages || 0,
      category: doc.category as DocumentCategory,
      thumbnail: generateThumbnailUrl(doc),
      url: doc.url,
      createdAt: new Date(doc.dateAdded),
      tags: doc.tags
    }));

  const handleExtractDocument = async (url: string) => {
    try {
      // Use the real document extractor
      const { documentExtractor } = await import('./services/DocumentExtractor');
      
      toast.loading('Extracting document metadata...', { id: 'extract' });
      
      const extractedData = await documentExtractor.extractFromUrl(url);
      
      // Add document using context
      const newDocument = await addDocument(extractedData);
      
      // Force refresh of document grid
      setRefreshKey(prev => prev + 1);
      
      toast.success(`Document "${newDocument.title}" extracted and added to library!`, { 
        id: 'extract',
        description: `By ${newDocument.authors.join(', ')}`,
        duration: 4000
      });
      
      // Auto-switch to the document's category if different
      const docCategory = newDocument.category as DocumentCategory;
      if (docCategory !== activeCategory) {
        setActiveCategory(docCategory);
      }
      
      // Optionally scroll to documents section or highlight new document
      console.log('New document added:', newDocument);
      
    } catch (error: any) {
      console.error('Failed to extract document:', error);
      
      if (error.message?.includes('already exists')) {
        toast.error('Document already exists in your library', { 
          id: 'extract',
          description: 'Check your library for existing documents'
        });
      } else {
        toast.error('Failed to extract document', { 
          id: 'extract',
          description: 'Please check the URL and try again'
        });
      }
    }
  };

  const handleFileUpload = async (files: FileList) => {
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Create real document from uploaded file
        const documentData = {
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          authors: ['File Upload'],
          category: 'General',
          tags: ['uploaded', file.type.includes('pdf') ? 'pdf' : 'document'],
          url: URL.createObjectURL(file), // Create blob URL for preview
          source: 'File Upload',
          pages: 0, // Will be determined when PDF loads
          abstract: `Uploaded file: ${file.name}. Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          thumbnail: file.type.includes('pdf') ? 
            'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=250&fit=crop' :
            'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=200&h=250&fit=crop'
        };
        
        return addDocument(documentData);
      });
      
      await Promise.all(uploadPromises);
      
      // Force refresh of document grid
      setRefreshKey(prev => prev + 1);
      
      toast.success(`${files.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Failed to upload files:', error);
      toast.error('Failed to upload files. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <DashboardHeader onToggleLibrary={() => setIsLibraryOpen(true)} />
      <div className="container mx-auto px-4 pt-28 pb-10">
        <div className="grid gap-6">
          {/* Document Input Section */}
          <div className="space-y-6">
            <Tabs defaultValue="extract" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary/60 backdrop-blur supports-[backdrop-filter]:bg-secondary/40 rounded-lg">
                <TabsTrigger value="extract" className="flex items-center gap-2 data-[state=active]:bg-background shadow-sm">
                  <FileText className="w-4 h-4" />
                  Extract Document
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2 data-[state=active]:bg-background shadow-sm">
                  <CloudUpload className="w-4 h-4" />
                  Upload Files
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="extract" className="mt-6">
                <DocumentInput onExtract={handleExtractDocument} />
              </TabsContent>
              
              <TabsContent value="upload" className="mt-6">
                <FileUpload onUpload={handleFileUpload} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Document Grid */}
          <div className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-xl shadow-sm border border-border/60">
            <DocumentGrid
              key={refreshKey} // Force re-render when documents change
              documents={documents}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              onSelectDocument={setSelectedDocument}
            />
          </div>
        </div>
      </div>

      {/* Document Reader */}
      {selectedDocument && (
        <PDFViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Library Popup */}
      <LibraryPopup
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        documents={documents}
      />

      {/* Google Drive Widget */}
      <GoogleDriveWidget documents={documents} />

      {/* Bottom Dock */}
      <Dock />
    </div>
  );
}
