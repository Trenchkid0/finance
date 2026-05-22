/**
 * Account detail — placeholder.
 *
 * AGENTS.md §6 specifies this dynamic route. Will display the account's
 * balance history and filtered transaction list.
 */
export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-3xl font-semibold text-text-primary mb-1">
        Detail akun
      </h1>
      <p className="text-sm text-text-muted mb-6 font-mono">{id}</p>
      <div className="bg-surface border border-border rounded-lg p-12 text-center">
        <p className="text-sm text-text-muted">
          Riwayat dan transaksi akun akan tampil di sini.
        </p>
      </div>
    </div>
  );
}
