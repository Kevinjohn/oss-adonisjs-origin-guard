# Public origin at startup

This AdonisJS starter reads `APP_URL` in `config/app.ts` and validates it with Origin Guard when the app boots. Give it the public origin visitors use, such as `https://app.example.com`. HTTP on loopback works for local development. A path, query string, or insecure production origin stops startup.

From this example directory, use Node 24 and pnpm 11.23.0:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
node ace generate:key --force
node ace codegen
node ace migration:run --force
pnpm dev
```

To check a deployment setting without starting a listening server, run `node ace list:routes` with the same environment. For example, `NODE_ENV=production APP_URL=https://app.example.com node ace list:routes` loads the routes, while setting `APP_URL=http://app.example.com` stops with an HTTPS configuration error.

The base is the [AdonisJS starter kits at 46d2359](https://github.com/adonisjs/starter-kits/tree/46d235932e3eb6472a16b740fa0b47b5f69fc6fc). This example installs the Origin Guard 0.2.0 release.
