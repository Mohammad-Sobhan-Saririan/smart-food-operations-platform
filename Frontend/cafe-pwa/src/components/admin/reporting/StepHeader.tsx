"use client";

import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface Step { id: number; name: string; }
interface StepHeaderProps { steps: Step[]; currentStep: number; onStepClick: (step: number) => void; }

export const StepHeader = ({ steps, currentStep, onStepClick }: StepHeaderProps) => {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex flex-wrap items-center gap-y-4">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className={cn("relative", stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20 flex-1" : "")}>
                        {stepIdx < currentStep ? ( // Completed Step
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="h-0.5 w-full bg-indigo-600" /></div>
                                <button onClick={() => onStepClick(step.id)} className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700">
                                    <CheckCircle className="h-5 w-5 text-white" />
                                </button>
                            </>
                        ) : stepIdx === currentStep ? ( // Current Step
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="h-0.5 w-full bg-white/10" /></div>
                                <button className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 bg-slate-800">
                                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
                                </button>
                            </>
                        ) : ( // Upcoming Step
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="h-0.5 w-full bg-white/10" /></div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 bg-slate-900" />
                            </>
                        )}
                        <span className="absolute top-10 -right-2 w-max text-sm font-semibold text-white">{step.name}</span>
                    </li>
                ))}
            </ol>
        </nav>
    );
};