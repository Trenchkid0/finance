import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listApiKeys } from "@/app/actions/api-keys";
import { SettingsClient } from "@/components/settings/SettingsClient";

/**
 * Settings Page — Server Component.
 * Fetches user profile data and category lists from DB.
 */
export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Fetch all default and custom categories belonging to this user
  const [dbCategories, apiKeys] = await Promise.all([
    prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: {
        name: "asc",
      },
    }),
    listApiKeys(),
  ]);

  const categories = dbCategories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as "income" | "expense",
    icon: c.icon,
    isDefault: c.userId === null,
  }));

  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      }
    : null;

  return (
    <SettingsClient user={user} categories={categories} apiKeys={apiKeys} />
  );
}
