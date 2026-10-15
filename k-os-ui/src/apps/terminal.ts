import {
    getNode,
    listDirectory,
    normalizePath
} from '../services/fileSystem';

export function renderTerminal(): string {
    return `
    <section class="terminal-app">
      <div class="terminal-header">
        <span>K-OS TERMINAL</span>
        <span>v0.1</span>
      </div>

      <div class="terminal-output" id="terminal-output">
        <div class="terminal-success">
          K-OS Terminal [Version 0.1]
        </div>
        <div>Type 'help' to list available commands.</div>
      </div>

      <form id="terminal-form" class="terminal-input-line">
        <label for="terminal-input">root@k-os:~$</label>
        <input
          id="terminal-input"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          aria-label="Terminalbefehl"
        />
      </form>
    </section>
  `;
}

export function initTerminal(): void {
    const form = document.querySelector<HTMLFormElement>('#terminal-form');
    const input = document.querySelector<HTMLInputElement>('#terminal-input');
    const output = document.querySelector<HTMLDivElement>('#terminal-output');

    if (!form || !input || !output) return;

    const terminalOutput: HTMLDivElement = output;
    const history: string[] = [];
    let historyIndex = 0;
    let currentDirectory = '/home/root';

    function print(text: string, className = ''): void {
        const line = document.createElement('div');
        line.className = className;
        line.textContent = text;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function execute(commandLine: string): void {
        const [rawCommand, ...args] = commandLine.trim().split(/\s+/);
        const command = rawCommand?.toLowerCase();

        switch (command) {
            case 'help':
                print('AVAILABLE COMMANDS:', 'terminal-success');
                print('help      Show available commands');
                print('clear     Clear terminal output');
                print('date      Show current date and time');
                print('whoami    Show current simulated user');
                print('uname     Show simulated system information');
                print('echo      Print text');
                print('ls        List virtual files');
                print('pwd       Print virtual working directory');
                print('neofetch  Show K-OS information');
                print('cd        Change directory');
                print('cat       Display file content');
                break;

            case 'clear':
                terminalOutput.replaceChildren();
                break;

            case 'date':
                print(new Date().toLocaleString('de-DE'));
                break;

            case 'whoami':
                print('root');
                break;

            case 'uname':
                print('K-OS Browser Simulator (Linux ARMv7 target)');
                break;

            case 'echo':
                print(args.join(' '));
                break;


            case 'ls':
                try {
                    const nodes = listDirectory(currentDirectory);

                    print(
                        nodes.map(node =>
                            node.type === 'directory'
                                ? `${node.name}/`
                                : node.name
                        ).join('  ')
                    );
                } catch (error) {
                    print(String(error), 'terminal-error');
                }
                break;

            case 'pwd':
                print(currentDirectory);
                break;

            case 'cd': {
                const target = args[0] ?? '/home/root';

                const newPath = target.startsWith('/')
                    ? normalizePath(target)
                    : normalizePath(`${currentDirectory}/${target}`);

                const node = getNode(newPath);

                if (!node || node.type !== 'directory') {
                    print(`cd: directory not found: ${target}`, 'terminal-error');
                } else {
                    currentDirectory = newPath;
                }

                break;
            }

            case 'cat': {
                const filename = args[0];

                if (!filename) {
                    print('Usage: cat <filename>', 'terminal-error');
                    break;
                }

                const path = filename.startsWith('/')
                    ? normalizePath(filename)
                    : normalizePath(`${currentDirectory}/${filename}`);

                const node = getNode(path);

                if (!node || node.type !== 'file') {
                    print(`cat: file not found: ${filename}`, 'terminal-error');
                } else {
                    print(node.content ?? '');
                }

                break;
            }


            case 'neofetch':
                print('K-OS', 'terminal-success');
                print('--------------------------');
                print('OS: K-OS UI Simulator');
                print('Target: Sony Xperia Z');
                print('Architecture: ARMv7 (target)');
                print('Kernel: Linux 7.2 (project target)');
                print('Shell: Browser Command Simulator');
                print('Theme: Cyber / Neon Green');
                break;

            default:
                print(`Command not found: ${command}`, 'terminal-error');
                print("Type 'help' for available commands.");
        }
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const commandLine = input.value.trim();

        if (!commandLine) return;

        print(`root@k-os:~$ ${commandLine}`, 'terminal-command');

        history.push(commandLine);
        historyIndex = history.length;

        execute(commandLine);
        input.value = '';
        terminalOutput.scrollTop = terminalOutput.scrollHeight;;
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            historyIndex = Math.max(0, historyIndex - 1);
            input.value = history[historyIndex] ?? '';
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            historyIndex = Math.min(history.length, historyIndex + 1);
            input.value = history[historyIndex] ?? '';
        }
    });

    input.focus();
}
