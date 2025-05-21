import { logger } from '@/util/Logger';

export async function execute(error: any) {
  logger.error("[ERROR]", error)
}
