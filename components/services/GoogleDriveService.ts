interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
}

interface DriveFolder {
  id: string;
  name: string;
}

class GoogleDriveService {
  private baseUrl = 'https://www.googleapis.com/drive/v3';
  private uploadUrl = 'https://www.googleapis.com/upload/drive/v3';
  private getAccessTokenFn: () => string | null;
  private onUnauthorizedFn?: () => Promise<string | null>;

  constructor(getAccessToken: () => string | null, onUnauthorized?: () => Promise<string | null>) {
    this.getAccessTokenFn = getAccessToken;
    this.onUnauthorizedFn = onUnauthorized;
  }

  private async makeRequest(url: string, options: RequestInit = {}, retry = true): Promise<Response> {
    const token = this.getAccessTokenFn();
    if (!token) {
      throw new Error('No access token available');
    }

    console.log('🌐 Drive API request:', url, options.method || 'GET');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401 && retry && this.onUnauthorizedFn) {
        console.warn('🔐 401 Unauthorized from Drive API, attempting token refresh...');
        const newToken = await this.onUnauthorizedFn();
        if (newToken) {
          return this.makeRequest(url, options, false);
        }
      }
      const error = await response.text();
      console.error('🚫 Drive API error:', response.status, error);
      throw new Error(`Drive API error: ${response.status} ${error}`);
    }

    return response;
  }

  async createFolder(name: string, parentId?: string): Promise<DriveFolder> {
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    };

    const response = await this.makeRequest(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    return response.json();
  }

  async findFolder(name: string, parentId?: string): Promise<DriveFolder | null> {
    let query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const response = await this.makeRequest(
      `${this.baseUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
    );
    
    const data = await response.json();
    return data.files.length > 0 ? data.files[0] : null;
  }

  async getOrCreateFolder(name: string, parentId?: string): Promise<DriveFolder> {
    const existing = await this.findFolder(name, parentId);
    if (existing) {
      return existing;
    }
    return this.createFolder(name, parentId);
  }

  async uploadFile(
    file: File,
    parentId?: string,
    name?: string
  ): Promise<DriveFile> {
    const fileName = name || file.name;
    
    const metadata = {
      name: fileName,
      ...(parentId && { parents: [parentId] }),
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await this.makeRequest(
      `${this.uploadUrl}/files?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size`,
      {
        method: 'POST',
        body: form,
      }
    );

    return response.json();
  }

  async uploadBlob(
    blob: Blob,
    fileName: string,
    mimeType: string,
    parentId?: string
  ): Promise<DriveFile> {
    const metadata = {
      name: fileName,
      ...(parentId && { parents: [parentId] }),
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new File([blob], fileName, { type: mimeType }));

    const response = await this.makeRequest(
      `${this.uploadUrl}/files?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size`,
      {
        method: 'POST',
        body: form,
      }
    );

    return response.json();
  }

  async listFiles(folderId?: string, pageSize: number = 100): Promise<DriveFile[]> {
    let query = 'trashed=false';
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const response = await this.makeRequest(
      `${this.baseUrl}/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name,mimeType,createdTime,modifiedTime,size,parents)&orderBy=modifiedTime desc`
    );
    
    const data = await response.json();
    return data.files || [];
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await this.makeRequest(`${this.baseUrl}/files/${fileId}?alt=media`);
    return response.blob();
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.makeRequest(`${this.baseUrl}/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async getFileMetadata(fileId: string): Promise<DriveFile> {
    const response = await this.makeRequest(
      `${this.baseUrl}/files/${fileId}?fields=id,name,mimeType,createdTime,modifiedTime,size,parents`
    );
    return response.json();
  }

  // Auto Report Formatter specific methods
  async initializeAutoReportFormatterStructure(): Promise<{
    mainFolder: DriveFolder;
    templatesFolder: DriveFolder;
    draftsFolder: DriveFolder;
    formattedFolder: DriveFolder;
  }> {
    console.log('🗂️ Initializing Auto Report Formatter folder structure...');
    
    const mainFolder = await this.getOrCreateFolder('AutoReportFormatter');
    console.log('✅ Main folder ready:', mainFolder.name);
    
    const [templatesFolder, draftsFolder, formattedFolder] = await Promise.all([
      this.getOrCreateFolder('Templates', mainFolder.id),
      this.getOrCreateFolder('Drafts', mainFolder.id),
      this.getOrCreateFolder('Formatted Reports', mainFolder.id),
    ]);

    console.log('✅ Folder structure initialized');
    return { mainFolder, templatesFolder, draftsFolder, formattedFolder };
  }

  async saveTemplate(file: File): Promise<DriveFile> {
    const { templatesFolder } = await this.initializeAutoReportFormatterStructure();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
    const fileName = `template_${timestamp}_${file.name}`;
    return this.uploadFile(file, templatesFolder.id, fileName);
  }

  async saveDraft(file: File): Promise<DriveFile> {
    const { draftsFolder } = await this.initializeAutoReportFormatterStructure();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
    const fileName = `draft_${timestamp}_${file.name}`;
    return this.uploadFile(file, draftsFolder.id, fileName);
  }

  async saveFormattedReport(docxBlob: Blob, pdfBlob: Blob, baseName: string): Promise<{
    docxFile: DriveFile;
    pdfFile: DriveFile;
  }> {
    const { formattedFolder } = await this.initializeAutoReportFormatterStructure();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
    
    const [docxFile, pdfFile] = await Promise.all([
      this.uploadBlob(
        docxBlob,
        `formatted_${timestamp}_${baseName}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        formattedFolder.id
      ),
      this.uploadBlob(
        pdfBlob,
        `formatted_${timestamp}_${baseName}.pdf`,
        'application/pdf',
        formattedFolder.id
      ),
    ]);

    return { docxFile, pdfFile };
  }

  async getFormattedReportsHistory(): Promise<DriveFile[]> {
    try {
      const { formattedFolder } = await this.initializeAutoReportFormatterStructure();
      return this.listFiles(formattedFolder.id);
    } catch (error) {
      console.warn('Could not fetch formatted reports history:', error);
      return [];
    }
  }

  async getTemplatesHistory(): Promise<DriveFile[]> {
    try {
      const { templatesFolder } = await this.initializeAutoReportFormatterStructure();
      return this.listFiles(templatesFolder.id);
    } catch (error) {
      console.warn('Could not fetch templates history:', error);
      return [];
    }
  }

  async getDraftsHistory(): Promise<DriveFile[]> {
    try {
      const { draftsFolder } = await this.initializeAutoReportFormatterStructure();
      return this.listFiles(draftsFolder.id);
    } catch (error) {
      console.warn('Could not fetch drafts history:', error);
      return [];
    }
  }
}

export { GoogleDriveService };
export type { DriveFile, DriveFolder };
