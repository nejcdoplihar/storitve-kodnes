This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Varnostni model in AI-agent integracija

Sistem ima **tri ločene kanale avtentikacije** — vsak z najmanjšimi potrebnimi pravicami.

### 1) Dashboard seja (uporabniki)
- Ob prijavi (`/api/login`) se izda **podpisan JWT** v piškotku `dashboard_session`
  (HS256, ključ `SESSION_SECRET`), z veljavnostjo 7 dni (30 z „zapomni si me").
- `middleware.ts` in občutljive poti **preverijo podpis JWT** prek `lib/session.ts`
  (`verifySession`) — ne le prisotnost piškotka.
- Stari piškotek `dashboard_auth` obstaja le zaradi kompatibilnosti in se **ne**
  uporablja za zaščito. `/api/logout` počisti oba.

### 2) AI agent — BRANJE
- Ločen token **`AGENT_API_TOKEN`** (glava `Authorization: Bearer …`) za endpointe
  pod **`/api/agent/*`** (`lib/agentAuth.ts`). Samo branje, brez pisanja.

### 3) AI agent — PISANJE
- Ločen token **`AGENT_WRITE_TOKEN`**, sprejet le na **poslovnih mutacijskih poteh**
  (`lib/agentWriteAuth.ts` → `resolveActor`), in uporabljen **šele po človeški
  potrditvi** (glej „Model potrditev"). V avdit (`lib/activityLog.ts`) se agent
  zabeleži kot `AI agent`.

### Okoljske spremenljivke (`.env.local`)
```
SESSION_SECRET=…              # podpis sejnega JWT (obstoječe)
WP_APP_USER=…                 # WP Application Password (obstoječe)
WP_APP_PASSWORD=…
NEXT_PUBLIC_WORDPRESS_URL=…   # headless WP
AGENT_API_TOKEN=…             # agentovo BRANJE
AGENT_WRITE_TOKEN=…           # agentovo PISANJE (ločen od bralnega)
```

### Zaščita po skupinah poti
| Skupina | Zaščita | Kdo sme |
|---|---|---|
| `/admin/*` (strani) | `middleware.ts` → podpis JWT | prijavljeni |
| Poslovne mutacije: `narocnik`, `stranka`, `ponudba`, `opravilo`, `licenca`, `delete`, `podaljsaj` | `resolveActor` | seja **ali** `AGENT_WRITE_TOKEN` |
| Uporabniške/bralne: `profile`, `profile/password`, `media/upload`, `activity`, `me` | `getSessionUser` / `verifySession` | **samo seja** (agent izključen) |
| Bralni agent API: `/api/agent/*` | `agentAuthorized` | `AGENT_API_TOKEN` |

### AI-agent bralni endpointi (read-only)
`GET /api/agent/clients` · `/clients/:id` · `/services/expiring?days=` ·
`/finance/summary` · `/tasks` · `/offers`.
Berejo **sveže** (no-store) prek `lib/agentData.ts` + `lib/agentReports.ts` — ista
poslovna logika kot dashboard (brez podvajanja).

### Interna stran
`/admin/agent` — strežniška stran s pregledi (finance, bližnji poteki) za
prijavljene uporabnike; računa se znotraj prijave, **brez tokena**.

### Model potrditev (pisanje »human-in-the-loop«)
Agent **nikoli ne piše neposredno**. Predlaga spremembo → človek jo pregleda in
potrdi (nabiralnik odobritev `/admin/odobritve`) → šele nato se pošlje na
mutacijsko pot z `AGENT_WRITE_TOKEN`. Tako človek ostane v zanki za vsako spremembo.

---

## Objava (deploy) — checklist

Dashboard teče na **Vercel** (`admin.kodnes.com`), WordPress na ločenem strežniku.
Za objavo integracije:

### 1) Vercel — okoljske spremenljivke
Project → Settings → Environment Variables (za Production):
```
SESSION_SECRET, WP_APP_USER, WP_APP_PASSWORD, NEXT_PUBLIC_WORDPRESS_URL   # obstoječe
AGENT_API_TOKEN        # agentovo BRANJE (/api/agent/*)
AGENT_WRITE_TOKEN      # agentovo PISANJE (odobritve → zapis)
ANTHROPIC_API_KEY      # dashboard AI klepet (/admin/chat) — brez njega vrne 500
```
Vrednosti `AGENT_API_TOKEN` / `AGENT_WRITE_TOKEN` morajo biti iste tudi v agentovem
`.env` (langchain-agent), če uporabljaš tudi zunanji Python agent.

> **AI klepet (`/api/agent/chat`)** ima `maxDuration = 60` (orodna zanka je lahko
> daljša). To zahteva **Vercel Pro / Fluid Compute**; na Hobby je meja 10 s in
> daljši klepet lahko poteče.

### 2) WordPress — mu-plugin
Kopiraj `wp-mu-plugin/agent-actions.php` v `wp-content/mu-plugins/` na WP strežniku
(registrira CPT `agent_action` za nabiralnik odobritev).

### 3) Objava kode
`git push` v `main` → Vercel samodejno zgradi in objavi. Preveri, da build uspe.

### 4) Agent (langchain-agent)
V `.env`: `API_BASE_URL=https://admin.kodnes.com` (produkcija) ali
`http://localhost:3000` (razvoj).

### 5) Preveri po objavi
- `/admin/agent` (AI pregledi), `/admin/odobritve` (Odobritve) in `/admin/chat`
  (AI klepet) se odprejo za prijavljene.
- V klepetu vprašaj npr. »finančni pregled« → odgovori z živimi podatki.
- Agent zna ustvariti predlog (npr. »dodaj opravilo …«); pojavi se v Odobritvah,
  po potrditvi se zapiše.

> Opomba: preveri, da se `next.config.ts` → `images.remotePatterns.hostname`
> ujema s tvojo WP domeno (npr. `storitve.kodnes.com`), sicer `next/image` ne bo
> nalagal WP slik.

