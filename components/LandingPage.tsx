import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { FileText, Upload, Download, History, CheckCircle } from "lucide-react";

export function LandingPage() {
  const { loginWithGoogle, isLoading, user } = useAuth();
  const navigate = useNavigate();

  // Redirect otomatis ke dashboard setelah user berhasil login
  useEffect(() => {
    if (!isLoading && user) {
      console.log('🚀 User logged in, navigating to /dashboard');
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
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
              <h1 className="text-xl font-bold text-gray-800">Auto Report Formatter</h1>
            </div>
            <Button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Masuk..." : "Masuk dengan Google"}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            Format Laporan Akademik
            <span className="text-blue-600"> Secara Otomatis</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Unggah template laporan dan draft dokumen Anda. Formatter pintar kami akan menerapkan 
            styling yang konsisten, membuat daftar isi, dan memastikan penomoran yang tepat di seluruh dokumen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
            >
              Mulai Gratis
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-3 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Lihat Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Cara Kerja</h2>
          <p className="text-lg text-gray-600">Langkah mudah untuk memformat laporan akademik Anda dengan sempurna</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Unggah Template</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Unggah template laporan Anda (PDF/DOCX) untuk mengekstrak aturan styling, font, dan panduan format.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Unggah Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Unggah draft laporan Anda (Word/PDF) yang perlu diformat dan diorganisir.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-purple-200 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Format Otomatis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                AI kami menerapkan styling template, memperbaiki penomoran, dan membuat daftar isi secara otomatis.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-orange-200 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl">Ekspor & Simpan</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Unduh dokumen yang telah diformat dalam format DOCX/PDF dan simpan ke Google Drive Anda secara otomatis.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features List */}
      <section className="container mx-auto px-6 py-16 bg-white/50 rounded-3xl mx-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Semua yang Anda Butuhkan untuk Laporan Sempurna
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Penomoran Otomatis</h3>
                  <p className="text-gray-600">BAB I, BAB II, bagian 1.1, 1.1.1, Tabel 2.1, Gambar 3.2, Lampiran A</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Daftar Isi</h3>
                  <p className="text-gray-600">Dibuat secara otomatis dengan nomor halaman dan format yang tepat</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Daftar Tabel & Gambar</h3>
                  <p className="text-gray-600">Daftar Tabel dan Daftar Gambar dibuat secara otomatis</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Integrasi Google Drive</h3>
                  <p className="text-gray-600">Simpan semua dokumen ke folder terorganisir di Google Drive Anda</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Berbagai Format Ekspor</h3>
                  <p className="text-gray-600">Ekspor laporan yang telah diformat sebagai file DOCX dan PDF</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Riwayat Dokumen</h3>
                  <p className="text-gray-600">Akses dokumen yang telah diformat sebelumnya kapan saja</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl font-bold text-gray-900">
            Siap untuk Memformat Laporan Anda?
          </h2>
          <p className="text-lg text-gray-600">
            Bergabung dengan ribuan mahasiswa dan peneliti yang mempercayai Auto Report Formatter 
            untuk kebutuhan dokumen akademik mereka.
          </p>
          <Button 
            size="lg" 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-lg px-12 py-4"
          >
            Mulai Format Sekarang
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 Auto Report Formatter. Dibuat untuk keunggulan akademik.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
