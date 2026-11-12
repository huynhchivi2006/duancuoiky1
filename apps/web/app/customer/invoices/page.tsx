"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatVND, formatDateTimeVN } from "@/lib/utils";
import { Receipt } from "lucide-react";

export default function CustomerInvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["my-invoices"],
    queryFn: () => apiClient("/invoices/my"),
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="CUSTOMER" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white">LỊCH SỬ HÓA ĐƠN & THANH TOÁN</h1>
            <p className="text-zinc-400 text-xs mt-1">
              Xem lại toàn bộ các hóa đơn đã thanh toán và chi tiết giờ chơi tại câu lạc bộ.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <Card className="text-center py-16 border-zinc-800 bg-zinc-900/40">
              <Receipt className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-300">Chưa có hóa đơn nào</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Các hóa đơn sau khi bạn kết thúc lượt chơi tại quán sẽ được hiển thị đầy đủ tại đây.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoices.map((inv: any) => (
                <Card key={inv.id} className="border-zinc-800 bg-zinc-900/60 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {inv.invoiceCode}
                        </span>
                        <Badge variant={inv.status === "PAID" ? "success" : "warning"}>
                          {inv.status === "PAID" ? "Đã Thanh Toán" : "Chưa Thanh Toán"}
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-400">
                        Thời gian: {formatDateTimeVN(inv.createdAt)}
                      </div>
                      <div className="mt-2 text-xs space-y-1">
                        {inv.invoiceItems?.map((item: any) => (
                          <div key={item.id} className="text-zinc-300 flex gap-2">
                            <span>• {item.itemName} (x{item.quantity})</span>
                            <span className="text-zinc-500">-</span>
                            <span className="text-zinc-400">{formatVND(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-zinc-800 sm:pl-6">
                      <div className="text-xs text-zinc-400">Tổng thanh toán:</div>
                      <div className="text-lg font-black text-emerald-400">
                        {formatVND(inv.finalAmount)}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        {inv.payments?.[0]?.method || "Tiền mặt"}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

