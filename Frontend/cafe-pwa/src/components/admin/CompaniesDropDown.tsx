import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Company } from "@/app/restaurant/select-company/page";


interface CompanyDropdownProps {
    companies: Company[];
    selectedCompanyId: number | null;
    isAdminPanel?: boolean;
    setSelectedCompanyId: (id: number | null) => void;
    setSelectedCompanyName: (name: string) => void;
    idPrefix?: string; // برای یکتا بودن aria-ids وقتی چند دراپ‌داون داریم
}

export function CompanyDropdown({
    companies,
    selectedCompanyId,
    isAdminPanel = true,
    setSelectedCompanyId,
    setSelectedCompanyName,
    idPrefix = "company",
}: CompanyDropdownProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

    // بستن با کلیک بیرون
    useEffect(() => {
        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            if (!open) return;
            const el = containerRef.current;
            if (el && !el.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("touchstart", onPointerDown, { passive: true });
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("touchstart", onPointerDown);
        };
    }, [open]);

    // بستن با ESC
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!open) return;
            if (e.key === "Escape") {
                e.stopPropagation();
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    // بستن وقتی انتخاب عوض می‌شود
    useEffect(() => {
        if (open) setOpen(false);
    }, [selectedCompanyId]);

    // اختیاری: بستن روی scroll/resize
    useEffect(() => {
        const close = () => setOpen(false);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, []);

    const handleSelect = (company: Company) => {
        setSelectedCompanyId(company.id);
        setSelectedCompanyName(company.name);

        const idKey = isAdminPanel ? "rst_selectedCompanyId_admin" : "rst_selectedCompanyId";
        const nameKey = isAdminPanel ? "rst_selectedCompanyName_admin" : "rst_selectedCompanyName";
        sessionStorage.setItem(idKey, String(company.id));
        sessionStorage.setItem(nameKey, company.name);

        setOpen(false);
        buttonRef.current?.focus();
    };

    const dropdownId = `${idPrefix}-dropdown`;
    const listboxId = `${idPrefix}-listbox`;

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mx-auto mb-8 relative"
            style={{ direction: "rtl" }}
        >
            <Label
                htmlFor={dropdownId}
                className="block text-sm font-medium text-white/70 mb-2 text-right"
            >
                سازمان / شرکت
            </Label>

            {/* دکمه انتخاب */}
            <motion.button
                ref={buttonRef}
                id={dropdownId}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                whileTap={{ scale: 0.98 }}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listboxId}
                className="appearance-none w-full text-sm sm:text-base text-white font-light bg-white/10 
                   backdrop-blur-lg border border-white/20 rounded-xl py-3 pl-10 pr-4 flex items-center 
                   justify-between cursor-pointer focus:ring-2 focus:ring-[#D63A4F]/70 
                   focus:border-transparent outline-none transition-all duration-300
                   hover:bg-white/15 hover:shadow-lg hover:shadow-[#D63A4F]/10"
            >
                <span className="truncate">
                    {selectedCompany ? selectedCompany.name : "انتخاب شرکت..."}
                </span>
                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-white/70"
                >
                    <ChevronDown className="h-5 w-5" />
                </motion.span>
            </motion.button>

            {/* پنل بازشو */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={listRef}
                        id={listboxId}
                        role="listbox"
                        aria-activedescendant={
                            selectedCompany ? `${idPrefix}-opt-${selectedCompany.id}` : undefined
                        }
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="absolute z-30 top-full mt-2 w-full rounded-xl border border-white/20 
                       bg-white/10 backdrop-blur-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto 
                       scrollbar-thin scrollbar-thumb-white/20"
                    >
                        {companies.map((company) => {
                            const active = company.id === selectedCompanyId;
                            return (
                                <div
                                    id={`${idPrefix}-opt-${company.id}`}
                                    key={company.id}
                                    role="option"
                                    aria-selected={active}
                                    tabIndex={0}
                                    onClick={() => handleSelect(company)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") handleSelect(company);
                                        if (e.key === "Escape") {
                                            setOpen(false);
                                            buttonRef.current?.focus();
                                        }
                                    }}
                                    className={`px-4 py-2.5 cursor-pointer text-sm sm:text-base transition-all outline-none
                    ${active
                                            ? "bg-[#D63A4F]/30 text-white font-medium"
                                            : "text-white/80 hover:bg-white/15 focus:bg-white/15"
                                        }`}
                                >
                                    {company.name}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* نمایش نام انتخاب‌شده */}
            {/* {selectedCompany && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-xs sm:text-sm text-white/60 text-center sm:text-right"
                >
                    شرکت انتخاب‌شده:{" "}
                    <span className="text-white font-semibold">{selectedCompany.name}</span>
                </motion.div>
            )} */}
        </motion.div>
    );
}
