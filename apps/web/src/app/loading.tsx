export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="relative">
        {/* Animated spinner with glow */}
        <div className="relative w-24 h-24">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          
          {/* Spinning gradient ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 border-r-cyan-500 animate-spin" />
          
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-xl" />
          
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 animate-pulse" />
          </div>
        </div>

        {/* Outer glow effect */}
        <div className="absolute inset-0 blur-2xl opacity-30 bg-gradient-to-br from-emerald-500 to-cyan-500 animate-pulse -z-10" />
      </div>

      {/* Loading text */}
      <div className="mt-8 space-y-2 text-center">
        <p className="text-lg font-medium text-slate-300 animate-pulse">
          Đang tải...
        </p>
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:150ms]" />
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
