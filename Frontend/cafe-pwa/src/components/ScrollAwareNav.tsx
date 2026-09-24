"use client";

import { cn } from "@/lib/utils";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { Coffee, Snowflake } from "lucide-react";
import { useEffect, useState } from "react";

interface ScrollAwareNavProps { activeCategory: string; }
const navItems = [
  { id: "hot-bar", label: "بار گرم", icon: Coffee },
  { id: "cold-bar", label: "بار سرد", icon: Snowflake },
];

export const ScrollAwareNav = ({ activeCategory }: ScrollAwareNavProps) => {
  const isScrolled = useScrollPosition();
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerHeight < 500);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <nav className={cn("sticky top-24 z-10 bg-[#082A5B]/90 backdrop-blur-xl mb-4 transition-all duration-300", isScrolled ? "py-2" : "py-4")}>
      <div className="container mx-auto flex h-full justify-center items-center gap-4">
        {navItems.map(item => (
          <a key={item.id} href={`#${item.id}`} className={cn(
            "relative flex items-center justify-center rounded-2xl transition-all duration-300 overflow-hidden text-center",
            activeCategory === item.id ? "bg-teal-700 text-white shadow-lg" : "text-white bg-white/5 border border-white/10 hover:bg-white/10",
            isCompact ? "h-14 px-5" : "h-20 w-20 sm:h-24 sm:w-24"
          )}>
            {!isCompact ? <item.icon className="h-10 w-10" /> : <span className="text-sm font-semibold select-none">{item.label}</span>}
          </a>
        ))}
      </div>
      <div className="h-[4px] bg-white/30 w-2/3 mx-auto rounded-full mt-3" />
    </nav>
  );
};
