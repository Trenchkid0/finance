"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronDown, Inbox, Loader2, Plus, Shield, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { createCategory, deleteCategory } from "@/app/actions/categories";
import type { ActionResult } from "@/types";
import type { CategoryTypeInput } from "@/lib/utils/validators";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiKeysCard } from "./ApiKeysCard";
import type { ApiKeyListItem } from "@/app/actions/api-keys";

interface CategoryItem {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  isDefault: boolean;
}

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
  } | null;
  categories: CategoryItem[];
  apiKeys: ApiKeyListItem[];
}

const PRESET_EMOJIS = [
  "🍔", "🚗", "🎮", "💡", "💰", "📈", "🛍️", "🏠",
  "🍕", "🏥", "📚", "✈️", "👔", "🎁", "☕",
];

export function SettingsClient({ user, categories, apiKeys }: Props) {
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CategoryItem | null>(null);
  const [type, setType] = useState<CategoryTypeInput>("expense");
  const [selectedEmoji, setSelectedEmoji] = useState(PRESET_EMOJIS[0]);

  const [state, formAction, pending] = useActionState<
    ActionResult<null> | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await createCategory(prev, formData);
    if (result.ok) {
      toast.success("Kategori kustom berhasil ditambahkan");
      setCreating(false);
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, undefined);

  const customCategories = categories.filter((c) => !c.isDefault);
  const defaultCategories = categories.filter((c) => c.isDefault);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-1">
          Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil pengguna dan kategori kustom keuangan Anda.
        </p>
      </div>

      {/* Profile Section */}
      <Card className="p-6">
        <h2 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
          <User size={14} /> Profil pengguna
        </h2>
        {user ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 text-primary font-semibold flex items-center justify-center text-sm">
              {user.name
                ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                : "U"}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{user.name ?? "User"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Gagal memuat profil pengguna.</p>
        )}
      </Card>

      {/* API keys (programatik / bot) */}
      <ApiKeysCard apiKeys={apiKeys} />

      {/* Categories */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-foreground flex items-center gap-2">
            <Shield size={14} /> Pengelolaan kategori
          </h2>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={12} /> Tambah kategori
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          Kategori default disediakan oleh sistem. Anda dapat menambahkan
          kategori kustom Anda sendiri.
        </p>

        <div className="space-y-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Kategori kustom
          </h3>
          {customCategories.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Belum ada kategori kustom"
              description="Klik tombol di atas untuk membuat kategori sendiri."
              size="sm"
              className="rounded-md border border-dashed border-border bg-elevated"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {customCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-elevated border border-border rounded-lg p-3 flex items-center justify-between hover:border-[#444C56] transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden>{cat.icon ?? "📂"}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {cat.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {cat.type === "expense" ? "Pengeluaran" : "Pemasukan"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setConfirmDelete(cat)}
                    className="h-7 w-7 hover:text-destructive"
                    aria-label={`Hapus ${cat.name}`}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 mt-8">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="group flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                aria-label="Tampilkan kategori sistem"
              >
                <ChevronDown
                  size={12}
                  className="transition-transform duration-200 -rotate-90 group-data-[state=open]:rotate-0"
                />
                Kategori sistem ({defaultCategories.length})
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                {defaultCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-elevated border border-border rounded-lg p-3 flex items-center gap-2"
                  >
                    <span aria-hidden>{cat.icon ?? "📂"}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground truncate">
                        {cat.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {cat.type === "expense" ? "Pengeluaran" : "Pemasukan"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Card>

      {/* Add modal */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah kategori baru</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form action={formAction} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label>Tipe kategori</Label>
                <ToggleGroup
                  type="single"
                  value={type}
                  onValueChange={(v) => v && setType(v as CategoryTypeInput)}
                  className="grid grid-cols-2 w-full"
                  aria-label="Tipe kategori"
                >
                  <ToggleGroupItem value="expense">Pengeluaran</ToggleGroupItem>
                  <ToggleGroupItem value="income">Pemasukan</ToggleGroupItem>
                </ToggleGroup>
                <input type="hidden" name="type" value={type} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nama kategori</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Mis. Makanan, Hadiah"
                  aria-invalid={!!state?.fieldErrors?.name}
                />
                {state?.fieldErrors?.name?.[0] ? (
                  <p className="text-xs text-destructive">
                    {state.fieldErrors.name[0]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="icon">Ikon</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="icon"
                    name="icon"
                    value={selectedEmoji}
                    onChange={(e) => setSelectedEmoji(e.target.value)}
                    maxLength={2}
                    className="w-12 text-center text-lg"
                  />
                  <span className="text-xs text-muted-foreground self-center">
                    Pilih preset di bawah atau ketik emoji.
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-8 h-8 rounded-md bg-elevated border flex items-center justify-center hover:bg-background transition-colors ${
                        selectedEmoji === emoji
                          ? "border-primary"
                          : "border-border"
                      }`}
                      aria-label={`Pilih emoji ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {state?.error && !state.fieldErrors ? (
                <p className="text-xs text-destructive">{state.error}</p>
              ) : null}

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={pending} className="flex-1">
                  {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Tambah kategori
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreating(false)}
                  disabled={pending}
                >
                  Batal
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDelete
        target={confirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ConfirmDelete({
  target,
  onClose,
}: {
  target: CategoryItem | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await deleteCategory(target.id);
      if (result.ok) {
        toast.success("Kategori berhasil dihapus");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal menghapus kategori");
      }
    });
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus kategori</DialogTitle>
          <DialogDescription>
            Transaksi yang menggunakan kategori ini akan dikosongkan kategorinya
            (data transaksi tetap aman).
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-foreground">
            Apakah Anda yakin ingin menghapus{" "}
            <span className="font-medium">&quot;{target?.name}&quot;</span>?
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Menghapus…" : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
