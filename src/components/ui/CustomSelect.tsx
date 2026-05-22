"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  color?: string; // HEX or CSS color
}

interface CustomSelectProps {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

export function CustomSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "Pilih opsi",
  required = false,
  onChange,
  className,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync internal state with defaultValue changes (e.g., when editing or resetting form)
  useEffect(() => {
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  function handleSelect(value: string) {
    setSelectedValue(value);
    setIsOpen(false);
    if (onChange) {
      onChange(value);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Hidden input to hold value for forms */}
      <input type="hidden" name={name} value={selectedValue} required={required} />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-left text-sm text-text-primary hover:border-[#444C56] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent flex items-center justify-between transition-all duration-200"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="shrink-0 text-text-muted">{selectedOption.icon}</span>
              )}
              {selectedOption.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: selectedOption.color }}
                />
              )}
              <div className="truncate">
                <span className="text-text-primary block truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.sublabel && (
                  <span className="text-[10px] text-text-muted block truncate">
                    {selectedOption.sublabel}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className="text-text-muted shrink-0 ml-2" />
      </button>

      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-elevated border border-border rounded-md py-1 shadow-lg animate-fade-in">
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-text-muted text-center">
              Tidak ada pilihan
            </li>
          ) : (
            options.map((opt) => {
              const isOptionSelected = opt.value === selectedValue;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors duration-150",
                      isOptionSelected
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-text-primary hover:bg-[#2D333B]"
                    )}
                  >
                    {opt.icon && (
                      <span className="shrink-0 text-text-muted">{opt.icon}</span>
                    )}
                    {opt.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    <div className="truncate">
                      <span className="block truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className={cn(
                          "block text-[10px] truncate",
                          isOptionSelected ? "text-accent/80" : "text-text-muted"
                        )}>
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
