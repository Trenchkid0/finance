export default function ExpensesPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-text-primary mb-1">
        Pengeluaran
      </h1>
      <p className="text-sm text-text-muted mb-6">
        Distribusi pengeluaran per kategori dan anggaran.
      </p>
      <div className="bg-surface border border-border rounded-lg p-12 text-center">
        <p className="text-sm text-text-muted">
          Breakdown pengeluaran akan tampil di sini.
        </p>
      </div>
    </div>
  );
}
