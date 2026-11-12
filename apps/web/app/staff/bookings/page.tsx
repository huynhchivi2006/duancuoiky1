"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatVND, formatDateTimeVN } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle,
  Play,
  XCircle,
  Clock,
  Search,
  Filter,
  UtensilsCrossed,
  UserCheck,
} from "lucide-react";

function parseBookingNotes(rawNotes?: string) {
  if (!rawNotes) return { customNote: "", items: [], staff: null };
  let items: any[] = [];
  let staff: any = null;
  let customNote = rawNotes;

  const startTag = "[__BOOKING_METADATA__]";
  const endTag = "[/__BOOKING_METADATA__]";
  const sIdx = rawNotes.indexOf(startTag);
  const eIdx = rawNotes.indexOf(endTag);
  if (sIdx !== -1 && eIdx !== -1 && eIdx > sIdx) {
    try {
      const json = JSON.parse(rawNotes.substring(sIdx + startTag.length, eIdx));
      items = json.preOrderedItems || [];
      staff = json.requestedStaff || null;
      customNote = rawNotes.substring(eIdx + endTag.length).trim();
    } catch {}
  } else if (rawNotes.startsWith("[METADATA:")) {
    try {
      const lastB = rawNotes.lastIndexOf("]");
      if (lastB > 10) {
        const json = JSON.parse(rawNotes.substring(10, lastB));
        items = json.preOrderedItems || [];
        staff = json.requestedStaff || null;
        customNote = rawNotes.substring(lastB + 1).trim();
      }
    } catch {}
  }
  return { customNote, items, staff };
}

export default function StaffBookingsPage() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [dateFilter, setDateFilter] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [cancelModalBooking, setCancelModalBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["staff-bookings", dateFilter, statusFilter, searchTerm],
    queryFn: () =>
      apiClient("/bookings", {
        params: {
          date: dateFilter || undefined,
          status: statusFilter || undefined,
          search: searchTerm || undefined,
        },
      }),
  });

  // Chuyển trạng thái
  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/bookings/${id}/confirm`, { method: "PUT" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-bookings"] }),
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/bookings/${id}/check-in`, { method: "PUT" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-bookings"] }),
  });

  const startSessionMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/bookings/${id}/start-session`, { method: "PUT" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-bookings"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient(`/bookings/${id}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setCancelModalBooking(null);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["staff-bookings"] });
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Chờ Duyệt</Badge>;
      case "CONFIRMED":
        return <Badge variant="success">Đã Giữ Chỗ</Badge>;
      case "CHECKED_IN":
        return <Badge variant="info">Đã Check-in</Badge>;
      case "IN_USE":
        return <Badge variant="danger">Đang Chơi</Badge>;
      case "COMPLETED":
        return <Badge variant="default">Hoàn Tất</Badge>;
      case "CANCELLED":
        return <Badge variant="outline">Đã Hủy</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="STAFF" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-black text-white">LỊCH ĐẶT BÀN TRONG CA</h1>
            <p className="text-zinc-400 text-xs mt-1">
              Tiếp nhận khách đặt trước, check-in và bật bàn theo chu trình nghiệp vụ chuẩn.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 mb-6">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Lọc theo ngày:
              </label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Lọc theo trạng thái:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="CONFIRMED">Đã Giữ Chỗ (CONFIRMED)</option>
                <option value="CHECKED_IN">Đã Check-in (CHECKED_IN)</option>
                <option value="IN_USE">Đang Chơi (IN_USE)</option>
                <option value="COMPLETED">Hoàn Tất (COMPLETED)</option>
                <option value="CANCELLED">Đã Hủy (CANCELLED)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Tìm kiếm mã / tên khách / SĐT:
              </label>
              <Input
                placeholder="Nhập từ khóa tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Bookings Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <Card className="text-center py-16 border-zinc-800 bg-zinc-900/40">
              <CalendarDays className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-zinc-300">Không có đơn đặt bàn nào</div>
              <div className="text-xs text-zinc-500 mt-1">Thay đổi bộ lọc hoặc ngày để xem thêm</div>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking: any) => (
                <Card
                  key={booking.id}
                  className="border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] text-zinc-400 font-semibold">BÀN</span>
                        <span className="text-base font-black text-emerald-400">
                          {booking.billiardTable?.tableNumber}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">
                            {booking.bookingCode}
                          </span>
                          {statusBadge(booking.status)}
                        </div>

                        <div className="text-xs text-zinc-200 font-medium">
                          Khách:{" "}
                          <strong className="text-white">
                            {booking.customer?.fullName || "Khách đặt trước"}
                          </strong>{" "}
                          ({booking.customer?.phone || "Chưa có SĐT"})
                        </div>

                        <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-zinc-500" />
                          <span>
                            {formatDateTimeVN(booking.startTime)} -{" "}
                            {formatDateTimeVN(booking.endTime)}
                          </span>
                        </div>

                        {/* Chi tiết món ăn & nhân viên đã order */}
                        {(() => {
                          const { customNote, items, staff } = parseBookingNotes(booking.notes);
                          return (
                            <div className="space-y-1 pt-1">
                              {items.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                    <UtensilsCrossed className="h-3 w-3" />
                                    {items.map((it: any) => `${it.quantity}x ${it.name}`).join(", ")}
                                  </span>
                                </div>
                              )}
                              {staff && (
                                <div className="flex items-center gap-1 text-[10px] text-sky-400 font-medium">
                                  <UserCheck className="h-3 w-3" />
                                  <span>
                                    {staff.roleName}: <strong>{staff.staffName || "Quán tự sắp xếp"}</strong>
                                  </span>
                                </div>
                              )}
                              {customNote && (
                                <div className="text-[10px] text-zinc-400 italic">
                                  Ghi chú: {customNote}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-800">
                      {booking.status === "PENDING" && (
                        <Button
                          size="sm"
                          className="text-xs bg-emerald-600"
                          onClick={() => confirmMutation.mutate(booking.id)}
                          isLoading={confirmMutation.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Duyệt Đặt Bàn
                        </Button>
                      )}

                      {booking.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          className="text-xs bg-sky-600 hover:bg-sky-500"
                          onClick={() => checkInMutation.mutate(booking.id)}
                          isLoading={checkInMutation.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Check-in Khách Đến
                        </Button>
                      )}

                      {booking.status === "CHECKED_IN" && (
                        <Button
                          size="sm"
                          className="text-xs bg-amber-600 hover:bg-amber-500"
                          onClick={() => startSessionMutation.mutate(booking.id)}
                          isLoading={startSessionMutation.isPending}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" />
                          Bật Bàn Bấm Giờ
                        </Button>
                      )}

                      {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="text-xs"
                          onClick={() => setCancelModalBooking(booking)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Hủy
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Cancel Modal */}
      <Modal
        isOpen={Boolean(cancelModalBooking)}
        onClose={() => setCancelModalBooking(null)}
        title="Nhân Viên Hủy Đặt Bàn"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Nhập lý do hủy đặt bàn (Bắt buộc):
            </label>
            <Input
              placeholder="VD: Khách gọi điện báo hủy bận việc đột xuất..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalBooking(null)}
            >
              Quay lại
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!cancelReason.trim()}
              isLoading={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate({
                  id: cancelModalBooking.id,
                  reason: cancelReason,
                })
              }
            >
              Xác Nhận Hủy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
