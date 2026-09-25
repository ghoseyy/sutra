# Dataset schema

The dataset lives in `src/data/sections/*.json`. Each file is one thematic section:

```json
{
  "section": "05-avatars",
  "nodes": [ /* Node objects */ ],
  "edges": [ /* Edge objects */ ]
}
```

`src/data/index.js` loads every section file automatically (`import.meta.glob`), merges them,
removes duplicate edges and computes each node's importance (degree). To add material, either
append to an existing section or drop a new `NN-name.json` file into `sections/`.

`src/data/registry.json` is the master list of ids. It is generated from `scripts/registry.txt`
and used by the validator. When you add a node, add its line to `registry.txt` too, then run
`npm run registry`.

Run `npm run validate` after any change to check the whole dataset.

## Node

| field | type | notes |
|---|---|---|
| `id` | string | kebab-case, unique, must match `registry.json` |
| `name` | string | common English/IAST-free spelling |
| `devanagari` | string | Sanskrit/Hindi name in Devanagari |
| `aliases` | string[] | other names and epithets (used by search) |
| `category` | string | a key of `CATEGORIES` in `meta.js` |
| `era` | string | an id from `ERAS` in `meta.js`: the **earliest text** where the figure appears |
| `group` | boolean | `true` for collective nodes (Adityas, Maruts, Matrikas, Navagraha…) |
| `description` | string | 2–3 sentences |
| `story` | string | one paragraph, 80–150 words, a key legend |
| `symbols` | string[] | iconographic attributes (may be empty) |
| `weapons` | string[] | (may be empty) |
| `vahana` | string \| null | mount |
| `abode` | string \| null | dwelling / loka / city |
| `sources` | string[] | primary texts, e.g. `"Rig Veda 1.32"`, `"Bhagavata Purana, Canto 7"`. Cite a chapter only when sure. |
| `variations` | string[] | differences between texts or regional traditions (empty if none) |
| `disputed` | boolean | `true` if the figure's textual basis is contested or late/regional |

## Edge

| field | type | notes |
|---|---|---|
| `source` | string | node id |
| `target` | string | node id |
| `type` | string | a key of `EDGE_TYPES` in `meta.js` |
| `label` | string | one-line explanation, e.g. "Narasimha killed Hiranyakashipu to protect Prahlada" |
| `disputed` | boolean? | optional; `true` when only some traditions attest the link |
| `variation` | string? | optional note on differing versions |

### Direction conventions (edge reads "source → target")

| type | meaning |
|---|---|
| `parent` | source is the **parent** of target (never write "child" edges) |
| `ancestor-of` | source is a distant ancestor of target (generations omitted in the data) |
| `spouse`, `sibling`, `enemy`, `ally` | symmetric, order does not matter |
| `slayer` | source killed target |
| `curse` | source cursed target |
| `boon` | source granted a boon to target |
| `avatar-of` | source is an avatar (incarnation) of target |
| `form-of` | source is a form / aspect / manifestation of target |
| `reincarnation-of` | source is the rebirth of target |
| `guru` | source is the teacher of target |
| `devotee` | source is a devotee of target |
| `vahana` | source is the mount of target |
| `created-by` | source was created, emanated or born (non-sexually) from target |
| `member-of` | source belongs to the group node target |
| `participated-in` | source (a character) took part in target (an event node) |
