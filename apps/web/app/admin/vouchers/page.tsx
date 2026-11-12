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
import { Ticket, Plus, Trash2, CheckCircle2, Clock, Percent, DollarSign, Tag } from "lucide-react";

export default function AdminVouchersPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED_AMOUNT">("PERCENT");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<number>(50000);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [applicableTo, setApplicableTo] = useState<string>("ALL");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Query vouchers list
  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: () => apiClient("/vouchers"),
  });

  // Mutation create voucher
  const createVoucherMutation = useMutation({
    mutationFn: async () => {
      return apiClient("/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name,
          discountType,
          discountValue: Number(discountValue),
          minOrderValue: Number(minOrderValue),
          maxDiscount: discountType === "PERCENT" && maxDiscount ? Number(maxDiscount) : undefined,
          usageLimit: usageLimit ? Number(usageLimit) : undefined,
          applicableTo,
          description,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setIsAddModalOpen(false);
      setCode("");
      setName("");
      setDescription("");
      setFormError(null);
    },
    onError: (err: any) => setFormError(err.message || "Lỗi khi tạo voucher"),
  });

  // Mutation toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiClient(`/vouchers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] }),
  });

  // Mutation delete voucher
  const deleteVoucherMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient(`/vouchers/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] }),
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="ADMIN" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                QUẢN LÝ VOUCHER & MÃ GIẢM GIÁ
              </h1>
              <p className="text-zinc-400 text-xs mt-1">
                Tạo mã khuyến mãi, thiết lập giảm giá theo % hoặc tiền cố định, giới hạn lượt dùng và đơn tối thiểu.
              </p>
            </div>

            <Button
              size="sm"
              className="gap-2 bg-emerald-600 font-semibold"
              onClick={() => {
                setIsAddModalOpen(true);
                setFormError(null);
              }}
            >
              <Plus className="h-4 w-4" />
              Tạo Voucher Mới
            </Button>
          </div>

          {/* Vouchers Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : vouchers.length === 0 ? (
            <Card className="text-center py-16 border-zinc-800 bg-zinc-900/40">
              <Ticket className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-300">Chưa có mã giảm giá nào</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-6">
                Tạo mã voucher để thu hút khách hàng và gia tăng doanh thu câu lạc bộ.
              </p>
              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                Tạo Voucher Đầu Tiên
              </Button>
            </Card>
          ) : (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[750px]">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3 whitespace-nowrap">Mã Voucher</th>
                      <th className="p-3 whitespace-nowrap">Tên Chương Trình</th>
                      <th className="p-3 whitespace-nowrap">Mức Giảm</th>
                      <th className="p-3 whitespace-nowrap">Đơn Tối Thiểu</th>
                      <th className="p-3 whitespace-nowrap">Áp Dụng</th>
                      <th className="p-3 whitespace-nowrap">Đã Dùng / Giới Hạn</th>
                      <th className="p-3 whitespace-nowrap">Trạng Thái</th>
                      <th className="p-3 text-right whitespace-nowrap">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {vouchers.map((vc: any) => (
                      <tr key={vc.id} className="hover:bg-zinc-800/30">
                        <td className="p-3 font-mono font-black text-emerald-400 whitespace-nowrap">{vc.code}</td>
                        <td className="p-3 font-semibold text-white whitespace-nowrap">{vc.name}</td>
                        <td className="p-3 font-bold text-amber-300 whitespace-nowrap">
                          {vc.discountType === "PERCENT"
                            ? `-${vc.discountValue}% (Tối đa ${formatVND(Number(vc.maxDiscount || 0))})`
                            : `-${formatVND(Number(vc.discountValue))}`}
                        </td>
                        <td className="p-3 text-zinc-300 whitespace-nowrap">{formatVND(Number(vc.minOrderValue || 0))}</td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant="outline">
                            {vc.applicableTo === "TABLE_ONLY"
                              ? "Chỉ Tiền Giờ"
                              : vc.applicableTo === "SERVICE_ONLY"
                              ? "Chỉ F&B"
                              : "Toàn Bộ Đơn"}
                          </Badge>
                        </td>
                        <td className="p-3 text-zinc-300 whitespace-nowrap">
                          <span className="font-bold text-white">{vc.usedCount}</span> /{" "}
                          {vc.usageLimit ? vc.usageLimit : "∞"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant={vc.isActive ? "success" : "default"}>
                            {vc.isActive ? "Hoạt động" : "Tạm dừng"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleActiveMutation.mutate({ id: vc.id, isActive: !vc.isActive })
                          }
                          className="h-7 text-[11px] px-2.5"
                        >
                          {vc.isActive ? "Tạm Dừng" : "Kích Hoạt"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa voucher ${vc.code}?`)) {
                              deleteVoucherMutation.mutate(vc.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-7 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Add Voucher Modal */}
          {isAddModalOpen && (
            <Modal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              title="Tạo Voucher Khuyến Mãi Mới"
            >
              <div className="space-y-4 text-xs">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Mã Voucher (Code):</label>
                    <Input
                      placeholder="VD: CHAOMUNG20"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Loại giảm giá:</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-800 px-3 text-zinc-200 text-xs"
                    >
                      <option value="PERCENT">Theo phần trăm (%)</option>
                      <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Tên chương trình khuyến mãi:</label>
                  <Input
                    placeholder="VD: Ưu đãi chào mừng khách mới"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      {discountType === "PERCENT" ? "Phần trăm giảm (%):" : "Số tiền giảm (VNĐ):"}
                    </label>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                    />
                  </div>
                  {discountType === "PERCENT" ? (
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">Giảm tối đa (VNĐ):</label>
                      <Input
                        type="number"
                        value={maxDiscount}
                        onChange={(e) => setMaxDiscount(Number(e.target.value))}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">Giá trị đơn tối thiểu (VNĐ):</label>
                      <Input
                        type="number"
                        value={minOrderValue}
                        onChange={(e) => setMinOrderValue(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Số lượt sử dụng tối đa:</label>
                    <Input
                      type="number"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Áp dụng cho:</label>
                    <select
                      value={applicableTo}
                      onChange={(e) => setApplicableTo(e.target.value)}
                      className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-800 px-3 text-zinc-200 text-xs"
                    >
                      <option value="ALL">Toàn bộ hóa đơn</option>
                      <option value="TABLE_ONLY">Chỉ tiền giờ chơi</option>
                      <option value="SERVICE_ONLY">Chỉ đồ ăn & nước uống (F&B)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Mô tả điều kiện:</label>
                  <Input
                    placeholder="Mô tả quyền lợi hoặc ghi chú thêm..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 font-bold"
                    isLoading={createVoucherMutation.isPending}
                    onClick={() => createVoucherMutation.mutate()}
                  >
                    Tạo Voucher
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

