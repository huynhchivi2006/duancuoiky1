"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/utils";
import { Plus, Trash2, Edit, UtensilsCrossed, Check } from "lucide-react";

export default function AdminServicesPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"DRINK" | "FOOD" | "ACCESSORY">("DRINK");
  const [unitPrice, setUnitPrice] = useState<number>(20000);
  const [unit, setUnit] = useState("Lon");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => apiClient("/services", { params: { onlyActive: false } }),
  });

  const addServiceMutation = useMutation({
    mutationFn: async () => {
      return apiClient("/services", {
        method: "POST",
        body: JSON.stringify({
          code,
          name,
          category,
          unitPrice: Number(unitPrice),
          unit,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      setIsAddModalOpen(false);
      setCode("");
      setName("");
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(err.message || "Không thể thêm món"),
  });

  const updateServiceMutation = useMutation({
    mutationFn: async () => {
      return apiClient(`/services/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          category,
          unitPrice: Number(unitPrice),
          unit,
          isActive: editingItem.isActive,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      setEditingItem(null);
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(err.message || "Lỗi khi cập nhật món"),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => apiClient(`/services/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-services"] }),
  });

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setUnitPrice(Number(item.unitPrice));
    setUnit(item.unit);
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
              <h1 className="text-xl sm:text-2xl font-black text-white">MENU DỊCH VỤ & ĐỒ UỐNG</h1>
              <p className="text-zinc-400 text-xs mt-1">
                Quản lý danh mục nước giải khát, đồ ăn nhẹ và sửa đơn giá bán trực tiếp.
              </p>
            </div>

            <Button
              size="sm"
              className="gap-2 bg-emerald-600 font-semibold"
              onClick={() => {
                setCode("");
                setName("");
                setUnitPrice(20000);
                setUnit("Lon");
                setErrorMsg(null);
                setIsAddModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Thêm Món Mới
            </Button>
          </div>

          {/* Services Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3 whitespace-nowrap">Mã</th>
                      <th className="p-3 whitespace-nowrap">Tên Món / Dịch Vụ</th>
                      <th className="p-3 whitespace-nowrap">Phân Loại</th>
                      <th className="p-3 whitespace-nowrap">Đơn Giá Hiện Tại</th>
                      <th className="p-3 whitespace-nowrap">Đơn Vị</th>
                      <th className="p-3 whitespace-nowrap">Trạng Thái</th>
                      <th className="p-3 text-right whitespace-nowrap">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {services.map((s: any) => (
                      <tr key={s.id} className="hover:bg-zinc-900/50">
                        <td className="p-3 font-mono font-bold text-emerald-400 whitespace-nowrap">{s.code}</td>
                        <td className="p-3 font-semibold text-white whitespace-nowrap">{s.name}</td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge
                            variant={
                              s.category === "DRINK"
                                ? "info"
                                : s.category === "FOOD"
                                ? "warning"
                                : "default"
                            }
                          >
                            {s.category}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-emerald-400 text-sm whitespace-nowrap">
                          {formatVND(s.unitPrice)}
                        </td>
                        <td className="p-3 text-zinc-400 whitespace-nowrap">{s.unit}</td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant={s.isActive ? "success" : "danger"}>
                            {s.isActive ? "Đang bán" : "Ngừng bán"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2 gap-1"
                          onClick={() => openEditModal(s)}
                        >
                          <Edit className="h-3 w-3" />
                          Sửa Giá
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => {
                            if (confirm(`Ngừng kinh doanh món ${s.name}?`)) {
                              deleteServiceMutation.mutate(s.id);
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

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Món / Dịch Vụ Mới"
      >
        <div className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Mã món (VD: DRK06):</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DRK..."
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Tên món:</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cà phê sữa đá..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Phân loại:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
              >
                <option value="DRINK">Nước giải khát (DRINK)</option>
                <option value="FOOD">Đồ ăn nhanh (FOOD)</option>
                <option value="ACCESSORY">Phụ kiện & Cơ (ACCESSORY)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Đơn vị tính:</label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Lon / Chai / Dĩa..."
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Đơn giá bán (VNĐ):</label>
            <Input
              type="number"
              min={1000}
              step={1000}
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 font-semibold"
              isLoading={addServiceMutation.isPending}
              disabled={!code || !name}
              onClick={() => addServiceMutation.mutate()}
            >
              Lưu Món Mới
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal (Sửa Giá & Thông Tin Món) */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={`Sửa Giá & Món: ${editingItem?.name}`}
        description={`Mã món: ${editingItem?.code}`}
      >
        <div className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Tên món:</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Phân loại:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
              >
                <option value="DRINK">Nước giải khát (DRINK)</option>
                <option value="FOOD">Đồ ăn nhanh (FOOD)</option>
                <option value="ACCESSORY">Phụ kiện & Cơ (ACCESSORY)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Đơn vị tính:</label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Đơn giá bán mới (VNĐ):</label>
            <Input
              type="number"
              min={1000}
              step={1000}
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className="text-emerald-400 font-bold text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 font-semibold"
              isLoading={updateServiceMutation.isPending}
              disabled={!name}
              onClick={() => updateServiceMutation.mutate()}
            >
              Cập Nhật Giá Món
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
