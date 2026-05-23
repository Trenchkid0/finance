"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Copy,
  Inbox,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  createApiKey,
  deleteApiKey,
  revokeApiKey,
  type ApiKeyListItem,
} from "@/app/actions/api-keys";
import { formatDate } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

interface Props {
  apiKeys: ApiKeyListItem[];
}

/**
 * Manajemen API key untuk akses programatik (bot, integrasi).
 *
 * Plain key SEKALI saja dimunculkan saat baru dibuat, lewat dialog
 * "PlainKeyDialog". Setelah ditutup, hanya prefix yang tersimpan dan
 * tidak bisa dilihat lagi — user wajib salin dulu.
 */
export function ApiKeysCard({ apiKeys }: Props) {
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{
    plain: string;
    name: string;
  } | null>(null);

  const activeCount = apiKeys.filter((k) => !k.revokedAt).length;

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-foreground flex items-center gap-2">
            <KeyRound size={14} /> Kunci API
          </h2>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={12} /> Buat kunci
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Kunci API dipakai untuk akses programatik (mis. bot Telegram,
          script otomasi). Kirim header{" "}
          <code className="bg-elevated px-1.5 py-0.5 rounded text-foreground font-mono">
            Authorization: Bearer &lt;kunci&gt;
          </code>{" "}
          ke <code className="font-mono">/api/v1/*</code>. Kunci hanya
          ditampilkan sekali — simpan baik-baik setelah dibuat.
        </p>

        {apiKeys.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Belum ada kunci"
            description="Buat kunci pertama untuk mulai mengintegrasikan bot atau otomasi."
            size="sm"
            className="rounded-md border border-dashed border-border bg-elevated"
          />
        ) : (
          <ul className="space-y-2">
            {apiKeys.map((key) => (
              <ApiKeyRow key={key.id} item={key} />
            ))}
          </ul>
        )}

        {activeCount >= 10 ? (
          <p className="text-xs text-warning mt-3">
            Sudah ada 10 kunci aktif (batas maksimal). Cabut yang tidak dipakai
            untuk membuat kunci baru.
          </p>
        ) : null}
      </Card>

      <CreateKeyDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(name, plain) => {
          setCreating(false);
          setNewKey({ name, plain });
        }}
      />

      <PlainKeyDialog
        target={newKey}
        onClose={() => setNewKey(null)}
      />
    </>
  );
}

// --- Single row ----------------------------------------------------------

function ApiKeyRow({ item }: { item: ApiKeyListItem }) {
  const [pending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] =
    useState<"revoke" | "delete" | null>(null);

  const isRevoked = !!item.revokedAt;

  function handleConfirm() {
    if (!confirmAction) return;
    startTransition(async () => {
      const result =
        confirmAction === "delete"
          ? await deleteApiKey(item.id)
          : await revokeApiKey(item.id);
      if (result.ok) {
        toast.success(
          confirmAction === "delete" ? "Kunci dihapus" : "Kunci dicabut",
        );
        setConfirmAction(null);
      } else {
        toast.error(result.error ?? "Gagal memproses permintaan.");
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-elevated px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">
            {item.name}
          </p>
          {isRevoked ? (
            <Badge variant="outline" className="font-normal">
              Dicabut
            </Badge>
          ) : (
            <Badge variant="income" className="font-normal">
              Aktif
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          {item.prefix}…••••••••
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Dibuat {formatDate(item.createdAt)}
          {item.lastUsedAt
            ? ` · Terakhir dipakai ${formatDate(item.lastUsedAt)}`
            : " · Belum pernah dipakai"}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!isRevoked ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setConfirmAction("revoke")}
            aria-label="Cabut kunci"
            title="Cabut kunci"
          >
            <XCircle size={14} />
          </Button>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 hover:text-destructive"
          onClick={() => setConfirmAction("delete")}
          aria-label="Hapus kunci"
          title="Hapus permanen"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "delete" ? "Hapus kunci" : "Cabut kunci"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "delete"
                ? "Kunci akan dihapus permanen dari sistem. Aksi ini tidak bisa dibatalkan."
                : "Kunci akan langsung tidak valid. Anda bisa menghapusnya sepenuhnya nanti."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-foreground">
              <span className="font-medium">{item.name}</span>{" "}
              <span className="text-muted-foreground font-mono">
                ({item.prefix}…)
              </span>
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmAction(null)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending
                ? "Memproses…"
                : confirmAction === "delete"
                  ? "Hapus"
                  : "Cabut"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

// --- Create dialog -------------------------------------------------------

function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string, plain: string) => void;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createApiKey(name);
      if (!result.ok) {
        setError(result.fieldErrors?.name?.[0] ?? result.error ?? "Gagal membuat kunci.");
        return;
      }
      const created = result.data;
      if (created) {
        toast.success("Kunci API berhasil dibuat");
        onCreated(name, created.plain);
        reset();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat kunci API baru</DialogTitle>
          <DialogDescription>
            Beri nama yang membantu Anda mengingat di mana kunci ini dipakai.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Nama kunci</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Telegram bot personal"
                maxLength={64}
                autoFocus
                aria-invalid={!!error}
              />
              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Buat kunci
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset();
                  onClose();
                }}
                disabled={pending}
              >
                Batal
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

// --- Plain key reveal dialog --------------------------------------------

function PlainKeyDialog({
  target,
  onClose,
}: {
  target: { name: string; plain: string } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.plain);
      setCopied(true);
      toast.success("Kunci disalin ke clipboard");
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error("Gagal menyalin. Salin manual dari kotak teks.");
    }
  }

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(o) => {
        if (!o) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salin kunci sekarang</DialogTitle>
          <DialogDescription>
            Ini satu-satunya kesempatan untuk menyalin kunci. Setelah dialog
            ditutup, kunci tidak bisa dilihat lagi.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {target ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Untuk kunci{" "}
                <span className="text-foreground font-medium">
                  {target.name}
                </span>
                :
              </p>
              <div className="rounded-md border border-border bg-elevated p-3 flex items-start gap-2">
                <code className="text-xs font-mono text-foreground break-all flex-1">
                  {target.plain}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={handleCopy}
                  aria-label="Salin kunci"
                >
                  {copied ? (
                    <Check size={14} className="text-income" />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Pakai sebagai header{" "}
                <code className="bg-elevated px-1.5 py-0.5 rounded text-foreground font-mono">
                  Authorization: Bearer {target.plain.slice(0, 12)}…
                </code>
              </p>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>Saya sudah menyalin</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
