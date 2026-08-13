/**
 * Migrasi in-place: 8 role → 5 role tanpa wipe data bisnis.
 * Jalankan: pnpm exec tsx prisma/migrate-roles.ts
 */
import {
  LEGACY_ROLE_MAP,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  ROLES,
} from '@siperbun/shared';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLE_PERMS = ROLE_PERMISSIONS;

async function ensureRole(slug: string, name: string) {
  return prisma.role.upsert({
    where: { slug },
    create: { slug, name, description: name },
    update: { name, description: name },
  });
}

async function syncRolePermissions(roleId: string, keys: string[]) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  const perms = await prisma.permission.findMany({
    where: { key: { in: keys } },
  });
  if (!perms.length) return;
  await prisma.rolePermission.createMany({
    data: perms.map((p) => ({ roleId, permissionId: p.id })),
    skipDuplicates: true,
  });
}

async function main() {
  console.log('Migrating roles → 5 role model…');

  for (const slug of Object.values(ROLES)) {
    const role = await ensureRole(slug, ROLE_LABELS[slug]);
    await syncRolePermissions(role.id, ROLE_PERMS[slug] ?? []);
    console.log(`  ✓ ${slug}`);
  }

  const allRoles = await prisma.role.findMany();
  const bySlug = Object.fromEntries(allRoles.map((r) => [r.slug, r]));

  let remapped = 0;
  for (const [legacy, target] of Object.entries(LEGACY_ROLE_MAP)) {
    const oldRole = bySlug[legacy];
    const newRole = bySlug[target];
    if (!oldRole || !newRole) continue;

    const links = await prisma.userRole.findMany({
      where: { roleId: oldRole.id },
    });
    for (const link of links) {
      const already = await prisma.userRole.findFirst({
        where: { userId: link.userId, roleId: newRole.id },
      });
      if (!already) {
        await prisma.userRole.create({
          data: { userId: link.userId, roleId: newRole.id },
        });
      }
      await prisma.userRole.delete({
        where: {
          userId_roleId: { userId: link.userId, roleId: oldRole.id },
        },
      });
      remapped += 1;
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: oldRole.id } });
    await prisma.role.delete({ where: { id: oldRole.id } });
    console.log(`  removed legacy ${legacy} → ${target} (${links.length} users)`);
  }

  const renames: Array<{ from: string; to: string; name: string }> = [
    {
      from: 'kepala@siperbun.local',
      to: 'pimpinan@siperbun.local',
      name: 'Pimpinan Dinas',
    },
  ];
  for (const r of renames) {
    const u = await prisma.user.findUnique({ where: { email: r.from } });
    if (!u) continue;
    const clash = await prisma.user.findUnique({ where: { email: r.to } });
    if (clash) {
      console.log(`  skip rename ${r.from} (target exists)`);
      continue;
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { email: r.to, name: r.name },
    });
    console.log(`  renamed ${r.from} → ${r.to}`);
  }

  for (const email of [
    'uptd@siperbun.local',
    'koordinator@siperbun.local',
    'adminkab1@siperbun.local',
    'adminkab2@siperbun.local',
  ]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) continue;
    await prisma.user.update({
      where: { id: u.id },
      data: { isActive: false },
    });
    console.log(`  deactivated ${email}`);
  }

  for (const [email, name] of [
    ['admin1@siperbun.local', 'Admin Operasional 1'],
    ['admin2@siperbun.local', 'Admin Operasional 2'],
  ] as const) {
    await prisma.user.updateMany({
      where: { email },
      data: { name },
    });
  }

  console.log(`Done. Remapped ${remapped} user-role links.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
