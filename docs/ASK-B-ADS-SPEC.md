# Spec: b takes ad jobs in chat (for the bit-sign / Ask b session)

Owner, 23 Oct 2026: people "literally have agent b in their pockets", so an ad is ordered by talking to b and paying b in Bitcoin, not by filling in a form. badvertisingx.com is the shop window; the order happens in Ask b.

## Entry

- badvertisingx.com links to `https://web.bwalletx.com/m/ask-b?ask=<text>` (bwalletX PR #24). The text lands in b's composer; the user presses send. Example text: "Make me a 45-second ad film for my business."
- Agents call b's existing turn API with the same words.

## What b does

1. **Recognise an ad job:** ad film, brand kit, logo, share image, launch pack.
2. **Ask at most two questions:** what the brand is and what it's for, then where viewers should go. Use anything the user already said.
3. **Quote a fixed price** from the menu (owner sets the prices; draft in the plan doc https://claude.ai/artifact/GdTAXAddPcYyDNHamqXM3j): share image $5, logo $49, brand kit $149, ad film $249, launch pack $399. Show what's included, the two rounds of changes and the delivery time.
4. **Take payment on the normal one-sheet consent/pay sheet** (the same path as other paid b work, `paid.ts`). Half up front; all of it under $20. Pay to the bCorp standard receive address.
5. **Record the order** in `public.badx_briefs` (Hetzner Supabase, service role): `identity_key`, `job`, `brand`, `brief` (a summary of the chat), `status = 'in-progress'`. Add `txid` and `price_usd` columns in a migration if you take payment here.
6. **Tell the owner:** bit-sign can DM them directly (the same as `/api/bitsign/bwalletx/dm`). Text: who, what, price, txid, order id.
7. **Deliver in the same chat:** first frames or a first cut, take comments, revise, then post the final files and a share link. Take the balance before handing over the final files. Mark the order `delivered`.

## Rules

- Never promise a delivery date for work we can't do yet. Music videos, characters and sound design are gaps: say so.
- No money moves without the consent sheet. A link or a pasted brief never triggers payment.
- People and agents pay the same prices.
- Until the b-ad-film quality gate is passed (owner, 23 Oct), b may take briefs and quote but must **not take payment**. It says "we'll confirm your price within a day" and records the brief with status `received`.

## Who does the work

b runs the studio skills (b-bad, b-ad-film, b-brand-kit) with a person reviewing the result. Later, home operators on contracts are paid in BSV/MNEE per job (memory: agentic-workers).
