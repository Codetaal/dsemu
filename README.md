# CramBoy

A Nintendo DS player for iPhone (web app) that shows Pokémon HeartGold/SoulSilver and Black/White
dialogue as tappable Korean subtitles. Tap a word: the game pauses, you get the
dictionary entry, and ☆ Save keeps it with its sentence. Saved words export to Anki.

## Use it
1. Host the `docs/` folder on any HTTPS static host (GitHub Pages works).
2. On iPhone, open the site in Safari → Share → **Add to Home Screen**, then open it from there.
3. **Open ROM file…** and pick your Korean HeartGold dump (`.nds`, decrypted). It's stored on
   the phone, so next time you just tap **Continue**.
4. Moving saves from ds.44670.org: in the old app, Settings → Backup (gives a `.dsz` file).
   In this app, ☰ → Import save.

## How the subtitles work
`docs/kr/reader.js` scans the DS's 4 MB main RAM ~7 times a second for the game's
`String` objects (magic `0xB6F8D2EC`, per the pret/pokeheartgold decompilation) and
finds the one being typed by looking for the text printer's pointer into it. It needs
no game-specific addresses and shows only the text typed so far.

- `docs/kr/table.js` Gen 4 character table incl. 2,406 Hangul (from PKHeX)
- `docs/kr/lookup.js` strips particles and verb endings (피카츄가 → 피카츄, 나타났다 → 나타나다)
- `docs/kr/dict.json` kengdic + official Korean/English Pokémon, move, item, ability and place names
- `docs/kr/ui.js` subtitle bar, word card, saved words, recent text

## Emulator
`emulator/build.sh` compiles [desmume-wasm](https://github.com/44670/desmume-wasm)
(GPL-2.0, pinned commit) with Emscripten 3.1.25 into `docs/build/`. Changes vs upstream
are in `emulator/extra/`: `main.cpp` without the unused `eval` hook, plus small stubs
for symbols the upstream tree leaves undefined, and save-state functions (`stateSave`,
`stateLoad`, …) for the experimental Resume feature. `extra/patches/apply.sh` fixes three
upstream bugs that crashed loading a save state; `build.sh` applies it. `docs/emu.js` is a new frontend.

## Tests
`node tests/reader.test.js`, `node tests/lookup.test.js` and `node tests/ja-lookup.test.js`.

Styles use Tailwind CSS: after changing classes in `docs/index.html`, `docs/emu.js` or
`docs/kr/ui.js`, run `npm install` once and then `npm run build:css` to regenerate `docs/tw.css`.

## Licences
GPL-3.0-or-later (see LICENSE). Includes desmume (GPL-2.0-or-later), PKHeX data
(GPL-3.0), kengdic (MPL-2.0 / LGPL-2.0+) and Heroicons (MIT, notice in docs/icons.js) and Tailwind CSS (MIT). Play only games you own.

## Japanese games
Japanese games (region letter `J` in the game code) are read in Japanese: the DS itself is set to
Japanese, the reader looks for kana/kanji, and words are looked up in `docs/kr/ja-dict.json`, built by
`tools/build_ja_dict.py` from [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) (© EDRDG,
CC BY-SA 4.0; this derived file is under the same licence) plus Japanese Pokémon names from PKHeX.
`docs/kr/ja-lookup.js` turns inflected words back into their dictionary form and splits text into words.
