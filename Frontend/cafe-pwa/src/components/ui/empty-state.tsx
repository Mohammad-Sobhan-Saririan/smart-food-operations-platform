"use client";
import { CheckCircle2 } from "lucide-react";
interface EmptyStateProps { title: string; description: string; }
export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="text-center py-16 px-4 border-2 border-dashed border-white/20 rounded-lg">
    <div className="flex flex-col items-center text-center text-white">
      <CheckCircle2 className="w-20 h-20 text-teal-300 mb-4" />
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-white/60 mt-2 max-w-sm">{description}</p>
    </div>
  </div>
);
