import { useAuth } from './AuthContext';
import React, { useState, useCallback, useEffect } from 'react';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
}

export function useGoogleDrive() {
  const { getDriveAccessToken } = useAuth();

  const getAccessToken = () => {
    const token = getDriveAccessToken();
    if (!token) {
      throw new Error('No access token available. Please login first.');
    }
    return token;
  };

  // Upload file to Google Drive
  const uploadFile = async (file: File, folderId?: string): Promise<DriveFile> => {
    const accessToken = getAccessToken();
    
    const metadata = {
      name: file.name,
      parents: folderId ? [folderId] : undefined,
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File uploaded to Google Drive:', result.name);
    return result;
  };

  // List files from Google Drive
  const listFiles = async (folderId?: string, pageSize = 10): Promise<DriveFile[]> => {
    const accessToken = getAccessToken();
    
    let query = "trashed=false";
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const result = await response.json();
    return result.files || [];
  };

  // Download file from Google Drive
  const downloadFile = async (fileId: string): Promise<Blob> => {
    const accessToken = getAccessToken();

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  };

  // Delete file from Google Drive
  const deleteFile = async (fileId: string): Promise<void> => {
    const accessToken = getAccessToken();

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    console.log('✅ File deleted from Google Drive');
  };

  // Create folder in Google Drive
  const createFolder = async (name: string, parentId?: string): Promise<DriveFile> => {
    const accessToken = getAccessToken();

    const metadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    };

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(`Folder creation failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Folder created in Google Drive:', result.name);
    return result;
  };

  // Get file metadata
  const getFileMetadata = async (fileId: string): Promise<DriveFile> => {
    const accessToken = getAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get file metadata: ${response.statusText}`);
    }

    return response.json();
  };

  // Search files in Google Drive
  const searchFiles = async (query: string, pageSize = 10): Promise<DriveFile[]> => {
    const accessToken = getAccessToken();
    
    const searchQuery = `name contains '${query}' and trashed=false`;

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&pageSize=${pageSize}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.files || [];
  };

  return {
    uploadFile,
    listFiles,
    downloadFile,
    deleteFile,
    createFolder,
    getFileMetadata,
    searchFiles,
  };
}

// Higher-level stateful hook expected by some components (e.g., GoogleDriveWidget_new)
// Provides: files, isLoading, error, loadFiles along with the underlying Drive operations.
export function useGoogleDriveManager(defaultPageSize: number = 50) {
  const drive = useGoogleDrive();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (folderId?: string, pageSize: number = defaultPageSize) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await drive.listFiles(folderId, pageSize);
      setFiles(data);
    } catch (e: any) {
      console.error('Failed to load Google Drive files', e);
      setError(e?.message || 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [drive, defaultPageSize]);

  // Auto-load root files on first mount
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return {
    files,
    isLoading,
    error,
    loadFiles,
    // Re-expose original methods for convenience
    uploadFile: drive.uploadFile,
    listFiles: drive.listFiles,
    downloadFile: drive.downloadFile,
    deleteFile: drive.deleteFile,
    createFolder: drive.createFolder,
    getFileMetadata: drive.getFileMetadata,
    searchFiles: drive.searchFiles,
  };
}

// Helper function to format file size
export const formatFileSize = (bytes: string | number): string => {
  const size = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (size === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
