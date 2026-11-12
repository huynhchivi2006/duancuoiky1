"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/utils";
import { Clock, Utensils, Package, Layers, PieChart } from "lucide-react";

export interface RevenueStructure {
  tableRevenue: number;
  fnbRevenue: number;
  accessoryRevenue: number;
  otherRevenue: number;
  tablePercent: number;
  fnbPercent: number;
  accessoryPercent: number;
  otherPercent: number;
}

interface RevenueStructureCardProps {
  data?: RevenueStructure;
  isLoading?: boolean;
}

export function RevenueStructureCard({ data, isLoading }: RevenueStructureCardProps) {
  const tableRev = data?.tableRevenue || 0;
  const fnbRev = data?.fnbRevenue || 0;
  const accRev = data?.accessoryRevenue || 0;
  const otherRev = data?.otherRevenue || 0;

  const tablePct = data?.tablePercent ?? 0;
  const fnbPct = data?.fnbPercent ?? 0;
  const accPct = data?.accessoryPercent ?? 0;
  const otherPct = data?.otherPercent ?? 0;

  const total = tableRev + fnbRev + accRev + otherRev;

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 space-y-5">
      <CardHeader className="p-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-emerald-400" />
            Cơ Cấu Doanh Thu: Tiền Giờ vs F&B vs Bán Phụ Kiện
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Phân tích tỷ trọng đóng góp vào tổng doanh thu kinh doanh của câu lạc bộ
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-zinc-400">Tổng doanh thu gộp:</span>
          <div className="text-lg font-black text-emerald-400">
            {isLoading ? "..." : formatVND(total)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-5">
        {/* Visual Multi-Segment Bar */}
        <div className="space-y-1.5">
          <div className="h-4 w-full bg-zinc-950 rounded-full overflow-hidden flex p-0.5 border border-zinc-800">
            {total === 0 ? (
              <div className="w-full h-full bg-zinc-800 rounded-full" />
            ) : (
              <>
                <div
                  style={{ width: `${tablePct}%` }}
                  className="bg-emerald-500 h-full rounded-l-full transition-all"
                  title={`Tiền Giờ: ${tablePct}%`}
                />
                <div
                  style={{ width: `${fnbPct}%` }}
                  className="bg-sky-500 h-full transition-all"
                  title={`F&B: ${fnbPct}%`}
                />
                <div
                  style={{ width: `${accPct}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`Phụ Kiện: ${accPct}%`}
                />
                <div
                  style={{ width: `${otherPct}%` }}
                  className="bg-purple-500 h-full rounded-r-full transition-all"
                  title={`Khác: ${otherPct}%`}
                />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Tiền Giờ ({tablePct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span>F&B Đồ Ăn/Uống ({fnbPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Phụ Kiện Bi-da ({accPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Dịch Vụ Khác ({otherPct}%)</span>
            </div>
          </div>
        </div>

        {/* 4 Detail Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Tiền giờ bàn */}
          <div className="rounded-xl border border-emerald-950/80 bg-zinc-950/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-zinc-200">Tiền Giờ Bàn</span>
              </div>
              <Badge variant="outline" className="text-emerald-400 border-emerald-800 text-[10px]">
                {tablePct}%
              </Badge>
            </div>
            <div className="text-lg font-black text-white">
              {isLoading ? "..." : formatVND(tableRev)}
            </div>
            <p className="text-[11px] text-zinc-500">
              Thu từ thời gian khách đánh bi-da theo block
            </p>
          </div>

          {/* 2. Tiền F&B */}
          <div className="rounded-xl border border-sky-950/80 bg-zinc-950/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                  <Utensils className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-zinc-200">F&B Ẩm Thực</span>
              </div>
              <Badge variant="outline" className="text-sky-400 border-sky-800 text-[10px]">
                {fnbPct}%
              </Badge>
            </div>
            <div className="text-lg font-black text-white">
              {isLoading ? "..." : formatVND(fnbRev)}
            </div>
            <p className="text-[11px] text-zinc-500">
              Nước giải khát, cafe, đồ ăn nhanh, mì, snack
            </p>
          </div>

          {/* 3. Phụ kiện bi-da */}
          <div className="rounded-xl border border-amber-950/80 bg-zinc-950/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-zinc-200">Bán Phụ Kiện</span>
              </div>
              <Badge variant="outline" className="text-amber-400 border-amber-800 text-[10px]">
                {accPct}%
              </Badge>
            </div>
            <div className="text-lg font-black text-white">
              {isLoading ? "..." : formatVND(accRev)}
            </div>
            <p className="text-[11px] text-zinc-500">
              Lơ xanh Master/Taom, găng tay, bao cơ, phụ kiện
            </p>
          </div>

          {/* 4. Khác */}
          <div className="rounded-xl border border-purple-950/80 bg-zinc-950/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-zinc-200">Dịch Vụ Khác</span>
              </div>
              <Badge variant="outline" className="text-purple-400 border-purple-800 text-[10px]">
                {otherPct}%
              </Badge>
            </div>
            <div className="text-lg font-black text-white">
              {isLoading ? "..." : formatVND(otherRev)}
            </div>
            <p className="text-[11px] text-zinc-500">
              Nhân viên xếp bi trợ giúp, phụ thu giờ cao điểm
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

