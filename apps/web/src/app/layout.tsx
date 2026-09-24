import type { Metadata } from 'next';
import './globals.css';
import { Navbar, Footer } from '@/components/layout-nav';
import { AuthProvider } from '@/lib/auth-context';
import { AuthModal } from '@/components/auth-modal';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Seiko MMO - Sàn Giao Dịch Số & Tool Tự Động Hóa MMO Chuyên Nghiệp',
  description:
    'Nền tảng mua bán sản phẩm số, tool auto nuôi nick, key bản quyền, proxy và dịch vụ seeding MMO uy tín với bảo chứng ký quỹ Escrow 100%.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950">
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <Footer />
            <AuthModal />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
