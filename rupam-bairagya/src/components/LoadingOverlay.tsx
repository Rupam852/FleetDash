import React from "react";
import { ShieldCheck } from "lucide-react";

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  subMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  message = "Loading LedgerGuard...",
  subMessage = "Connecting to isolated workspace...",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-[999] animate-fade-in p-4">
      <div
        className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950/20 dark:shadow-black/60 flex flex-col items-center justify-center space-y-4 max-w-sm w-full text-center animate-pop"
      >
        {/* Animated Circular Spinner with Shield */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-100 dark:border-blue-950 border-t-blue-600 dark:border-t-blue-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>
        </div>

        {/* Message and Subtext */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{message}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{subMessage}</p>
        </div>
      </div>
    </div>
  );
};
