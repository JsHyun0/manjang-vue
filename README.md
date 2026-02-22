# manjang-vue

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Environment Variables

Create `manjang-vue/.env` with:

```sh
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE=http://localhost:8000
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Run Frontend + Backend Together (Local)

From project root (`/Users/hyeonjiseung/dev/manjang`):

```sh
./dev-local.sh
```

This starts:
- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:5173`

Stop both with `Ctrl+C`.

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
