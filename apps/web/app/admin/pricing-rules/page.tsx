"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatVND } from "@/lib/utils";
import { Plus, Trash2, Edit, Percent, Calendar, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminPricingRulesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<"SUNDAY_ONLY" | "WEEKEND" | "HOLIDAY" | "SPECIAL_DATE">("SUNDAY_ONLY");
  const [surchargePercent, setSurchargePercent] = useState<number>(20);
  const [fixedSurcharge, setFixedSurcharge] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["admin-pricing-rules"],
    queryFn: () => apiClient("/pricing-rules"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name,
        ruleType,
        surchargePercent: Number(surchargePercent),
        fixedSurcharge: Number(fixedSurcharge),
        description,
        isActive,
      };

      if (ruleType === "SUNDAY_ONLY") {
        payload.dayOfWeek = 0;
      }

      if (ruleType === "HOLIDAY" || ruleType === "SPECIAL_DATE") {
        if (!startDate || !endDate) {
          throw new Error("Vui lòng chọn ngày bắt đầu và kết thúc cho ngày Lễ/Tết");
        }
        payload.startDate = new Date(startDate).toISOString();
        payload.endDate = new Date(`${endDate}T23:59:59.999Z`).toISOString();
      }

      if (editingRule) {
        return apiClient(`/pricing-rules/${editingRule.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        return apiClient("/pricing-rules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-rules"] });
      closeModal();
    },
    onError: (err: any) => setErrorMsg(err.message || "Lỗi khi lưu quy tắc"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient(`/pricing-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pricing-rules"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiClient(`/pricing-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: active }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pricing-rules"] }),
  });

  const openAddModal = () => {
    setEditingRule(null);
    setName("");
    setRuleType("SUNDAY_ONLY");
    setSurchargePercent(20);
    setFixedSurcharge(0);
    setStartDate("");
    setEndDate("");
    setDescription("");
    setIsActive(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: any) => {
    setEditingRule(rule);
    setName(rule.name);
    setRuleType(rule.ruleType);
    setSurchargePercent(Number(rule.surchargePercent));
    setFixedSurcharge(Number(rule.fixedSurcharge));
    setStartDate(rule.startDate ? rule.startDate.slice(0, 10) : "");
    setEndDate(rule.endDate ? rule.endDate.slice(0, 10) : "");
    setDescription(rule.description || "");
    setIsActive(rule.isActive);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="ADMIN" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">BẢNG GIÁ & PHỤ THU NGÀY LỄ / CHỦ NHẬT</h1>
              <p className="text-zinc-400 text-xs mt-1">
                Thiết lập mức tăng giá tự động cho các ngày cao điểm: Chủ Nhật hàng tuần, Tết Nguyên Đán, Lễ 30/4 - 1/5.
              </p>
            </div>

            <Button size="sm" className="gap-2 bg-emerald-600 font-semibold" onClick={openAddModal}>
              <Plus className="h-4 w-4" />
              Thêm Quy Tắc Phụ Thu
            </Button>
          </div>

          {/* Quick Notice Banner */}
          <Card className="border-amber-900/40 bg-amber-950/20 p-4 text-xs text-amber-200/90 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Cơ chế tự động hóa:</strong> Khi khách hàng chơi vào ngày Chủ Nhật hoặc trong kỳ nghỉ Lễ/Tết đã kích hoạt, hệ thống sẽ tự động nhân tỷ lệ % phụ thu trên tiền giờ chơi và hiển thị chi tiết minh bạch trên hóa đơn của khách.
            </div>
          </Card>

          {/* Rules Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <Card className="p-8 text-center border-zinc-800 bg-zinc-900/40 text-xs text-zinc-400">
              Chưa có quy tắc phụ thu nào. Bấm &quot;Thêm Quy Tắc Phụ Thu&quot; để tạo mới.
            </Card>
          ) : (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3 whitespace-nowrap">Tên Quy Tắc</th>
                      <th className="p-3 whitespace-nowrap">Loại Áp Dụng</th>
                      <th className="p-3 whitespace-nowrap">Mức Phụ Thu</th>
                      <th className="p-3 whitespace-nowrap">Thời Gian / Chu Kỳ</th>
                      <th className="p-3 whitespace-nowrap">Trạng Thái</th>
                      <th className="p-3 text-right whitespace-nowrap">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {rules.map((rule: any) => (
                    <tr key={rule.id} className="hover:bg-zinc-900/40">
                      <td className="p-3 font-semibold text-white">
                        {rule.name}
                        {rule.description && (
                          <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                            {rule.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {rule.ruleType === "SUNDAY_ONLY"
                            ? "Chủ Nhật"
                            : rule.ruleType === "WEEKEND"
                            ? "Thứ 7 & CN"
                            : rule.ruleType === "HOLIDAY"
                            ? "Ngày Lễ / Tết"
                            : "Ngày Đặc Biệt"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-amber-400">
                          +{Number(rule.surchargePercent)}%
                        </span>
                        {Number(rule.fixedSurcharge) > 0 && (
                          <span className="text-zinc-400 text-[11px] block">
                            +{formatVND(rule.fixedSurcharge)}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-zinc-400 text-[11px]">
                        {rule.ruleType === "SUNDAY_ONLY" ? (
                          "Mỗi Chủ Nhật hàng tuần"
                        ) : rule.ruleType === "WEEKEND" ? (
                          "Thứ Bảy & Chủ Nhật hàng tuần"
                        ) : rule.startDate && rule.endDate ? (
                          `${new Date(rule.startDate).toLocaleDateString("vi-VN")} - ${new Date(
                            rule.endDate,
                          ).toLocaleDateString("vi-VN")}`
                        ) : (
                          "Không giới hạn"
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({ id: rule.id, active: !rule.isActive })
                          }
                          className="cursor-pointer"
                        >
                          <Badge variant={rule.isActive ? "success" : "danger"}>
                            {rule.isActive ? "ĐANG BẬT" : "ĐÃ TẮT"}
                          </Badge>
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => openEditModal(rule)}
                        >
                          <Edit className="h-3 w-3" />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                          onClick={() => {
                            if (confirm(`Bạn chắc chắn muốn xóa quy tắc: ${rule.name}?`)) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
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
        </div>
      </main>

      {/* Modal Thêm / Sửa Quy Tắc */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRule ? "Sửa Quy Tắc Phụ Thu" : "Thêm Quy Tắc Phụ Thu Mới"}
        description="Điều chỉnh giá giờ cho ca phục vụ ngày lễ Tết hoặc ngày cuối tuần"
      >
        <div className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Tên Quy Tắc:</label>
            <Input
              placeholder="VD: Phụ thu Chủ Nhật, Tết Nguyên Đán..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Loại Áp Dụng:</label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as any)}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              <option value="SUNDAY_ONLY">Riêng ngày Chủ Nhật hàng tuần</option>
              <option value="WEEKEND">Cuối tuần (Thứ Bảy & Chủ Nhật)</option>
              <option value="HOLIDAY">Ngày Lễ, Tết (theo khoảng ngày)</option>
              <option value="SPECIAL_DATE">Sự kiện đặc biệt</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">% Phụ Thu Trên Tiền Giờ:</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={surchargePercent}
                onChange={(e) => setSurchargePercent(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Phụ Thu Cố Định (VNĐ):</label>
              <Input
                type="number"
                min={0}
                step={5000}
                value={fixedSurcharge}
                onChange={(e) => setFixedSurcharge(Number(e.target.value))}
              />
            </div>
          </div>

          {(ruleType === "HOLIDAY" || ruleType === "SPECIAL_DATE") && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Từ ngày:</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Đến hết ngày:</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Mô Tả / Ghi Chú:</label>
            <Input
              placeholder="VD: Áp dụng phụ thu 15% vào ngày Chủ Nhật..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-0"
            />
            <label htmlFor="isActiveCheck" className="text-zinc-200 font-medium">
              Kích hoạt áp dụng quy tắc này ngay
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={closeModal}>
              Hủy Bỏ
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 font-semibold"
              isLoading={saveMutation.isPending}
              disabled={!name}
              onClick={() => saveMutation.mutate()}
            >
              {editingRule ? "Lưu Thay Đổi" : "Tạo Quy Tắc"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

