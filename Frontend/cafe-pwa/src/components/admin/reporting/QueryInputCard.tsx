"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface QueryInputStepProps {
    nlQuery: string;
    setNlQuery: (query: string) => void;
    onRun: () => void;
    isLoading: boolean;
}

export const QueryInputCard = ({ nlQuery, setNlQuery, onRun, isLoading }: QueryInputStepProps) => {
    return (
        <Card className="bg-white/5 backdrop-blur-lg border border-white/20 text-white p-4 sm:p-6">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-right sm:text-left w-full sm:w-auto">
                        <Sparkles className="text-indigo-400" /> کارگاه گزارش‌گیری
                    </CardTitle>
                    <Button asChild variant="outline" className="bg-transparent hover:bg-white/10 text-left sm:text-right w-full sm:w-auto">
                        <Link href="/admin/reporting" className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            بازگشت به لیست
                        </Link>
                    </Button>
                </div>
                <CardDescription className="text-white/60 pt-1 text-sm sm:text-base">
                    سوال خود را به زبان فارسی وارد کنید تا نماینده هوش مصنوعی آن را به گزارش تبدیل کند.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Textarea
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    placeholder="مثال: نمایش تعداد سفارشات در هر روز"
                    className="min-h-[120px] bg-white/10 border-white/20 placeholder:text-white/40 text-sm sm:text-base"
                />
                <div className="flex justify-end mt-4">
                    <Button onClick={onRun} disabled={isLoading} className="bg-[#D63A4F] hover:bg-red-700 font-semibold text-sm sm:text-base cursor-pointer">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'دریافت داده‌ها'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
