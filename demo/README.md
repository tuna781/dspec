# The demo recording

`../demo.gif` is produced from `demo.tape` by [vhs](https://github.com/charmbracelet/vhs):

```bash
cd demo && vhs demo.tape
```

Every command in the tape is real and runs against `shop/`, a small fixture codebase that carries a
real `.ds/` map. The numbers on screen — 12 files mentioning "discount" out of 15 — are whatever
`grep` actually returns. Nothing is staged, and nothing is edited into the gif afterwards.

**If you change `shop/`, re-run the tape** rather than touching the gif; the point of the recording
is that a viewer could type the same commands and see the same thing.

`shop/` is a fixture, not a product: a storefront checkout small enough to read in a few minutes
and realistic enough that "where is this decided?" is a genuine question. It exists so the
recording can show a map answering something a grep cannot — *why* a second discount code is
refused.

Neither this directory nor the gif ships to npm; `files` in `package.json` lists what does.
