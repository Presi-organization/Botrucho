import { Router, Request, Response } from "express";

const router = Router()

router.get('/', (_req: Request, res: Response) => {
    const data = {
        uptime: process.uptime(),
        message: 'Ok',
        date: new Date()
    }

    res.status(200).send(data);
});

export default router;
