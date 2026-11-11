/* HTML Studio standalone — template library (boilerplates, layouts, apps and games). */
window.HS = window.HS || {};
window.HS.TEMPLATES = [
  {
    id: 'boilerplate', name: 'HTML5 Boilerplate', category: 'HTML', type: 'html',
    description: 'Semantic, accessible document shell with meta tags.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Page description" />
  <title>New page</title>
</head>
<body>
  <header>
    <h1>Page title</h1>
  </header>
  <main>
    <p>Your content goes here.</p>
  </main>
  <footer>
    <small>&copy; 2026</small>
  </footer>
</body>
</html>
`
  },
  {
    id: 'css-reset', name: 'Modern CSS Reset', category: 'CSS', type: 'css',
    description: 'Sensible defaults for box-sizing, media and typography.',
    content: `*, *::before, *::after { box-sizing: border-box; }

* { margin: 0; }

html { -webkit-text-size-adjust: 100%; }

body {
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select { font: inherit; }

p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }
`
  },
  {
    id: 'js-starter', name: 'JavaScript Starter', category: 'JavaScript', type: 'js',
    description: 'Strict-mode module skeleton with a small utility.',
    content: `'use strict';

const state = {
  count: 0,
};

function increment(step = 1) {
  state.count += step;
  console.log('count is now', state.count);
  return state.count;
}

document.querySelectorAll('[data-increment]').forEach((el) => {
  el.addEventListener('click', () => increment(1));
});

console.log('Starter script ready');
`
  },
  {
    id: 'dark-toggle', name: 'Dark Mode Toggle', category: 'Apps', type: 'html',
    description: 'Theme switch persisted in localStorage.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Dark mode toggle</title>
  <style>
    :root { --bg: #ffffff; --fg: #111111; }
    [data-theme="dark"] { --bg: #0d0d0f; --fg: #f2f2f2; }
    body { background: var(--bg); color: var(--fg); font-family: system-ui, sans-serif; padding: 40px; transition: background .25s; }
    button { padding: 10px 18px; border-radius: 999px; border: 1px solid currentColor; background: none; color: inherit; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Dark mode toggle</h1>
  <p>Your choice is remembered.</p>
  <button id="toggle">Switch theme</button>
  <script>
    var saved = localStorage.getItem('demo-theme');
    if (saved) document.documentElement.dataset.theme = saved;
    document.getElementById('toggle').addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('demo-theme', next);
      console.log('theme set to', next);
    });
  <\/script>
</body>
</html>
`
  },
  {
    id: 'landing', name: 'Responsive Landing Page', category: 'Layout', type: 'html',
    description: 'Hero, feature grid and call to action.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Product</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body { font-family: system-ui, sans-serif; color: #101114; background: #fafafa; }
    .wrap { max-width: 1020px; margin: 0 auto; padding: 64px 24px; }
    .hero { text-align: center; }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.4rem); letter-spacing: -.02em; }
    .hero p { color: #5b6169; margin: 14px 0 26px; }
    .cta { display: inline-block; background: #101114; color: #fff; padding: 13px 26px; border-radius: 999px; text-decoration: none; }
    .features { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 56px; }
    .card { background: #fff; border: 1px solid #e6e6e6; border-radius: 18px; padding: 22px; }
    .card h3 { margin-bottom: 8px; }
    .card p { color: #5b6169; font-size: .94rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Build something people remember.</h1>
      <p>A clean, fast starting point you can shape in minutes.</p>
      <a class="cta" href="#">Get started</a>
    </section>
    <section class="features">
      <article class="card"><h3>Fast</h3><p>Nothing extra, nothing slow.</p></article>
      <article class="card"><h3>Clear</h3><p>Readable markup and simple styles.</p></article>
      <article class="card"><h3>Yours</h3><p>Change every colour and word.</p></article>
    </section>
  </div>
</body>
</html>
`
  },
  {
    id: 'flex-gallery', name: 'Flexbox Gallery', category: 'Layout', type: 'html',
    description: 'Wrapping photo grid with captions.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Gallery</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 32px; background: #0f1012; color: #eaeaea; }
  .gallery { display: flex; flex-wrap: wrap; gap: 14px; }
  figure { flex: 1 1 220px; margin: 0; border-radius: 14px; overflow: hidden; background: #1b1d21; }
  figure div { height: 150px; background: linear-gradient(135deg, #6a8dff, #b06aff); }
  figcaption { padding: 10px 12px; font-size: .85rem; color: #a9aeb6; }
</style>
</head>
<body>
  <h1>Gallery</h1>
  <div class="gallery">
    <figure><div></div><figcaption>First frame</figcaption></figure>
    <figure><div></div><figcaption>Second frame</figcaption></figure>
    <figure><div></div><figcaption>Third frame</figcaption></figure>
    <figure><div></div><figcaption>Fourth frame</figcaption></figure>
  </div>
</body>
</html>
`
  },
  {
    id: 'grid-dashboard', name: 'CSS Grid Dashboard', category: 'Layout', type: 'html',
    description: 'Sidebar plus stat cards layout.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: system-ui, sans-serif; background: #f4f5f7; color: #17181b; }
  .app { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
  aside { background: #17181b; color: #e9eaec; padding: 22px; }
  aside a { display: block; color: #b9bec7; text-decoration: none; padding: 9px 0; }
  main { padding: 26px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; }
  .stat { background: #fff; border-radius: 16px; padding: 18px; border: 1px solid #e7e8ea; }
  .stat b { font-size: 1.7rem; display: block; }
  .stat span { color: #6b7280; font-size: .85rem; }
</style>
</head>
<body>
  <div class="app">
    <aside>
      <strong>Acme</strong>
      <nav>
        <a href="#">Overview</a><a href="#">Reports</a><a href="#">Settings</a>
      </nav>
    </aside>
    <main>
      <h1>Overview</h1>
      <div class="stats">
        <div class="stat"><span>Users</span><b>1,204</b></div>
        <div class="stat"><span>Sessions</span><b>8,930</b></div>
        <div class="stat"><span>Revenue</span><b>$24k</b></div>
        <div class="stat"><span>Uptime</span><b>99.98%</b></div>
      </div>
    </main>
  </div>
</body>
</html>
`
  },
  {
    id: 'form-validation', name: 'Form + Validation', category: 'Apps', type: 'html',
    description: 'Signup form with inline error messages.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Signup</title>
<style>
  body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; background: #f6f7f9; }
  form { background: #fff; padding: 28px; border-radius: 18px; width: 320px; box-shadow: 0 12px 34px rgba(16,17,20,.08); }
  label { display: block; font-size: .85rem; margin: 14px 0 6px; color: #4b5158; }
  input { width: 100%; padding: 11px 13px; border: 1px solid #d9dbe0; border-radius: 11px; }
  button { margin-top: 18px; width: 100%; padding: 12px; border: 0; border-radius: 11px; background: #17181b; color: #fff; cursor: pointer; }
  .error { color: #d93025; font-size: .78rem; min-height: 16px; }
</style>
</head>
<body>
  <form id="f" novalidate>
    <h2>Create account</h2>
    <label for="email">Email</label>
    <input id="email" type="email" />
    <div class="error" id="emailErr"></div>
    <label for="pass">Password</label>
    <input id="pass" type="password" />
    <div class="error" id="passErr"></div>
    <button type="submit">Sign up</button>
  </form>
  <script>
    document.getElementById('f').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('email').value;
      var pass = document.getElementById('pass').value;
      var ok = true;
      document.getElementById('emailErr').textContent = '';
      document.getElementById('passErr').textContent = '';
      if (!/^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$/i.test(email)) { document.getElementById('emailErr').textContent = 'Enter a valid email'; ok = false; }
      if (pass.length < 8) { document.getElementById('passErr').textContent = 'At least 8 characters'; ok = false; }
      if (ok) console.log('Submitted', email);
    });
  <\/script>
</body>
</html>
`
  },
  {
    id: 'fetch-demo', name: 'Fetch API Demo', category: 'JavaScript', type: 'js',
    description: 'Request JSON and render a list safely.',
    content: `'use strict';

async function loadItems(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Request failed: ' + res.status);
  return res.json();
}

async function render() {
  const list = document.getElementById('list');
  if (!list) return;
  try {
    const data = await loadItems('https://jsonplaceholder.typicode.com/todos?_limit=5');
    list.innerHTML = '';
    data.forEach(function (item) {
      const li = document.createElement('li');
      li.textContent = item.title;
      list.appendChild(li);
    });
    console.log('Loaded ' + data.length + ' items');
  } catch (err) {
    console.error(err.message);
  }
}

render();
`
  },
  {
    id: 'todo-app', name: 'Todo App', category: 'Apps', type: 'html',
    description: 'Add, complete and clear tasks.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Todo</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 420px; margin: 60px auto; padding: 0 20px; }
  .row { display: flex; gap: 8px; }
  input { flex: 1; padding: 11px 13px; border: 1px solid #dcdde1; border-radius: 11px; }
  button { padding: 11px 16px; border: 0; border-radius: 11px; background: #17181b; color: #fff; cursor: pointer; }
  li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
  li.done span { text-decoration: line-through; color: #9aa0a6; }
  li button { background: none; color: #d93025; padding: 0 6px; }
</style>
</head>
<body>
  <h1>Tasks</h1>
  <div class="row"><input id="input" placeholder="What needs doing?" /><button id="add">Add</button></div>
  <ul id="list"></ul>
  <script>
    var items = [];
    function paint() {
      var list = document.getElementById('list');
      list.innerHTML = '';
      items.forEach(function (item, i) {
        var li = document.createElement('li');
        if (item.done) li.className = 'done';
        var span = document.createElement('span');
        span.textContent = item.text;
        span.style.cursor = 'pointer';
        span.addEventListener('click', function () { item.done = !item.done; paint(); });
        var del = document.createElement('button');
        del.textContent = 'x';
        del.addEventListener('click', function () { items.splice(i, 1); paint(); });
        li.appendChild(span); li.appendChild(del);
        list.appendChild(li);
      });
    }
    document.getElementById('add').addEventListener('click', function () {
      var input = document.getElementById('input');
      if (!input.value.trim()) return;
      items.push({ text: input.value.trim(), done: false });
      input.value = '';
      console.log('Added task, total ' + items.length);
      paint();
    });
  <\/script>
</body>
</html>
`
  },
  {
    id: 'canvas-particles', name: 'Canvas Particles', category: 'Apps', type: 'html',
    description: 'Animated particle field on canvas.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Particles</title>
<style>
  html, body { margin: 0; height: 100%; background: #06070a; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
  <canvas id="c"></canvas>
  <script>
    var canvas = document.getElementById('c');
    var ctx = canvas.getContext('2d');
    var dots = [];
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    function seed() {
      dots = [];
      for (var i = 0; i < 90; i++) {
        dots.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - .5) * .7, vy: (Math.random() - .5) * .7, r: Math.random() * 2 + 1 });
      }
    }
    function frame() {
      ctx.fillStyle = 'rgba(6,7,10,0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      dots.forEach(function (d) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = '#8ab4f8';
        ctx.fill();
      });
      requestAnimationFrame(frame);
    }
    addEventListener('resize', function () { resize(); seed(); });
    resize(); seed(); frame();
    console.log('Particle field running');
  <\/script>
</body>
</html>
`
  },
  {
    id: 'clock', name: 'Analog Clock', category: 'Apps', type: 'html',
    description: 'Live analog clock drawn with CSS transforms.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Clock</title>
<style>
  body { display: grid; place-items: center; min-height: 100vh; background: #0f1013; }
  .clock { position: relative; width: 240px; height: 240px; border-radius: 50%; border: 2px solid #2b2d33; background: #15171b; }
  .hand { position: absolute; left: 50%; bottom: 50%; transform-origin: 50% 100%; background: #e8eaed; border-radius: 4px; }
  .hour { width: 5px; height: 62px; margin-left: -2.5px; }
  .minute { width: 3px; height: 88px; margin-left: -1.5px; }
  .second { width: 2px; height: 96px; margin-left: -1px; background: #8ab4f8; }
  .dot { position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: #8ab4f8; }
</style>
</head>
<body>
  <div class="clock">
    <div class="hand hour" id="h"></div>
    <div class="hand minute" id="m"></div>
    <div class="hand second" id="s"></div>
    <div class="dot"></div>
  </div>
  <script>
    function tick() {
      var now = new Date();
      var s = now.getSeconds() * 6;
      var m = now.getMinutes() * 6 + now.getSeconds() * 0.1;
      var h = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;
      document.getElementById('s').style.transform = 'rotate(' + s + 'deg)';
      document.getElementById('m').style.transform = 'rotate(' + m + 'deg)';
      document.getElementById('h').style.transform = 'rotate(' + h + 'deg)';
    }
    tick();
    setInterval(tick, 1000);
  <\/script>
</body>
</html>
`
  },
  {
    id: 'svg-chart', name: 'SVG Bar Chart', category: 'Apps', type: 'html',
    description: 'Dependency-free bar chart from a data array.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Chart</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 40px; background: #fff; }
  rect { fill: #1a73e8; }
  rect:hover { fill: #174ea6; }
  text { font-size: 11px; fill: #5f6368; }
</style>
</head>
<body>
  <h2>Weekly signups</h2>
  <svg id="chart" width="480" height="240"></svg>
  <script>
    var data = [12, 30, 18, 44, 27, 51, 38];
    var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var svg = document.getElementById('chart');
    var max = Math.max.apply(null, data);
    data.forEach(function (value, i) {
      var h = (value / max) * 170;
      var x = 30 + i * 60;
      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', 190 - h);
      rect.setAttribute('width', 34);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', 6);
      svg.appendChild(rect);
      var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x + 6);
      label.setAttribute('y', 210);
      label.textContent = days[i];
      svg.appendChild(label);
    });
  <\/script>
</body>
</html>
`
  },
  {
    id: 'game-snake', name: 'Game: Snake', category: 'Games', type: 'html',
    description: 'Classic snake with arrow-key controls and score.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Snake</title>
<style>
  body { margin: 0; display: grid; place-items: center; min-height: 100vh; background: #0b0c0f; color: #e8eaed; font-family: system-ui, sans-serif; }
  canvas { background: #12141a; border: 1px solid #23262e; border-radius: 12px; }
  .hud { display: flex; gap: 18px; margin-bottom: 10px; }
</style>
</head>
<body>
  <div>
    <div class="hud"><span>Score <b id="score">0</b></span><span>Arrows to move</span></div>
    <canvas id="c" width="360" height="360"></canvas>
  </div>
  <script>
    var cell = 18, ctx = document.getElementById('c').getContext('2d');
    var snake = [{ x: 8, y: 8 }], dir = { x: 1, y: 0 }, food = { x: 4, y: 6 }, score = 0, timer;
    function placeFood() {
      food = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
    }
    function draw() {
      ctx.fillStyle = '#12141a'; ctx.fillRect(0, 0, 360, 360);
      ctx.fillStyle = '#f28b82'; ctx.fillRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4);
      ctx.fillStyle = '#8ab4f8';
      snake.forEach(function (s) { ctx.fillRect(s.x * cell + 2, s.y * cell + 2, cell - 4, cell - 4); });
    }
    function step() {
      var head = { x: (snake[0].x + dir.x + 20) % 20, y: (snake[0].y + dir.y + 20) % 20 };
      if (snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
        clearInterval(timer);
        console.error('Game over — score ' + score);
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++; document.getElementById('score').textContent = score; placeFood();
        console.log('Score ' + score);
      } else snake.pop();
      draw();
    }
    addEventListener('keydown', function (e) {
      var map = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      var next = map[e.key];
      if (next && (next.x !== -dir.x || next.y !== -dir.y)) dir = next;
    });
    draw();
    timer = setInterval(step, 130);
  <\/script>
</body>
</html>
`
  },
  {
    id: 'game-breakout', name: 'Game: Breakout', category: 'Games', type: 'html',
    description: 'Paddle, ball and brick rows with lives.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Breakout</title>
<style>
  body { margin: 0; display: grid; place-items: center; min-height: 100vh; background: #0b0c0f; color: #e8eaed; font-family: system-ui, sans-serif; }
  canvas { border: 1px solid #23262e; border-radius: 12px; background: #12141a; }
</style>
</head>
<body>
  <canvas id="c" width="420" height="320"></canvas>
  <script>
    var ctx = document.getElementById('c').getContext('2d');
    var paddle = { x: 180, w: 80, h: 10 };
    var ball = { x: 210, y: 240, dx: 3, dy: -3, r: 6 };
    var bricks = [];
    for (var r = 0; r < 4; r++) for (var col = 0; col < 8; col++)
      bricks.push({ x: 12 + col * 50, y: 24 + r * 20, alive: true });
    var keys = {};
    addEventListener('keydown', function (e) { keys[e.key] = true; });
    addEventListener('keyup', function (e) { keys[e.key] = false; });
    document.getElementById('c').addEventListener('mousemove', function (e) {
      var rect = this.getBoundingClientRect();
      paddle.x = Math.max(0, Math.min(420 - paddle.w, e.clientX - rect.left - paddle.w / 2));
    });
    function loop() {
      if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - 6);
      if (keys.ArrowRight) paddle.x = Math.min(420 - paddle.w, paddle.x + 6);
      ball.x += ball.dx; ball.y += ball.dy;
      if (ball.x < ball.r || ball.x > 420 - ball.r) ball.dx *= -1;
      if (ball.y < ball.r) ball.dy *= -1;
      if (ball.y > 320 - ball.r) { ball.x = 210; ball.y = 240; ball.dy = -3; }
      if (ball.y > 300 - ball.r && ball.x > paddle.x && ball.x < paddle.x + paddle.w) ball.dy = -Math.abs(ball.dy);
      bricks.forEach(function (b) {
        if (!b.alive) return;
        if (ball.x > b.x && ball.x < b.x + 46 && ball.y > b.y && ball.y < b.y + 16) {
          b.alive = false; ball.dy *= -1; console.log('Brick broken');
        }
      });
      ctx.fillStyle = '#12141a'; ctx.fillRect(0, 0, 420, 320);
      ctx.fillStyle = '#8ab4f8';
      bricks.forEach(function (b) { if (b.alive) ctx.fillRect(b.x, b.y, 46, 16); });
      ctx.fillStyle = '#e8eaed'; ctx.fillRect(paddle.x, 300, paddle.w, paddle.h);
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
      if (!bricks.some(function (b) { return b.alive; })) { console.log('You win!'); return; }
      requestAnimationFrame(loop);
    }
    loop();
  <\/script>
</body>
</html>
`
  },
  {
    id: 'game-memory', name: 'Game: Memory Match', category: 'Games', type: 'html',
    description: 'Flip cards and find every pair.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Memory</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f1013; color: #e8eaed; display: grid; place-items: center; min-height: 100vh; margin: 0; }
  .board { display: grid; grid-template-columns: repeat(4, 78px); gap: 10px; }
  .card { height: 78px; border-radius: 14px; background: #1d2027; display: grid; place-items: center; font-size: 1.7rem; cursor: pointer; user-select: none; border: 1px solid #262a33; }
  .card.open { background: #8ab4f8; color: #0b0f19; }
  .card.matched { background: #1e8e3e; color: #fff; cursor: default; }
</style>
</head>
<body>
  <div>
    <h3 id="msg">Find the pairs</h3>
    <div class="board" id="board"></div>
  </div>
  <script>
    var symbols = ['★','▲','●','◆','▼','■','✦','✚','★','▲','●','◆','▼','■','✦','✚'];
    symbols.sort(function () { return Math.random() - .5; });
    var first = null, lock = false, found = 0;
    var board = document.getElementById('board');
    symbols.forEach(function (sym) {
      var el = document.createElement('div');
      el.className = 'card'; el.dataset.sym = sym; el.textContent = '';
      el.addEventListener('click', function () {
        if (lock || el.classList.contains('open') || el.classList.contains('matched')) return;
        el.classList.add('open'); el.textContent = sym;
        if (!first) { first = el; return; }
        if (first.dataset.sym === sym) {
          first.classList.add('matched'); el.classList.add('matched');
          first = null; found++;
          console.log('Pair found: ' + found + '/8');
          if (found === 8) document.getElementById('msg').textContent = 'You win!';
        } else {
          lock = true;
          var a = first; first = null;
          setTimeout(function () {
            a.classList.remove('open'); a.textContent = '';
            el.classList.remove('open'); el.textContent = '';
            lock = false;
          }, 650);
        }
      });
      board.appendChild(el);
    });
  <\/script>
</body>
</html>
`
  },
  {
    id: 'game-typing', name: 'Game: Typing Race', category: 'Games', type: 'html',
    description: 'Measure words per minute against the clock.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Typing</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f1013; color: #e8eaed; display: grid; place-items: center; min-height: 100vh; margin: 0; }
  .box { width: 520px; }
  .target { font-size: 1.2rem; line-height: 1.7; color: #9aa0a6; margin-bottom: 14px; }
  .target span.ok { color: #81c995; }
  .target span.bad { color: #f28b82; text-decoration: underline; }
  input { width: 100%; padding: 13px; border-radius: 12px; border: 1px solid #2b2f38; background: #16181d; color: #e8eaed; font-size: 1rem; }
  .stat { margin-top: 10px; color: #9aa0a6; font-size: .9rem; }
</style>
</head>
<body>
  <div class="box">
    <h2>Typing race</h2>
    <div class="target" id="target"></div>
    <input id="input" placeholder="Start typing the text above..." />
    <div class="stat" id="stat">WPM 0 · Accuracy 100%</div>
  </div>
  <script>
    var sentence = 'the quick brown fox jumps over the lazy dog while the sun sets slowly';
    var target = document.getElementById('target');
    var input = document.getElementById('input');
    var stat = document.getElementById('stat');
    var start = null, errors = 0;
    function paint() {
      var typed = input.value;
      target.innerHTML = sentence.split('').map(function (ch, i) {
        if (i >= typed.length) return '<span>' + ch + '</span>';
        return '<span class="' + (typed[i] === ch ? 'ok' : 'bad') + '">' + ch + '</span>';
      }).join('');
    }
    input.addEventListener('input', function () {
      if (!start) start = Date.now();
      paint();
      var typed = input.value;
      errors = 0;
      for (var i = 0; i < typed.length; i++) if (typed[i] !== sentence[i]) errors++;
      var mins = (Date.now() - start) / 60000;
      var words = typed.trim().split(/\\s+/).filter(Boolean).length;
      var wpm = mins > 0 ? Math.round(words / mins) : 0;
      var acc = typed.length ? Math.round(((typed.length - errors) / typed.length) * 100) : 100;
      stat.textContent = 'WPM ' + wpm + ' · Accuracy ' + acc + '%';
      if (typed === sentence) console.log('Finished with ' + wpm + ' WPM');
    });
    paint();
  <\/script>
</body>
</html>
`
  },
  {
    id: 'spa-router', name: 'Hash Router SPA', category: 'JavaScript', type: 'js',
    description: 'Tiny hash router with view registry.',
    content: `'use strict';

const routes = {};
const outlet = () => document.getElementById('app') || document.body;

function route(path, view) {
  routes[path] = view;
}

function render() {
  const path = location.hash.replace(/^#/, '') || '/';
  const view = routes[path] || routes['/'];
  outlet().innerHTML = '';
  outlet().appendChild(view());
  console.log('Navigated to ' + path);
}

function el(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

route('/', () => el('<h1>Home</h1><p><a href="#/about">About</a></p>'));
route('/about', () => el('<h1>About</h1><p><a href="#/">Home</a></p>'));

window.addEventListener('hashchange', render);
render();
`
  },
  {
    id: 'modal-component', name: 'Dialog / Modal', category: 'Apps', type: 'html',
    description: 'Accessible dialog with backdrop and escape key.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><title>Modal</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 40px; background: #f6f7f9; }
  button.open { padding: 12px 20px; border: 0; border-radius: 12px; background: #17181b; color: #fff; cursor: pointer; }
  dialog { border: 0; border-radius: 18px; padding: 0; box-shadow: 0 24px 60px rgba(0,0,0,.25); width: 340px; }
  dialog::backdrop { background: rgba(12,13,16,.55); }
  .inner { padding: 24px; }
  .inner h3 { margin: 0 0 8px; }
  .inner p { color: #5f6368; margin: 0 0 18px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .actions button { padding: 10px 16px; border-radius: 10px; border: 1px solid #dadce0; background: #fff; cursor: pointer; }
</style>
</head>
<body>
  <button class="open" id="open">Open dialog</button>
  <dialog id="dlg">
    <div class="inner">
      <h3>Confirm action</h3>
      <p>This is a native dialog element.</p>
      <div class="actions">
        <button id="cancel">Cancel</button>
        <button id="ok" style="background:#17181b;color:#fff;border-color:#17181b;">Confirm</button>
      </div>
    </div>
  </dialog>
  <script>
    var dlg = document.getElementById('dlg');
    document.getElementById('open').addEventListener('click', function () { dlg.showModal(); });
    document.getElementById('cancel').addEventListener('click', function () { dlg.close('cancel'); });
    document.getElementById('ok').addEventListener('click', function () { console.log('Confirmed'); dlg.close('ok'); });
  <\/script>
</body>
</html>
`
  }
];

window.HS.TEMPLATE_CATEGORIES = ['HTML', 'CSS', 'JavaScript', 'Layout', 'Apps', 'Games'];
