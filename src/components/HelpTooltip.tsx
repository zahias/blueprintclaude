"use client";

import { useState, useRef, useEffect } from "react";

interface HelpTooltipProps {
  text: string;
  className?: string;
}

export default function HelpTooltip({ text, className = "" }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <span className={`relative inline-flex items-center ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 transition flex items-center justify-center text-[10px] font-bold leading-none ml-1 shrink-0"
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </span>
  );
}
