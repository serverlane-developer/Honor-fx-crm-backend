import { Request, Response } from "express";

const getHealth = (req: Request, res: Response) => {
  const data = {
    uptime: process.uptime(),
    message: "Ok",
    date: new Date(),
  };
  res.status(200).send(data);
};

export default { getHealth };
