import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { ensureFuelRulesSeeded } from './services/fuelRules.service';

async function main() {
  await ensureFuelRulesSeeded();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`BPCL Cashback backend listening on port ${env.port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error starting server');
  process.exit(1);
});
