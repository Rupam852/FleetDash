import React, { useState, useRef, useEffect, useLayoutEffect, useId, useMemo } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface PremiumSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  searchKeywords?: string;
}

interface PremiumSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: PremiumSelectOption[];
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  menuMaxHeight?: string;
  menuClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
  clearAriaLabel?: string;
  size?: "sm" | "md";
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  emptyMessage?: string;
}

export const PremiumSelect: React.FC<PremiumSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  icon,
  disabled = false,
  menuMaxHeight,
  menuClassName = "left-0 right-0",
  searchable = false,
  searchPlaceholder = "Search options...",
  clearable = false,
  clearAriaLabel = "Clear selection",
  size = "md",
  id,
  ariaLabel,
  ariaLabelledBy,
  emptyMessage = "No matching options",
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const [dynamicMaxHeight, setDynamicMaxHeight] = useState<number>(240);

  const reactId = useId();
  const listboxId = `premium-select-listbox-${reactId}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!searchable || !q) return options;
    return options.filter((opt) => {
      const haystack = [
        opt.label,
        opt.subLabel,
        opt.badge,
        opt.value,
        opt.searchKeywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [options, searchable, searchQuery]);

  // Calculate viewport-aware placement (auto-flip upward when near viewport bottom)
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const neededHeight = searchable ? 255 : 210;

    const shouldFlipUp = spaceBelow < neededHeight && spaceAbove > spaceBelow;
    setPlacement(shouldFlipUp ? "top" : "bottom");

    const available = shouldFlipUp ? spaceAbove : spaceBelow;
    const chromeHeight = searchable ? 56 : 16;
    const clampedListHeight = Math.max(120, Math.min(248, Math.floor(available - chromeHeight)));
    setDynamicMaxHeight(clampedListHeight);
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, searchable]);

  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updatePosition();
    window.addEventListener("resize", handleReposition, { passive: true });
    window.addEventListener("scroll", handleReposition, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, { capture: true });
    };
  }, [isOpen, searchable]);

  // Outside click / pointer dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handlePointerDownOutside);
    return () => document.removeEventListener("mousedown", handlePointerDownOutside);
  }, [isOpen]);

  // Reset search & focus search input (or listbox) on open
  useEffect(() => {
    if (!isOpen) return;

    const currentIdx = options.findIndex((o) => o.value === value && !o.disabled);
    const firstEnabled = options.findIndex((o) => !o.disabled);
    setHighlightedIndex(currentIdx >= 0 ? currentIdx : firstEnabled);

    const frame = requestAnimationFrame(() => {
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus({ preventScroll: true });
      } else if (listboxRef.current) {
        listboxRef.current.focus({ preventScroll: true });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Keep highlighted option scrolled into view
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const el = optionRefs.current[highlightedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  // Re-sync highlighted index when search query changes
  useEffect(() => {
    if (!isOpen) return;
    const firstEnabled = filteredOptions.findIndex((o) => !o.disabled);
    setHighlightedIndex(firstEnabled);
  }, [searchQuery]);

  const closeMenu = (restoreFocus: boolean) => {
    setIsOpen(false);
    setSearchQuery("");
    if (restoreFocus) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus({ preventScroll: true });
      });
    }
  };

  const commitOption = (opt: PremiumSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    closeMenu(true);
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (filteredOptions.length === 0) return;
    let next = highlightedIndex;
    for (let step = 0; step < filteredOptions.length; step++) {
      next = (next + direction + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[next]?.disabled) {
        setHighlightedIndex(next);
        return;
      }
    }
  };

  const handleOpenKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    } else if (event.key === "Tab") {
      setIsOpen(false);
      setSearchQuery("");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      const first = filteredOptions.findIndex((o) => !o.disabled);
      if (first >= 0) setHighlightedIndex(first);
    } else if (event.key === "End") {
      event.preventDefault();
      for (let i = filteredOptions.length - 1; i >= 0; i--) {
        if (!filteredOptions[i].disabled) {
          setHighlightedIndex(i);
          break;
        }
      }
    } else if (event.key === "Enter") {
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        event.preventDefault();
        commitOption(filteredOptions[highlightedIndex]);
      }
    } else if (event.key === " " && !searchable) {
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        event.preventDefault();
        commitOption(filteredOptions[highlightedIndex]);
      }
    }
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeMenu(true);
    }
  };

  const showClearButton = Boolean(clearable && !disabled && value);
  const triggerPadding =
    size === "sm"
      ? showClearButton
        ? "pl-3 pr-14 py-1.5 rounded-xl text-xs"
        : "px-3 py-1.5 rounded-xl text-xs"
      : showClearButton
      ? "pl-3.5 pr-14 py-2.5 rounded-xl text-xs"
      : "px-3.5 py-2.5 rounded-xl text-xs";

  const activeDescendantId =
    isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]
      ? `${listboxId}-opt-${highlightedIndex}`
      : undefined;

  return (
    <div className={`relative min-w-0 ${className}`} ref={containerRef}>
      {/* Trigger Row (Sibling buttons prevent invalid nested interactive buttons) */}
      <div className="relative flex items-center min-w-0">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => (isOpen ? closeMenu(false) : setIsOpen(true))}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={`w-full min-h-[34px] flex items-center justify-between gap-2 border font-medium transition-all duration-150 select-none focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 focus-visible:outline-offset-2 ${triggerPadding} ${
            disabled
              ? "bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed"
              : isOpen
              ? "bg-white dark:bg-[#1E293B] border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/15 dark:ring-blue-400/20 shadow-sm text-slate-900 dark:text-white"
              : "bg-slate-50/90 dark:bg-[#1E293B]/70 hover:bg-white dark:hover:bg-[#1E293B] border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-100 shadow-2xs"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
            {icon && (
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-400 shrink-0">
                {icon}
              </span>
            )}
            {selectedOption?.icon && (
              <span aria-hidden="true" className="shrink-0">
                {selectedOption.icon}
              </span>
            )}

            <div className="min-w-0 flex-1">
              {selectedOption ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {selectedOption.label}
                  </span>
                  {selectedOption.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border shrink-0 whitespace-nowrap ${
                        selectedOption.badgeColor ||
                        "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      }`}
                    >
                      {selectedOption.badge}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 dark:text-slate-400 truncate block font-normal">
                  {placeholder}
                </span>
              )}

              {selectedOption?.subLabel && (
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {selectedOption.subLabel}
                </div>
              )}
            </div>
          </div>

          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
            }`}
          />
        </button>

        {showClearButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              triggerRef.current?.focus({ preventScroll: true });
            }}
            aria-label={clearAriaLabel}
            className="absolute right-8 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
          >
            <X aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Dropdown Menu Popover (Viewport-Aware Placement + Light/Dark Surface) */}
      {isOpen && (
        <div
          className={`absolute z-[110] ${menuClassName} bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/90 ring-1 ring-slate-900/5 dark:ring-white/10 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/70 p-1.5 focus:outline-none ${
            placement === "top"
              ? "bottom-full mb-1.5 origin-bottom animate-pop-up"
              : "top-full mt-1.5 origin-top animate-pop"
          }`}
          onKeyDown={handleOpenKeyDown}
        >
          {/* Optional Sticky Search Box */}
          {searchable && (
            <div className="px-1 pt-0.5 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800/90">
              <div className="relative flex items-center">
                <Search
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 absolute left-2.5 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  aria-controls={listboxId}
                  aria-activedescendant={activeDescendantId}
                  className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500/40 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus({ preventScroll: true });
                    }}
                    aria-label="Clear search query"
                    className="absolute right-1.5 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition"
                  >
                    <X aria-hidden="true" className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Listbox Container (Never set overflow: hidden so zooming/short viewports stay reachable) */}
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={searchable ? undefined : -1}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-activedescendant={!searchable ? activeDescendantId : undefined}
            style={menuMaxHeight ? undefined : { maxHeight: `${dynamicMaxHeight}px` }}
            className={`${
              menuMaxHeight || ""
            } overflow-y-auto overscroll-contain dropdown-scrollbar space-y-0.5 focus:outline-none`}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={opt.value || `empty-${idx}`}
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    id={`${listboxId}-opt-${idx}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    disabled={opt.disabled}
                    aria-selected={isSelected}
                    onMouseEnter={() => {
                      if (!opt.disabled) setHighlightedIndex(idx);
                    }}
                    onClick={() => commitOption(opt)}
                    className={`w-full min-h-[34px] text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors duration-100 border ${
                      opt.disabled
                        ? "opacity-45 cursor-not-allowed border-transparent text-slate-400 dark:text-slate-500"
                        : isSelected
                        ? "bg-blue-50/90 dark:bg-blue-950/55 text-blue-900 dark:text-blue-200 font-semibold border-blue-200/80 dark:border-blue-800/70"
                        : isHighlighted
                        ? "bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-700/80"
                        : "text-slate-700 dark:text-slate-200 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && (
                        <span aria-hidden="true" className="shrink-0">
                          {opt.icon}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{opt.label}</span>
                          {opt.badge && (
                            <span
                              className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold border shrink-0 whitespace-nowrap ${
                                opt.badgeColor ||
                                "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        aria-hidden="true"
                        className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-2xs"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
