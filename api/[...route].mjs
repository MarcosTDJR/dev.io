import { app } from "../server/index.mjs"

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
}

export default function handler(req, res) {
  return app(req, res)
}
