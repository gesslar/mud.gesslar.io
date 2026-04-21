import {existsSync} from "node:fs"
import path from "node:path"

export default {
  plugins: [{
    name: "strict-apps-fallback",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if(req.url?.startsWith("/apps/")) {
          const urlPath = req.url.split("?")[0]
          const filePath = path.join(server.config.root, urlPath)

          if(!existsSync(filePath)) {
            res.statusCode = 404
            res.end(`Not Found: ${urlPath}`)

            return
          }
        }

        next()
      })
    }
  }]
}
