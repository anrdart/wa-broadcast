# Broadcasto

WhatsApp broadcast tool with Vue 3/Nuxt frontend and Supabase for data persistence and realtime sync.

## Setup

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# WhatsApp API
NUXT_PUBLIC_WHATSAPP_API_URL=http://localhost:3000
NUXT_PUBLIC_WHATSAPP_API_KEY=

# Supabase (required for data sync)
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Install Dependencies

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
