import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';

async function main() {
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`SIPERBUN API listening on http://localhost:${env.port}`);
    logger.info(`Swagger docs: http://localhost:${env.port}/api/docs`);
  });
}

main().catch(async (err) => {
  logger.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
