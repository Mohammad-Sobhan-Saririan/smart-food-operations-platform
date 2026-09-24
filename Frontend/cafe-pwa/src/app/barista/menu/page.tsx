"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductDialog } from "@/components/barista/ProductDialog";
import { useDebounce } from "@/hooks/useDebounce";
import type { Product } from "@/types";
import { Loader2 } from "lucide-react";

export default function ManageMenuPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Partial<Product> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/products/manage?search=${debouncedSearchTerm}`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch products");
            const data = await res.json();
            setProducts(data);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, [debouncedSearchTerm]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedProduct(null);
        setIsDialogOpen(true);
    };

    return (
        <>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/20 text-white" style={{ direction: 'rtl' }}>
                <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle className="text-2xl font-bold w-full md:w-auto text-center md:text-right mb-2 md:mb-0">مدیریت منو و موجودی</CardTitle>
                    <div className="flex flex-col md:flex-row-reverse items-center gap-2 w-full md:w-auto">
                        <Input placeholder="جستجوی محصول..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm bg-white/10 border-white/20 placeholder:text-white/40" />
                        <Button onClick={handleAdd} className="bg-[#D63A4F] hover:bg-red-700 w-full md:w-auto">
                            {/* <PlusCircle className="ml-2 h-4 w-4" /> */}
                            محصول جدید
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-white/10 overflow-x-auto">
                        <Table className="min-w-[640px]">
                            <TableHeader>
                                <TableRow className="border-b-white/10 hover:bg-transparent">
                                    <TableHead className="text-right text-white">وضعیت</TableHead>
                                    <TableHead className="text-right text-white">نام محصول</TableHead>
                                    <TableHead className="text-right text-white hidden sm:table-cell">دسته بندی</TableHead>
                                    <TableHead className="text-right text-white">قیمت</TableHead>
                                    <TableHead className="text-right text-white">موجودی</TableHead>
                                    <TableHead className="text-right text-white">اقدامات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                                ) : (
                                    products.map((product) => (
                                        <TableRow key={product.id} className="border-white/10 hover:bg-white/5">
                                            <TableCell><Badge variant={product.isDisabled ? "destructive" : "secondary"}>{product.isDisabled ? "غیرفعال" : "فعال"}</Badge></TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{product.category}</TableCell>
                                            <TableCell className="text-right font-mono">{product.price.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-mono">{product.stock}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>ویرایش</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <ProductDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                product={selectedProduct}
                onProductUpdate={fetchProducts}
            />
        </>
    );
}