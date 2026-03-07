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
VITE_PUBLIC_SITE_URL=https://your-production-domain
```

관리자 계정은 별도 로그인 모드가 아니라, Supabase `public.users.role = 'admin'`인 이메일 계정으로 동일한 로그인 화면에서 로그인하면 자동으로 관리자 권한이 적용됩니다.

### Pre-create Admin Account

개발자가 회원가입 없이 관리자 계정을 미리 만들려면 아래 명령을 사용하세요.

```sh
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='change-this-password' \
ADMIN_NAME='관리자' \
ADMIN_STUDENT_ID='ADMIN0000' \
ADMIN_MAJOR='운영' \
npm run seed:admin
```

설명:
- `SUPABASE_URL`이 없으면 `.env/.env.local`의 `VITE_SUPABASE_URL`을 사용합니다.
- 계정이 이미 있으면 새로 만들지 않고 `public.users.role`을 `admin`으로 맞춥니다.
- 이후 일반 로그인 화면에서 해당 이메일/비밀번호로 로그인하면 관리자 모드가 자동 적용됩니다.

### Password Reset (Email)

- 로그인 화면의 `비밀번호를 잊으셨나요?` 버튼으로 재설정 메일을 발송할 수 있습니다.
- 메일 링크는 `/reset-password` 페이지로 이동해 새 비밀번호를 입력받습니다.
- 프론트엔드는 `VITE_PUBLIC_SITE_URL`이 있으면 해당 도메인으로, 없으면 현재 접속 도메인(`window.location.origin`)으로 리다이렉트 URL을 생성합니다.
- Supabase Dashboard > Authentication > URL Configuration에서 아래 URL을 Redirect URL에 포함해야 합니다.
  - 개발: `http://localhost:5173/reset-password`
  - 운영: `https://<your-domain>/reset-password`

### Supabase Email Redirect Checklist

- Supabase Dashboard > Authentication > URL Configuration > **Site URL**을 운영 도메인으로 설정하세요.
  - 예: `https://<your-domain>`
- **Redirect URLs**에 운영/개발 URL을 모두 등록하세요.
  - `https://<your-domain>/login`
  - `https://<your-domain>/reset-password`
  - `http://localhost:5173/login`
  - `http://localhost:5173/reset-password`
- Vercel/Netlify 등 배포 환경 변수에 `VITE_PUBLIC_SITE_URL=https://<your-domain>`를 설정하고 재배포하세요.

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
