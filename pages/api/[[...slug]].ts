import type { NextApiRequest, NextApiResponse } from "next";
import { createApiApp } from "@/lib/server/expressApp";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const app = createApiApp();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return app(req, res);
}
