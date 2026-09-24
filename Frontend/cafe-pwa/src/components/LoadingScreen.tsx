"use client";
import { motion } from "framer-motion";
import { Coffee } from "lucide-react";
import { useEffect, useState } from "react";

interface LoadingScreenProps { minDuration?: number; done?: boolean; message?: string; onFinish?: () => void; }
export default function LoadingScreen({ minDuration = 1000, done = false, message = "در حال بارگذاری...", onFinish }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => setProgress(p => (p < 90 ? p + Math.random() * 3 : 90)), 50);
    return () => clearInterval(interval);
  }, [finished]);
  useEffect(() => {
    if (!done) return;
    const remaining = Math.max(minDuration - (Date.now() - startTime), 0);
    const timeout = setTimeout(() => {
      setProgress(100); setFinished(true); setTimeout(() => onFinish?.(), 400);
    }, remaining);
    return () => clearTimeout(timeout);
  }, [done, minDuration, startTime, onFinish]);
  return (
    <motion.div initial={{ opacity: 1 }} animate={{ opacity: finished ? 0 : 1 }} transition={{ duration: 0.4 }} className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black flex flex-col items-center justify-center z-50">
      <div className="flex items-center gap-3 mb-10 text-white"><Coffee className="w-12 h-12 text-teal-300" /><span className="text-xl font-semibold">Smart Food Operations</span></div>
      <div className="relative w-40 h-1 bg-gray-700 overflow-hidden rounded-full"><motion.div className="absolute top-0 left-0 h-full bg-teal-400" animate={{ width: `${progress}%` }} transition={{ duration: 0.2 }} /></div>
      <p className="mt-8 text-gray-400 text-sm text-center">{message}</p>
    </motion.div>
  );
}
