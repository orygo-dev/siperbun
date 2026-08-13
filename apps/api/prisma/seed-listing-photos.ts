import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/** Resolve image assets from Cursor assets folder via USERPROFILE */
function assetsDir() {
  return path.join(
    process.env.USERPROFILE || '',
    '.cursor',
    'projects',
    'c-Users-Baenk-s-Documents-siperbun',
    'assets',
  );
}

function pickImage(commodityName: string) {
  const n = commodityName.toLowerCase();
  if (n.includes('kopi')) return 'seedling-kopi.png';
  if (n.includes('lada')) return 'seedling-lada.png';
  return 'seedling-kelapa.png';
}

async function main() {
  const listings = await prisma.publicListing.findMany({
    where: { deletedAt: null },
    include: {
      commodity: { select: { name: true } },
      photos: true,
    },
  });

  if (listings.length === 0) {
    console.log('No listings found');
    return;
  }

  const storageRoot = path.resolve(process.cwd(), process.env.STORAGE_PATH || './storage');
  const listingsDir = path.join(storageRoot, 'listings');
  await fs.mkdir(listingsDir, { recursive: true });

  let attached = 0;

  for (const listing of listings) {
    if (listing.photos.length > 0) {
      console.log(`Skip (has photo): ${listing.title}`);
      continue;
    }

    const fileName = pickImage(listing.commodity.name);
    const src = path.join(assetsDir(), fileName);
    try {
      await fs.access(src);
    } catch {
      console.error(`Missing asset: ${src}`);
      continue;
    }

    const buffer = await fs.readFile(src);
    const storageName = `${uuidv4()}.png`;
    const relativePath = path.join('listings', storageName).replace(/\\/g, '/');
    const dest = path.join(storageRoot, relativePath);
    await fs.writeFile(dest, buffer);

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const stored = await prisma.storedFile.create({
      data: {
        originalName: fileName,
        storageName,
        mimeType: 'image/png',
        size: BigInt(buffer.length),
        sha256,
        path: relativePath,
      },
    });

    await prisma.publicListingPhoto.create({
      data: {
        listingId: listing.id,
        fileId: stored.id,
        caption: `Bibit ${listing.commodity.name}`,
        sortOrder: 0,
        isCover: true,
      },
    });

    attached += 1;
    console.log(`Attached ${fileName} → ${listing.title}`);
  }

  console.log(`Done. Attached photos to ${attached} listings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
