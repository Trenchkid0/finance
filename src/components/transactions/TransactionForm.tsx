"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Loader2, Sparkles, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import {
  createTransaction,
  updateTransaction,
} from "@/app/actions/transactions";
import { scanTransactionText } from "@/app/actions/ai";
import type { ActionResult } from "@/types";
import type { TransactionTypeInput } from "@/lib/utils/validators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

const LAST_USED_STORAGE_KEY = "maybe_finance_last_used_categories";

type LastUsedMap = Partial<Record<"income" | "expense", string>>;

function readLastUsed(): LastUsedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LAST_USED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LastUsedMap) : {};
  } catch {
    return {};
  }
}

function writeLastUsed(type: "income" | "expense", categoryId: string) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readLastUsed(), [type]: categoryId };
    localStorage.setItem(LAST_USED_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or storage disabled — silently ignore.
  }
}

/**
 * Shared transaction form — used by Add and Edit modals.
 *
 * Saat `aiScanEnabled=true` dan mode=create, header form berubah jadi
 * dua tab: "Manual" (default) dan "Scan AI" untuk parse teks struk
 * lewat DeepSeek. Hasil scan auto-fill state field, user tetap
 * memvalidasi dan klik "Tambah transaksi" sendiri.
 *
 * Type segmented control toggles which fields are shown:
 *  - income / expense: category dropdown
 *  - transfer: destination account dropdown (no category)
 */
export interface AccountOption {
  id: string;
  name: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
}

export interface TransactionFormInitial {
  id?: string;
  type: TransactionTypeInput;
  accountId: string;
  categoryId: string | null;
  transferToId: string | null;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  note: string;
}

interface Props {
  mode: "create" | "edit";
  initial: TransactionFormInitial;
  accounts: AccountOption[];
  categories: CategoryOption[];
  /** True kalau DEEPSEEK_API_KEY ter-set di server. Hanya relevan untuk create. */
  aiScanEnabled?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  mode,
  initial,
  accounts,
  categories,
  aiScanEnabled = false,
  onSuccess,
  onCancel,
}: Props) {
  const [type, setType] = useState<TransactionTypeInput>(initial.type);
  const [accountId, setAccountId] = useState(initial.accountId);
  const [categoryId, setCategoryId] = useState<string>(initial.categoryId ?? "");
  const [transferToId, setTransferToId] = useState<string>(initial.transferToId ?? "");
  const [amount, setAmount] = useState<string>(
    initial.amount > 0 ? String(initial.amount) : "",
  );
  const [date, setDate] = useState<string>(initial.date);
  const [description, setDescription] = useState<string>(initial.description);
  const [note, setNote] = useState<string>(initial.note);
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");

  // Smart default: pre-fill the category for create-mode by reading the
  // last-used category for the current type from localStorage. Also
  // clears stale categoryId when toggling between expense/income so the
  // Select doesn't keep an id from the wrong type.
  useEffect(() => {
    if (mode !== "create") return;
    if (type === "transfer") return;

    const matchesType = categories.some(
      (c) => c.id === categoryId && c.type === type,
    );
    if (categoryId && !matchesType) {
      setCategoryId("");
    }

    if (categoryId && matchesType) return;
    const last = readLastUsed()[type];
    if (last && categories.some((c) => c.id === last && c.type === type)) {
      setCategoryId(last);
    }
    // We intentionally rerun whenever `type` changes so switching the
    // segmented control surfaces the right pre-fill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, mode]);

  const action =
    mode === "edit" && initial.id
      ? updateTransaction.bind(null, initial.id)
      : createTransaction;

  const [state, formAction, pending] = useActionState<
    ActionResult<null> | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.ok) {
      // Persist the last-used category so the next create-mode form
      // pre-fills it automatically.
      if (type !== "transfer" && categoryId) {
        writeLastUsed(type, categoryId);
      }
      onSuccess();
    }
    return result;
  }, undefined);

  const filteredCategories = categories.filter((c) => c.type === type);

  /**
   * Apply AI scan candidate to the form state. Only fills slots that
   * the AI is confident about — empty/null answers leave existing
   * values alone so user input is never silently overwritten.
   */
  function applyAICandidate(candidate: {
    type: TransactionTypeInput;
    amount: number;
    date: string | null;
    description: string | null;
    accountId: string | null;
    transferToId: string | null;
    categoryId: string | null;
  }) {
    setType(candidate.type);
    setAmount(String(candidate.amount));
    if (candidate.date) setDate(candidate.date);
    if (candidate.description) setDescription(candidate.description);
    if (candidate.accountId) setAccountId(candidate.accountId);
    setTransferToId(candidate.transferToId ?? "");
    setCategoryId(candidate.categoryId ?? "");
    setActiveTab("manual");
  }

  const showTabs = mode === "create";

  const formContent = (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Type segmented control */}
      <div className="space-y-1.5">
        <Label>Tipe</Label>
        <ToggleGroup
          type="single"
          value={type}
          onValueChange={(v) => v && setType(v as TransactionTypeInput)}
          className="grid grid-cols-3 w-full"
          aria-label="Tipe transaksi"
        >
          <ToggleGroupItem value="expense">Pengeluaran</ToggleGroupItem>
          <ToggleGroupItem value="income">Pemasukan</ToggleGroupItem>
          <ToggleGroupItem value="transfer">Transfer</ToggleGroupItem>
        </ToggleGroup>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Jumlah</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!!state?.fieldErrors?.amount}
          />
          {state?.fieldErrors?.amount?.[0] ? (
            <p className="text-xs text-destructive">{state.fieldErrors.amount[0]}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Tanggal</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!!state?.fieldErrors?.date}
          />
          {state?.fieldErrors?.date?.[0] ? (
            <p className="text-xs text-destructive">{state.fieldErrors.date[0]}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accountId">{type === "transfer" ? "Dari akun" : "Akun"}</Label>
        <Select value={accountId} onValueChange={setAccountId} name="accountId" required>
          <SelectTrigger id="accountId" aria-invalid={!!state?.fieldErrors?.accountId}>
            <SelectValue placeholder="Pilih akun" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.fieldErrors?.accountId?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.accountId[0]}</p>
        ) : null}
      </div>

      {type === "transfer" ? (
        <div className="space-y-1.5">
          <Label htmlFor="transferToId">Ke akun</Label>
          <Select
            value={transferToId}
            onValueChange={setTransferToId}
            name="transferToId"
            required
          >
            <SelectTrigger id="transferToId" aria-invalid={!!state?.fieldErrors?.transferToId}>
              <SelectValue placeholder="Pilih akun tujuan" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.fieldErrors?.transferToId?.[0] ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.transferToId[0]}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Kategori</Label>
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            name="categoryId"
            required
          >
            <SelectTrigger id="categoryId" aria-invalid={!!state?.fieldErrors?.categoryId}>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.fieldErrors?.categoryId?.[0] ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.categoryId[0]}
            </p>
          ) : null}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="description">Deskripsi</Label>
        <Input
          id="description"
          name="description"
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mis. Kopi pagi"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Catatan (opsional)</Label>
        <Textarea
          id="note"
          name="note"
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          {mode === "edit" ? "Simpan perubahan" : "Tambah transaksi"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </form>
  );

  if (!showTabs) return formContent;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "manual" | "ai")}
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual">Manual</TabsTrigger>
        <TabsTrigger value="ai">
          <Sparkles size={12} />
          Scan AI
        </TabsTrigger>
      </TabsList>

      <TabsContent value="manual">{formContent}</TabsContent>

      <TabsContent value="ai">
        <AIScanPanel
          enabled={aiScanEnabled}
          onApply={applyAICandidate}
          accounts={accounts}
          categories={categories}
        />
      </TabsContent>
    </Tabs>
  );
}

// --- AI Scan Panel -------------------------------------------------------

interface AIPanelProps {
  enabled: boolean;
  onApply: (candidate: {
    type: TransactionTypeInput;
    amount: number;
    date: string | null;
    description: string | null;
    accountId: string | null;
    transferToId: string | null;
    categoryId: string | null;
  }) => void;
  accounts: AccountOption[];
  categories: CategoryOption[];
}

function AIScanPanel({ enabled, onApply, accounts, categories }: AIPanelProps) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<null | {
    type: TransactionTypeInput;
    amount: number;
    date: string | null;
    description: string | null;
    accountId: string | null;
    transferToId: string | null;
    categoryId: string | null;
    confidence: number;
    reasoning: string | null;
  }>(null);

  function handleScan() {
    if (!text.trim()) {
      toast.error("Tempel teks transaksi terlebih dahulu.");
      return;
    }
    startTransition(async () => {
      const result = await scanTransactionText(text);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPreview(result.candidate);
    });
  }

  function handleApply() {
    if (!preview) return;
    onApply(preview);
    toast.success("Form berhasil diisi dari hasil scan AI.");
    setPreview(null);
    setText("");
  }

  if (!enabled) {
    return (
      <div className="rounded-md border border-dashed border-border bg-elevated p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <p className="text-sm font-medium text-foreground">
            Scan AI belum aktif
          </p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Untuk mengaktifkan, tambahkan kunci API DeepSeek ke file{" "}
          <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono">
            .env
          </code>
          :
        </p>
        <pre className="bg-card border border-border rounded p-2 text-[11px] font-mono text-foreground overflow-x-auto">
          DEEPSEEK_API_KEY=&quot;sk-xxxxxxxxxxxxxxxx&quot;
        </pre>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Dapatkan kunci di{" "}
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            platform.deepseek.com/api_keys
          </a>
          , lalu restart dev server agar variabel terbaca.
        </p>
      </div>
    );
  }

  const accountName = (id: string | null) =>
    accounts.find((a) => a.id === id)?.name ?? null;
  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ai-text">Teks transaksi</Label>
        <Textarea
          id="ai-text"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={[
            "Contoh:",
            "BCA m-BCA 23/05 Tarik Tunai Rp250.000 di ATM Kuningan",
            "atau:",
            "Bayar Gojek GoFood Rp 87.500 - Burger King",
            "atau:",
            "Transfer dari BCA ke GoPay Rp 1.000.000 hari ini",
          ].join("\n")}
        />
        <p className="text-xs text-muted-foreground">
          Tempel SMS bank, notifikasi e-wallet, atau ringkasan struk. AI akan
          memilih akun dan kategori dari yang sudah Anda buat.
        </p>
      </div>

      <Button
        type="button"
        onClick={handleScan}
        disabled={pending || text.trim().length < 10}
        className="w-full"
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <WandSparkles size={14} />
        )}
        {pending ? "Memproses…" : "Scan dengan AI"}
      </Button>

      {preview ? (
        <div className="rounded-md border border-border bg-elevated p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" />
              Hasil deteksi AI
            </span>
            <Badge
              variant={preview.confidence >= 0.7 ? "income" : "outline"}
              className="font-mono"
            >
              {Math.round(preview.confidence * 100)}% yakin
            </Badge>
          </div>

          <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
            <PreviewRow label="Tipe" value={typeLabel(preview.type)} />
            <PreviewRow
              label="Jumlah"
              value={
                <span className="font-mono tabular-nums">
                  {preview.amount.toLocaleString("id-ID")}
                </span>
              }
            />
            <PreviewRow
              label="Tanggal"
              value={
                preview.date ? (
                  <span className="font-mono">{preview.date}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
            <PreviewRow
              label={preview.type === "transfer" ? "Dari" : "Akun"}
              value={
                accountName(preview.accountId) ?? (
                  <span className="text-muted-foreground">Tidak terdeteksi</span>
                )
              }
            />
            {preview.type === "transfer" ? (
              <PreviewRow
                label="Ke"
                value={
                  accountName(preview.transferToId) ?? (
                    <span className="text-muted-foreground">Tidak terdeteksi</span>
                  )
                }
              />
            ) : (
              <PreviewRow
                label="Kategori"
                value={
                  categoryName(preview.categoryId) ?? (
                    <span className="text-muted-foreground">Tidak terdeteksi</span>
                  )
                }
              />
            )}
            <PreviewRow
              label="Deskripsi"
              value={
                preview.description ?? (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
          </dl>

          {preview.reasoning ? (
            <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
              <span className="font-medium">AI:</span> {preview.reasoning}
            </p>
          ) : null}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="flex-1"
            >
              Pakai hasil ini
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPreview(null)}
            >
              Buang
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground truncate">{value}</dd>
    </>
  );
}

function typeLabel(t: TransactionTypeInput): string {
  if (t === "income") return "Pemasukan";
  if (t === "expense") return "Pengeluaran";
  return "Transfer";
}
