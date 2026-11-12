"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatVND, formatDateTimeVN } from "@/lib/utils";
import {
  Receipt,
  Plus,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  Eye,
  Award,
  Ticket,
  Search,
  ArrowRightLeft,
  Layers,
  Sparkles,
} from "lucide-react";

export default function StaffBillingPage() {
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Block rounding state
  const [roundingMode, setRoundingMode] = useState<"BLOCK_5" | "BLOCK_15" | "EXACT">("BLOCK_5");

  // Customer membership lookup state
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerInfo, setCustomerInfo] = useState<any | null>(null);
  const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Switch & Merge table states
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [targetSwitchTableId, setTargetSwitchTableId] = useState("");
  const [targetMergeTableId, setTargetMergeTableId] = useState("");
  const [switchReason, setSwitchReason] = useState("");

  // QR Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ url: string; title: string } | null>(null);

  // 1. Lấy danh sách bàn đang chơi
  const { data: tables = [], isLoading: isLoadingTables } = useQuery({
    queryKey: ["staff-billing-tables"],
    queryFn: () => apiClient("/tables"),
    refetchInterval: 10000,
  });

  // 2. Lấy danh sách dịch vụ / đồ uống
  const { data: services = [] } = useQuery({
    queryKey: ["services-menu"],
    queryFn: () => apiClient("/services"),
  });

  // 3. Tra cứu khách hàng theo SĐT
  const handleSearchCustomer = async () => {
    if (!customerPhone.trim()) return;
    setIsSearchingCustomer(true);
    setCustomerSearchError(null);
    try {
      const data = await apiClient(`/users/by-phone/${customerPhone.trim()}`);
      setCustomerInfo(data);
    } catch (err: any) {
      setCustomerInfo(null);
      setCustomerSearchError(err.message || "Không tìm thấy khách hàng");
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  // 4. Kiểm tra mã voucher
  const handleValidateVoucher = async () => {
    if (!voucherCode.trim() || !activeSession) return;
    setIsValidatingVoucher(true);
    setVoucherError(null);
    try {
      const rate = Number(activeSession.hourlyRateSnapshot || 80000);
      const estOrderVal = Math.max(100000, rate * 1.5);
      const res = await apiClient("/vouchers/validate", {
        params: {
          code: voucherCode.trim(),
          orderValue: estOrderVal,
        },
      });
      setAppliedVoucher(res);
    } catch (err: any) {
      setAppliedVoucher(null);
      setVoucherError(err.message || "Mã voucher không hợp lệ");
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  // Mutation tạo hóa đơn kết thúc phiên chơi
  const createInvoiceMutation = useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      return apiClient("/invoices/create-from-session", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          roundingMode,
          customerPhone: customerPhone ? customerPhone.trim() : undefined,
          customerId: customerInfo?.id || undefined,
          voucherCode: appliedVoucher?.voucher?.code || voucherCode || undefined,
          discountAmount: Number(discountAmount) || 0,
        }),
      });
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["staff-billing-tables"] });
      setSelectedInvoice(invoice);
      setActiveSession(null);
      setCustomerInfo(null);
      setCustomerPhone("");
      setVoucherCode("");
      setAppliedVoucher(null);
    },
    onError: (err: any) => alert(err.message || "Lỗi khi chốt giờ"),
  });

  // Mutation thêm dịch vụ vào hóa đơn
  const addServiceMutation = useMutation({
    mutationFn: async ({ invoiceId, serviceId, quantity }: any) => {
      return apiClient(`/invoices/${invoiceId}/add-service`, {
        method: "POST",
        body: JSON.stringify({ serviceId, quantity: Number(quantity) }),
      });
    },
    onSuccess: (updatedInvoice) => {
      setSelectedInvoice(updatedInvoice);
      setSelectedServiceId("");
      setServiceQuantity(1);
    },
  });

  // Mutation gọi món trực tiếp vào phiên chơi trước khi chốt hóa đơn
  const addSessionOrderMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) {
        throw new Error("Vui lòng chọn bàn đang chơi trước khi gọi món");
      }
      return apiClient(`/invoices/session/${activeSession.id}/order`, {
        method: "POST",
        body: JSON.stringify({
          serviceId: selectedServiceId,
          quantity: Number(serviceQuantity),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-billing-tables"] });
      setSelectedServiceId("");
      setServiceQuantity(1);
      alert("✅ Đã gọi món vào bàn thành công!");
    },
    onError: (err: any) => alert(err.message || "Lỗi khi gọi món"),
  });

  // Mutation chuyển bàn
  const switchTableMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.billiardTableId || !targetSwitchTableId) {
        throw new Error("Vui lòng chọn bàn đích");
      }
      return apiClient("/tables/switch", {
        method: "POST",
        body: JSON.stringify({
          sourceTableId: activeSession.billiardTableId,
          targetTableId: targetSwitchTableId,
          reason: switchReason || undefined,
        }),
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["staff-billing-tables"] });
      setIsSwitchModalOpen(false);
      setActiveSession(null);
      setTargetSwitchTableId("");
      alert(res?.message || "✅ Chuyển bàn thành công!");
    },
    onError: (err: any) => alert(err.message || "Lỗi khi chuyển bàn"),
  });

  // Mutation gộp bàn
  const mergeTableMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.billiardTableId || !targetMergeTableId) {
        throw new Error("Vui lòng chọn bàn đích để gộp vào");
      }
      return apiClient("/tables/merge", {
        method: "POST",
        body: JSON.stringify({
          sourceTableId: activeSession.billiardTableId,
          targetTableId: targetMergeTableId,
        }),
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["staff-billing-tables"] });
      setIsMergeModalOpen(false);
      setActiveSession(null);
      setTargetMergeTableId("");
      alert(res?.message || "✅ Gộp bàn thành công!");
    },
    onError: (err: any) => alert(err.message || "Lỗi khi gộp bàn"),
  });

  // Mutation xác nhận thanh toán
  const payMutation = useMutation({
    mutationFn: async ({ invoiceId, method }: { invoiceId: string; method: string }) => {
      return apiClient(`/invoices/${invoiceId}/pay`, {
        method: "POST",
        body: JSON.stringify({
          method,
          note: "Thanh toán thành công tại quầy thu ngân",
        }),
      });
    },
    onSuccess: (updatedInv: any) => {
      queryClient.invalidateQueries({ queryKey: ["staff-billing-tables"] });
      const pts = updatedInv?.pointsEarned || 0;
      alert(`✅ Thanh toán thành công! ${pts > 0 ? `Khách được cộng +${pts} điểm thưởng.` : ""}`);
      setSelectedInvoice(null);
    },
  });

  const occupiedTables = tables.filter(
    (t: any) => t.status === "OCCUPIED" && t.playSessions?.length > 0,
  );

  const openQrModal = (code: string, title: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/huynhchivi/doan")
      ? "/huynhchivi/doan"
      : "";
    const url = `${origin}${basePath}/live-bill?${code}`;
    setQrCodeData({ url, title });
    setIsQrModalOpen(true);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "VIP":
        return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500 font-bold">HẠNG VIP</Badge>;
      case "GOLD":
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500 font-bold">HẠNG GOLD</Badge>;
      case "SILVER":
        return <Badge className="bg-slate-400/20 text-slate-200 border-slate-400 font-bold">HẠNG SILVER</Badge>;
      default:
        return <Badge className="bg-zinc-800 text-zinc-300 font-bold">HẠNG STANDARD</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      <Sidebar role="STAFF" />

      <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-black text-white">THU NGÂN & THANH TOÁN (POS)</h1>
            <p className="text-zinc-400 text-xs mt-1">
              Tính tiền giờ theo block (5p, 15p, phút thực tế), chuyển bàn, gộp bàn, áp dụng chiết khấu hạng thành viên & mã voucher.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cột 1: Danh sách bàn đang chơi */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-400" />
                Bàn Đang Chơi ({occupiedTables.length})
              </h2>

              {isLoadingTables ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
                  ))}
                </div>
              ) : occupiedTables.length === 0 ? (
                <Card className="text-center py-10 border-zinc-800 bg-zinc-900/30 text-xs text-zinc-500">
                  Hiện không có bàn nào đang trong phiên chơi.
                </Card>
              ) : (
                <div className="space-y-3">
                  {occupiedTables.map((t: any) => {
                    const session = t.playSessions[0];
                    const isSelected = activeSession?.id === session.id;
                    return (
                      <Card
                        key={t.id}
                        className={`p-4 border-zinc-800 bg-zinc-900/60 hover:border-emerald-500 cursor-pointer transition-all ${
                          isSelected ? "ring-2 ring-emerald-500 bg-emerald-950/20" : ""
                        }`}
                        onClick={() => {
                          setActiveSession(session);
                          setSelectedInvoice(null);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black text-base text-white">Bàn {t.tableNumber}</span>
                          <Badge variant="danger">Đang chơi</Badge>
                        </div>
                        <div className="text-xs text-zinc-400">
                          {t.tableType?.name} • Bắt đầu: {formatDateTimeVN(session.startTime)}
                        </div>
                        {session.invoice?.invoiceItems?.length > 0 && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                            <UtensilsCrossed className="h-3 w-3" />
                            <span>{session.invoice.invoiceItems.length} dịch vụ/món ({formatVND(session.invoice.serviceAmount)})</span>
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 gap-1 border-zinc-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQrModal(`table=${t.tableNumber}`, `Bàn ${t.tableNumber}`);
                            }}
                          >
                            <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                            Mã QR Bàn
                          </Button>
                          <Button size="sm" className="text-xs h-7">
                            Tính Tiền Bàn
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cột 2 & 3: Chi tiết tính tiền, Hội viên, Voucher & Thanh toán */}
            <div className="lg:col-span-2">
              {activeSession ? (
                <Card className="border-zinc-800 bg-zinc-900/80 p-6 space-y-5">
                  {/* Top Bar with Quick Switch / Merge buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>Chốt Giờ & Tính Tiền</span>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          Phiên {activeSession.sessionCode}
                        </Badge>
                      </h3>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Bàn: <strong className="text-white">{activeSession.billiardTable?.tableNumber}</strong> •{" "}
                        {formatVND(activeSession.hourlyRateSnapshot)}/h
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 h-8 border-indigo-700 text-indigo-300 hover:bg-indigo-950/40"
                        onClick={() => {
                          const avail = tables.find(
                            (t: any) => t.id !== activeSession.billiardTableId && t.status === "AVAILABLE"
                          );
                          if (avail) setTargetSwitchTableId(avail.id);
                          setIsSwitchModalOpen(true);
                        }}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Chuyển Bàn
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 h-8 border-purple-700 text-purple-300 hover:bg-purple-950/40"
                        onClick={() => {
                          const other = tables.find(
                            (t: any) => t.id !== activeSession.billiardTableId && t.playSessions?.length > 0
                          );
                          if (other) setTargetMergeTableId(other.id);
                          setIsMergeModalOpen(true);
                        }}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Gộp Bàn
                      </Button>
                    </div>
                  </div>

                  {/* 1. Chọn chế độ làm tròn tính tiền giờ (Block rounding) */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                    <label className="block text-xs font-bold text-zinc-300">
                      Chế độ làm tròn tiền giờ (Block Rounding):
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: "BLOCK_5", label: "Block 5 phút (Chuẩn)", desc: "Làm tròn lên bội số 5p" },
                        { id: "BLOCK_15", label: "Block 15 phút", desc: "Làm tròn lên bội số 15p" },
                        { id: "EXACT", label: "Phút thực tế", desc: "Tính chính xác từng phút" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRoundingMode(item.id as any)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            roundingMode === item.id
                              ? "border-emerald-500 bg-emerald-950/30 text-white"
                              : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Tra cứu khách hàng & Áp dụng ưu đãi hạng thành viên (Silver, Gold, VIP) */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                    <div className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-amber-400" />
                        Khách Hàng Thành Viên (Tích Điểm & Chiết Khấu Hạng):
                      </span>
                      {customerInfo && getTierBadge(customerInfo.membershipTier)}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Nhập SĐT khách hàng (VD: 0901234567)..."
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-9 text-xs gap-1 font-semibold"
                        onClick={handleSearchCustomer}
                        isLoading={isSearchingCustomer}
                      >
                        <Search className="h-3.5 w-3.5" />
                        Tra Cứu
                      </Button>
                    </div>

                    {customerSearchError && (
                      <p className="text-[11px] text-amber-400">{customerSearchError}</p>
                    )}

                    {customerInfo && (
                      <div className="p-3 rounded-lg bg-zinc-900 border border-emerald-900/60 text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <strong className="text-white text-sm">{customerInfo.fullName}</strong>
                          <span className="text-amber-300 font-bold">{customerInfo.points || 0} PTS</span>
                        </div>
                        <div className="text-zinc-400 text-[11px] flex items-center justify-between">
                          <span>Tổng chi tiêu: {formatVND(Number(customerInfo.totalSpending || 0))}</span>
                          <span className="text-emerald-400 font-semibold">
                            Tự động áp dụng chiết khấu hạng {customerInfo.membershipTier}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Nhập Voucher khuyến mãi */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                    <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Ticket className="h-4 w-4 text-emerald-400" />
                      Mã Voucher Khuyến Mãi (Nếu có):
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="VD: CHAOMUNG20, ROYAL50K, FNB10..."
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        className="h-9 text-xs uppercase font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs font-semibold border-zinc-700"
                        onClick={handleValidateVoucher}
                        isLoading={isValidatingVoucher}
                      >
                        Áp Dụng
                      </Button>
                    </div>

                    {voucherError && <p className="text-[11px] text-rose-400">{voucherError}</p>}

                    {appliedVoucher && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800 text-xs text-emerald-300 flex items-center justify-between">
                        <span>{appliedVoucher.message}</span>
                        <button
                          onClick={() => {
                            setAppliedVoucher(null);
                            setVoucherCode("");
                          }}
                          className="text-xs font-bold text-rose-400 hover:text-rose-300 ml-2"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4. Gọi thêm món vào bàn trước khi chốt */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                    <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <UtensilsCrossed className="h-4 w-4 text-emerald-400" />
                      Gọi Thêm Món Vào Bàn Này (Trước Khi Chốt):
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="flex-1 h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-100"
                      >
                        <option value="">-- Chọn món trong menu --</option>
                        {services.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({formatVND(s.unitPrice)} / {s.unit})
                          </option>
                        ))}
                      </select>

                      <Input
                        type="number"
                        min={1}
                        value={serviceQuantity}
                        onChange={(e) => setServiceQuantity(Number(e.target.value))}
                        className="w-16 h-9 text-xs"
                      />

                      <Button
                        size="sm"
                        disabled={!selectedServiceId}
                        isLoading={addSessionOrderMutation.isPending}
                        onClick={() => addSessionOrderMutation.mutate()}
                        className="h-9 text-xs gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm
                      </Button>
                    </div>
                  </div>

                  {/* 5. Danh sách các món / dịch vụ đã có trong bàn này */}
                  {activeSession.invoice?.invoiceItems?.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
                      <div className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <Receipt className="h-4 w-4" />
                          Dịch Vụ & Món Đã Gọi ({activeSession.invoice.invoiceItems.length} món):
                        </span>
                        <span className="text-emerald-400 font-extrabold text-xs">
                          {formatVND(Number(activeSession.invoice.serviceAmount) || 0)}
                        </span>
                      </div>
                      <div className="border border-zinc-800 rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                            <tr>
                              <th className="p-2">Tên Món / Dịch Vụ</th>
                              <th className="p-2 text-center">SL</th>
                              <th className="p-2 text-right">Đơn Giá</th>
                              <th className="p-2 text-right">Thành Tiền</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                            {activeSession.invoice.invoiceItems.map((item: any) => (
                              <tr key={item.id} className="hover:bg-zinc-900/40">
                                <td className="p-2 font-medium text-white">{item.itemName}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-right">{formatVND(Number(item.unitPriceSnapshot))}</td>
                                <td className="p-2 text-right font-bold text-emerald-400">
                                  {formatVND(Number(item.subtotal))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Nút hành động Chốt giờ */}
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold h-11 text-sm shadow-lg shadow-emerald-950/50"
                    isLoading={createInvoiceMutation.isPending}
                    onClick={() =>
                      createInvoiceMutation.mutate({
                        sessionId: activeSession.id,
                      })
                    }
                  >
                    Chốt Giờ Chơi & Tính Hóa Đơn (Áp Dụng Block & Chiết Khấu)
                  </Button>
                </Card>
              ) : selectedInvoice ? (
                /* Hóa đơn đã chốt: Chi tiết & Xác nhận thanh toán */
                <Card className="border-zinc-800 bg-zinc-900/80 p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">HÓA ĐƠN THANH TOÁN</h3>
                      <div className="text-xs text-emerald-400 font-mono font-bold mt-0.5">
                        {selectedInvoice.invoiceCode}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() =>
                          openQrModal(
                            `invoice=${selectedInvoice.invoiceCode}`,
                            `Hóa đơn ${selectedInvoice.invoiceCode}`,
                          )
                        }
                      >
                        <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                        QR Khách
                      </Button>
                      <Badge variant={selectedInvoice.status === "PAID" ? "success" : "warning"}>
                        {selectedInvoice.status === "PAID" ? "Đã Thanh Toán" : "Chờ Thanh Toán"}
                      </Badge>
                    </div>
                  </div>

                  {/* Chi tiết các dòng tính phí */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-zinc-300">Chi tiết dịch vụ & tiền bàn:</div>
                    <div className="border border-zinc-800 rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                          <tr>
                            <th className="p-2.5">Khoản Mục</th>
                            <th className="p-2.5 text-center">SL</th>
                            <th className="p-2.5 text-right">Đơn Giá</th>
                            <th className="p-2.5 text-right">Thành Tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 text-zinc-300">
                          {selectedInvoice.invoiceItems?.map((item: any) => (
                            <tr key={item.id}>
                              <td className="p-2.5 font-medium">{item.itemName}</td>
                              <td className="p-2.5 text-center">{item.quantity}</td>
                              <td className="p-2.5 text-right">{formatVND(item.unitPriceSnapshot)}</td>
                              <td className="p-2.5 text-right font-bold text-white">
                                {formatVND(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tổng tiền & Chiết khấu */}
                  <div className="border-t border-zinc-800 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Tiền giờ chơi:</span>
                      <strong className="text-white">{formatVND(Number(selectedInvoice.tableAmount))}</strong>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Tiền đồ ăn & dịch vụ (F&B):</span>
                      <strong className="text-white">{formatVND(Number(selectedInvoice.serviceAmount))}</strong>
                    </div>

                    {Number(selectedInvoice.tierDiscount || 0) > 0 && (
                      <div className="flex justify-between text-amber-300 font-semibold">
                        <span>Chiết khấu hạng thành viên:</span>
                        <span>-{formatVND(Number(selectedInvoice.tierDiscount))}</span>
                      </div>
                    )}

                    {Number(selectedInvoice.voucherDiscount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Chiết khấu Voucher ({selectedInvoice.voucherCode}):</span>
                        <span>-{formatVND(Number(selectedInvoice.voucherDiscount))}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline pt-3 border-t border-zinc-800">
                      <span className="text-sm font-bold text-zinc-200">TỔNG THANH TOÁN:</span>
                      <span className="text-2xl font-black text-emerald-400">
                        {formatVND(selectedInvoice.finalAmount)}
                      </span>
                    </div>

                    {selectedInvoice.status !== "PAID" && (
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <Button
                          className="gap-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs h-10"
                          isLoading={payMutation.isPending}
                          onClick={() =>
                            payMutation.mutate({
                              invoiceId: selectedInvoice.id,
                              method: "CASH",
                            })
                          }
                        >
                          <Banknote className="h-4 w-4" />
                          Tiền Mặt
                        </Button>

                        <Button
                          className="gap-2 bg-sky-600 hover:bg-sky-500 font-semibold text-xs h-10"
                          isLoading={payMutation.isPending}
                          onClick={() =>
                            payMutation.mutate({
                              invoiceId: selectedInvoice.id,
                              method: "BANK_TRANSFER",
                            })
                          }
                        >
                          <QrCode className="h-4 w-4" />
                          Chuyển Khoản VietQR
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="text-center py-24 border-zinc-800 bg-zinc-900/40 text-xs text-zinc-400">
                  <Receipt className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                  <div className="font-bold text-zinc-200">Chọn một bàn đang chơi bên trái để lập hóa đơn</div>
                  <div className="mt-1 text-zinc-500">
                    Hệ thống sẽ tự động tính số phút chơi theo block, áp dụng chiết khấu hạng thẻ & voucher.
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Switch Table Modal */}
      {isSwitchModalOpen && (
        <Modal
          isOpen={isSwitchModalOpen}
          onClose={() => setIsSwitchModalOpen(false)}
          title={`Chuyển Vị Trí Bàn - Nguồn: ${activeSession?.billiardTable?.tableNumber}`}
          description="Chuyển thời gian chơi và toàn bộ dịch vụ đã gọi sang bàn mới"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Chọn bàn trống muốn chuyển sang:</label>
              <select
                value={targetSwitchTableId}
                onChange={(e) => setTargetSwitchTableId(e.target.value)}
                className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
              >
                <option value="">-- Chọn bàn đích khả dụng --</option>
                {tables
                  .filter((t: any) => t.id !== activeSession?.billiardTableId && t.status === "AVAILABLE")
                  .map((t: any) => (
                    <option key={t.id} value={t.id}>
                      Bàn {t.tableNumber} - {t.tableType?.name} ({t.area}) • {formatVND(t.hourlyRate || t.tableType?.hourlyRate)}/h
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Lý do đổi vị trí (tùy chọn):</label>
              <Input
                value={switchReason}
                onChange={(e) => setSwitchReason(e.target.value)}
                placeholder="VD: Khách muốn đổi bàn gần điều hòa..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button variant="outline" size="sm" onClick={() => setIsSwitchModalOpen(false)}>
                Hủy
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 font-bold"
                disabled={!targetSwitchTableId}
                isLoading={switchTableMutation.isPending}
                onClick={() => switchTableMutation.mutate()}
              >
                Xác Nhận Chuyển Bàn
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Merge Tables Modal */}
      {isMergeModalOpen && (
        <Modal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          title={`Gộp Bàn - Nguồn: ${activeSession?.billiardTable?.tableNumber}`}
          description="Tính tiền giờ bàn này tính đến hiện tại và dồn hóa đơn sang bàn đích"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Chọn bàn đích để gộp vào:</label>
              <select
                value={targetMergeTableId}
                onChange={(e) => setTargetMergeTableId(e.target.value)}
                className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
              >
                <option value="">-- Chọn bàn đích đang chơi --</option>
                {tables
                  .filter((t: any) => t.id !== activeSession?.billiardTableId && t.playSessions?.length > 0)
                  .map((t: any) => (
                    <option key={t.id} value={t.id}>
                      Bàn {t.tableNumber} - {t.tableType?.name} (Đang chơi)
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button variant="outline" size="sm" onClick={() => setIsMergeModalOpen(false)}>
                Hủy
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 font-bold"
                disabled={!targetMergeTableId}
                isLoading={mergeTableMutation.isPending}
                onClick={() => mergeTableMutation.mutate()}
              >
                Xác Nhận Gộp Bàn
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal QR Code */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={`Mã QR ${qrCodeData?.title || "Hóa Đơn"}`}
        description="Khách quét mã bằng camera điện thoại để xem trực tiếp tiêu dùng và chuyển khoản"
      >
        {qrCodeData && (
          <div className="space-y-4 text-center text-xs">
            <div className="p-3 bg-white rounded-xl inline-block shadow-lg mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  qrCodeData.url,
                )}`}
                alt="QR Code"
                className="w-56 h-56 object-contain mx-auto"
              />
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 text-left space-y-1">
              <div>Link trực tiếp: <strong className="text-emerald-400 break-all">{qrCodeData.url}</strong></div>
              <div className="text-zinc-500">Khách không cần tài khoản hay đăng nhập vẫn xem được hóa đơn.</div>
            </div>

            <div className="flex justify-center gap-3 pt-2 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(qrCodeData.url, "_blank")}
              >
                Xem Trang Khách
              </Button>
              <Button size="sm" onClick={() => setIsQrModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
