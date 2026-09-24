"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Coffee, Utensils } from "lucide-react";

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 12 } },
};

const HubCard = ({ title, description, href, reverse, kind }: any) => {
  const router = useRouter();
  const Icon = kind === 'cafe' ? Coffee : Utensils;
  return (
    <motion.div
      variants={cardVariants}
      onClick={() => router.push(href)}
      className={`group flex flex-col md:flex-row ${reverse ? "md:flex-row-reverse" : ""} items-center justify-between gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-[#1f2937] transition-colors`}
    >
      <div className="w-full md:w-1/3 flex justify-center">
        <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-3xl bg-teal-500/10 border border-teal-300/20 flex items-center justify-center">
          <Icon className="w-14 h-14 text-teal-200" aria-hidden="true" />
        </div>
      </div>
      <div className="flex-1 text-center md:text-right text-white">
        <h2 className="text-xl sm:text-2xl font-bold mb-1">{title}</h2>
        <p className="text-white/80 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function HubPage() {
  return (
    <div className="flex flex-col flex-grow justify-center items-center p-3 sm:p-4">
      <motion.div className="flex flex-col gap-4 w-full max-w-2xl" initial="hidden" animate="visible" transition={{ staggerChildren: 0.15 }}>
        <HubCard title="کافه" description="سفارش نوشیدنی و پیگیری وضعیت سفارش" kind="cafe" href="/cafe" />
        <HubCard title="رستوران" description="رزرو غذای کارکنان و مشاهده منوی هفتگی" kind="restaurant" href="/restaurant/select-company" reverse />
      </motion.div>
    </div>
  );
}
