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
import { formatVND, formatDateTimeVN } from "@/lib/utils";
import {
  Award,
  Gift,
  Sparkles,
  Crown,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Flame,
} from "lucide-react";

export default function CustomerMembershipPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedGift, setSelectedGift] = useState<any | null>(null);
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState<string | null>(null);
  const [redeemErrorMsg, setRedeemErrorMsg] = useState<string | null>(null);

  // 1. Lấy thông tin thẻ thành viên & tiến trình thăng hạng
  const { data: memberData, isLoading: isLoadingCard } = useQuery({
    queryKey: ["my-membership-card"],
    queryFn: () => apiClient("/membership/my-card"),
  });

  // 2. Lấy danh sách quà đổi điểm
  const { data: gifts = [], isLoading: isLoadingGifts } = useQuery({
    queryKey: ["reward-gifts"],
    queryFn: () => apiClient("/membership/gifts"),
  });

  // 3. Lấy lịch sử đổi quà của khách
  const { data: myRedemptions = [] } = useQuery({
    queryKey: ["my-redemptions"],
    queryFn: () => apiClient("/membership/my-redemptions"),
  });

  // Mutation đổi quà
  const redeemMutation = useMutation({
    mutationFn: async (giftId: string) => {
      return apiClient("/membership/redeem", {
        method: "POST",
        body: JSON.stringify({ giftId, note: "Đổi quà trực tiếp từ cổng Hội Viên" }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-membership-card"] });
      queryClient.invalidateQueries({ queryKey: ["reward-gifts"] });
      queryClient.invalidateQueries({ queryKey: ["my-redemptions"] });
      setRedeemSuccessMsg(`Đổi thành công "${selectedGift?.name}"! Vui lòng liên hệ quầy thu ngân để nhận quà.`);
      setSelectedGift(null);
      setRedeemErrorMsg(null);
    },
    onError: (err: any) => {
      setRedeemErrorMsg(err.message || "Không thể đổi quà, vui lòng thử lại");
    },
  });

  const cardInfo = memberData?.user || user;
  const currentBenefit = memberData?.currentTierBenefit;
  const nextBenefit = memberData?.nextTierBenefit;
  const progressPercent = memberData?.progressToNextTier ?? 0;
  const spendNeeded = memberData?.spendNeededForNextTier ?? 0;

  const tierColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    STANDARD: {
      bg: "bg-zinc-800",
      text: "text-zinc-200",
      border: "border-zinc-700",
      gradient: "from-zinc-800 via-zinc-900 to-zinc-950",
    },
    SILVER: {
      bg: "bg-slate-700",
      text: "text-slate-100",
      border: "border-slate-500",
      gradient: "from-slate-700 via-slate-800 to-zinc-900",
    },
    GOLD: {
      bg: "bg-amber-900/60",
      text: "text-amber-200",
      border: "border-amber-500/70",
      gradient: "from-amber-600/40 via-yellow-700/30 to-zinc-950",
    },
    VIP: {
      bg: "bg-purple-900/60",
      text: "text-purple-200",
      border: "border-purple-500",
      gradient: "from-purple-700/50 via-indigo-900/40 to-zinc-950",
    },
  };

  const currentTier = (cardInfo?.membershipTier || "STANDARD") as string;
  const tierStyle = tierColors[currentTier] || tierColors.STANDARD;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="CUSTOMER" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Award className="h-6 w-6 text-emerald-400" />
              THẺ HỘI VIÊN & TÍCH ĐIỂM ĐỔI QUÀ
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              Xem hạng thẻ thành viên (Silver, Gold, VIP), tích lũy điểm thưởng sau mỗi trận chơi và đổi quà hấp dẫn.
            </p>
          </div>

          {redeemSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>{redeemSuccessMsg}</span>
              </div>
              <button onClick={() => setRedeemSuccessMsg(null)} className="text-emerald-400 hover:text-white font-bold ml-4">
                ✕
              </button>
            </div>
          )}

          {/* Membership Electronic Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* VIP Card Preview */}
            <div
              className={`lg:col-span-2 relative overflow-hidden rounded-2xl p-6 border ${tierStyle.border} bg-gradient-to-br ${tierStyle.gradient} shadow-2xl flex flex-col justify-between min-h-[220px]`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-400" />
                    <span className="text-xs font-black tracking-widest uppercase font-azonix text-white/90">
                      ROYAL BILLIARDS CLUB
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white mt-2 tracking-wide uppercase">
                    {cardInfo?.fullName || "Khách Hàng"}
                  </h2>
                  <p className="text-xs text-white/70 font-mono mt-0.5">
                    SĐT: {cardInfo?.phone || "Chưa cập nhật"}
                  </p>
                </div>

                <div className="text-right">
                  <Badge className="bg-white/20 text-white font-black px-3 py-1 text-xs border border-white/30 backdrop-blur-sm uppercase">
                    HẠNG {currentTier}
                  </Badge>
                  <div className="mt-3 text-right">
                    <div className="text-[10px] text-white/70 uppercase tracking-wider">Điểm tích lũy</div>
                    <div className="text-2xl font-black text-amber-300">
                      {cardInfo?.points?.toLocaleString("vi-VN") || 0} <span className="text-xs">PTS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer details */}
              <div className="pt-6 border-t border-white/10 mt-6 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-[10px] text-white/60">Tổng chi tiêu</div>
                  <div className="font-bold text-white">
                    {formatVND(Number(cardInfo?.totalSpending || 0))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/60">Tần suất chơi</div>
                  <div className="font-bold text-white">
                    {cardInfo?.visitCount || 0} lượt chơi
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/60">Ưu đãi giờ & F&B</div>
                  <div className="font-bold text-emerald-300">
                    Giảm -{currentBenefit?.discountTablePercent || 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Next Tier Progress Widget */}
            <Card className="border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Tiến Trình Thăng Hạng
                  </span>
                  <span className="text-emerald-400 font-black">{progressPercent}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-amber-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {nextBenefit ? (
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="text-zinc-400">
                      Chi tiêu thêm <strong className="text-amber-300 font-bold">{formatVND(spendNeeded)}</strong> để thăng hạng{" "}
                      <strong className="text-white uppercase font-black">{nextBenefit.tier}</strong>.
                    </p>
                    <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-300 space-y-1">
                      <div className="font-semibold text-emerald-400">Quyền lợi hạng {nextBenefit.tier}:</div>
                      <div>• Giảm {nextBenefit.discountTablePercent}% tiền giờ chơi</div>
                      <div>• Giảm {nextBenefit.discountServicePercent}% đồ ăn & thức uống</div>
                      <div>• Tích điểm x{nextBenefit.pointMultiplier} sau mỗi hóa đơn</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-lg bg-purple-950/30 border border-purple-800/50 text-xs text-purple-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>Chúc mừng! Bạn đã đạt hạng thành viên cao nhất (VIP Diamond)!</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Quy tắc: 10.000đ = 1 điểm</span>
                <span className="text-emerald-400 font-medium">Tự động cộng điểm khi thanh toán</span>
              </div>
            </Card>
          </div>

          {/* Reward Gifts Catalog */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Gift className="h-5 w-5 text-amber-400" />
                  ĐỔI QUÀ BẰNG ĐIỂM THƯỞNG
                </h3>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Dùng điểm tích lũy của bạn để đổi lấy giờ chơi miễn phí, nước ngọt, phụ kiện thi đấu chuyên nghiệp.
                </p>
              </div>

              <div className="text-xs text-zinc-400">
                Điểm khả dụng: <strong className="text-amber-400 text-sm">{cardInfo?.points || 0} PTS</strong>
              </div>
            </div>

            {isLoadingGifts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : gifts.length === 0 ? (
              <Card className="p-8 text-center border-zinc-800 bg-zinc-900/40">
                <Gift className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400 text-xs">Hiện chưa có phần quà đổi thưởng nào khả dụng.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gifts.map((gift: any) => {
                  const canRedeem = (cardInfo?.points || 0) >= gift.pointsRequired && gift.stockQuantity > 0;
                  return (
                    <Card
                      key={gift.id}
                      className="border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-sm">{gift.name}</h4>
                          <Badge className="bg-amber-500/20 text-amber-300 font-bold border-amber-500/30 shrink-0">
                            {gift.pointsRequired} PTS
                          </Badge>
                        </div>
                        <p className="text-zinc-400 text-xs mt-2 line-clamp-2">
                          {gift.description || "Quà tặng tri ân đặc quyền dành riêng cho hội viên."}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">
                          Còn lại: <strong className="text-zinc-300">{gift.stockQuantity}</strong> phần
                        </span>

                        <Button
                          size="sm"
                          disabled={!canRedeem || redeemMutation.isPending}
                          onClick={() => {
                            setSelectedGift(gift);
                            setRedeemErrorMsg(null);
                          }}
                          className={`text-xs font-semibold ${
                            canRedeem
                              ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                              : "bg-zinc-800 text-zinc-500 opacity-60"
                          }`}
                        >
                          <Gift className="h-3.5 w-3.5 mr-1" />
                          Đổi Quà
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Redemption History */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              LỊCH SỬ ĐỔI QUÀ CỦA BẠN
            </h3>

            {myRedemptions.length === 0 ? (
              <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 text-center text-xs text-zinc-500">
                Bạn chưa thực hiện yêu cầu đổi quà nào.
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Phần Quà</th>
                      <th className="p-3">Điểm Đã Dùng</th>
                      <th className="p-3">Thời Gian Đổi</th>
                      <th className="p-3">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {myRedemptions.map((red: any) => (
                      <tr key={red.id} className="hover:bg-zinc-800/30">
                        <td className="p-3 font-semibold text-white">{red.gift?.name}</td>
                        <td className="p-3 text-amber-300 font-bold">-{red.pointsSpent} PTS</td>
                        <td className="p-3 text-zinc-400">{formatDateTimeVN(red.createdAt)}</td>
                        <td className="p-3">
                          {red.status === "CLAIMED" ? (
                            <Badge variant="success">Đã Nhận Quà</Badge>
                          ) : (
                            <Badge variant="warning">Chờ Nhận Tại Quầy</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Redeem Confirmation Modal */}
          {selectedGift && (
            <Modal
              isOpen={!!selectedGift}
              onClose={() => setSelectedGift(null)}
              title="Xác Nhận Đổi Quà Thưởng"
            >
              <div className="space-y-4 text-xs">
                {redeemErrorMsg && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300">
                    {redeemErrorMsg}
                  </div>
                )}

                <p className="text-zinc-300">
                  Bạn có chắc chắn muốn dùng <strong className="text-amber-300 font-bold">{selectedGift.pointsRequired} điểm</strong> để đổi phần quà:
                </p>

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="font-bold text-white text-sm">{selectedGift.name}</div>
                  <div className="text-zinc-400 text-xs mt-1">{selectedGift.description}</div>
                  <div className="mt-3 flex items-center justify-between text-[11px] pt-3 border-t border-zinc-800 text-zinc-400">
                    <span>Điểm hiện có: <strong className="text-white">{cardInfo?.points || 0} PTS</strong></span>
                    <span>Điểm sau khi đổi: <strong className="text-emerald-400">{(cardInfo?.points || 0) - selectedGift.pointsRequired} PTS</strong></span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedGift(null)}>
                    Hủy Bỏ
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                    disabled={redeemMutation.isPending}
                    onClick={() => redeemMutation.mutate(selectedGift.id)}
                  >
                    {redeemMutation.isPending ? "Đang xử lý..." : "Xác Nhận Đổi Ngay"}
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </main>
    </div>
  );
}

