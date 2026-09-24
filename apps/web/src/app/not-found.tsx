import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="text-center space-y-6 px-4">
        {/* 404 Number with glow effect */}
        <div className="relative">
          <h1 className="text-9xl font-bold bg-gradient-to-br from-emerald-400 via-cyan-400 to-emerald-600 bg-clip-text text-transparent animate-pulse">
            404
          </h1>
          <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-emerald-500 to-cyan-500 -z-10" />
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-100">
            Trang Không Tồn Tại
          </h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-semibold rounded-lg transition-all duration-200 glow-emerald hover:scale-105 active:scale-95"
          >
            Về Trang Chủ
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-100 font-semibold rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Xem Sản Phẩm
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="pt-8 opacity-50">
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
            <span className="text-sm">Seiko MMO</span>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
