"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatVND, formatDateTimeVN } from "@/lib/utils";
import { RevenueStructureCard } from "@/components/analytics/revenue-structure-card";
import { TableUtilizationCard } from "@/components/analytics/table-utilization-card";
import {
  Download,
  Calendar,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
  TrendingUp,
  BarChart2,
  CalendarRange,
  ArrowRightLeft,
} from "lucide-react";

export default function AdminReportsPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultStartStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const [period, setPeriod] = useState<"day" | "week" | "month" | "quarter" | "year">("day");
  const [startDate, setStartDate] = useState(defaultStartStr);
  const [endDate, setEndDate] = useState(todayStr);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-revenue-report", startDate, endDate, period],
    queryFn: () =>
      apiClient("/reports/revenue", {
        params: { startDate, endDate, period },
      }),
  });

  const summary = data?.summary;
  const periodStats = data?.periodStats || [];
  const invoices = data?.invoices || [];

  const handleExportCsv = () => {
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH !== undefined ? process.env.NEXT_PUBLIC_BASE_PATH : "/huynhchivi/doan";
    const csvPath = `/reports/export-csv?startDate=${startDate}&endDate=${endDate}&period=${period}`;

    const url = isHttps
      ? `${basePath}/proxy.php?path=${encodeURIComponent(csvPath)}`
      : `${process.env.NEXT_PUBLIC_API_URL || "http://78.154.103.20:14602/api/v1"}${csvPath}`;

    window.open(url, "_blank");
  };

  const handlePeriodChange = (p: "day" | "week" | "month" | "quarter" | "year") => {
    setPeriod(p);
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    let start = "";

    if (p === "year") {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 3);
      start = past.toISOString().slice(0, 10);
    } else if (p === "quarter" || p === "month") {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      start = past.toISOString().slice(0, 10);
    } else if (p === "week") {
      const past = new Date();
      past.setDate(past.getDate() - 84); // 12 tuần
      start = past.toISOString().slice(0, 10);
    } else {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      start = past.toISOString().slice(0, 10);
    }

    setStartDate(start);
    setEndDate(end);
  };

  const maxRevenueInPeriod = Math.max(...periodStats.map((p: any) => p.revenue), 1);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="ADMIN" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">BÁO CÁO DOANH THU & GIAO DỊCH</h1>
              <p className="text-zinc-400 text-xs mt-1">
                Thống kê doanh thu đa kỳ: Ngày, Tuần, Tháng, Quý, Năm với phân tích tiền giờ, dịch vụ và đối soát.
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleExportCsv}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs h-9 w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Xuất File Excel (CSV)
            </Button>
          </div>

          {/* Period Selector & Filter Bar - Tối ưu di động không tràn màn hình */}
          <Card className="border-zinc-800 bg-zinc-900/70 p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Pills chọn kỳ - vuốt ngang mượt mà trên di động */}
              <div className="w-full lg:w-auto overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800/90 text-xs w-max">
                  <span className="text-zinc-500 font-semibold px-2 shrink-0">Xem:</span>
                  {[
                    { id: "day", label: "Theo Ngày" },
                    { id: "week", label: "Theo Tuần" },
                    { id: "month", label: "Theo Tháng" },
                    { id: "quarter", label: "Theo Quý" },
                    { id: "year", label: "Theo Năm" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handlePeriodChange(item.id as any)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all shrink-0 ${
                        period === item.id
                          ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ô chọn khoảng ngày - hiển thị gọn gàng 2 cột trên điện thoại */}
              <div className="grid grid-cols-2 gap-2 text-xs w-full lg:w-auto">
                <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5">
                  <span className="text-zinc-400 font-semibold text-[11px] shrink-0">Từ:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-transparent text-zinc-100 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5">
                  <span className="text-zinc-400 font-semibold text-[11px] shrink-0">Đến:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-transparent text-zinc-100 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
              <span className="text-xs text-zinc-400 font-semibold">Tổng Doanh Thu</span>
              <div className="text-2xl font-black text-emerald-400 mt-2">
                {isLoading ? "..." : formatVND(summary?.totalRevenue || 0)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Từ {summary?.totalInvoices || 0} hóa đơn thanh toán
              </div>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
              <span className="text-xs text-zinc-400 font-semibold">Tiền Giờ Thuê Bàn</span>
              <div className="text-2xl font-black text-white mt-2">
                {isLoading ? "..." : formatVND(summary?.totalTableAmount || 0)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Tỷ trọng:{" "}
                {summary?.totalRevenue
                  ? Math.round((summary.totalTableAmount / summary.totalRevenue) * 100)
                  : 0}
                %
              </div>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
              <span className="text-xs text-zinc-400 font-semibold">Doanh Thu Dịch Vụ & Món</span>
              <div className="text-2xl font-black text-sky-400 mt-2">
                {isLoading ? "..." : formatVND(summary?.totalServiceAmount || 0)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Đồ ăn, đồ uống, nhân viên xếp bi
              </div>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
              <span className="text-xs text-zinc-400 font-semibold">Tổng Tiền Giảm Giá</span>
              <div className="text-2xl font-black text-rose-400 mt-2">
                {isLoading ? "..." : formatVND(summary?.totalDiscountAmount || 0)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">Khuyến mãi & chiết khấu</div>
            </Card>
          </div>

          {/* Cơ Cấu Doanh Thu: Tiền Giờ vs F&B vs Phụ Kiện */}
          <RevenueStructureCard
            data={data?.revenueStructure}
            isLoading={isLoading}
          />

          {/* Hiệu Suất Khai Thác Bàn: 24h & Loại Bàn Ưa Chuộng */}
          <TableUtilizationCard
            data={data?.tableUtilization}
            isLoading={isLoading}
          />

          {/* Section: Bảng Tổng Hợp Gom Nhóm Theo Kỳ - Vuốt ngang mượt mà trên Mobile */}
          <Card className="border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-base text-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Bảng Tổng Hợp Doanh Thu {period === "day" ? "Theo Từng Ngày" : period === "week" ? "Theo Từng Tuần" : period === "month" ? "Theo Từng Tháng" : period === "quarter" ? "Theo Từng Quý" : "Theo Từng Năm"}
                </span>
                <span className="text-xs font-normal text-zinc-400">
                  {periodStats.length} kỳ thống kê
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-zinc-950/60 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : periodStats.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  Không có giao dịch nào phát sinh trong kỳ này.
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-xl bg-zinc-950/40 overflow-hidden">
                  {/* Thanh gợi ý vuốt ngang trên điện thoại */}
                  <div className="sm:hidden px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>👉 Vuốt ngang để xem đủ các cột</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      Kéo qua lại <ArrowRightLeft className="h-3 w-3 inline" />
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[680px] text-xs">
                      <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="p-3 whitespace-nowrap">Kỳ Thống Kê</th>
                          <th className="p-3 text-center whitespace-nowrap">Số Hóa Đơn</th>
                          <th className="p-3 text-right whitespace-nowrap">Tiền Bàn (VNĐ)</th>
                          <th className="p-3 text-right whitespace-nowrap">Tiền Dịch Vụ (VNĐ)</th>
                          <th className="p-3 text-right whitespace-nowrap">Giảm Giá (VNĐ)</th>
                          <th className="p-3 text-right whitespace-nowrap">Tổng Doanh Thu</th>
                          <th className="p-3 text-center w-36 whitespace-nowrap">Tỷ Trọng Biểu Đồ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 text-zinc-300">
                        {periodStats.map((item: any) => {
                          const percentOfMax = Math.round((item.revenue / maxRevenueInPeriod) * 100);
                          return (
                            <tr key={item.periodKey} className="hover:bg-zinc-900/50">
                              <td className="p-3 font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                                <CalendarRange className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                {item.periodLabel}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <Badge variant="outline">{item.invoiceCount}</Badge>
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">{formatVND(item.tableAmount)}</td>
                              <td className="p-3 text-right text-sky-400 whitespace-nowrap">
                                {formatVND(item.serviceAmount)}
                              </td>
                              <td className="p-3 text-right text-rose-400 whitespace-nowrap">
                                {formatVND(item.discountAmount)}
                              </td>
                              <td className="p-3 text-right font-black text-emerald-400 text-sm whitespace-nowrap">
                                {formatVND(item.revenue)}
                              </td>
                              <td className="p-3">
                                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden min-w-[80px]">
                                  <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentOfMax}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices Detailed Breakdown - Vuốt ngang mượt mà trên Mobile */}
          <Card className="border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-400" />
                Danh Sách Giao Dịch Chi Tiết ({invoices.length} hóa đơn)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-zinc-950/60 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  Không tìm thấy giao dịch nào trong khoảng thời gian đã chọn.
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-xl bg-zinc-950/40 overflow-hidden">
                  {/* Thanh gợi ý vuốt ngang trên điện thoại */}
                  <div className="sm:hidden px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>👉 Vuốt ngang để xem đủ các cột</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      Kéo qua lại <ArrowRightLeft className="h-3 w-3 inline" />
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[740px] text-xs">
                      <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="p-3 whitespace-nowrap">Mã Hóa Đơn</th>
                          <th className="p-3 whitespace-nowrap">Khách Hàng</th>
                          <th className="p-3 whitespace-nowrap">Bàn</th>
                          <th className="p-3 text-right whitespace-nowrap">Tiền Giờ</th>
                          <th className="p-3 text-right whitespace-nowrap">Tiền Dịch Vụ</th>
                          <th className="p-3 text-right whitespace-nowrap">Tổng Thanh Toán</th>
                          <th className="p-3 whitespace-nowrap">Thời Gian TT</th>
                          <th className="p-3 text-center whitespace-nowrap">Phương Thức</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 text-zinc-300">
                        {invoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-zinc-900/50">
                            <td className="p-3 font-mono font-bold text-white whitespace-nowrap">
                              {inv.invoiceCode}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <div className="font-semibold text-zinc-200">{inv.customerName}</div>
                              {inv.customerPhone && (
                                <div className="text-[11px] text-zinc-500">{inv.customerPhone}</div>
                              )}
                            </td>
                            <td className="p-3 font-semibold text-zinc-200 whitespace-nowrap">
                              Bàn {inv.tableNumber}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">{formatVND(inv.tableAmount)}</td>
                            <td className="p-3 text-right text-sky-400 whitespace-nowrap">
                              {formatVND(inv.serviceAmount)}
                            </td>
                            <td className="p-3 text-right font-black text-emerald-400 text-sm whitespace-nowrap">
                              {formatVND(inv.finalAmount)}
                            </td>
                            <td className="p-3 text-zinc-400 whitespace-nowrap">
                              {inv.paidAt ? formatDateTimeVN(inv.paidAt) : "-"}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <Badge variant={inv.paymentMethod === "CASH" ? "success" : "info"}>
                                {inv.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
