import { logger } from '@/utils';

export async function execute(error: unknown) {
  logger.error('[ERROR]', error)
}
