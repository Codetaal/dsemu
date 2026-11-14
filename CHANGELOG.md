# Changelog

CramBoy uses [semantic versioning](https://semver.org): patch = fixes, minor = new features, major = big changes.

## 0.8.0
- New Review: your saved words come back for review (after 1, 3, 7, 14 and 30 days). Each card shows the sentence from the game, the place and a snapshot of the screen from when you saved the word. "Got it" after the last step makes the word Known. Find it in the words sheet (Review tab) or in the menu (Review words).
- Saved words: tap a word in the list to open it (meaning, hear it, New / Learning / Known).
- Portrait and landscape now share one controls system; only sizes and positions differ.
- New icons: an academic cap on the translate button, a fingerprint on the hide-controls button, and the CramLab logo redrawn in the CramBoy pixel style.

## 0.7.0
- Landscape gets the portrait touch controls: the D-pad follows your thumb, you can slide between the face buttons, and pressing between two presses both.
- Landscape gets the hide-controls button (in the middle, above the translate button); the handle at the bottom brings the controls back.
- The controls opacity is the same in portrait and landscape (landscape was 15% stronger).

## 0.6.15
- Landscape: the translate button is now as big relative to the controls as in portrait, and sits in the middle, level with the D-pad.

## 0.6.14
- The Retro style option is removed again for now; CramBoy has its original look. (Your box frame choice is unaffected.)

## 0.6.13
- New Retro style (Menu > Look > Style): a pixel font, square framed boxes and tab-style labels across the app. The default style was unchanged.

## 0.6.12
- The menu shows the game's full title from the game file (for example its Korean or Japanese name) instead of the short internal name.
- The highlight around the chosen box frame is no longer cut off at the top.
- The menu fades almost completely while you drag the opacity slider, so you can see the controls clearly.

## 0.6.11
- Subtitle box frames: pick one of eight frames in Menu > Study > Box frame (shown with In box): Classic, Gold, Poké Ball, Ocean, Forest, Night, Retro and Sakura. Original designs in the spirit of the games' own Frame option.

## 0.6.10
- Fix: Update now could load an older version from the phone's or GitHub's cache. It now downloads a complete fresh copy first and reloads from that.
- The controls are 70% visible by default (was 45%). You can still change it in Menu > Controls > Opacity.

## 0.6.9
- Menu > Advanced > Update now: loads the newest version right away (handy for the home-screen app, which updates separately from Safari). Your games, saves and words stay.
- Updates are more reliable on a phone: a file that fails to download is tried again instead of dropping the whole update.

## 0.6.8
- Fix: updates always download fresh files. Quick releases could mix in an older file from GitHub's server cache (0.6.7 could show the previous translate button transparency).

## 0.6.7
- The translate button is 75% visible, and 90% while subtitles are on screen, whatever the controls opacity is set to.

## 0.6.6
- The translate button is always 90% visible, whatever the controls opacity is set to, so it stands out.

## 0.6.5
- The translate button reacts to a press like the other controls: a quick shrink and amber tint, springing back when you let go. While it is amber (text on screen) it keeps its look.

## 0.6.4
- The menu is grouped into Study, Controls, Saves and More. The top button is now "Play" (back to the game). "Saved words & recent text" sits under Study, and "Resume where you left off" moved from Advanced to Saves.

## 0.6.3
- Menu > Controls > Opacity: choose how see-through the floating controls are (15-100%). The menu fades while you drag so you can see the result. The translate button stays a bit stronger than the other controls.

## 0.6.2
- Saved words remember where you were: the place name the game shows when you enter a town or route (for example 연두마을) and the game's name are saved with each word. They show under the word in the word sheet and the saved list, can be searched, and are exported to Anki as two extra columns (Place, Game). Checked on HeartGold.
- One switch per word in the word sheet: New / Learning / Known. Learning is your saved list (amber, exported to Anki); Known removes the dotted underline. A word is one or the other: marking it Known takes it off your saved list.

## 0.6.1
- Signs and other text the game shows all at once (instead of typing it) now appear as subtitles too, with tappable words. Menu labels and names are still ignored.

## 0.6.0
- Hear it: speaker buttons in the word sheet (word and sentence) and "Hear it" in the Now tab read the text aloud with your phone's own Korean or Japanese voice. Works offline.
- Known words: tap "I know this word" in the word sheet and it loses its dotted underline in the subtitles (still tappable). Other forms of the same word count too. Undo from the same sheet.
- Saved words: a search box (word, reading, meaning or sentence) and headings for Today, Yesterday, This week and Earlier. Export for Anki and Copy list sit right under the search box, so a long list never hides them.
- Typing in the search box no longer triggers the game's keyboard shortcuts.

## 0.5.13
- While subtitles are on screen, the amber translate button is only 10% transparent, so it is easy to see.

## 0.5.12
- The translate button has the same see-through look as the floating controls, slightly less transparent so it still stands out.

## 0.5.11
- Portrait controls made for thumbs: a bigger D-pad and face buttons low on the phone, with SELECT and START between them. L, R, settings and fast forward keep their slim size, with the translate button between them.
- Easier to hit: the whole left part of the controls steers the D-pad (it follows your thumb if you slide past its edge), and the whole right part works for A, B, X and Y. Slide from one button to the next without lifting; between two buttons both are pressed.
- Touch mode: the new button above − and + hides all controls so the whole touch screen is free. Subtitle text can still be tapped. The small handle at the bottom brings the controls back.
- The "Below" controls setting is gone: the controls always float.
- Link previews: sharing the link now shows a picture, title and description (Reddit, Discord, iMessage, WhatsApp and others).
- The app now lives at codetaal.github.io/cramboy/.

## 0.5.10
- The app icon is now grape (purple) instead of amber.

## 0.5.9
- Start screen: a "Made by CramLab" card with the CramLab flask icon, together with the support link, which now goes to buymeacoffee.com/cramlab.

## 0.5.8
- The app icon drawing is larger again (85% of the icon's width), close to the first CramBoy icon.

## 0.5.7
- The app icon drawing is a little larger again: between 0.5.5 and 0.5.6.

## 0.5.6
- The app icon has more space around the drawing.

## 0.5.5
- CheeseLab is now called CramBoy, with a new pixel-art icon: an open box shaped like a game controller.
  Your games, saves and saved words stay as they are. On iPhone, remove the home-screen app and add it again from Safari to see the new name and icon.

## 0.5.4
- Resume (experimental): tapping outside the resume card cancels it: the game isn't started and you stay on the start screen.

## 0.5.3
CheeseLab is still being built, so version numbers now start with 0 until the full 1.0 release.
0.5.3 is the release after 1.5.2 (the 1.x numbers below are the earlier releases).
- The translate button fades softly (0.8 s) between its normal colour and amber when text appears or disappears, instead of switching at once.
- A touch that just misses a button or the D-pad (within 15 px) no longer counts as a tap on the game's touch screen, which mattered most with Floating controls. The open space between the controls still works as a touch screen.

## 1.5.2
- Fixed: the subtitles sometimes showed a single letter of a touch-screen button (in HeartGold "조" from the "조사한다" button) instead of the dialogue. Text now only counts as dialogue once it is actually being typed out (or is fully printed).

## 1.5.1
- Resume (experimental): the indicator that blinks when a snapshot is stored is now a clock instead of a camera.
- Resume (experimental): "Start normally" no longer loses the snapshot. The skipped snapshot is kept and offered next time as "Earlier: <time>", below the latest one.
- Portrait: more space between L / R and the D-pad / face buttons.
- Loading a big game sometimes failed on the first try on iPhone ("ArrayBuffer has been detached"). CheeseLab now retries once by itself; the reason is shown under Menu › Advanced for diagnosis.

## 1.5.0
- Japanese games: CheeseLab now reads Japanese Pokémon games (tested with the Gen 4 and Gen 5 text formats, i.e. HeartGold and White) and shows Japanese subtitles with tappable words.
- Words are split using a Japanese–English dictionary (JMdict, © EDRDG, CC BY-SA 4.0, about 30,000 common words plus Japanese Pokémon, move, item and place names). Inflected verbs and adjectives are traced back to their dictionary form (いきました → 行く, polite past), and the word sheet shows the reading.
- For Japanese games the word sheet links to Jisho instead of Naver, and Google translates from Japanese. The Japanese dictionary is downloaded the first time a Japanese game is played, then works offline.
- The emulated DS is set to the game's language, based on the region letter in the game code (J = Japanese, E/P/K = English, F/D/I/S = French/German/Italian/Spanish).
- Saved words keep their reading; the Anki export has a Reading column.

## 1.4.6
- Landscape: the translate button is the wobbling blob too, in the middle of the black strip under the screens, above SELECT and START.
- The menu button shows a gear (settings) icon instead of three lines.
- Portrait: the controls sit a bit higher, with more room to the bottom edge of the phone.
- The menu and word sheets are now 80% of the screen height (was 70%), in portrait and landscape.

## 1.4.5
- SELECT and START show icons (− and +) instead of text, side by side (in portrait too, under the translate button).
- New "Study mode" switch at the top of the menu (on by default). Turning it off hides everything for studying Korean: subtitles, the translate button, Words & text and the subtitle settings, and stops reading text from the game.

## 1.4.4
- Portrait: Below and Floating now both use the roomier Floating controls size (it was the tighter Below size in 1.4.3). With Below, the screens are slightly smaller to make room.

## 1.4.3
- Portrait: Floating now uses exactly the same controls area as Below, so every button and the translate button sit in the same place and at the same size in both settings.

## 1.4.2
- Landscape: the controls keep their full size again (the same with Below and Floating), low on the phone; they may overlap the screens a little, see-through there. The screens stay at the top.

## 1.4.1
- Resume (experimental): a small camera blinks for a moment at the top-right of the game screen whenever a snapshot is stored.
- The menu and the word sheets are now 70% of the screen height, in portrait and landscape.
- Landscape: the screens sit at the top of the phone, and the controls in the strip below them (D-pad left, A/B/X/Y right, L and R just inside them, menu/fast forward and SELECT/START side by side in the middle). On wider phones where that strip is too thin, the controls float low over the screens instead.

## 1.4.0
- New, experimental: **Resume where you left off** (Menu › Advanced, off by default). Takes a snapshot of the whole game every 2 minutes and whenever you leave the app or close the game. When you start that game again, a card offers "Resume where you left off" or "Start normally". It warns you if you saved in the game after the snapshot. Turning it off deletes all snapshots.
- Emulator rebuilt with save-state support, plus three small fixes to the emulator source that made loading a snapshot crash (see `emulator/extra/patches/apply.sh`).
- "Export memory snapshot" is now called "Export memory dump", so it isn't confused with the new snapshots.

## 1.3.7
- Fixed: after rotating from landscape back to portrait, the subtitle box jumped and could hardly be dragged or resized. iPhone home-screen apps keep reporting the landscape window size; CheeseLab now measures the real size of the app's area instead.
- The subtitles and the translate button are now pinned to the screen like the controls, so a page left slightly scrolled after rotating can't shift them.

## 1.3.6
- The movable subtitle box keeps its position and size separately for portrait and landscape, decided by the phone's orientation (not by the screen layout, which iPhone can report late after rotating). Each orientation starts at the default spot until you move the box there.
- A saved position can never put the box or its grip off screen, so it can always be dragged and resized again.

## 1.3.5
- Landscape: L / R, menu and fast forward sit just above the D-pad and face buttons instead of at the screen's top edge.
- Landscape: the translate button moved into the empty band above the top screen, clear of the L button.
- After rotating the phone, the layout is redone a few times, because iPhone reports the new screen size a little late (this misplaced the subtitles and buttons).

## 1.3.4
- No message when a game starts; the game's own title screen shows Continue when there is a save.

## 1.3.3
- No more "Game saved" pop-ups: the in-game save is backed up quietly, and you only get a message if a backup fails.
- When a game starts with an existing in-game save, the message says "Your last in-game save is ready" (no message for a game without a save).
- "Back to game" is pinned to the bottom of the word sheets; the content above it scrolls underneath.

## 1.3.2
- The star and the saved-word count line up exactly (Saved tab and menu).

## 1.3.1
- Word sheet has a back button (top-left) to the Now, Saved words or Recent tab you came from; from the subtitles it goes to Now.

## 1.3.0
- One notification style for the whole app: a dark toast at the top with an icon (check, star, bin, warning or info) and an optional Undo. Replaces the three different styles used before.
- Portrait: the translate button is a slowly wobbling blob (still when Reduce Motion is on), slightly bigger and lighter.

## 1.2.6
- In portrait, the menu and word sheets always have the same height: exactly the bottom half of the screen.

## 1.2.5
- In portrait, the menu and the word sheets cover at most the bottom screen, so the game screen stays visible; longer content scrolls.
- Word sheets have the same grab handle as the menu.
- All cards in the sheets share the same padding and spacing (the Now text box now matches the others).

## 1.2.4
- Portrait: the translate button moved into the empty centre of the controls, between menu/fast forward and SELECT, and is a bit larger. Landscape is unchanged.

## 1.2.3
- The word sheet's sentence link now opens Google Translate (Korean to English) and is labelled "Google".

## 1.2.2
- Loading a game now shows a floating card with the game's icon, name and a progress bar, instead of a status line that pushed the start screen down.
- The movable subtitle box no longer snaps up and down, only to the left and right edges.

## 1.2.1
- In-box subtitles: the dotted underline on the second line is no longer cut off.
- The menu button turns amber while the menu is open, and fast forward stays amber while it's on.

## 1.2.0
- The in-box subtitles can be moved and resized: drag the grip on the top edge to move the box anywhere, and the corner handle to resize it.
- Text size follows the box height (always two lines) and only shrinks when a line would not fit the width.
- The box snaps to the screen edges, stays on screen, and remembers its place separately for portrait and landscape.
- New menu option "Reset subtitle box position" (shown in In box mode).

## 1.1.5
- In-box subtitles keep full width but get their rounded corners and side borders back.
- The box starts a few pixels higher, so the edge of the game's own text box no longer peeks out above it.

## 1.1.4
- In-box subtitles are now full width and stick to the bottom of the top screen, with square corners, top and bottom borders and no side borders.

## 1.1.3
- The subtitle bar never shows more than two lines, like the game's own text box.
- The subtitle bar is slightly see-through, with a blur and soft text shadow so it stays readable.
- The translate button always stays top-left on the main screen, also in bar mode; the bar sits on the bottom screen in landscape too. The separate star button in the bar is gone.

## 1.1.2
- The live subtitle bar now sits at the top of the bottom screen, so the main game screen stays clear.

## 1.1.1
- The in-game 가 button is now a translate icon on a soft square, matching the menu buttons.
- The button no longer shows the saved-word count (it's still in the words sheet).

## 1.1.0
- New look built with Tailwind CSS: cards, amber accent buttons and badges, and cleaner light and dark modes.
- All icons are Heroicons (MIT), including the sound toggle, menu and word sheets.
- Word sheets redesigned: Save star button, dictionary card with particle badges, highlighted sentence, and a segmented Now / Saved / Recent switch.
- Much smaller hand-written CSS; styles are built with `npm run build:css`.

## 1.0.5 (2026-11-10)

- All icons are now Heroicons (menu, fast forward, sound on/off, play, arrows, add, stars, links, close)
- Icons optically aligned with the text next to them (row arrows, stars, buttons)

## 1.0.4 (2026-11-10)

- Renamed the app to CheeseLab
- The gold CheeseLab flask is the app icon again; the blue DS icon is kept in docs/icons/unused

## 1.0.3 (2026-11-10)

- New CheeseLab DS icon: the CheeseLab flask on a blue sky with a round gold "DS" badge in the top corner
- CheeseLab master logo saved in docs/icons/cheeselab-logo-512.png
- Removed the slogan from the start screen

## 1.0.2 (2026-11-10)

- Game icons in the list are no longer cut off at the corners

## 1.0.1 (2026-11-10)

- Support link on the start screen

## 1.0.0 (2026-11-10)

First release as CheeseLab DS.

- DS emulator (desmume-wasm, built from source) as an iPhone Home Screen web app, works offline
- Korean subtitles read live from game memory for Pokémon HeartGold/SoulSilver (Gen 4) and Black/White (Gen 5)
- Subtitle modes: in the game's own text box, as a bar, or off (tap 가)
- Tap a word: offline dictionary with particle and verb-ending handling; save words with their sentence; export to Anki
- iOS-style start screen with a game library (3 recent, All Games, swipe to remove, undo)
- Light and dark mode, following the iPhone setting
- Controls below the screens or floating, with press animations
- Save export/import (.dsz/.sav/.dsv) and memory snapshots for adding new games
- Checks that opened files are DS games
