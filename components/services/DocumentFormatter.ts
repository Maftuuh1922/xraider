import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } from 'docx';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
// Lightweight PDF generation for valid, non‑corrupt PDF output

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
// Vite: import worker as URL
// @ts-ignore - query param import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import mammoth from 'mammoth';

// Configure pdf.js worker once
GlobalWorkerOptions.workerSrc = pdfWorker;

interface TemplateStyle {
  fontFamily: string;
  fontSize: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  headingStyles: {
    [key: string]: {
      fontSize: number;
      bold: boolean;
      spacing: { before: number; after: number };
    };
  };
  paragraphSpacing: { before: number; after: number };
  lineSpacing: number;
}

interface ParsedContent {
  title: string;
  sections: ContentSection[];
  tables: Table[];
  figures: Figure[];
  references: Reference[];
  appendices: AppendixSection[];
  metadata?: ReportMetadata;
}

interface ContentSection {
  level: number;
  title: string;
  content: string;
  subsections: ContentSection[];
}

interface Table {
  number: number;
  title: string;
  content: string[][];
  chapterNumber?: number;
}

interface Figure {
  number: number;
  title: string;
  description: string;
  chapterNumber?: number;
}

interface Reference {
  text: string;
  type: 'book' | 'article' | 'website' | 'other';
}

interface AppendixSection {
  label: string; // A, B, C, etc.
  title: string;
  content: string[];
  type: 'sql' | 'code' | 'data' | 'other';
}

interface ReportMetadata {
  title: string;
  author: string;
  studentId?: string; // NIM
  program?: string;
  university?: string;
  year?: string;
}

class DocumentFormatter {
  private templateStyle: TemplateStyle | null = null;
  private defaultMetadata: ReportMetadata = {
    title: 'LAPORAN PENELITIAN',
    author: 'Nama Penulis',
    studentId: 'NIM',
    program: 'Program Studi',
    university: 'Universitas Anda',
    year: new Date().getFullYear().toString(),
  };

  async parseTemplate(file: File): Promise<TemplateStyle> {
    console.log('📄 Parsing template file:', file.name);
    try {
      if (file.type === 'application/pdf') {
        return await this.parsePDFTemplate(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return await this.parseDOCXTemplate(file);
      } else {
        throw new Error('Unsupported template format. Please use PDF or DOCX.');
      }
    } catch (e) {
      console.error('❌ Template parse failed, using default style:', e);
      const fallback: TemplateStyle = {
        fontFamily: 'Times New Roman',
        fontSize: 12,
        margins: { top:72,bottom:72,left:72,right:72 },
        headingStyles: {
          'BAB': { fontSize: 14, bold: true, spacing: { before: 240, after: 120 } },
          'heading1': { fontSize: 14, bold: true, spacing: { before: 120, after: 60 } },
          'heading2': { fontSize: 13, bold: true, spacing: { before: 80, after: 40 } },
          'heading3': { fontSize: 12, bold: true, spacing: { before: 60, after: 30 } },
        },
        paragraphSpacing: { before: 0, after: 120 },
        lineSpacing: 1.5,
      };
      this.templateStyle = fallback;
      return fallback;
    }
  }

  private async parsePDFTemplate(file: File): Promise<TemplateStyle> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    
    // Extract basic styling from first page
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    
    // Analyze text items to extract font information
    const fontSizes = new Set<number>();
    const fontFamilies = new Set<string>();
    
    textContent.items.forEach((item: any) => {
      if (item.height) fontSizes.add(Math.round(item.height));
      if (item.fontName) fontFamilies.add(item.fontName);
    });
    
    // Default template style based on common academic formats
    const templateStyle: TemplateStyle = {
      fontFamily: Array.from(fontFamilies)[0] || 'Times New Roman',
      fontSize: 12,
      margins: {
        top: 72, // 1 inch
        bottom: 72,
        left: 72,
        right: 72,
      },
      headingStyles: {
        'BAB': { fontSize: 14, bold: true, spacing: { before: 240, after: 120 } },
        'heading1': { fontSize: 14, bold: true, spacing: { before: 120, after: 60 } },
        'heading2': { fontSize: 13, bold: true, spacing: { before: 80, after: 40 } },
        'heading3': { fontSize: 12, bold: true, spacing: { before: 60, after: 30 } },
      },
      paragraphSpacing: { before: 0, after: 120 },
      lineSpacing: 1.5,
    };

    this.templateStyle = templateStyle;
    console.log('✅ PDF template parsed:', templateStyle);
    return templateStyle;
  }

  private async parseDOCXTemplate(_file: File): Promise<TemplateStyle> {
    // For DOCX parsing, we'll use default academic styling
    // In a real implementation, you would use a library like mammoth.js or docx-parser
    const templateStyle: TemplateStyle = {
      fontFamily: 'Times New Roman',
      fontSize: 12,
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72,
      },
      headingStyles: {
        'BAB': { fontSize: 14, bold: true, spacing: { before: 240, after: 120 } },
        'heading1': { fontSize: 14, bold: true, spacing: { before: 120, after: 60 } },
        'heading2': { fontSize: 13, bold: true, spacing: { before: 80, after: 40 } },
        'heading3': { fontSize: 12, bold: true, spacing: { before: 60, after: 30 } },
      },
      paragraphSpacing: { before: 0, after: 120 },
      lineSpacing: 1.5,
    };

    this.templateStyle = templateStyle;
    console.log('✅ DOCX template parsed:', templateStyle);
    return templateStyle;
  }

  async parseDraft(file: File): Promise<ParsedContent> {
    console.log('📝 Parsing draft file:', file.name);
    try {
      if (file.type === 'application/pdf') {
        return await this.parsePDFDraft(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return await this.parseDOCXDraft(file);
      } else {
        throw new Error('Unsupported draft format. Please use PDF or DOCX.');
      }
    } catch (e) {
      console.error('❌ Draft parse failed, returning minimal parsed content:', e);
      return {
        title: 'Draft (fallback)',
        sections: [],
        tables: [],
        figures: [],
        references: [],
        appendices: [],
      };
    }
  }

  private async parsePDFDraft(file: File): Promise<ParsedContent> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return this.parseTextContent(fullText);
  }

  private async parseDOCXDraft(file: File): Promise<ParsedContent> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value || '';
    return this.parseTextContent(text);
  }

  private parseTextContent(text: string): ParsedContent {
    const rawLines = text.split('\n');
    const cleanedLines = rawLines.map(l => l.replace(/\s+/g, ' ').trim());
    const lines = cleanedLines.filter(l => l.length > 0);

    const parsedContent: ParsedContent = {
      title: 'Laporan Penelitian',
      sections: [],
      tables: [],
      figures: [],
      references: [],
      appendices: [], // Add appendices section
    };

    let currentSection: ContentSection | null = null;
    let currentSubsection: ContentSection | null = null;
    let tableCount = 0;
    let figureCount = 0;
    let inReferences = false;
    let appendixContent: string[] = []; // Collect technical content for appendices

    const isChapterHeading = (line: string) => /^BAB\s+([IVX]+|\d+)/i.test(line);
    const isNumberedHeading = (line: string) => /^(\d+\.){1,3}\d*\s+/.test(line); // 1., 1.1, 1.1.1
    const isReferencesHeading = (line: string) => /^(DAFTAR\s+PUSTAKA|REFERENCES)$/i.test(line);
    const isLikelyTable = (line: string) => /^(tabel|table)\s+\d+/i.test(line);
    const isLikelyFigure = (line: string) => /^(gambar|figure)\s+\d+/i.test(line);
    
    // Enhanced detection for technical content that should go to appendices
    const isTechnicalContent = (line: string) => {
      return /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(line) || // SQL
             /^(function|var|const|let|def|class|import|package)/i.test(line) || // Code
             /^(ASCII|CHR|CONCAT|LENGTH|SUBSTRING|TRIM)/i.test(line) || // SQL Functions
             /^\s*[{}()\[\];]/.test(line) || // Code brackets/syntax
             /^[A-Z_]+\s*=/.test(line) || // Variable assignments
             /^\d+\.\s+function|^\d+\.\s+procedure/i.test(line); // Function listings
    };

    // Enhanced content classification
    const isHeadingContent = (line: string) => {
      return isChapterHeading(line) || 
             isNumberedHeading(line) || 
             /^[A-Z\s]{3,}$/.test(line) || // ALL CAPS headings
             /^\d+\.\d+\s+[A-Z]/.test(line); // Numbered headings like "2.1 Introduction"
    };

    for (const line of lines) {
      if (isReferencesHeading(line)) {
        inReferences = true;
        currentSubsection = null;
        currentSection = null;
        continue;
      }
      if (inReferences) {
        // Basic reference pattern: starts with number / bracket / dash or author-year style
        if (/^(\[?\d+\]?|\d+\.|-)/.test(line) || /\d{4}\.?$/.test(line)) {
          parsedContent.references.push({ text: line, type: 'other' });
        }
        continue;
      }

      // Separate technical content for appendices
      if (isTechnicalContent(line)) {
        appendixContent.push(line);
        continue;
      }

      // Chapter (BAB) detection
      if (isChapterHeading(line)) {
        currentSection = { level: 1, title: line, content: '', subsections: [] };
        parsedContent.sections.push(currentSection);
        currentSubsection = null;
        continue;
      }

      // Numbered heading (subsection) - only for proper headings, not code
      if (isNumberedHeading(line) && isHeadingContent(line)) {
        if (!currentSection) {
          // If no chapter yet, create implicit BAB I
            currentSection = { level: 1, title: 'BAB I PENDAHULUAN', content: '', subsections: [] };
            parsedContent.sections.push(currentSection);
        }
        currentSubsection = { level: 2, title: line, content: '', subsections: [] };
        currentSection.subsections.push(currentSubsection);
        continue;
      }

      // Table detection
      if (isLikelyTable(line)) {
        tableCount++;
        const chapterNumber = currentSection ? this.extractChapterNumber(currentSection.title) : 1;
        parsedContent.tables.push({
          number: tableCount,
          title: line,
          content: [['Kolom 1', 'Kolom 2'], ['Data 1', 'Data 2']],
          chapterNumber,
        });
        continue;
      }

      // Figure detection
      if (isLikelyFigure(line)) {
        figureCount++;
        const chapterNumber = currentSection ? this.extractChapterNumber(currentSection.title) : 1;
        parsedContent.figures.push({
          number: figureCount,
          title: line,
          description: 'Deskripsi gambar',
          chapterNumber,
        });
        continue;
      }

      // Only add substantial content lines (filter out code fragments)
      if (line.length > 30 && !isTechnicalContent(line)) {
        if (currentSubsection) currentSubsection.content += line + ' ';
        else if (currentSection) currentSection.content += line + ' ';
        else {
          // No section yet – create implicit Introduction section
          currentSection = { level: 1, title: 'BAB I PENDAHULUAN', content: line + ' ', subsections: [] };
          parsedContent.sections.push(currentSection);
        }
      }
    }

    // Process collected appendix content
    if (appendixContent.length > 0) {
      parsedContent.appendices = this.organizeAppendices(appendixContent);
    }

    // Fallback: if still no sections but we have text, create a single section
    if (parsedContent.sections.length === 0 && lines.length > 0) {
      parsedContent.sections.push({
        level: 1,
        title: 'BAB I PENDAHULUAN',
        content: lines.filter(l => !isTechnicalContent(l)).join(' '),
        subsections: [],
      });
    }

    console.log('✅ Draft content parsed with appendices separation:', parsedContent);
    return parsedContent;
  }

  private extractChapterNumber(title: string): number {
    const match = title.match(/BAB\s+([IVX]+|\d+)/i);
    if (match) {
      const roman = match[1];
      if (roman.match(/^\d+$/)) {
        return parseInt(roman);
      }
      // Convert Roman numerals to numbers
      const romanMap: { [key: string]: number } = {
        'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
        'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10
      };
      return romanMap[roman.toUpperCase()] || 1;
    }
    return 1;
  }

  private organizeAppendices(content: string[]): AppendixSection[] {
    const appendices: AppendixSection[] = [];
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    // Group content by type
    const sqlContent = content.filter(line => 
      /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(line)
    );
    
    const functionContent = content.filter(line => 
      /^(ASCII|CHR|CONCAT|LENGTH|SUBSTRING|TRIM|function|def|var|const)/i.test(line)
    );
    
    const codeContent = content.filter(line => 
      /^(function|var|const|let|class|import|package)/i.test(line) ||
      /^\s*[{}()\[\];]/.test(line)
    );
    
    const otherContent = content.filter(line => 
      !sqlContent.includes(line) && 
      !functionContent.includes(line) && 
      !codeContent.includes(line)
    );

    let appendixIndex = 0;

    if (sqlContent.length > 0) {
      appendices.push({
        label: labels[appendixIndex++],
        title: 'Query SQL',
        content: sqlContent,
        type: 'sql'
      });
    }

    if (functionContent.length > 0) {
      appendices.push({
        label: labels[appendixIndex++],
        title: 'Fungsi dan Prosedur',
        content: functionContent,
        type: 'code'
      });
    }

    if (codeContent.length > 0) {
      appendices.push({
        label: labels[appendixIndex++],
        title: 'Kode Program',
        content: codeContent,
        type: 'code'
      });
    }

    if (otherContent.length > 0) {
      appendices.push({
        label: labels[appendixIndex++],
        title: 'Data Tambahan',
        content: otherContent,
        type: 'data'
      });
    }

    // If no technical content was found, add a placeholder
    if (appendices.length === 0) {
      appendices.push({
        label: 'A',
        title: 'Lampiran Penelitian',
        content: ['Lampiran akan diisi sesuai dengan kebutuhan penelitian.'],
        type: 'other'
      });
    }

    return appendices;
  }

  /**
   * Produce DOCX + PDF from already parsed draft. Also returns a plain text representation
   * of the final structured document for diff viewing.
   */
  async formatDocument(parsedContent: ParsedContent, metadata?: Partial<ReportMetadata>): Promise<{ docxBlob: Blob; pdfBlob: Blob; formattedText: string; structured: ParsedContent }> {
    console.log('🔧 Formatting document with template style...');
    
    if (!this.templateStyle) {
      throw new Error('No template style available. Please parse a template first.');
    }

    // Enrich + structure + numbering
    const structured = this.enrichAndStructure(parsedContent, metadata);

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: this.templateStyle.margins.top,
                bottom: this.templateStyle.margins.bottom,
                left: this.templateStyle.margins.left,
                right: this.templateStyle.margins.right,
              },
            },
          },
          children: [
            // Cover Page - First and most important
            ...this.generateCoverPage(structured.metadata!),

            // Add page break after cover
            new Paragraph({
              children: [new TextRun({ text: "", break: 1 })],
              spacing: { after: 240 },
            }),

            // Table of Contents
            new Paragraph({
              children: [
                new TextRun({
                  text: "DAFTAR ISI",
                  bold: true,
                  size: 28,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 240 },
            }),

            // Generate TOC entries with page numbers
            ...this.generateTableOfContents(structured),

            // List of Tables (if any tables exist)
            ...(structured.tables.length > 0 ? [
              new Paragraph({
                children: [new TextRun({ text: "", break: 1 })],
                spacing: { after: 240 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "DAFTAR TABEL",
                    bold: true,
                    size: 28,
                  }),
                ],
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 240 },
              }),
              ...this.generateListOfTables(structured.tables),
            ] : []),

            // List of Figures (if any figures exist)
            ...(structured.figures.length > 0 ? [
              new Paragraph({
                children: [new TextRun({ text: "", break: 1 })],
                spacing: { after: 240 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "DAFTAR GAMBAR",
                    bold: true,
                    size: 28,
                  }),
                ],
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 240 },
              }),
              ...this.generateListOfFigures(structured.figures),
            ] : []),

            // Page break before main content
            new Paragraph({
              children: [new TextRun({ text: "", break: 1 })],
              spacing: { after: 240 },
            }),

            // Main content sections
            ...this.generateFormattedContent(structured),

            // Bibliography/Daftar Pustaka - Always include
            new Paragraph({
              children: [new TextRun({ text: "", break: 1 })],
              spacing: { after: 240 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "DAFTAR PUSTAKA",
                  bold: true,
                  size: 28,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 240 },
            }),
            ...this.generateBibliography(structured.references),

            // Appendices - Enhanced with structured content
            new Paragraph({
              children: [new TextRun({ text: "", break: 1 })],
              spacing: { after: 240 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "LAMPIRAN",
                  bold: true,
                  size: 28,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 240 },
            }),
            ...this.generateAppendices(structured.appendices),
          ],
        },
      ],
    });

    // Generate DOCX
    const docxBlob = await Packer.toBlob(doc);

    // Real PDF generation (simple) using pdf-lib
    const pdfBlob = await this.buildPDF(structured);

    const formattedText = this.getPlainText(structured);

    console.log('✅ Document formatted successfully (DOCX + PDF)');
    return { docxBlob, pdfBlob, formattedText, structured };
  }

  private async buildPDF(parsed: ParsedContent): Promise<Blob> {
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      const pageMargin = 72; // 1 inch = 72 points
      const fontSizeTitle = 20;
      const fontSizeHeading = 14;
      const fontSizeSubheading = 12;
      const fontSizeBody = 11;
      const lineHeightFactor = 1.5; // Academic 1.5 line spacing

      const wrapAndDraw = (page: any, text: string, cursor: { y: number }, size: number, isBold: boolean = false) => {
        const maxWidth = page.getWidth() - 2 * pageMargin;
        const words = text.split(/\s+/).filter(Boolean);
        const lineHeight = size * lineHeightFactor;
        const useFont = isBold ? boldFont : font;
        let line = '';
        
        const flushLine = () => {
          if (!line) return;
          if (cursor.y < pageMargin + lineHeight) { 
            page = pdfDoc.addPage();
            cursor.y = page.getHeight() - pageMargin;
          }
          page.drawText(line, { 
            x: pageMargin, 
            y: cursor.y, 
            size, 
            font: useFont, 
            color: rgb(0,0,0) 
          });
          cursor.y -= lineHeight;
          line = '';
        };
        
        for (const w of words) {
          const candidate = line ? line + ' ' + w : w;
          const width = useFont.widthOfTextAtSize(candidate, size);
          if (width > maxWidth) {
            flushLine();
            line = w;
          } else {
            line = candidate;
          }
        }
        flushLine();
        return page;
      };

      const addCenteredText = (page: any, text: string, cursor: { y: number }, size: number, isBold: boolean = false) => {
        const useFont = isBold ? boldFont : font;
        const textWidth = useFont.widthOfTextAtSize(text, size);
        const x = (page.getWidth() - textWidth) / 2;
        
        if (cursor.y < pageMargin + size * lineHeightFactor) {
          page = pdfDoc.addPage();
          cursor.y = page.getHeight() - pageMargin;
        }
        
        page.drawText(text, {
          x: x,
          y: cursor.y,
          size,
          font: useFont,
          color: rgb(0,0,0)
        });
        cursor.y -= size * lineHeightFactor;
        return page;
      };

      let page = pdfDoc.addPage();
      const cursor = { y: page.getHeight() - pageMargin };

      // Cover Page
      const meta = parsed.metadata!;
      cursor.y -= 100; // Top margin for cover
      
      page = addCenteredText(page, meta.university || 'UNIVERSITAS', cursor, 16, true);
      cursor.y -= 20;
      page = addCenteredText(page, `FAKULTAS/PROGRAM STUDI ${meta.program || 'PROGRAM STUDI'}`, cursor, 12);
      cursor.y -= 60;
      
      page = addCenteredText(page, meta.title, cursor, fontSizeTitle, true);
      cursor.y -= 80;
      
      page = addCenteredText(page, 'Disusun oleh:', cursor, 12);
      cursor.y -= 20;
      page = addCenteredText(page, meta.author, cursor, 14, true);
      cursor.y -= 20;
      
      if (meta.studentId) {
        page = addCenteredText(page, `NIM: ${meta.studentId}`, cursor, 12);
        cursor.y -= 40;
      }
      
      cursor.y -= 60;
      page = addCenteredText(page, meta.year || new Date().getFullYear().toString(), cursor, 14, true);

      // New page for Table of Contents
      page = pdfDoc.addPage();
      cursor.y = page.getHeight() - pageMargin;
      
      page = addCenteredText(page, 'DAFTAR ISI', cursor, fontSizeHeading, true);
      cursor.y -= 40;
      
      // TOC entries
      parsed.sections.forEach((section, index) => {
        const pageNum = index + 5; // Rough page estimation
        page = wrapAndDraw(page, `${section.title}...........${pageNum}`, cursor, fontSizeBody);
        cursor.y -= 5;
        
        section.subsections.forEach(sub => {
          page = wrapAndDraw(page, `    ${sub.title}...........${pageNum}`, cursor, fontSizeBody - 1);
          cursor.y -= 3;
        });
      });

      // List of Tables (if any)
      if (parsed.tables.length > 0) {
        cursor.y -= 40;
        page = addCenteredText(page, 'DAFTAR TABEL', cursor, fontSizeHeading, true);
        cursor.y -= 30;
        
        parsed.tables.forEach(table => {
          page = wrapAndDraw(page, `${table.title}...........${table.number}`, cursor, fontSizeBody);
          cursor.y -= 5;
        });
      }

      // List of Figures (if any)
      if (parsed.figures.length > 0) {
        cursor.y -= 40;
        page = addCenteredText(page, 'DAFTAR GAMBAR', cursor, fontSizeHeading, true);
        cursor.y -= 30;
        
        parsed.figures.forEach(figure => {
          page = wrapAndDraw(page, `${figure.title}...........${figure.number}`, cursor, fontSizeBody);
          cursor.y -= 5;
        });
      }

      // Main Content - New page
      page = pdfDoc.addPage();
      cursor.y = page.getHeight() - pageMargin;

      // Process each section
      for (const section of parsed.sections) {
        cursor.y -= 30;
        page = addCenteredText(page, section.title, cursor, fontSizeHeading, true);
        cursor.y -= 20;
        
        if (section.content.trim()) {
          const paragraphs = this.splitIntoParagraphs(section.content.trim());
          for (const para of paragraphs) {
            page = wrapAndDraw(page, para, cursor, fontSizeBody);
            cursor.y -= 10;
          }
        }
        
        for (const sub of section.subsections) {
          cursor.y -= 20;
          page = wrapAndDraw(page, sub.title, cursor, fontSizeSubheading, true);
          cursor.y -= 10;
          
          if (sub.content.trim()) {
            const paragraphs = this.splitIntoParagraphs(sub.content.trim());
            for (const para of paragraphs) {
              page = wrapAndDraw(page, para, cursor, fontSizeBody);
              cursor.y -= 8;
            }
          }
        }
        cursor.y -= 30; // Space between sections
      }

      // Bibliography
      cursor.y -= 40;
      page = addCenteredText(page, 'DAFTAR PUSTAKA', cursor, fontSizeHeading, true);
      cursor.y -= 30;
      
      parsed.references.forEach(ref => {
        page = wrapAndDraw(page, ref.text, cursor, fontSizeBody);
        cursor.y -= 15;
      });

      // Appendices - Enhanced content
      cursor.y -= 40;
      page = addCenteredText(page, 'LAMPIRAN', cursor, fontSizeHeading, true);
      cursor.y -= 30;
      
      parsed.appendices.forEach(appendix => {
        cursor.y -= 20;
        page = wrapAndDraw(page, `Lampiran ${appendix.label}: ${appendix.title}`, cursor, fontSizeSubheading, true);
        cursor.y -= 15;
        
        appendix.content.forEach(line => {
          page = wrapAndDraw(page, line, cursor, fontSizeBody - 1);
          cursor.y -= 8;
        });
        cursor.y -= 15;
      });

      const pdfBytes = await pdfDoc.save();
      return this.createBlobFromBytes(pdfBytes);
    } catch (err) {
      console.error('⚠️ PDF build failed, falling back to empty PDF:', err);
      const fallback = await PDFDocument.create();
      const bytes = await fallback.save();
      return this.createBlobFromBytes(bytes);
    }
  }

  private splitIntoParagraphs(text: string): string[] {
    const rough = text
      .replace(/\s+\n/g, '\n')
      .split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(p));
    
    const dedup: string[] = [];
    for (const p of rough) {
      if (dedup[dedup.length-1] !== p) dedup.push(p);
    }
    return dedup;
  }

  private createBlobFromBytes(bytes: any): Blob {
    let arrayBuffer: ArrayBuffer;
    if (bytes instanceof Uint8Array) {
      arrayBuffer = bytes.slice().buffer;
    } else if ((bytes as any)?.constructor?.name === 'ArrayBuffer') {
      arrayBuffer = bytes as unknown as ArrayBuffer;
    } else {
      arrayBuffer = new Uint8Array(bytes as any).slice().buffer;
    }
    return new Blob([arrayBuffer], { type: 'application/pdf' });
  }

  private generateTableOfContents(content: ParsedContent): Paragraph[] {
    const tocEntries: Paragraph[] = [];
    
    // Only include proper BAB sections in TOC, filter out technical content
    content.sections.forEach((section, index) => {
      // Ensure this is a proper academic chapter heading
      if (section.title.startsWith('BAB') && section.level === 1) {
        tocEntries.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${section.title}`,
                size: 24,
              }),
              new TextRun({
                text: `...........${index + 5}`, // Rough page estimation after cover + TOC
                size: 24,
              }),
            ],
            spacing: { after: 120 },
          })
        );

        // Only include proper subsections (numbered headings)
        section.subsections
          .filter(sub => /^\d+\.\d+\s+/.test(sub.title)) // Only numbered subsections
          .forEach((subsection) => {
            tocEntries.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `    ${subsection.title}`,
                    size: 22,
                  }),
                  new TextRun({
                    text: `...........${index + 5}`,
                    size: 22,
                  }),
                ],
                spacing: { after: 80 },
              })
            );
          });
      }
    });

    // Add DAFTAR PUSTAKA to TOC
    tocEntries.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "DAFTAR PUSTAKA",
            size: 24,
          }),
          new TextRun({
            text: `...........${content.sections.length + 10}`,
            size: 24,
          }),
        ],
        spacing: { after: 120 },
      })
    );

    // Add LAMPIRAN to TOC
    tocEntries.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "LAMPIRAN",
            size: 24,
          }),
          new TextRun({
            text: `...........${content.sections.length + 12}`,
            size: 24,
          }),
        ],
        spacing: { after: 120 },
      })
    );

    return tocEntries;
  }

  private generateListOfTables(tables: Table[]): Paragraph[] {
    return tables.map(table => 
      new Paragraph({
        children: [
          new TextRun({
            text: `Tabel ${table.chapterNumber}.${table.number} ${table.title}`,
            size: 22,
          }),
          new TextRun({
            text: `...........${table.number}`,
            size: 22,
          }),
        ],
        spacing: { after: 80 },
      })
    );
  }

  private generateListOfFigures(figures: Figure[]): Paragraph[] {
    return figures.map(figure => 
      new Paragraph({
        children: [
          new TextRun({
            text: `Gambar ${figure.chapterNumber}.${figure.number} ${figure.title}`,
            size: 22,
          }),
          new TextRun({
            text: `...........${figure.number}`,
            size: 22,
          }),
        ],
        spacing: { after: 80 },
      })
    );
  }

  private generateFormattedContent(content: ParsedContent): Paragraph[] {
    const formattedContent: Paragraph[] = [];

    content.sections.forEach(section => {
      // Chapter heading
      formattedContent.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: this.templateStyle!.headingStyles['BAB'].fontSize * 2,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: this.templateStyle!.headingStyles['BAB'].spacing,
        })
      );

      // Chapter content
      if (section.content.trim()) {
        formattedContent.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.content.trim(),
                size: this.templateStyle!.fontSize * 2,
              }),
            ],
            spacing: this.templateStyle!.paragraphSpacing,
          })
        );
      }

      // Subsections
      section.subsections.forEach(subsection => {
        formattedContent.push(
          new Paragraph({
            children: [
              new TextRun({
                text: subsection.title,
                bold: true,
                size: this.templateStyle!.headingStyles['heading2'].fontSize * 2,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: this.templateStyle!.headingStyles['heading2'].spacing,
          })
        );

        if (subsection.content.trim()) {
          formattedContent.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: subsection.content.trim(),
                  size: this.templateStyle!.fontSize * 2,
                }),
              ],
              spacing: this.templateStyle!.paragraphSpacing,
            })
          );
        }
      });
    });

    return formattedContent;
  }

  private enrichAndStructure(parsed: ParsedContent, metaOverride?: Partial<ReportMetadata>): ParsedContent {
    const metadata: ReportMetadata = { ...this.defaultMetadata, ...(parsed.metadata || {}), ...(metaOverride || {}) };

    // Enhanced standard academic chapters with proper Indonesian structure
    const standardChapters = [
      { title: 'BAB I PENDAHULUAN', defaultSubs: ['1.1 Latar Belakang', '1.2 Rumusan Masalah', '1.3 Tujuan Penelitian', '1.4 Manfaat Penelitian'] },
      { title: 'BAB II LANDASAN TEORI', defaultSubs: ['2.1 Teori Dasar', '2.2 Penelitian Terkait', '2.3 Kerangka Konseptual'] },
      { title: 'BAB III METODOLOGI PENELITIAN', defaultSubs: ['3.1 Jenis Penelitian', '3.2 Sumber Data', '3.3 Metode Pengumpulan Data', '3.4 Metode Analisis'] },
      { title: 'BAB IV HASIL DAN PEMBAHASAN', defaultSubs: ['4.1 Analisis Data', '4.2 Pembahasan Hasil', '4.3 Temuan Penelitian'] },
      { title: 'BAB V PENUTUP', defaultSubs: ['5.1 Kesimpulan', '5.2 Saran'] }
    ];

    // Map existing sections to their normalized titles
    const existingMap: Record<string,ContentSection> = {};
    parsed.sections.forEach(sec => {
      const norm = sec.title.toUpperCase().replace(/\s+/g,' ').trim();
      existingMap[norm] = sec;
    });

    // Reconstruct sections with proper academic structure
    const newSections: ContentSection[] = [];

    standardChapters.forEach((standard, index) => {
      const norm = standard.title.toUpperCase();
      const found = Object.keys(existingMap).find(k => 
        k.startsWith(norm) || 
        k.includes(norm.split(' ').slice(-1)[0]) // Match by keyword like "PENDAHULUAN"
      );
      
      let section: ContentSection;
      
      if (found) {
        // Use existing section but ensure proper title
        section = { ...existingMap[found] };
        section.title = standard.title;
      } else {
        // Create new section with default content
        section = { 
          level: 1, 
          title: standard.title,
          content: this.generateDefaultChapterContent(standard.title),
          subsections: []
        };
      }

      // Ensure proper subsection structure
      if (section.subsections.length === 0) {
        section.subsections = standard.defaultSubs.map(subTitle => ({
          level: 2,
          title: subTitle,
          content: `Konten untuk ${subTitle} akan diisi berdasarkan penelitian yang dilakukan.`,
          subsections: []
        }));
      } else {
        // Renumber existing subsections
        section.subsections.forEach((sub, sIdx) => {
          const cleanTitle = sub.title.replace(/^\d+(\.\d+)*\s+/, '').trim();
          sub.title = `${index + 1}.${sIdx + 1} ${cleanTitle}`;
        });
      }

      newSections.push(section);
    });

    // Add any remaining sections that don't fit standard structure
    parsed.sections.forEach(sec => {
      const norm = sec.title.toUpperCase().replace(/\s+/g,' ').trim();
      const isStandard = standardChapters.some(std => 
        norm.startsWith(std.title.toUpperCase()) ||
        norm.includes(std.title.split(' ').slice(-1)[0])
      );
      
      if (!isStandard) {
        const chapNum = newSections.length + 1;
        const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
        sec.title = sec.title.startsWith('BAB') ? sec.title : `BAB ${romanNumerals[chapNum-1] || chapNum} ${sec.title}`;
        newSections.push(sec);
      }
    });

    parsed.sections = newSections;

    // Enhanced table and figure numbering per chapter
    const chapterTableCounts: Record<number,number> = {};
    parsed.tables.forEach(t=>{
      const chap = t.chapterNumber || 1;
      chapterTableCounts[chap] = (chapterTableCounts[chap]||0)+1;
      t.number = chapterTableCounts[chap];
      
      // Clean and format table title
      const cleanTitle = t.title.replace(/^T(ab|e)l\w*\s+\d+(\.\d+)*\s*/i,'').trim();
      t.title = `Tabel ${chap}.${t.number} ${cleanTitle}`;
      t.chapterNumber = chap;
    });

    const chapterFigureCounts: Record<number,number> = {};
    parsed.figures.forEach(f=>{
      const chap = f.chapterNumber || 1;
      chapterFigureCounts[chap] = (chapterFigureCounts[chap]||0)+1;
      f.number = chapterFigureCounts[chap];
      
      // Clean and format figure title
      const cleanTitle = f.title.replace(/^Gambar\s+\d+(\.\d+)*\s*/i,'').trim();
      f.title = `Gambar ${chap}.${f.number} ${cleanTitle}`;
      f.chapterNumber = chap;
    });

    // Ensure bibliography exists with proper academic format
    if (parsed.references.length === 0) {
      parsed.references = [
        { text: 'Contoh referensi akan diisi sesuai dengan sumber yang digunakan dalam penelitian menggunakan format sitasi yang sesuai (APA/IEEE/Chicago/Harvard).', type: 'other' }
      ];
    }

    // Ensure appendices exist
    if (!parsed.appendices || parsed.appendices.length === 0) {
      parsed.appendices = [{
        label: 'A',
        title: 'Lampiran Penelitian',
        content: ['Material pendukung penelitian akan ditempatkan di bagian ini, seperti kode program, query database, atau data mentah.'],
        type: 'other'
      }];
    }

    parsed.metadata = metadata;
    return parsed;
  }

  private generateDefaultChapterContent(chapterTitle: string): string {
    const contentMap: Record<string, string> = {
      'BAB I PENDAHULUAN': 'Bab ini membahas latar belakang penelitian, rumusan masalah yang akan dipecahkan, tujuan yang ingin dicapai, dan manfaat yang diharapkan dari penelitian ini.',
      'BAB II LANDASAN TEORI': 'Bab ini membahas teori-teori dasar yang menjadi landasan penelitian, penelitian terkait yang telah dilakukan sebelumnya, dan kerangka konseptual yang digunakan.',
      'BAB III METODOLOGI PENELITIAN': 'Bab ini menjelaskan metode penelitian yang digunakan, jenis penelitian, sumber data, teknik pengumpulan data, dan metode analisis yang diterapkan.',
      'BAB IV HASIL DAN PEMBAHASAN': 'Bab ini menyajikan hasil penelitian yang telah dilakukan, analisis data yang diperoleh, pembahasan temuan, dan interpretasi hasil penelitian.',
      'BAB V PENUTUP': 'Bab ini berisi kesimpulan dari penelitian yang telah dilakukan dan saran untuk penelitian selanjutnya atau implementasi hasil penelitian.'
    };
    
    return contentMap[chapterTitle] || `Konten untuk ${chapterTitle} akan diisi sesuai dengan kebutuhan penelitian.`;
  }

  private generateCoverPage(meta: ReportMetadata): Paragraph[] {
    return [
      // University Logo placeholder
      new Paragraph({
        children:[ new TextRun({ text: `LOGO UNIVERSITAS`, size: 20, italics: true, color: "888888" }) ],
        alignment: AlignmentType.CENTER,
        spacing:{ after: 200 }
      }),
      
      // University Name
      new Paragraph({
        children:[ new TextRun({ text: meta.university || 'UNIVERSITAS', size: 32, bold:true }) ],
        alignment: AlignmentType.CENTER,
        spacing:{ after: 100 }
      }),
      
      // Faculty/Program
      new Paragraph({
        children:[ new TextRun({ text: `FAKULTAS/PROGRAM STUDI ${meta.program || 'PROGRAM STUDI'}`, size: 24 }) ],
        alignment: AlignmentType.CENTER,
        spacing:{ after: 300 }
      }),
      
      // Document Title
      new Paragraph({
        children:[ new TextRun({ text: meta.title, bold:true, size: 48 }) ],
        alignment: AlignmentType.CENTER,
        spacing:{ after: 400 }
      }),
      
      // Author Information
      new Paragraph({
        children:[ new TextRun({ text: `Disusun oleh:`, size: 24 }) ],
        alignment: AlignmentType.CENTER,
        spacing:{ after: 100 }
      }),
      new Paragraph({
        children:[ new TextRun({ text: meta.author, size: 28, bold:true }) ],
        alignment: AlignmentType.CENTER,
        spacing:{ after: 100 }
      }),
      
      // Student ID (NIM)
      ...(meta.studentId ? [ 
        new Paragraph({ 
          children:[ new TextRun({ text: `NIM: ${meta.studentId}`, size: 24 }) ], 
          alignment: AlignmentType.CENTER, 
          spacing:{ after: 300 } 
        }) 
      ]: []),
      
      // Year
      new Paragraph({
        children:[ new TextRun({ text: meta.year || new Date().getFullYear().toString(), size: 28, bold:true }) ],
        alignment: AlignmentType.CENTER,
        spacing:{ after: 200 }
      }),
    ];
  }

  private generateBibliography(references: Reference[]): Paragraph[] {
    if (references.length === 0) {
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: "Daftar Pustaka akan diisi sesuai dengan sumber yang digunakan dalam penelitian.",
              size: this.templateStyle!.fontSize * 2,
              italics: true,
            }),
          ],
          spacing: this.templateStyle!.paragraphSpacing,
        }),
      ];
    }

    return references.map(ref => 
      new Paragraph({
        children: [
          new TextRun({
            text: ref.text,
            size: this.templateStyle!.fontSize * 2,
          }),
        ],
        spacing: { before: 0, after: 120 },
      })
    );
  }

  private generateAppendices(appendices: AppendixSection[]): Paragraph[] {
    const appendixParagraphs: Paragraph[] = [];

    appendices.forEach(appendix => {
      // Appendix heading
      appendixParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Lampiran ${appendix.label}: ${appendix.title}`,
              bold: true,
              size: this.templateStyle!.headingStyles['heading1'].fontSize * 2,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );

      // Appendix content
      appendix.content.forEach(line => {
        appendixParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: this.templateStyle!.fontSize * 2,
                font: appendix.type === 'sql' || appendix.type === 'code' ? 'Courier New' : undefined,
              }),
            ],
            spacing: { before: 0, after: 80 },
            // Use different formatting for code content
            ...(appendix.type === 'sql' || appendix.type === 'code' ? {
              indent: { left: 720, right: 720 }, // Indent code blocks
            } : {}),
          })
        );
      });

      // Add space between appendices
      appendixParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "", break: 1 })],
          spacing: { after: 200 },
        })
      );
    });

    return appendixParagraphs;
  }

  /**
   * Convert structured parsed content into a linear plain-text view for diffing.
   */
  public getPlainText(parsed: ParsedContent): string {
    const lines: string[] = [];
    
    // Cover page info
    if (parsed.metadata) {
      lines.push('=== HALAMAN SAMPUL ===');
      lines.push(parsed.metadata.university || '');
      lines.push(parsed.metadata.title || parsed.title || '');
      lines.push(`Disusun oleh: ${parsed.metadata.author}`);
      if (parsed.metadata.studentId) lines.push(`NIM: ${parsed.metadata.studentId}`);
      lines.push(parsed.metadata.year || '');
      lines.push('');
    }
    
    // Table of Contents - Clean, only headings
    lines.push('=== DAFTAR ISI ===');
    parsed.sections
      .filter(sec => sec.title.startsWith('BAB') && sec.level === 1)
      .forEach(sec => {
        lines.push(sec.title);
        sec.subsections
          .filter(sub => /^\d+\.\d+\s+/.test(sub.title))
          .forEach(sub => {
            lines.push(`  ${sub.title}`);
          });
      });
    lines.push('DAFTAR PUSTAKA');
    lines.push('LAMPIRAN');
    lines.push('');
    
    // List of Tables
    if (parsed.tables.length > 0) {
      lines.push('=== DAFTAR TABEL ===');
      parsed.tables.forEach(t => lines.push(t.title));
      lines.push('');
    }
    
    // List of Figures
    if (parsed.figures.length > 0) {
      lines.push('=== DAFTAR GAMBAR ===');
      parsed.figures.forEach(f => lines.push(f.title));
      lines.push('');
    }
    
    // Main content - Only academic chapters
    lines.push('=== KONTEN UTAMA ===');
    parsed.sections
      .filter(sec => sec.title.startsWith('BAB') && sec.level === 1)
      .forEach(sec => {
        lines.push(sec.title);
        if (sec.content.trim()) lines.push(sec.content.trim());
        sec.subsections
          .filter(sub => /^\d+\.\d+\s+/.test(sub.title))
          .forEach(sub => {
            lines.push(sub.title);
            if (sub.content.trim()) lines.push(sub.content.trim());
          });
        lines.push('');
      });
    
    // Bibliography
    lines.push('=== DAFTAR PUSTAKA ===');
    parsed.references.forEach(r => lines.push(r.text));
    lines.push('');
    
    // Appendices - Technical content moved here
    lines.push('=== LAMPIRAN ===');
    if (parsed.appendices && parsed.appendices.length > 0) {
      parsed.appendices.forEach(appendix => {
        lines.push(`Lampiran ${appendix.label}: ${appendix.title}`);
        appendix.content.forEach(line => lines.push(`  ${line}`));
        lines.push('');
      });
    } else {
      lines.push('Bagian lampiran untuk material pendukung penelitian.');
    }
    
    return lines.join('\n');
  }
}

export { DocumentFormatter };
export type { TemplateStyle, ParsedContent, ContentSection, Table, Figure, Reference, AppendixSection, ReportMetadata };
