"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { formatVND, formatDateTimeVN } from "@/lib/utils";
import Link from "next/link";
import { CalendarDays, Clock, Plus, XCircle, AlertCircle, CheckCircle, QrCode, Receipt } from "lucide-react";

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cancelModalBooking, setCancelModalBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [qrModalBooking, setQrModalBooking] = useState<any | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => apiClient("/bookings/my"),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiClient(`/bookings/${id}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      setCancelModalBooking(null);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (err: any) => {
      setCancelError(err.message || "Không thể hủy đặt bàn");
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="success">Đã Xác Nhận (Giữ Bàn)</Badge>;
      case "CHECKED_IN":
        return <Badge variant="info">Đã Check-in</Badge>;
      case "IN_USE":
        return <Badge variant="warning">Đang Chơi</Badge>;
      case "COMPLETED":
        return <Badge variant="default">Hoàn Tất</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">Đã Hủy</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="CUSTOMER" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-white">LỊCH ĐẶT BÀN CỦA TÔI</h1>
              <p className="text-zinc-400 text-xs mt-1">
                Xin chào, <strong className="text-emerald-400">{user?.fullName}</strong>! Bạn có thể theo dõi và quản lý lịch đặt tại đây.
              </p>
            </div>

            <Link href="/book">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Đặt Bàn Mới
              </Button>
            </Link>
          </div>

          {/* Booking List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <Card className="text-center py-16 border-zinc-800 bg-zinc-900/40">
              <CalendarDays className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-300">Bạn chưa có lượt đặt bàn nào</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-6">
                Hãy đặt bàn trước để đảm bảo có vị trí chơi ưa thích khi đến quán.
              </p>
              <Link href="/book">
                <Button size="sm">Đặt Bàn Ngay</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking: any) => {
                const canCancel =
                  booking.status === "CONFIRMED" || booking.status === "PENDING";
                return (
                  <Card key={booking.id} className="border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-400 text-sm">
                            {booking.bookingCode}
                          </span>
                          {statusBadge(booking.status)}
                        </div>
                        <div className="text-sm font-bold text-white">
                          Bàn {booking.billiardTable?.tableNumber} - {booking.billiardTable?.tableType?.name}
                        </div>
                        <div className="text-xs text-zinc-400 flex items-center gap-3">
                          <span>Bắt đầu: {formatDateTimeVN(booking.startTime)}</span>
                          <span>•</span>
                          <span>Kết thúc: {formatDateTimeVN(booking.endTime)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:border-l sm:border-zinc-800 sm:pl-6">
                        <div>
                          <div className="text-[11px] text-zinc-400">Chi phí dự kiến:</div>
                          <div className="text-sm font-extrabold text-emerald-400">
                            {formatVND(booking.estimatedPrice)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/40"
                            onClick={() => setQrModalBooking(booking)}
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            QR Bill
                          </Button>

                          {canCancel && (
                            <Button
                              variant="danger"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                setCancelModalBooking(booking);
                                setCancelError(null);
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Hủy Bàn
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Cancel Modal */}
      <Modal
        isOpen={Boolean(cancelModalBooking)}
        onClose={() => setCancelModalBooking(null)}
        title="Xác Nhận Hủy Đặt Bàn"
        description="Theo chính sách câu lạc bộ, bạn chỉ có thể tự hủy trước giờ bắt đầu ít nhất 60 phút."
      >
        <div className="space-y-4 text-xs">
          {cancelError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300">
              {cancelError}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Lý do hủy đặt bàn:
            </label>
            <Input
              placeholder="VD: Thay đổi lịch trình bận việc..."
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
              isLoading={cancelMutation.isPending}
              disabled={!cancelReason.trim()}
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

      {/* QR Code Bill Modal */}
      <Modal
        isOpen={Boolean(qrModalBooking)}
        onClose={() => setQrModalBooking(null)}
        title={`Mã QR Hóa Đơn & Tra Cứu - ${qrModalBooking?.bookingCode}`}
      >
        <div className="text-center py-2 space-y-3">
          <div className="p-3 bg-white rounded-2xl inline-block shadow-xl shadow-emerald-950/40 border-2 border-emerald-500/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                typeof window !== "undefined"
                  ? `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH !== undefined ? process.env.NEXT_PUBLIC_BASE_PATH : "/huynhchivi/doan"}/live-bill?code=${encodeURIComponent(qrModalBooking?.bookingCode || "")}`
                  : `/live-bill?code=${encodeURIComponent(qrModalBooking?.bookingCode || "")}`
              )}`}
              alt="Mã QR Tra Cứu Bill"
              className="w-48 h-48 object-contain mx-auto"
            />
          </div>

          <p className="text-xs text-zinc-400">
            Dùng camera điện thoại quét mã QR để theo dõi chi tiết hóa đơn (Live Bill), thời gian chơi và mã VietQR thanh toán.
          </p>

          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-left text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Bàn:</span>
              <strong className="text-white">Bàn {qrModalBooking?.billiardTable?.tableNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Giờ đặt hẹn:</span>
              <span className="text-emerald-400 font-medium">
                {qrModalBooking?.startTime ? formatDateTimeVN(qrModalBooking.startTime) : ""}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            <Link
              href={`/live-bill?code=${encodeURIComponent(qrModalBooking?.bookingCode || "")}`}
              target="_blank"
            >
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 gap-1.5 text-xs h-9">
                <Receipt className="h-4 w-4" />
                Mở Xem Trực Tiếp
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9"
              onClick={() => setQrModalBooking(null)}
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

