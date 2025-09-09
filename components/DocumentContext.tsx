import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface Document {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  source: string;
  url: string;
  pdfUrl?: string;
  dateAdded: string;
  datePublished?: string;
  tags: string[];
  category: string;
  isRead: boolean;
  isFavorite: boolean;
  notes: string;
  readingProgress: number;
  fileSize?: string;
  pages?: number;
  doi?: string;
  citation?: string;
  // Google Drive integration metadata (optional)
  driveFileId?: string; // Original Drive file ID to avoid duplicates
  mimeType?: string;    // Original MIME type
}

interface DocumentContextType {
  documents: Document[];
  addDocument: (docData: Partial<Document>) => Promise<Document>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  searchDocuments: (query: string) => Document[];
  filterDocuments: (filters: DocumentFilters) => Document[];
  getDocument: (id: string) => Document | undefined;
  isLoading: boolean;
  totalDocuments: number;
  recentDocuments: Document[];
}

interface DocumentFilters {
  category?: string;
  tags?: string[];
  isRead?: boolean;
  isFavorite?: boolean;
  dateRange?: { start: Date; end: Date };
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUserDocuments();
    } else {
      setDocuments([]);
    }
  }, [user]);

  const loadUserDocuments = () => {
    const savedDocs = localStorage.getItem(`xraider_documents_${user?.id}`);
    if (savedDocs) {
      try {
        const docs = JSON.parse(savedDocs);
        setDocuments(docs);
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    }
    // No sample documents - start with empty state
  };

  const saveDocuments = (docs: Document[]) => {
    if (user) {
      localStorage.setItem(`xraider_documents_${user.id}`, JSON.stringify(docs));
    }
  };

  const addDocument = async (docData: Partial<Document>): Promise<Document> => {
    setIsLoading(true);
    
    // Generate unique ID based on URL or title to prevent duplicates
    const generateId = () => {
      if (docData.url) {
        return btoa(docData.url).substring(0, 16);
      }
      return Math.random().toString(36).substr(2, 9);
    };
    
    // Check for duplicates based on URL
    const existingDoc = documents.find(doc => 
      doc.url === docData.url && docData.url && docData.url.length > 0
    );
    
    if (existingDoc) {
      setIsLoading(false);
      throw new Error('Document already exists in library');
    }
    
    const newDoc: Document = {
      id: generateId(),
      title: docData.title || 'Untitled Document',
      authors: docData.authors || [],
      abstract: docData.abstract || '',
      source: docData.source || 'Manual Upload',
      url: docData.url || '',
      pdfUrl: docData.pdfUrl || docData.url,
      dateAdded: new Date().toISOString(),
      datePublished: docData.datePublished,
      tags: docData.tags || [],
      category: docData.category || 'General',
      isRead: false,
      isFavorite: false,
      notes: '',
      readingProgress: 0,
      fileSize: docData.fileSize,
      pages: docData.pages,
      doi: docData.doi,
      citation: docData.citation,
      driveFileId: docData.driveFileId,
      mimeType: docData.mimeType,
      ...docData
    };
    
    const updatedDocs = [newDoc, ...documents];
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);
    setIsLoading(false);
    
    return newDoc;
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    const updatedDocs = documents.map(doc => 
      doc.id === id ? { ...doc, ...updates } : doc
    );
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);
  };

  const deleteDocument = async (id: string) => {
    const updatedDocs = documents.filter(doc => doc.id !== id);
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);
  };

  const searchDocuments = (query: string): Document[] => {
    if (!query.trim()) return documents;
    
    const searchLower = query.toLowerCase();
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(searchLower) ||
      doc.authors.some(author => author.toLowerCase().includes(searchLower)) ||
      doc.abstract.toLowerCase().includes(searchLower) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  };

  const filterDocuments = (filters: DocumentFilters): Document[] => {
    return documents.filter(doc => {
      if (filters.category && doc.category !== filters.category) return false;
      if (filters.isRead !== undefined && doc.isRead !== filters.isRead) return false;
      if (filters.isFavorite !== undefined && doc.isFavorite !== filters.isFavorite) return false;
      if (filters.tags?.length && !filters.tags.some(tag => doc.tags.includes(tag))) return false;
      if (filters.dateRange) {
        const docDate = new Date(doc.dateAdded);
        if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) return false;
      }
      return true;
    });
  };

  const getDocument = (id: string): Document | undefined => {
    return documents.find(doc => doc.id === id);
  };

  const recentDocuments = documents
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 5);

  return (
    <DocumentContext.Provider value={{
      documents,
      addDocument,
      updateDocument,
      deleteDocument,
      searchDocuments,
      filterDocuments,
      getDocument,
      isLoading,
      totalDocuments: documents.length,
      recentDocuments
    }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}
