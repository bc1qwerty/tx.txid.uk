# tx.txid.uk

## Language
- Respond in Korean (한국어로 응답)

## Project Overview
Bitcoin transaction explorer subdomain. Allows users to look up and inspect Bitcoin transactions, blocks, and addresses with decoded details. Shows recent broadcast history. Multilingual (EN/KO/JA).

## Tech Stack
- **Framework**: Astro 6 (static output)
- **UI**: @txid/ui shared components (local file dependency)
- **Language**: TypeScript
- **Deployment**: Cloudflare Pages

## Directory Structure
```
src/
  components/
    RecentBroadcasts.astro  # Recent TX broadcast list
  data/              # Static data files
  layouts/           # Page layouts
  pages/
    [lang]/
      index.astro    # Explorer interface
    index.astro      # Root redirect
  styles/            # Global styles
packages/
  txid-ui/           # Local copy of @txid/ui
public/              # Static assets
```

## Key Commands
```bash
npm run dev        # Local dev server
npm run build      # Build static site
npm run deploy     # Build + wrangler deploy + notify
npm run preview    # Preview built site
```

## Deployment
- **Platform**: Cloudflare Pages
- **Project**: `tx-txid-uk`
- **Branch**: main (MUST use --branch=main)
- **Output**: `dist/`

## Notes
- Transaction/block/address API calls are proxied through txid.uk Cloudflare Functions (see txid.uk-astro/functions/)
- Client-side fetches go to `https://txid.uk/tx/`, `https://txid.uk/block/`, `https://txid.uk/address/`

## Related Projects
- **txid.uk-astro**: provides the backend Functions for blockchain data
- **tools.txid.uk**: complementary developer tools (script decoder, PSBT editor)
- **@txid/ui**: shared component library
