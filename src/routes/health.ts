import { Request, Response, Router } from "express";

const router: Router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const data = {
    uptime: process.uptime(),
    message: 'Ok',
    date: new Date()
  }

  res.status(200).send(data);
});

export default router;
