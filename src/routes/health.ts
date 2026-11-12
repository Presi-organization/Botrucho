import { Request, Response, Router } from 'express';

export function createHealthRoute(isReady: () => boolean): Router {
  const router: Router = Router();

  router.get('/', (_req: Request, res: Response): void => {
    const data = {
      uptime: process.uptime(),
      message: isReady() ? 'Ready' : 'Not ready',
      date: new Date(),
    };

    res.status(data.message === 'Ready' ? 200 : 503).send(data);
  });

  return router;
}
