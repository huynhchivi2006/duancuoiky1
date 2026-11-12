"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatVND } from "@/lib/utils";
import Link from "next/link";
import {
  Play,
  Receipt,
  Clock,
  RefreshCw,
  UtensilsCrossed,
  UserCheck,
  QrCode,
  Plus,
  Zap,
  ArrowRightLeft,
  Layers,
} from "lucide-react";

export default function StaffDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Form states
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffRoleType, setStaffRoleType] = useState<"BALL_RACKER" | "TABLE_ATTENDANT">("BALL_RACKER");
  const [staffFee, setStaffFee] = useState<number>(30000);
  const [staffNotes, setStaffNotes] = useState("");

  const [targetSwitchTableId, setTargetSwitchTableId] = useState("");
  const [switchReason, setSwitchReason] = useState("");
  const [targetMergeTableId, setTargetMergeTableId] = useState("");

  const { data: tables = [], isLoading, refetch } = useQuery({
    queryKey: ["staff-tables"],
    queryFn: () => apiClient("/tables"),
    refetchInterval: 10000,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services-menu"],
    queryFn: () => apiClient("/services"),
  });

  const { data: staffUsers = [] } = useQuery({
    queryKey: ["staff-users-list"],
    queryFn: () => apiClient("/users", { params: { role: "STAFF" } }),
  });

  // Chuyển bàn khi khách muốn đổi vị trí
  const switchTableMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTable?.id || !targetSwitchTableId) {
        throw new Error("Vui lòng chọn bàn đích muốn chuyển đến");
      }
      return apiClient("/tables/switch", {
        method: "POST",
        body: JSON.stringify({
          sourceTableId: selectedTable.id,
          targetTableId: targetSwitchTableId,
          reason: switchReason || undefined,
        }),
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["staff-tables"] });
      setIsSwitchModalOpen(false);
      setSelectedTable(null);
      setTargetSwitchTableId("");
      setSwitchReason("");
      alert(res?.message || "✅ Chuyển bàn thành công!");
    },
    onError: (err: any) => alert(err.message || "Không thể chuyển bàn"),
  });

  // Gộp bàn khi nhóm khách muốn gộp thanh toán chung
  const mergeTableMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTable?.id || !targetMergeTableId) {
        throw new Error("Vui lòng chọn bàn đích để gộp vào");
      }
      return apiClient("/tables/merge", {
        method: "POST",
        body: JSON.stringify({
          sourceTableId: selectedTable.id,
          targetTableId: targetMergeTableId,
        }),
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["staff-tables"] });
      setIsMergeModalOpen(false);
      setSelectedTable(null);
      setTargetMergeTableId("");
      alert(res?.message || "✅ Gộp bàn thành công!");
    },
    onError: (err: any) => alert(err.message || "Không thể gộp bàn"),
  });

  // Mở bàn nhanh cho khách vãng lai
  const quickOpenMutation = useMutation({
    mutationFn: (tableId: string) =>
      apiClient(`/invoices/quick-open/${tableId}`, {
        method: "POST",
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["staff-tables"] });
      alert(res?.message || "✅ Đã mở bàn thành công! Bắt đầu tính giờ chơi.");
    },
    onError: (err: any) => alert(err.message || "Không thể mở bàn"),
  });

  // Order đồ uống / món ăn trong lúc bàn đang chơi
  const addSessionOrderMutation = useMutation({
    mutationFn: async () => {
      const currentTable = tables.find((t: any) => t.id === selectedTable?.id) || selectedTable;
      const activeSession = currentTable?.playSessions?.[0];

      if (!activeSession?.id) {
        throw new Error(
          `Bàn ${currentTable?.tableNumber || ""} chưa được mở phiên chơi. Vui lòng bấm "Mở Bàn Nhanh" trước khi gọi món!`
        );
      }

      // Thử gọi endpoint session (hỗ trợ cả server Wispbyte hiện tại và local)
      try {
        return await apiClient(`/invoices/session/${activeSession.id}/order`, {
          method: "POST",
          body: JSON.stringify({
            serviceId: selectedServiceId,
            quantity: Number(orderQuantity),
          }),
        });
      } catch (err: any) {
        // Fallback sang endpoint table nếu backend mới
        return await apiClient(`/invoices/table/${currentTable.id}/order`, {
          method: "POST",
          body: JSON.stringify({
            serviceId: selectedServiceId,
            quantity: Number(orderQuantity),
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-tables"] });
      setIsOrderModalOpen(false);
      setSelectedServiceId("");
      setOrderQuantity(1);
      alert("✅ Đã gọi món thành công vào bàn!");
    },
    onError: (err: any) => alert(err.message || "Lỗi khi gọi món"),
  });

  // Gán nhân viên phục vụ bàn (xếp bi / đứng bàn)
  const assignStaffMutation = useMutation({
    mutationFn: async () => {
      const currentTable = tables.find((t: any) => t.id === selectedTable?.id) || selectedTable;
      const activeSession = currentTable?.playSessions?.[0];

      if (!activeSession?.id) {
        throw new Error(
          `Bàn ${currentTable?.tableNumber || ""} chưa được mở phiên chơi. Vui lòng bấm "Mở Bàn Nhanh" trước khi phân công nhân viên!`
        );
      }

      try {
        return await apiClient(`/invoices/session/${activeSession.id}/assign-staff`, {
          method: "POST",
          body: JSON.stringify({
            staffId: selectedStaffId,
            roleType: staffRoleType,
            fee: Number(staffFee),
            notes: staffNotes,
          }),
        });
      } catch (err: any) {
        return await apiClient(`/invoices/table/${currentTable.id}/assign-staff`, {
          method: "POST",
          body: JSON.stringify({
            staffId: selectedStaffId,
            roleType: staffRoleType,
            fee: Number(staffFee),
            notes: staffNotes,
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-tables"] });
      setIsStaffModalOpen(false);
      setSelectedStaffId("");
      setStaffNotes("");
      alert("✅ Đã phân công nhân viên phục vụ bàn!");
    },
    onError: (err: any) => alert(err.message || "Lỗi khi gán nhân viên"),
  });

  const currentTable = tables.find((t: any) => t.id === selectedTable?.id) || selectedTable;
  const activeSession = currentTable?.playSessions?.[0];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH !== undefined ? process.env.NEXT_PUBLIC_BASE_PATH : "/huynhchivi/doan";
  const liveBillUrl = typeof window !== "undefined"
    ? `${window.location.origin}${basePath}/live-bill?table=${currentTable?.tableNumber || "B01"}`
    : `${basePath}/live-bill?table=${currentTable?.tableNumber || "B01"}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    liveBillUrl,
  )}`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="STAFF" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">SƠ ĐỒ BÀN TRỰC QUAN (CA LÀM VIỆC)</h1>
              <p className="text-zinc-400 text-xs mt-1">
                Quản lý bàn thời gian thực: mở bàn nhanh, gọi thêm món, gán nhân viên xếp bi và xuất mã QR.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Làm Mới
              </Button>
              <Link href="/staff/billing">
                <Button size="sm" className="text-xs gap-1.5 bg-emerald-600">
                  <Receipt className="h-4 w-4" />
                  Quầy Thu Ngân & POS
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Status Legend */}
          <div className="flex flex-wrap items-center gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 text-xs">
            <span className="font-semibold text-zinc-300">Chú thích trạng thái:</span>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-zinc-300">Bàn Trống (Sẵn Sàng)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-zinc-300">Đang Chơi (Bấm để gọi món/QR)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-zinc-300">Có Lịch Đặt Trước</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-zinc-600" />
              <span className="text-zinc-400">Bảo Trì</span>
            </div>
          </div>

          {/* Grid of Tables */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-44 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tables.map((table: any) => {
                const session = table.playSessions?.[0];
                const isPlaying = Boolean(session);
                const isOccupied = isPlaying || table.status === "OCCUPIED";

                return (
                  <Card
                    key={table.id}
                    className={`border-zinc-800 transition-all cursor-pointer relative overflow-hidden ${
                      isPlaying
                        ? "bg-rose-950/20 border-rose-800/60 hover:border-rose-500 shadow-lg shadow-rose-950/30"
                        : "bg-zinc-900/70 hover:border-emerald-500/60"
                    }`}
                    onClick={() => setSelectedTable(table)}
                  >
                    <div
                      className={`h-1.5 w-full ${
                        isPlaying
                          ? "bg-rose-500"
                          : table.status === "MAINTENANCE"
                          ? "bg-zinc-600"
                          : "bg-emerald-500"
                      }`}
                    />

                    <CardContent className="p-5 flex flex-col justify-between h-40">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-black text-white">
                            {table.tableNumber}
                          </span>
                          <Badge
                            variant={
                              isPlaying
                                ? "danger"
                                : table.status === "MAINTENANCE"
                                ? "default"
                                : table.status === "OCCUPIED"
                                ? "warning"
                                : "success"
                            }
                          >
                            {isPlaying ? "ĐANG CHƠI" : table.status === "AVAILABLE" ? "SẴN SÀNG" : table.status}
                          </Badge>
                        </div>

                        <div className="text-xs font-semibold text-zinc-300">
                          {table.tableType?.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Khu: {table.area} • {formatVND(table.hourlyRate || table.tableType?.hourlyRate)}/h
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                        {isPlaying ? (
                          <div className="text-rose-400 font-semibold flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 animate-spin" />
                            <span>Đang tính giờ</span>
                          </div>
                        ) : (
                          <span className="text-emerald-400 font-medium">Bấm để mở bàn</span>
                        )}

                        <span className="text-[11px] text-zinc-500 underline">Thao tác</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Table Action Modal */}
      <Modal
        isOpen={Boolean(selectedTable)}
        onClose={() => setSelectedTable(null)}
        title={`Thao Tác Bàn ${selectedTable?.tableNumber}`}
        description={`${selectedTable?.tableType?.name} (${selectedTable?.area})`}
      >
        {selectedTable && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Trạng thái:</span>
                <span className="font-bold text-white">{selectedTable.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Đơn giá giờ:</span>
                <span className="font-bold text-emerald-400">
                  {formatVND(selectedTable.hourlyRate || selectedTable.tableType?.hourlyRate)} / giờ
                </span>
              </div>
              {selectedTable.playSessions?.[0] && (
                <div className="flex justify-between pt-1 border-t border-zinc-800">
                  <span className="text-zinc-400">Mã phiên chơi:</span>
                  <span className="font-mono font-bold text-zinc-200">
                    {selectedTable.playSessions[0].sessionCode}
                  </span>
                </div>
              )}
            </div>

            {/* Actions for playing table vs available table */}
            {selectedTable.playSessions?.[0] ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs gap-1.5 h-10"
                  onClick={() => setIsOrderModalOpen(true)}
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  Gọi Thêm Đồ Uống / Món
                </Button>

                <Button
                  className="bg-sky-600 hover:bg-sky-500 text-xs gap-1.5 h-10"
                  onClick={() => {
                    if (staffUsers.length > 0 && !selectedStaffId) {
                      setSelectedStaffId(staffUsers[0].id);
                    }
                    setIsStaffModalOpen(true);
                  }}
                >
                  <UserCheck className="h-4 w-4" />
                  Nhân Viên Xếp Bi / Đứng Bàn
                </Button>

                <Button
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5 h-10"
                  onClick={() => {
                    const availableFirst = tables.find(
                      (t: any) => t.id !== selectedTable.id && t.status === "AVAILABLE"
                    );
                    if (availableFirst) setTargetSwitchTableId(availableFirst.id);
                    setIsSwitchModalOpen(true);
                  }}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Chuyển Vị Trí Bàn
                </Button>

                <Button
                  className="bg-purple-600 hover:bg-purple-500 text-xs gap-1.5 h-10"
                  onClick={() => {
                    const otherOccupied = tables.find(
                      (t: any) => t.id !== selectedTable.id && t.playSessions?.length > 0
                    );
                    if (otherOccupied) setTargetMergeTableId(otherOccupied.id);
                    setIsMergeModalOpen(true);
                  }}
                >
                  <Layers className="h-4 w-4" />
                  Gộp Bàn (Dồn Hóa Đơn)
                </Button>

                <Button
                  variant="outline"
                  className="text-xs gap-1.5 h-10 border-zinc-700 hover:bg-zinc-800"
                  onClick={() => setIsQrModalOpen(true)}
                >
                  <QrCode className="h-4 w-4 text-emerald-400" />
                  Xuất Mã QR Cho Khách Quét
                </Button>

                <Link href="/staff/billing" className="block">
                  <Button className="w-full bg-amber-600 hover:bg-amber-500 text-xs gap-1.5 h-10">
                    <Receipt className="h-4 w-4" />
                    Chốt Tiền & Thanh Toán
                  </Button>
                </Link>
              </div>
            ) : (
              /* Actions for table without active session */
              <div className="space-y-2.5 pt-1">
                {selectedTable.status === "OCCUPIED" && (
                  <p className="text-amber-400 text-[11px] font-semibold bg-amber-950/40 border border-amber-800/60 p-2 rounded-lg">
                    ⚠️ Bàn đang được đánh dấu bận nhưng chưa có giờ chơi. Bấm nút dưới để bắt đầu tính giờ ngay!
                  </p>
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold gap-2 h-10"
                  isLoading={quickOpenMutation.isPending}
                  onClick={() => quickOpenMutation.mutate(selectedTable.id)}
                >
                  <Zap className="h-4 w-4" />
                  Mở Bàn Nhanh Cho Khách Vãng Lai (Bắt Đầu Ngay)
                </Button>

                <Link href={`/book?tableId=${selectedTable.id}`} className="block">
                  <Button variant="outline" className="w-full gap-2 text-xs h-9">
                    <Play className="h-3.5 w-3.5" />
                    Tạo Đặt Bàn Khung Giờ Cụ Thể
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal 1: Gọi Thêm Đồ Khi Bàn Đang Chơi */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title={`Gọi Thêm Đồ Vào Bàn ${selectedTable?.tableNumber}`}
        description="Món ăn / nước uống sẽ được cộng trực tiếp vào hóa đơn của lượt chơi này"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Chọn món trong menu:</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              <option value="">-- Bấm để chọn món --</option>
              {services.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatVND(s.unitPrice)} / {s.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Số lượng:</label>
            <Input
              type="number"
              min={1}
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(Number(e.target.value))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setIsOrderModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 font-semibold gap-1.5"
              disabled={!selectedServiceId}
              isLoading={addSessionOrderMutation.isPending}
              onClick={() => addSessionOrderMutation.mutate()}
            >
              <Plus className="h-4 w-4" />
              Thêm Vào Bàn
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Gán Nhân Viên Phục Vụ Bàn */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title={`Nhân Viên Phục Vụ Bàn ${selectedTable?.tableNumber}`}
        description="Ghi nhận nhân viên hỗ trợ xếp bi hoặc phục vụ liên tục cho khách"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Nhân viên phụ trách:</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              <option value="">-- Chọn nhân viên trong ca --</option>
              {staffUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Nhiệm vụ phục vụ:</label>
            <select
              value={staffRoleType}
              onChange={(e) => {
                const val = e.target.value as any;
                setStaffRoleType(val);
                setStaffFee(val === "BALL_RACKER" ? 30000 : 50000);
              }}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              <option value="BALL_RACKER">Xếp bi theo từng ván / bàn</option>
              <option value="TABLE_ATTENDANT">Nhân viên đứng bàn phục vụ (Marker)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Phí dịch vụ nhân viên (VNĐ):</label>
            <Input
              type="number"
              min={0}
              step={5000}
              value={staffFee}
              onChange={(e) => setStaffFee(Number(e.target.value))}
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Nhập 0 nếu đây là dịch vụ miễn phí của quán.
            </span>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Ghi chú yêu cầu của khách:</label>
            <Input
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              placeholder="VD: Hỗ trợ xếp bi nhanh trận giao hữu..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setIsStaffModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-500 font-semibold"
              disabled={!selectedStaffId}
              isLoading={assignStaffMutation.isPending}
              onClick={() => assignStaffMutation.mutate()}
            >
              Xác Nhận Phân Công
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Xuất Mã QR Hóa Đơn Cho Khách Quét */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={`Mã QR Hóa Đơn Trực Tiếp - Bàn ${selectedTable?.tableNumber}`}
        description="Khách dùng camera điện thoại quét mã này để xem chi tiết tiêu dùng thời gian thực"
      >
        <div className="space-y-4 text-center text-xs">
          <div className="p-3 bg-white rounded-xl inline-block shadow-lg mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="Mã QR Bàn Trực Tiếp"
              className="w-56 h-56 object-contain mx-auto"
            />
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 text-left space-y-1">
            <div>Link hóa đơn: <strong className="text-emerald-400 break-all">{liveBillUrl}</strong></div>
            <div className="text-zinc-500">Khách quét mã sẽ thấy: Thời gian chơi, tiền bàn, các món đã gọi và mã VietQR thanh toán.</div>
          </div>

          <div className="flex justify-center gap-3 pt-2 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(liveBillUrl, "_blank")}
            >
              Mở Trang Xem Thử
            </Button>
            <Button size="sm" onClick={() => setIsQrModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 4: Chuyển Vị Trí Bàn */}
      <Modal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
        title={`Chuyển Vị Trí Bàn - Nguồn: ${selectedTable?.tableNumber}`}
        description="Toàn bộ thời gian chơi và dịch vụ đã gọi sẽ được chuyển sang bàn mới"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Chọn bàn trống muốn chuyển sang:
            </label>
            <select
              value={targetSwitchTableId}
              onChange={(e) => setTargetSwitchTableId(e.target.value)}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              <option value="">-- Chọn bàn đích khả dụng --</option>
              {tables
                .filter((t: any) => t.id !== selectedTable?.id && t.status === "AVAILABLE")
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
              placeholder="VD: Khách đổi sang bàn gần máy lạnh, đổi loại bàn lỗ sang carom..."
            />
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <p>• Bàn nguồn <strong className="text-white">{selectedTable?.tableNumber}</strong> sẽ trở về trạng thái Sẵn Sàng (Trống).</p>
            <p>• Bàn đích được chọn sẽ chuyển sang trạng thái Đang Chơi (Occupied).</p>
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

      {/* Modal 5: Gộp Bàn (Dồn Hóa Đơn) */}
      <Modal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        title={`Gộp Bàn - Bàn Nguồn: ${selectedTable?.tableNumber}`}
        description="Tính tiền giờ bàn này tính đến hiện tại và dồn toàn bộ tiền giờ + món F&B sang bàn đích"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Chọn bàn đích nhận gộp hóa đơn:
            </label>
            <select
              value={targetMergeTableId}
              onChange={(e) => setTargetMergeTableId(e.target.value)}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              <option value="">-- Chọn bàn đích đang chơi --</option>
              {tables
                .filter((t: any) => t.id !== selectedTable?.id && t.playSessions?.length > 0)
                .map((t: any) => (
                  <option key={t.id} value={t.id}>
                    Bàn {t.tableNumber} - {t.tableType?.name} (Đang chơi)
                  </option>
                ))}
            </select>
          </div>

          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/50 text-[11px] text-purple-200 space-y-1">
            <p className="font-semibold text-purple-300">Quy trình sau khi gộp bàn:</p>
            <p>1. Tiền giờ bàn {selectedTable?.tableNumber} được tính theo block và chuyển sang hóa đơn bàn đích.</p>
            <p>2. Toàn bộ đồ uống, món ăn đã gọi ở bàn này được chuyển sang bàn đích.</p>
            <p>3. Bàn {selectedTable?.tableNumber} sẽ kết thúc và giải phóng thành Sẵn Sàng (Trống).</p>
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
              Xác Nhận Gộp Bàn Ngay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
