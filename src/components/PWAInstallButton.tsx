import React, { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { isNativeCapacitorApp, useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'full'
            ? 'w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-[#1C1917] bg-[#F6F4EC] hover:bg-white border border-[#D6CFC0] rounded-md transition-colors whitespace-nowrap cursor-pointer'
            : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#9A6614] bg-[#FAF3E0] hover:bg-[#F3E6C3] border border-[#E6D9B5] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="w-3.5 h-3.5" />
        <span>Pasang App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        title="Cara pasang di HP Android / iOS"
        className={
          variant === 'full'
            ? 'w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#1C1917] bg-[#FAF8F2] hover:bg-[#ECE7D8] border border-[#DDD6C3] rounded-md transition-colors whitespace-nowrap cursor-pointer'
            : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#EFEBE0] border border-[#DDD6C3] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Pasang di HP</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bg-[#FAF8F2] border border-[#DDD6C3] rounded-lg max-w-md w-full p-5 shadow-xl space-y-3">
            <h3 className="font-display text-base font-bold text-[#1C1917]">
              Pasang Kerajaan 1066 di Ponsel
            </h3>
            {isIOS ? (
              <div className="text-xs text-[#44403C] space-y-1.5 leading-relaxed">
                <p>1. Buka tautan aplikasi ini di browser <strong>Safari</strong>.</p>
                <p>2. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari.</p>
                <p>3. Pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
              </div>
            ) : (
              <div className="text-xs text-[#44403C] space-y-1.5 leading-relaxed">
                <p>
                  <strong>Cara Langsung (Android Chrome - Tanpa APK):</strong>
                </p>
                <p>1. Buka aplikasi di Google Chrome Android.</p>
                <p>2. Ketuk ikon menu titik tiga <strong>⋮</strong> di pojok kanan atas Chrome.</p>
                <p>3. Pilih <strong>Tambahkan ke layar utama / Instal aplikasi</strong>. Game akan terpasang sebagai aplikasi layar penuh dan dapat dimainkan offline.</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2 text-xs font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline || isNativeCapacitorApp()) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-[#78350F] text-[#FEF3C7] text-xs font-medium rounded-md border border-[#9A6614] shadow-md">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Mode Offline — Data tersimpan di perangkat</span>
    </div>
  );
};
