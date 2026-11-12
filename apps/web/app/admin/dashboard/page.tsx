"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import { RevenueStructureCard } from "@/components/analytics/revenue-structure-card";
import { TableUtilizationCard } from "@/components/analytics/table-utilization-card";
import {
  TableProperties,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  CalendarRange,
  ChevronRight,
  Filter,
} from "lucide-react";

export default function AdminDashboardPage() {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const todayStr = now.toISOString().slice(0, 10);

  // Tính số tuần hiện tại
  const firstDay = new Date(curY, 0, 1);
  const pastDays = (now.getTime() - firstDay.getTime()) / 86400000;
  const curWeek = Math.max(1, Math.ceil((pastDays + firstDay.getDay() + 1) / 7));
  const curQuarter = Math.floor((curM - 1) / 3) + 1;

  // State các bộ lọc
  const [period, setPeriod] = useState<"day" | "week" | "month" | "quarter" | "year">("day");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedYear, setSelectedYear] = useState<number>(curY);
  const [selectedMonth, setSelectedMonth] = useState<number>(curM);
  const [selectedWeek, setSelectedWeek] = useState<number>(curWeek);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(curQuarter);

  // Query API dashboard summary
  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-dashboard-summary",
      period,
      selectedDate,
      selectedYear,
      selectedMonth,
      selectedWeek,
      selectedQuarter,
    ],
    queryFn: () => {
      const params: any = { period };
      if (period === "day") {
        params.date = selectedDate;
      } else if (period === "week") {
        params.year = selectedYear;
        params.week = selectedWeek;
      } else if (period === "month") {
        params.year = selectedYear;
        params.month = selectedMonth;
      } else if (period === "quarter") {
        params.year = selectedYear;
        params.quarter = selectedQuarter;
      } else if (period === "year") {
        params.year = selectedYear;
      }
      return apiClient("/dashboard/summary", { params });
    },
    refetchInterval: 15000,
  });

  const overview = data?.overview;
  const chartData = data?.chartData || [];
  const recentBookings = data?.recentBookings || [];

  const maxRevenue = Math.max(...chartData.map((c: any) => c.revenue), 100000);
  const totalChartRevenue = chartData.reduce((sum: number, c: any) => sum + Number(c.revenue || 0), 0);

  // Tạo danh sách 52 tuần trong năm
  const weeksList = Array.from({ length: 52 }, (_, i) => i + 1);
  // Tạo danh sách 12 tháng
  const monthsList = Array.from({ length: 12 }, (_, i) => i + 1);
  // Danh sách năm
  const yearsList = [2024, 2025, 2026, 2027];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="ADMIN" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white break-words">
                TỔNG QUAN HỆ THỐNG (ADMIN DASHBOARD)
              </h1>
              <p className="text-zinc-400 text-xs mt-1">
                Số liệu thống kê thời gian thực theo từng ngày, từng tuần, từng tháng, từng quý và từng năm cụ thể.
              </p>
            </div>

            {/* Thanh Tab chọn chu kỳ */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs overflow-x-auto max-w-full pb-1 sm:pb-1">
              <span className="text-zinc-500 font-semibold px-2 shrink-0">Xem theo:</span>
              {[
                { id: "day", label: "Ngày" },
                { id: "week", label: "Tuần" },
                { id: "month", label: "Tháng" },
                { id: "quarter", label: "Quý" },
                { id: "year", label: "Năm" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPeriod(item.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
                    period === item.id
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bộ lọc chi tiết cho từng chu kỳ (Chọn ngày, chọn tuần 1 2 3..., chọn tháng 1 2 3...) */}
          <Card className="border-zinc-800 bg-zinc-900/60 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <Filter className="h-4 w-4 text-emerald-400" />
                <span>
                  {period === "day" && "Chọn ngày cụ thể cần xem:"}
                  {period === "week" && "Chọn tuần & năm cần xem:"}
                  {period === "month" && "Chọn tháng & năm cần xem:"}
                  {period === "quarter" && "Chọn quý & năm cần xem:"}
                  {period === "year" && "Chọn năm cần xem:"}
                </span>
              </div>

              {/* 1. Lọc theo từng ngày */}
              {period === "day" && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-40 h-8 text-xs bg-zinc-950 border-zinc-700 flex-1 sm:flex-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs whitespace-nowrap shrink-0"
                    onClick={() => setSelectedDate(todayStr)}
                  >
                    Xem Hôm Nay
                  </Button>
                </div>
              )}

              {/* 2. Lọc theo từng tuần */}
              {period === "week" && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">Năm:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100"
                    >
                      {yearsList.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">Chọn Tuần:</span>
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(Number(e.target.value))}
                      className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100"
                    >
                      {weeksList.map((w) => (
                        <option key={w} value={w}>
                          Tuần {w} {w === curWeek && selectedYear === curY ? "(Tuần hiện tại)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 3. Lọc theo từng tháng (Tháng 1, 2, 3, 4...) */}
              {period === "month" && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">Năm:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100"
                    >
                      {yearsList.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">Chọn Tháng:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100"
                    >
                      {monthsList.map((m) => (
                        <option key={m} value={m}>
                          Tháng {m} {m === curM && selectedYear === curY ? "(Tháng hiện tại)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 4. Lọc theo từng quý (Quý 1, 2, 3, 4) */}
              {period === "quarter" && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">Năm:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100"
                    >
                      {yearsList.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">Chọn Quý:</span>
                    <select
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                      className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100"
                    >
                      <option value={1}>Quý 1 (Tháng 1 - Tháng 3)</option>
                      <option value={2}>Quý 2 (Tháng 4 - Tháng 6)</option>
                      <option value={3}>Quý 3 (Tháng 7 - Tháng 9)</option>
                      <option value={4}>Quý 4 (Tháng 10 - Tháng 12)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 5. Lọc theo từng năm */}
              {period === "year" && (
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">Chọn Năm:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100"
                  >
                    {yearsList.map((y) => (
                      <option key={y} value={y}>
                        Năm {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Badge variant="outline" className="text-zinc-400 font-mono text-[11px] ml-auto">
                Đang xem: {overview?.periodTitle || "..."}
              </Badge>
            </div>
          </Card>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Doanh thu theo thời gian đã chọn */}
            <Card className="border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 truncate">
                  Doanh Thu ({overview?.periodTitle || "Đang tải"})
                </span>
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-emerald-400">
                {isLoading ? "..." : formatVND(overview?.periodRevenue || 0)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Từ {overview?.periodInvoicesCount || 0} hóa đơn thanh toán ({formatVND(overview?.periodTableAmount || 0)} tiền bàn)
              </div>
            </Card>

            {/* Card 2: Tỷ lệ lấp đầy bàn */}
            <Card className="border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Tỷ Lệ Lấp Đầy Bàn Hiện Tại</span>
                <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800 text-sky-400">
                  <Percent className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-white">
                {isLoading ? "..." : `${overview?.occupancyRate || 0}%`}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {overview?.occupiedTables || 0} / {overview?.totalTables || 0} bàn đang chơi
              </div>
            </Card>

            {/* Card 3: Lượt đặt bàn theo thời gian đã chọn */}
            <Card className="border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 truncate">
                  Lượt Chơi ({overview?.periodTitle || "Đang tải"})
                </span>
                <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-400">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-amber-400">
                {isLoading ? "..." : overview?.periodBookingsCount || 0}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {overview?.periodCompletedCount || 0} lượt chơi đã kết thúc
              </div>
            </Card>

            {/* Card 4: Tổng số bàn bi-da */}
            <Card className="border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Tổng Số Bàn Bi-da</span>
                <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800 text-purple-400">
                  <TableProperties className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-white">
                {isLoading ? "..." : overview?.totalTables || 0}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">
                {overview?.availableTables || 0} bàn sẵn sàng phục vụ
              </div>
            </Card>
          </div>

          {/* Revenue Visual Chart Theo Chu Kỳ Được Chọn */}
          <Card className="border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 space-y-4">
            <CardHeader className="p-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  {overview?.chartTitle || "Biểu Đồ Doanh Thu"}
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tổng doanh thu trong chu kỳ:{" "}
                  <strong className="text-emerald-400 font-mono">
                    {formatVND(totalChartRevenue)}
                  </strong>
                </p>
              </div>

              <Badge variant="outline" className="text-xs font-mono">
                {overview?.periodTitle || "Thống kê"}
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              <div className="h-56 flex items-end justify-between gap-2.5 pt-6 border-b border-zinc-800 pb-2 overflow-x-auto">
                {chartData.map((d: any) => {
                  const heightPercent = Math.max(8, Math.round((d.revenue / maxRevenue) * 100));

                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[10px] text-zinc-400 font-medium group-hover:text-emerald-400 transition-colors">
                        {d.revenue > 0 ? `${Math.round(d.revenue / 1000)}k` : "0"}
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[48px] rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-400 transition-all group-hover:from-emerald-500 group-hover:to-emerald-300 shadow-sm shadow-emerald-950"
                        title={`${d.date}: ${formatVND(d.revenue)}`}
                      />
                      <span className="text-[10px] text-zinc-400 font-semibold group-hover:text-white transition-colors text-center truncate max-w-[64px]">
                        {d.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Phân Tích Cơ Cấu Doanh Thu: Tiền Giờ vs F&B vs Bán Phụ Kiện */}
          <RevenueStructureCard
            data={data?.revenueStructure}
            isLoading={isLoading}
          />

          {/* Hiệu Suất Khai Thác Bàn: 24h & Loại Bàn Ưa Chuộng */}
          <TableUtilizationCard
            data={data?.tableUtilization}
            isLoading={isLoading}
          />

          {/* Recent Bookings */}
          <Card className="border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 space-y-4">
            <CardHeader className="p-0 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                Các Lượt Đặt Bàn Gần Nhất
              </CardTitle>
              <span className="text-[11px] font-normal text-zinc-500 sm:hidden">
                (Vuốt ngang để xem ➔)
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border border-zinc-800 rounded-lg overflow-x-auto text-xs">
                <table className="w-full text-left min-w-[560px]">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 whitespace-nowrap">
                    <tr>
                      <th className="p-3">Mã Đặt Bàn</th>
                      <th className="p-3">Khách Hàng</th>
                      <th className="p-3">Bàn</th>
                      <th className="p-3">Loại Bàn</th>
                      <th className="p-3">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300 whitespace-nowrap">
                    {recentBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-zinc-500">
                          Chưa có lượt đặt bàn nào trong chu kỳ này
                        </td>
                      </tr>
                    ) : (
                      recentBookings.map((b: any) => (
                        <tr key={b.id} className="hover:bg-zinc-900/50">
                          <td className="p-3 font-mono font-bold text-emerald-400">
                            {b.bookingCode}
                          </td>
                          <td className="p-3 font-medium text-white">
                            {b.customerName}
                          </td>
                          <td className="p-3 font-bold text-white">
                            Bàn {b.tableNumber}
                          </td>
                          <td className="p-3 text-zinc-400">
                            {b.tableType}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                b.status === "CONFIRMED"
                                  ? "success"
                                  : b.status === "IN_USE"
                                  ? "danger"
                                  : b.status === "COMPLETED"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
