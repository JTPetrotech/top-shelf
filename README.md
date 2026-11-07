# Slapshot Arena

A 3D hockey game that runs in a browser. One HTML file, no install, no server,
no internet connection required once the page has loaded.

Play it: **https://jtpetrotech.github.io/slapshot-arena/**

## Modes

- **Ice** — fast, loose, long glides, puck slides forever.
- **Roller** — grippier wheels, tighter turns, the ball dies quicker.
- Tutorial runs first time through: skating, puck pickup, shooting, passing, poke checks.

## Controls

| | Player 1 | Player 2 |
|---|---|---|
| Skate | `W` `A` `S` `D` | arrow keys |
| Shoot | `Space` | `Enter` |
| Pass | `Q` | `/` |

Two gamepads work as well — plug them in and they take over automatically.
On a phone or tablet the screen splits into two touch zones, one per player.

Camera: `C` cycles broadcast / overhead / low angle. `P` or `Esc` pauses.

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

## Credits

Built with [three.js](https://threejs.org) r128 (MIT). Fonts are Bebas Neue and
Barlow, both SIL Open Font License.
