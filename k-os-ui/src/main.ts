
import './style.scss';
import { renderTerminal, initTerminal } from './apps/terminal';
import { renderFiles, initFiles } from './apps/files';

type AppId = 'terminal' | 'files' | 'settings' | 'signal';

interface KosApp {
  id: AppId;
  name: string;
  icon: string;
  description: string;
}

const apps: KosApp[] = [
  {
    id: 'terminal',
    name: 'Terminal',
    icon: '>_',
    description: 'K-OS Command Terminal'
  },
  {
    id: 'files',
    name: 'Dateien',
    icon: '▤',
    description: 'K-OS File Manager'
  },
  {
    id: 'settings',
    name: 'Einstellungen',
    icon: '⚙',
    description: 'K-OS System Settings'
  },
  {
    id: 'signal',
    name: 'Signal',
    icon: '⌁',
    description: 'K-OS Signal Analyzer'
  }
];

let currentApp: AppId | null = null;
let recentApps: AppId[] = [];
let showingRecents = false;

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('K-OS: #app wurde nicht gefunden.');
}

root.innerHTML = `
  <div class="kos-screen">

    <header class="status-bar">
      <span id="clock"></span>
      <span class="status-icons">● ▰ 100%</span>
    </header>

    <main id="screen-content" class="screen-content"></main>

    <nav class="navigation-bar" aria-label="Systemnavigation">
      <button id="nav-back" aria-label="Zurück">◀</button>
      <button id="nav-home" aria-label="Home">●</button>
      <button id="nav-recents" aria-label="Letzte Apps">■</button>
    </nav>

  </div>
`;

const screen = document.querySelector<HTMLElement>('#screen-content')!;

function renderHome(): void {
  currentApp = null;
  showingRecents = false;

  screen.innerHTML = `
    <section class="home-screen">
      <div class="home-heading">
        <h1>K-OS</h1>
        <p>YOUR SYSTEM. YOUR RULES.</p>
      </div>

      <div class="app-grid">
        ${apps.map(app => `
          <button class="app-icon" data-app="${app.id}">
            <span class="app-symbol">${app.icon}</span>
            <span class="app-name">${app.name}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function openApp(id: AppId): void {
  const app = apps.find(item => item.id === id);

  if (!app) return;

  currentApp = id;
  showingRecents = false;

  recentApps = [
    id,
    ...recentApps.filter(item => item !== id)
  ];

  if (id === 'terminal') {
    screen.innerHTML = renderTerminal();
    initTerminal();
    return;
  }


  if (id === 'files') {
    screen.innerHTML = renderFiles();
    initFiles();
    return;
  }


  screen.innerHTML = `
    <section class="opened-app">
      <div class="app-header">
        <span>${app.icon}</span>
        <h2>${app.name}</h2>
      </div>

      <div class="app-placeholder">
        <div class="placeholder-icon">${app.icon}</div>
        <h3>${app.description}</h3>
        <p>MODULE INITIALIZED</p>
        <span class="module-status">STATUS: DEVELOPMENT</span>
      </div>
    </section>
  `;
}

function renderRecents(): void {
  showingRecents = true;
  currentApp = null;

  screen.innerHTML = `
    <section class="recents-screen">
      <h2>RECENT APPLICATIONS</h2>

      ${recentApps.length === 0
      ? '<p>No recent applications</p>'
      : `<div class="recent-list">
            ${recentApps.map(id => {
        const app = apps.find(item => item.id === id)!;

        return `
                <button class="recent-item" data-app="${app.id}">
                  <span>${app.icon}</span>
                  <strong>${app.name}</strong>
                  <span>↗</span>
                </button>
              `;
      }).join('')}
          </div>`
    }
    </section>
  `;
}

// App-Icons und Einträge der App-Übersicht
screen.addEventListener('click', (event: MouseEvent) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const button = target.closest<HTMLButtonElement>('[data-app]');

  if (!button) return;

  const id = button.dataset.app as AppId;

  if (apps.some(app => app.id === id)) {
    openApp(id);
  }
});

// Navigation
document.querySelector('#nav-home')?.addEventListener('click', renderHome);

document.querySelector('#nav-back')?.addEventListener('click', () => {
  if (currentApp !== null || showingRecents) {
    renderHome();
  }
});

document.querySelector('#nav-recents')?.addEventListener('click', renderRecents);

// Systemuhr
function updateClock(): void {
  const clock = document.querySelector('#clock');

  if (clock) {
    clock.textContent = new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

renderHome();
updateClock();
setInterval(updateClock, 1000);
