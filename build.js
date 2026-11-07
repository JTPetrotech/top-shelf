/*
 * Assembles index.html from parts/ with the 3D engine and both fonts inlined,
 * so the finished page has no external references and runs with no internet.
 *
 *   node build.js            rebuild index.html from parts/ + vendor/
 *   node build.js --fonts    re-download the font files first
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PARTS = ['00-head.html', '10-core.js', '20-world.js', '30-players.js', '40-game.js', '50-loop.js'];
const THREE_FILE = path.join(DIR, 'vendor', 'three.r128.min.js');
const FONT_CSS = path.join(DIR, 'vendor', 'fonts.css');
const FONT_INLINE = path.join(DIR, 'vendor', 'fonts-inline.css');

const LINK_BLOCK =
`<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;800&display=swap" rel="stylesheet">`;
const SCRIPT_TAG = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>';

/* ---- turn the Google stylesheet into self-contained @font-face rules ---- */
async function buildFonts(){
  const css = fs.readFileSync(FONT_CSS, 'utf8');
  const faces = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
  let m;
  while((m = re.exec(css)) !== null){
    if(m[1] !== 'latin') continue;              // latin only keeps the payload small
    faces.push(m[2]);
  }
  if(!faces.length) throw new Error('no latin @font-face blocks found in ' + FONT_CSS);

  const out = [];
  for(const face of faces){
    const url = (face.match(/url\((https:\/\/[^)]+)\)/) || [])[1];
    if(!url) continue;
    const res = await fetch(url);
    if(!res.ok) throw new Error('font fetch failed ' + res.status + ' ' + url);
    const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
    const family = (face.match(/font-family:\s*'([^']+)'/) || [])[1];
    const weight = (face.match(/font-weight:\s*([^;]+);/) || [])[1] || '400';
    const style = (face.match(/font-style:\s*([^;]+);/) || [])[1] || 'normal';
    out.push(
      '@font-face{font-family:\'' + family + '\';font-style:' + style.trim() +
      ';font-weight:' + weight.trim() + ';font-display:swap;' +
      'src:url(data:font/woff2;base64,' + b64 + ') format(\'woff2\');}'
    );
    console.log('  embedded ' + family + ' ' + weight.trim() + ' (' + Math.round(b64.length/1024) + ' KB base64)');
  }
  fs.writeFileSync(FONT_INLINE, out.join('\n'));
}

function assemble(){
  const three = fs.readFileSync(THREE_FILE, 'utf8');
  const fonts = fs.readFileSync(FONT_INLINE, 'utf8');
  if(three.indexOf('</script') !== -1) throw new Error('engine source contains a closing script tag');

  let head = fs.readFileSync(path.join(DIR, 'parts', PARTS[0]), 'utf8');
  if(head.indexOf(LINK_BLOCK) === -1) throw new Error('font link block not found in head');
  head = head.replace(LINK_BLOCK, '<style>\n' + fonts + '\n</style>');
  if(head.indexOf(SCRIPT_TAG) === -1) throw new Error('engine script tag not found in head');
  head = head.replace(SCRIPT_TAG, '<script>\n/* three.js r128 - MIT - https://threejs.org */\n' + three + '\n</script>');

  const body = PARTS.slice(1).map(function(p){
    return fs.readFileSync(path.join(DIR, 'parts', p), 'utf8');
  }).join('');

  const html = head + body + '</script>\n</body>\n</html>\n';
  const outFile = path.join(DIR, 'index.html');
  fs.writeFileSync(outFile, html);

  const left = html.match(/(https?:)?\/\/(fonts\.|cdnjs|unpkg|cdn\.)[^"')\s]*/g);
  console.log('wrote index.html  ' + Math.round(html.length/1024) + ' KB');
  console.log('external references remaining: ' + (left ? left.join(', ') : 'none'));
}

(async function(){
  if(process.argv.indexOf('--fonts') !== -1){ console.log('downloading fonts...'); await buildFonts(); }
  assemble();
})();
