"use client";

import { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Receipt,
  QrCode,
  Coffee,
  UtensilsCrossed,
  UserCheck,
  Plus,
  Minus,
  Check,
  User,
} from "lucide-react";

interface AvailableTable {
  id: string;
  tableNumber: string;
  area: "STANDARD" | "VIP" | "OUTDOOR";
  tableType: {
    id: string;
    code: string;
    name: string;
    hourlyRate: number;
  };
  slot: {
    startTime: string;
    endTime: string;
    durationMinutes: number;
    estimatedPrice: number;
  };
}

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  category: "DRINK" | "FOOD" | "SNACK" | "COMBO" | "OTHER";
  unitPrice: number;
  unit: string;
  stockQuantity: number;
  imageUrl?: string;
}

interface StaffOption {
  id: string;
  fullName: string;
  phone?: string;
}

function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTableId = searchParams.get("tableId");
  const { user } = useAuth();

  // Khởi tạo ngày mặc định là hôm nay theo giờ địa phương
  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>("18:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [selectedTable, setSelectedTable] = useState<AvailableTable | null>(null);
  const [notes, setNotes] = useState<string>("");

  // Trạng thái chọn đồ uống & món ăn trước
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>("ALL");

  // Trạng thái yêu cầu nhân viên phục vụ / xếp bi
  const [requestedStaffRole, setRequestedStaffRole] = useState<"" | "BALL_RACKER" | "TABLE_ATTENDANT">("");
  const [requestedStaffId, setRequestedStaffId] = useState<string>("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  // Tính ISO Start Time theo giờ địa phương Việt Nam (tránh lệch 7 tiếng UTC)
  const computedStartTime = useMemo(() => {
    if (!date || !time) return "";
    const localDate = new Date(`${date}T${time}:00`);
    return isNaN(localDate.getTime()) ? "" : localDate.toISOString();
  }, [date, time]);

  // Query tìm bàn trống
  const {
    data: availableTables = [],
    isLoading: isSearching,
    refetch,
  } = useQuery<AvailableTable[]>({
    queryKey: ["available-tables", computedStartTime, durationMinutes],
    queryFn: () =>
      apiClient("/tables/available", {
        params: {
          startTime: computedStartTime,
          durationMinutes,
        },
      }),
    enabled: Boolean(date && time),
  });

  // Query menu đồ uống / món ăn
  const { data: services = [], isLoading: isLoadingServices } = useQuery<ServiceItem[]>({
    queryKey: ["services-menu"],
    queryFn: () => apiClient("/services"),
  });

  // Query danh sách nhân viên phục vụ
  const { data: staffOptions = [] } = useQuery<StaffOption[]>({
    queryKey: ["staff-options"],
    queryFn: () => apiClient("/bookings/staff-options"),
  });

  // Cập nhật số lượng món ăn
  const updateServiceQty = (serviceId: string, delta: number) => {
    setSelectedServices((prev) => {
      const curr = prev[serviceId] || 0;
      const next = Math.max(0, curr + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[serviceId];
        return copy;
      }
      return { ...prev, [serviceId]: next };
    });
  };

  // Lọc món theo danh mục
  const filteredServices = useMemo(() => {
    if (serviceCategoryFilter === "ALL") return services;
    return services.filter((s) => s.category === serviceCategoryFilter);
  }, [services, serviceCategoryFilter]);

  // Tính tiền món đã chọn
  const preOrderedTotal = useMemo(() => {
    return Object.entries(selectedServices).reduce((sum, [sId, qty]) => {
      const svc = services.find((s) => s.id === sId);
      return sum + (svc ? Number(svc.unitPrice) * qty : 0);
    }, 0);
  }, [selectedServices, services]);

  const totalPreOrderedItemsCount = useMemo(() => {
    return Object.values(selectedServices).reduce((sum, qty) => sum + qty, 0);
  }, [selectedServices]);

  // Phí nhân viên phục vụ
  const staffFee = useMemo(() => {
    if (requestedStaffRole === "TABLE_ATTENDANT") return 50000;
    if (requestedStaffRole === "BALL_RACKER") return 30000;
    return 0;
  }, [requestedStaffRole]);

  // Tổng cộng dự kiến
  const tableEstimatedPrice = selectedTable?.slot.estimatedPrice || 0;
  const grandTotalEstimate = tableEstimatedPrice + preOrderedTotal + staffFee;

  // Mutation đặt bàn
  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTable) throw new Error("Vui lòng chọn bàn");

      const preOrderedPayload = Object.entries(selectedServices)
        .filter(([_, qty]) => qty > 0)
        .map(([serviceId, quantity]) => ({ serviceId, quantity }));

      return apiClient("/bookings", {
        method: "POST",
        body: JSON.stringify({
          billiardTableId: selectedTable.id,
          startTime: computedStartTime,
          durationMinutes,
          notes,
          preOrderedServices: preOrderedPayload.length > 0 ? preOrderedPayload : undefined,
          requestedStaffRole: requestedStaffRole || undefined,
          requestedStaffId: requestedStaffId || undefined,
        }),
      });
    },
    onSuccess: (data) => {
      setConfirmModalOpen(false);
      setSuccessBooking(data);
      refetch();
    },
    onError: (err: any) => {
      setConfirmModalOpen(false);
      if (err.statusCode === 409) {
        setErrorMessage(
          "Khung giờ này vừa có người đặt trước! Vui lòng chọn bàn khác hoặc điều chỉnh khung giờ.",
        );
      } else {
        setErrorMessage(err.message || "Đã xảy ra lỗi khi tạo đặt bàn.");
      }
    },
  });

  const handleOpenConfirm = () => {
    if (!selectedTable) {
      setErrorMessage("Vui lòng chọn 1 bàn bi-da còn trống ở Bước 2 trước khi tiếp tục.");
      return;
    }
    setErrorMessage(null);

    if (!user) {
      router.push("/login?redirect=/book");
      return;
    }

    setConfirmModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="success" className="text-xs">Trực Tuyến 24/7</Badge>
            <span className="text-xs text-zinc-400">Giữ bàn tức thì • Nhận phòng đúng giờ</span>
          </div>
          <h1 className="text-3xl font-black text-white">ĐẶT BÀN BI-DA & PHỤC VỤ TRỰC TUYẾN</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Chọn bàn, đặt trước đồ uống / món ăn và yêu cầu nhân viên xếp bi, trợ lý bàn chuyên nghiệp.
          </p>
        </div>

        {/* Step 1: Chọn thời gian */}
        <Card className="border-zinc-800 bg-zinc-900/70 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-400">
              <Calendar className="h-5 w-5" />
              Bước 1: Chọn Ngày, Giờ Bắt Đầu & Thời Lượng Chơi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Ngày chơi
                </label>
                <Input
                  type="date"
                  min={todayStr}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Giờ bắt đầu (08:00 - 23:00)
                </label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Thời lượng dự kiến
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={60}>1 tiếng (60 phút)</option>
                  <option value={90}>1.5 tiếng (90 phút)</option>
                  <option value={120}>2 tiếng (120 phút)</option>
                  <option value={180}>3 tiếng (180 phút)</option>
                  <option value={240}>4 tiếng (240 phút)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-rose-800/80 bg-rose-950/40 text-rose-300 flex items-start gap-3 text-sm">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Lưu ý: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Step 2: Chọn bàn khả dụng */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Bước 2: Chọn Bàn Khả Dụng Trong Khung Giờ Này
            </h2>
            <span className="text-xs text-zinc-400">
              Tìm thấy <strong className="text-emerald-400">{availableTables.length}</strong> bàn trống
            </span>
          </div>

          {isSearching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse"
                />
              ))}
            </div>
          ) : availableTables.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-zinc-800 bg-zinc-900/30">
              <Clock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-zinc-200">Không có bàn nào trống trong khung giờ này</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Khung giờ {time} ngày {date} hiện tại đã kín lịch. Vui lòng chọn một giờ bắt đầu khác hoặc chọn ngày khác.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {availableTables.map((table) => {
                const isSelected = selectedTable?.id === table.id;
                const isPreselected = preselectedTableId === table.id && !selectedTable;

                return (
                  <Card
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`cursor-pointer border transition-all relative overflow-hidden ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-500 shadow-lg shadow-emerald-950/50"
                        : isPreselected
                        ? "border-zinc-700 bg-zinc-900/80 ring-1 ring-emerald-500/50"
                        : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-600 hover:bg-zinc-900"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-zinc-950 rounded-full p-1 shadow">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    )}
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xl font-black text-white">{table.tableNumber}</span>
                          <span className="text-[11px] font-semibold text-emerald-400">
                            {formatVND(table.tableType.hourlyRate)}/h
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-zinc-300">
                          {table.tableType.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Khu vực:{" "}
                          <span className="text-zinc-200 font-medium">
                            {table.area === "VIP" ? "Phòng VIP" : "Khu Thường"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-zinc-400">Tạm tính giờ:</div>
                          <div className="text-sm font-extrabold text-emerald-400">
                            {formatVND(table.slot.estimatedPrice)}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={isSelected ? "primary" : "outline"}
                          className={`text-xs h-7 px-3 ${isSelected ? "bg-emerald-600 text-white" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTable(table);
                          }}
                        >
                          {isSelected ? "Đã Chọn" : "Chọn Bàn Này"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3: Chọn Đồ Uống & Món Ăn Trước */}
        <Card className="border-zinc-800 bg-zinc-900/70 mb-6">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-400">
                <UtensilsCrossed className="h-5 w-5" />
                Bước 3: Chọn Đồ Uống & Món Ăn Chuẩn Bị Sẵn (Tùy Chọn)
              </CardTitle>
              {totalPreOrderedItemsCount > 0 && (
                <Badge variant="success" className="text-xs self-start sm:self-auto">
                  Đã chọn {totalPreOrderedItemsCount} món ({formatVND(preOrderedTotal)})
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Đồ uống và thức ăn sẽ được nhân viên chuẩn bị sẵn sàng ngay khi bạn đến nhận bàn.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-zinc-800/80 pb-3">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "DRINK", label: "🥤 Đồ uống" },
                { id: "FOOD", label: "🍜 Món ăn" },
                { id: "SNACK", label: "🍿 Ăn vặt" },
                { id: "COMBO", label: "✨ Combo" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setServiceCategoryFilter(tab.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    serviceCategoryFilter === tab.id
                      ? "bg-emerald-600 text-white shadow"
                      : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Menu Grid */}
            {isLoadingServices ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-zinc-800/40 animate-pulse" />
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs">
                Không có món nào trong danh mục này.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredServices.map((svc) => {
                  const qty = selectedServices[svc.id] || 0;
                  return (
                    <div
                      key={svc.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                        qty > 0
                          ? "border-emerald-500/80 bg-emerald-950/20"
                          : "border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="font-semibold text-xs text-white line-clamp-1">{svc.name}</h4>
                          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                            {svc.unit}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-emerald-400">
                          {formatVND(svc.unitPrice)}
                        </div>
                      </div>

                      {/* Stepper +/- */}
                      <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">
                          {qty > 0 ? `${qty} ${svc.unit}` : "Chưa chọn"}
                        </span>
                        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-lg p-0.5">
                          <button
                            type="button"
                            disabled={qty === 0}
                            onClick={() => updateServiceQty(svc.id, -1)}
                            className="h-6 w-6 rounded flex items-center justify-center text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-white">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateServiceQty(svc.id, 1)}
                            className="h-6 w-6 rounded flex items-center justify-center text-emerald-400 hover:bg-zinc-800"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Yêu Cầu Nhân Viên Phục Vụ / Xếp Bi */}
        <Card className="border-zinc-800 bg-zinc-900/70 mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-400">
              <UserCheck className="h-5 w-5" />
              Bước 4: Đặt Nhân Viên Phục Vụ / Xếp Bi Tận Bàn (Tùy Chọn)
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Bạn có thể tự chơi hoặc chọn nhân viên chuyên trách để có trải nghiệm trận đấu tốt nhất.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Tự chơi */}
              <div
                onClick={() => {
                  setRequestedStaffRole("");
                  setRequestedStaffId("");
                }}
                className={`cursor-pointer p-4 rounded-xl border transition-all ${
                  requestedStaffRole === ""
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">Tự Chơi Thoải Mái</span>
                  <Badge variant="outline" className="text-[10px]">Mặc định</Badge>
                </div>
                <div className="text-xs text-emerald-400 font-extrabold mb-1">Miễn phí (0 ₫)</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Bạn tự xếp bi, quầy phục vụ chung hỗ trợ khi cần gọi thêm dịch vụ.
                </p>
              </div>

              {/* Option 2: Xếp bi riêng */}
              <div
                onClick={() => setRequestedStaffRole("BALL_RACKER")}
                className={`cursor-pointer p-4 rounded-xl border transition-all ${
                  requestedStaffRole === "BALL_RACKER"
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">Xếp Bi Riêng</span>
                  <Badge variant="info" className="text-[10px]">+30.000 ₫</Badge>
                </div>
                <div className="text-xs text-emerald-400 font-extrabold mb-1">30.000 ₫ / lượt</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Nhân viên đứng cạnh xếp bi liên tục, nhanh chóng và chuẩn xác để ván đấu liền mạch.
                </p>
              </div>

              {/* Option 3: Trợ lý bàn */}
              <div
                onClick={() => setRequestedStaffRole("TABLE_ATTENDANT")}
                className={`cursor-pointer p-4 rounded-xl border transition-all ${
                  requestedStaffRole === "TABLE_ATTENDANT"
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">Trợ Lý & Phục Vụ VIP</span>
                  <Badge variant="warning" className="text-[10px]">+50.000 ₫</Badge>
                </div>
                <div className="text-xs text-emerald-400 font-extrabold mb-1">50.000 ₫ / lượt</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Phục vụ toàn diện: xếp bi, lau cơ, rót nước, order món và chăm sóc suốt buổi chơi.
                </p>
              </div>
            </div>

            {/* Staff Selector Dropdown (nếu có chọn phục vụ) */}
            {requestedStaffRole !== "" && (
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  Chọn nhân viên bạn muốn (Tùy chọn):
                </label>
                <select
                  value={requestedStaffId}
                  onChange={(e) => setRequestedStaffId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Quán tự sắp xếp nhân viên trong ca (Khuyên dùng)</option>
                  {staffOptions.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} {st.phone ? `(${st.phone})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-400">
                  Hệ thống sẽ thông báo ngay tới nhân viên được chỉ định khi bạn tạo đơn thành công.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Floating/Bottom Summary Bar */}
        <div className="sticky bottom-4 z-20">
          <Card className="border-emerald-500/50 bg-zinc-900/95 backdrop-blur shadow-2xl shadow-emerald-950/60">
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs w-full md:w-auto">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Bàn đã chọn:</span>
                  <span className="font-bold text-white text-sm">
                    {selectedTable ? `${selectedTable.tableNumber} (${selectedTable.tableType.name})` : "Chưa chọn bàn"}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px]">Đồ ăn / nước:</span>
                  <span className="font-semibold text-zinc-200">
                    {totalPreOrderedItemsCount > 0 ? `${totalPreOrderedItemsCount} món (${formatVND(preOrderedTotal)})` : "Không"}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px]">Phục vụ bàn:</span>
                  <span className="font-semibold text-zinc-200">
                    {requestedStaffRole === "TABLE_ATTENDANT"
                      ? `Trợ lý VIP (${formatVND(staffFee)})`
                      : requestedStaffRole === "BALL_RACKER"
                      ? `Xếp bi riêng (${formatVND(staffFee)})`
                      : "Tự chơi (0 ₫)"}
                  </span>
                </div>

                <div className="pt-2 md:pt-0 md:pl-4 md:border-l border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">Tổng dự kiến:</span>
                  <span className="text-xl font-black text-emerald-400">
                    {formatVND(grandTotalEstimate)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleOpenConfirm}
                disabled={!selectedTable}
                className="w-full md:w-auto px-6 h-11 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm shrink-0"
              >
                Tiếp Tục Xác Nhận Đặt Bàn <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Xác Nhận Đặt Bàn & Dịch Vụ"
        description="Vui lòng kiểm tra lại chi tiết đặt bàn và các dịch vụ bạn đã chọn."
      >
        {selectedTable && (
          <div className="space-y-4 text-xs">
            {/* Chi tiết đơn */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Bàn đã chọn:</span>
                <span className="font-bold text-white text-sm">
                  {selectedTable.tableNumber} - {selectedTable.tableType.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Thời gian chơi:</span>
                <span className="font-semibold text-zinc-200">
                  {time} - {date} ({durationMinutes} phút)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Tiền giờ ước tính:</span>
                <span className="font-semibold text-white">
                  {formatVND(tableEstimatedPrice)}
                </span>
              </div>

              {/* Món ăn đồ uống */}
              {totalPreOrderedItemsCount > 0 && (
                <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-400">
                    Đồ uống & Món ăn đã gọi ({totalPreOrderedItemsCount} món):
                  </div>
                  {Object.entries(selectedServices).map(([sId, qty]) => {
                    const svc = services.find((s) => s.id === sId);
                    if (!svc || qty <= 0) return null;
                    return (
                      <div key={sId} className="flex justify-between text-zinc-300 text-[11px]">
                        <span>
                          {qty}x {svc.name}
                        </span>
                        <span>{formatVND(Number(svc.unitPrice) * qty)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Phục vụ bàn */}
              {requestedStaffRole !== "" && (
                <div className="pt-2 border-t border-zinc-800/80 flex justify-between text-sky-300">
                  <div>
                    <div className="font-semibold">
                      {requestedStaffRole === "TABLE_ATTENDANT" ? "Trợ lý & Phục vụ VIP" : "Nhân viên xếp bi riêng"}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {requestedStaffId
                        ? `Chỉ định: ${staffOptions.find((s) => s.id === requestedStaffId)?.fullName || "Nhân viên"}`
                        : "Quán tự sắp xếp nhân viên trong ca"}
                    </div>
                  </div>
                  <span className="font-bold">{formatVND(staffFee)}</span>
                </div>
              )}

              {/* Tổng cộng */}
              <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm">
                <span className="font-bold text-zinc-300">Tổng thanh toán dự kiến:</span>
                <span className="font-black text-emerald-400">
                  {formatVND(grandTotalEstimate)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Ghi chú (nếu có):</label>
              <Input
                placeholder="VD: Chuẩn bị 2 cơ thi đấu, khăn lạnh..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px] leading-relaxed">
              ⚠️ <strong>Lưu ý:</strong> Quán sẽ giữ bàn tối đa 15 phút sau giờ hẹn. Bạn có thể tự hủy miễn phí trước giờ chơi ít nhất 60 phút.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModalOpen(false)}
              >
                Quay lại
              </Button>
              <Button
                size="sm"
                isLoading={bookingMutation.isPending}
                onClick={() => bookingMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                Xác Nhận Đặt Bàn Ngay
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={Boolean(successBooking)}
        onClose={() => setSuccessBooking(null)}
        title="🎉 Đặt Bàn Thành Công!"
      >
        <div className="text-center py-2 space-y-4">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle className="h-5 w-5" />
            <span>Đơn đặt của bạn đã được xác nhận thành công!</span>
          </div>

          {/* QR Code Bill Tra Cứu */}
          {successBooking && (
            <div className="space-y-2">
              <div className="p-3 bg-white rounded-2xl inline-block shadow-xl shadow-emerald-950/40 border-2 border-emerald-500/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? `${window.location.origin}${window.location.pathname.startsWith("/huynhchivi/doan") ? "/huynhchivi/doan" : ""}/live-bill?code=${encodeURIComponent(successBooking.bookingCode)}`
                      : `/live-bill?code=${encodeURIComponent(successBooking.bookingCode)}`
                  )}`}
                  alt="Mã QR Tra Cứu Bill"
                  className="w-44 h-44 object-contain mx-auto"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-zinc-400">
                  📱 Dùng camera điện thoại quét mã QR để tra cứu & xem bill trực tiếp:
                </div>
                <div className="inline-block px-3 py-1 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-sm font-black text-emerald-400 tracking-wider">
                  {successBooking.bookingCode}
                </div>
              </div>
            </div>
          )}

          {/* Thông tin tóm tắt đơn đặt */}
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-zinc-400">Bàn đã đặt:</span>
              <strong className="text-white font-semibold">
                Bàn {selectedTable?.tableNumber} ({selectedTable?.tableType?.name})
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Khung giờ hẹn:</span>
              <span className="text-emerald-400 font-medium">
                {time} - {date} ({durationMinutes} phút)
              </span>
            </div>
            {totalPreOrderedItemsCount > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Đồ ăn / nước đã gọi:</span>
                <span className="text-zinc-200 font-medium">
                  {totalPreOrderedItemsCount} món ({formatVND(preOrderedTotal)})
                </span>
              </div>
            )}
            {requestedStaffRole !== "" && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Nhân viên phục vụ:</span>
                <span className="text-sky-300 font-medium">
                  {requestedStaffRole === "TABLE_ATTENDANT" ? "Trợ lý VIP (50k)" : "Xếp bi (30k)"}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-zinc-800">
              <span className="text-zinc-400">Tổng thanh toán dự kiến:</span>
              <strong className="text-amber-400 font-bold">
                {formatVND(successBooking?.estimatedPrice || grandTotalEstimate)}
              </strong>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
            <Link
              href={`/live-bill?code=${encodeURIComponent(successBooking?.bookingCode || "")}`}
              target="_blank"
              className="flex-1"
            >
              <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold gap-1.5 text-xs h-9">
                <Receipt className="h-4 w-4" />
                Mở Xem Bill Trực Tiếp
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-9"
              onClick={() => {
                setSuccessBooking(null);
                router.push("/customer/dashboard");
              }}
            >
              Xem Lịch Đặt Của Tôi
            </Button>
          </div>
        </div>
      </Modal>

      <Footer />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
          Đang tải thông tin đặt bàn...
        </div>
      }
    >
      <BookContent />
    </Suspense>
  );
}
