import React, { useState } from 'react';
import { ChevronRight, Shield } from 'lucide-react';

interface GameImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const GameImage: React.FC<GameImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#2B2620] to-[#1C1917] text-[#E6DEC8] p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shield className="w-8 h-8 text-[#C4912F] mb-1.5 opacity-80" />
        {fallbackTitle && (
          <span className="text-xs font-medium text-center opacity-85 line-clamp-2">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

interface StatBarProps {
  value: number;
  label?: string;
  showText?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({ value, label, showText = false }) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color =
    v < 34 ? 'bg-[#991B1B]' : v < 67 ? 'bg-[#B45309]' : 'bg-[#15803D]';
  const statusText = v < 34 ? 'Rendah' : v < 67 ? 'Sedang' : 'Baik';

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between text-xs text-[#44403C] mb-1">
          <span className="font-medium capitalize">{label}</span>
          <span className="font-num text-[#1C1917] font-semibold">
            {v}/100{showText ? ` · ${statusText}` : ''}
          </span>
        </div>
      )}
      <div className="h-2.5 w-full bg-[#E5E0D0] rounded-sm overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${color}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
};

interface ListRowProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  onClick?: () => void;
  rightLabel?: string;
  disabled?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  icon,
  title,
  subtitle,
  onClick,
  rightLabel,
  disabled = false,
}) => {
  const interactive = Boolean(onClick) && !disabled;
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={interactive ? disabled : undefined}
      className={`w-full text-left flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E1D3] last:border-b-0 transition-colors duration-150 ${
        interactive
          ? 'hover:bg-[#F1EDE0] active:bg-[#E9E3D0] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9A6614]'
          : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon !== undefined && (
        <span className="w-8 h-8 shrink-0 flex items-center justify-center text-lg bg-[#F4F0E4] border border-[#E2DCC9] rounded-md">
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#1C1917] truncate">{title}</div>
        {subtitle && (
          <div className="text-xs text-[#57534E] mt-0.5 leading-snug">{subtitle}</div>
        )}
      </div>
      {rightLabel && (
        <span className="text-xs font-num font-medium text-[#57534E] shrink-0">
          {rightLabel}
        </span>
      )}
      {interactive && <ChevronRight className="w-4 h-4 text-[#78716C] shrink-0" />}
    </Tag>
  );
};

export const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({
  title,
  right,
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 bg-[#ECE7D8] border-y border-[#DDD6C3]">
    <h3 className="text-xs font-semibold tracking-wide text-[#44403C]">{title}</h3>
    {right && <div className="text-xs text-[#57534E]">{right}</div>}
  </div>
);

export const ViewShell: React.FC<{
  title: string;
  onBack?: () => void;
  onHome?: () => void;
  bannerUrl?: string;
  bannerCaption?: string;
  children: React.ReactNode;
}> = ({ title, onBack, onHome, bannerUrl, bannerCaption, children }) => (
  <div className="bg-white border border-[#DDD6C3] rounded-lg overflow-hidden shadow-xs">
    {bannerUrl && (
      <div className="relative h-32 sm:h-40 w-full overflow-hidden bg-[#1C1917]">
        <GameImage
          src={bannerUrl}
          alt={bannerCaption || title}
          fallbackTitle={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-4">
          <div>
            {bannerCaption && (
              <p className="text-xs text-[#E7DEC8] font-medium mb-0.5">{bannerCaption}</p>
            )}
            <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-black/50 hover:bg-black/70 border border-white/25 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Kembali
              </button>
            )}
            {onHome && (
              <button
                type="button"
                onClick={onHome}
                className="px-3 py-1.5 text-xs font-semibold text-[#1C1917] bg-[#F6F4EC] hover:bg-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Istana
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    {!bannerUrl && (
      <div className="px-4 py-3 bg-[#F4F0E4] border-b border-[#DDD6C3] flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-bold text-[#1C1917] truncate">{title}</h2>
        <div className="flex items-center gap-2 shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 text-xs font-semibold text-[#1C1917] bg-white border border-[#D6CFC0] hover:bg-[#EFEBE0] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Kembali
            </button>
          )}
          {onHome && (
            <button
              type="button"
              onClick={onHome}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#9A6614] hover:bg-[#82540F] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Istana
            </button>
          )}
        </div>
      </div>
    )}
    <div>{children}</div>
  </div>
);
