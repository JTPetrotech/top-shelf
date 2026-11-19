# Top Shelf

A 3D hockey game that runs in a browser. One HTML file, no install, no server,
no internet connection required once the page has loaded.

Play it: **https://jtpetrotech.github.io/top-shelf/**

## Modes

- **Ice** — five a side plus goalies. Fast, loose, long glides.
- **Roller** — four a side plus goalies. Grippier wheels, tighter turns.
- Tutorial runs first time through: skating, puck pickup, shooting, passing, poke checks.
- **Dangle** pulls the puck across your body for a burst of speed and a moment
  where it is on the far side from whoever is leaning on you. It is on a
  cooldown, and the CPU uses it too.

## Modes

- **Exhibition** — one game, nothing tracked.
- **Franchise** — a season: home and away against seven rivals, a live table,
  rival results simulated around you, and a cheque for whoever finishes top.
- **Story** — seven chapters, each asking for something specific: win by two,
  keep a clean sheet, beat the All-Stars. Clear one and it pays a bonus.
- **Manager** — you do not skate. Dress the line, pick the tactics, and the
  result is decided by your cards against theirs, on the same season and table.
- **Pro mode** — a toggle on any of them. Ninety-second periods, aim assist cut
  to a quarter, sharper goalies and opponents, and 1.8x on every payout.

## Career

Winning pays coins. Coins buy packs; packs hold sticks and skater cards in four
rarities; cards change how you actually play.

- **Sticks** move shot speed, aim assist and pass zip, and each one is a
  different stick in your hands on the ice — its own shaft, grip, blade length
  and blade curve, from the flat long blade of the Surgeon to the hook on a
  Slingshot.
- **Skaters** move acceleration, shot power and how easily you strip a puck.
  Stacked gear is capped so a lucky Legendary cannot make every shot a goal.
- **Travel teams** are bought with coins — Sandlot, Ironworks, Bulldogs,
  North Star, Overtime AC. Higher circuits pay a bigger multiplier on every
  game and put better cards and better sticks on the other bench.
- **Friend codes** carry your squad as a string you can text someone. Paste
  theirs back and their actual team skates against you as the CPU. Codes are
  checksummed, so one clipped by a messaging app is refused rather than
  quietly read as the wrong squad.

- **Custom sticks** — pick the shape (which sets the stats), the shaft colour
  and the tape, then pay for the grade you want: Rare 1,500, Epic 4,500,
  Legendary 14,000. No pack, no gamble, and it is yours on the ice. Eighteen
  tape colours.
- **Signings** — named players with fixed ratings, not in any pack. Jake
  Claiborne is 99 speed, 99 shot, 99 dangle and 5′0″, with checking as the
  trade-off. 20,000 in the shop, or free for finishing the story.
- **Jerseys** — three kits come with the club. Every travel team you buy hands
  you its kit free. The away side is always picked for colour contrast, so the
  two teams can never turn up looking alike.

There is no real money anywhere in this game and there never should be. Coins
come from playing, and everything lives in localStorage on your own device —
nothing is uploaded and there is no account.

## Controls

| | Player 1 | Player 2 |
|---|---|---|
| Skate | `W` `A` `S` `D` | arrow keys |
| Shoot | `Space` | `Enter` |
| Pass | `Q` | `/` |
| Dangle | `E` | `.` |
| Slapshot | `R` | `,` |
| Check | `F` | `R-Shift` |

Two gamepads work as well — A shoots, X passes, B dangles.
On a phone or tablet the screen splits into two touch zones, one per player,
and dangle is its own small joystick: flick it and the puck goes that way.

Camera: `C` cycles broadcast / overhead / low / follow. Follow rides over your
skater’s shoulder. `P` or `Esc` pauses.

## Running it offline

Download `index.html` and open it. That's the whole game — 781 KB, with the 3D
engine and both fonts embedded, so it works on a plane, at a rink, or anywhere
else with no signal.

## Building

The 781 KB `index.html` is generated, not hand-edited. Source lives in `parts/`.

```
node build.js            # reassemble index.html from parts/ + vendor/
node build.js --fonts    # re-download and re-embed the web fonts first
```

`build.js` inlines `vendor/three.r128.min.js` and the Latin font subsets, then
reports any external reference left in the output (should always be `none`).

## Tests

```
node test/career.test.js
node test/dangle.test.js
node test/goal.test.js
node test/career2.test.js
```

Skater cards read 0-99. Internally every stat is a multiplier around 1.0;
`rate()` is just how that reads on the card face.

No framework. It loads `parts/45-meta.js` into a sandbox with a fake
localStorage and checks the payout maths, pack odds over 40,000 rolls, the
guaranteed Epic in a gold pack, the selling guards, friend-code round trips
and rejection of clipped codes, recovery from a corrupt save, and that every
stick blueprint has a look to render. The dangle suite lifts `dangle()` and
`carryLat()` out of the game module and checks who may use the move, which side
the puck ends up on, that direction is read against your heading rather than the
rink, and that the puck sweeps across rather than teleporting.

## Credits

Built with [three.js](https://threejs.org) r128 (MIT). Fonts are Bebas Neue and
Barlow, both SIL Open Font License.
