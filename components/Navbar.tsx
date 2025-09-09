import { Button } from "./ui/button";
import { Github, Menu, X, BookOpen, HelpCircle, Play, FileText, Search, Settings, Code } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { LoginDialog } from "./LoginDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showUserManual, setShowUserManual] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
              <span className="text-foreground font-black text-2xl">X</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-foreground/80 hover:text-foreground transition-colors">
              Features
            </a>
            
            {/* Docs Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-foreground/80 hover:text-foreground transition-colors flex items-center gap-1">
                Docs
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuLabel>Getting Started</DropdownMenuLabel>
                <DropdownMenuItem className="cursor-pointer">
                  <Play className="w-4 h-4 mr-2" />
                  Quick Start Guide
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setShowUserManual(true)}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  User Manual
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Features</DropdownMenuLabel>
                <DropdownMenuItem className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Document Upload
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Search className="w-4 h-4 mr-2" />
                  Text Extraction
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Library Management
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Advanced</DropdownMenuLabel>
                <DropdownMenuItem className="cursor-pointer">
                  <Code className="w-4 h-4 mr-2" />
                  API Reference
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  FAQ & Troubleshooting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <a href="https://github.com/Maftuuh1922" target="_blank" rel="noopener noreferrer" 
               className="text-foreground/80 hover:text-foreground transition-colors flex items-center gap-2">
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <Button size="sm" className="bg-background hover:bg-secondary rounded-full">
                Go to Dashboard
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsLoginOpen(true)} className="rounded-full">
                Login
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-foreground/80"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-foreground/80 hover:text-foreground transition-colors">
                Features
              </a>
              
              {/* Mobile Docs Section */}
              <div className="space-y-2">
                <h4 className="text-foreground font-medium">Documentation</h4>
                <div className="pl-4 space-y-2">
                  <div className="flex items-center space-x-2 text-foreground/70 text-sm">
                    <Play className="w-4 h-4" />
                    <span>Quick Start Guide</span>
                  </div>
                  <div className="flex items-center space-x-2 text-foreground/70 text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>User Manual</span>
                  </div>
                  <div className="flex items-center space-x-2 text-foreground/70 text-sm">
                    <FileText className="w-4 h-4" />
                    <span>Document Upload</span>
                  </div>
                  <div className="flex items-center space-x-2 text-foreground/70 text-sm">
                    <Search className="w-4 h-4" />
                    <span>Text Extraction</span>
                  </div>
                  <div className="flex items-center space-x-2 text-foreground/70 text-sm">
                    <Code className="w-4 h-4" />
                    <span>API Reference</span>
                  </div>
                  <div className="flex items-center space-x-2 text-foreground/70 text-sm">
                    <HelpCircle className="w-4 h-4" />
                    <span>FAQ & Help</span>
                  </div>
                </div>
              </div>
              
              <a href="https://github.com/Maftuuh1922" target="_blank" rel="noopener noreferrer" 
                 className="text-foreground/80 hover:text-foreground transition-colors flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                {user ? (
                  <Button size="sm" className="bg-background rounded-full">
                    Go to Dashboard
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsLoginOpen(true)} className="rounded-full">
                    Login
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Login Dialog */}
      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
      
      {/* User Manual Modal */}
      {showUserManual && (
        <div className="fixed inset-0 z-[100] bg-background">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center border">
                      <span className="text-foreground font-black text-lg">X</span>
                    </div>
                    <h1 className="text-xl font-semibold">User Manual - XRAIDER</h1>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowUserManual(false)}
                    className="rounded-full w-8 h-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                  
                  {/* Introduction */}
                  <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">Selamat Datang di XRAIDER</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      XRAIDER adalah platform ekstraksi dan manajemen dokumen akademik yang dirancang khusus untuk 
                      membantu peneliti, mahasiswa, dan akademisi dalam mengelola koleksi dokumen mereka dengan efisien.
                    </p>
                  </section>

                  {/* Getting Started */}
                  <section className="space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Play className="w-5 h-5 text-blue-500" />
                      Memulai Penggunaan
                    </h3>
                    <div className="bg-muted/30 rounded-lg p-6 space-y-3">
                      <div className="flex items-start space-x-3">
                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</span>
                        <div>
                          <h4 className="font-medium">Buat Akun atau Login</h4>
                          <p className="text-sm text-muted-foreground">Klik tombol "Login" di navbar untuk membuat akun baru atau masuk dengan akun existing.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</span>
                        <div>
                          <h4 className="font-medium">Upload Dokumen Pertama</h4>
                          <p className="text-sm text-muted-foreground">Gunakan area upload untuk menambahkan dokumen PDF, DOCX, atau format lainnya.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</span>
                        <div>
                          <h4 className="font-medium">Kelola Library Anda</h4>
                          <p className="text-sm text-muted-foreground">Organisir dokumen berdasarkan kategori dan gunakan fitur pencarian untuk menemukan informasi.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Features */}
                  <section className="space-y-4">
                    <h3 className="text-xl font-semibold">Fitur Utama</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      
                      {/* Document Upload */}
                      <div className="bg-muted/30 rounded-lg p-6 space-y-3">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-green-500" />
                          <h4 className="font-semibold">Upload Dokumen</h4>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Mendukung format PDF, DOCX, TXT</li>
                          <li>• Upload multiple files sekaligus</li>
                          <li>• Ekstraksi teks otomatis</li>
                          <li>• Preview dokumen sebelum disimpan</li>
                        </ul>
                      </div>

                      {/* Smart Organization */}
                      <div className="bg-muted/30 rounded-lg p-6 space-y-3">
                        <div className="flex items-center space-x-2">
                          <Settings className="w-5 h-5 text-purple-500" />
                          <h4 className="font-semibold">Organisasi Cerdas</h4>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Kategorisasi otomatis berdasarkan konten</li>
                          <li>• Tagging manual dan otomatis</li>
                          <li>• Grouping berdasarkan topik</li>
                          <li>• Metadata extraction</li>
                        </ul>
                      </div>

                      {/* Advanced Search */}
                      <div className="bg-muted/30 rounded-lg p-6 space-y-3">
                        <div className="flex items-center space-x-2">
                          <Search className="w-5 h-5 text-orange-500" />
                          <h4 className="font-semibold">Pencarian Canggih</h4>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Full-text search dalam dokumen</li>
                          <li>• Filter berdasarkan kategori</li>
                          <li>• Search berdasarkan author</li>
                          <li>• Pencarian semantik</li>
                        </ul>
                      </div>

                      {/* Library Management */}
                      <div className="bg-muted/30 rounded-lg p-6 space-y-3">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-5 h-5 text-red-500" />
                          <h4 className="font-semibold">Manajemen Library</h4>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Bookmark dokumen favorit</li>
                          <li>• Export citation dalam berbagai format</li>
                          <li>• Sharing collection dengan kolaborator</li>
                          <li>• Backup otomatis</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Tips & Best Practices */}
                  <section className="space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-yellow-500" />
                      Tips & Best Practices
                    </h3>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 space-y-3">
                      <div className="space-y-2">
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">💡 Tips untuk Efisiensi Maksimal:</h4>
                        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                          <li>• Gunakan nama file yang deskriptif sebelum upload</li>
                          <li>• Manfaatkan tags untuk kategorisasi yang lebih baik</li>
                          <li>• Gunakan fitur bookmark untuk dokumen yang sering diakses</li>
                          <li>• Lakukan backup library secara berkala</li>
                          <li>• Gunakan pencarian dengan keyword spesifik untuk hasil yang lebih akurat</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Troubleshooting */}
                  <section className="space-y-4">
                    <h3 className="text-xl font-semibold">Troubleshooting</h3>
                    <div className="space-y-4">
                      <div className="border border-border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Dokumen tidak bisa diupload?</h4>
                        <p className="text-sm text-muted-foreground">Pastikan file tidak melebihi 50MB dan format didukung (PDF, DOCX, TXT).</p>
                      </div>
                      <div className="border border-border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Pencarian tidak menampilkan hasil?</h4>
                        <p className="text-sm text-muted-foreground">Coba gunakan keyword yang lebih umum atau periksa filter kategori yang aktif.</p>
                      </div>
                      <div className="border border-border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Ekstraksi teks tidak akurat?</h4>
                        <p className="text-sm text-muted-foreground">Pastikan dokumen PDF memiliki text layer (bukan scan image). Untuk hasil terbaik, gunakan PDF yang dihasilkan dari text editor.</p>
                      </div>
                    </div>
                  </section>

                  {/* Contact Support */}
                  <section className="space-y-4">
                    <h3 className="text-xl font-semibold">Butuh Bantuan Lebih Lanjut?</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                      <p className="text-blue-800 dark:text-blue-200 mb-4">
                        Jika Anda mengalami masalah atau membutuhkan bantuan, jangan ragu untuk menghubungi kami:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://github.com/Maftuuh1922" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <Github className="w-4 h-4" />
                            GitHub Support
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4" />
                          FAQ & Help Center
                        </Button>
                      </div>
                    </div>
                  </section>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}