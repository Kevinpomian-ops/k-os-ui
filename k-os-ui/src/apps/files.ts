
import {
  createNode,
  deleteNode,
  getNode,
  listDirectory,
  normalizePath,
  writeFile
} from '../services/fileSystem';

let currentPath = '/home/root';

export function renderFiles(): string {
  return `
    <section class="files-app">
      <header class="files-header">
        <h2>FILE MANAGER</h2>
        <span>LOCAL STORAGE</span>
      </header>

      <div class="files-toolbar">
        <button id="files-up" title="Übergeordneten Ordner öffnen">
          ↑
        </button>
        <span id="files-path"></span>
      </div>

      <div class="files-actions">
        <button id="new-folder">+ Ordner</button>
        <button id="new-file">+ Datei</button>
      </div>

      <div id="files-list" class="files-list"></div>

      <div id="files-message" class="files-message"></div>

      <div id="file-editor" class="file-editor" hidden>
        <h3 id="editor-title"></h3>
        <textarea id="editor-content"></textarea>

        <div class="editor-actions">
          <button id="editor-cancel">Abbrechen</button>
          <button id="editor-save">Speichern</button>
        </div>
      </div>

      <div id="files-dialog-backdrop" class="files-dialog-backdrop" hidden>
        <section class="files-dialog" role="dialog" aria-modal="true" aria-labelledby="files-dialog-title">
          <form id="files-dialog-form">
            <h3 id="files-dialog-title"></h3>
            <label id="files-dialog-label" for="files-dialog-input"></label>
            <input id="files-dialog-input" type="text" maxlength="255" autocomplete="off">
            <p id="files-dialog-error" role="alert"></p>
            <div class="files-dialog-actions">
              <button id="files-dialog-cancel" type="button">Abbrechen</button>
              <button id="files-dialog-submit" type="submit">Bestätigen</button>
            </div>
          </form>
        </section>
      </div>
    </section>
  `;
}

export function initFiles(): void {
  const app = document.querySelector<HTMLElement>('.files-app');
  if (!app) return;

  const list = app.querySelector<HTMLDivElement>('#files-list');
  const pathLabel = app.querySelector<HTMLSpanElement>('#files-path');
  const message = app.querySelector<HTMLDivElement>('#files-message');
  const editor = app.querySelector<HTMLDivElement>('#file-editor');
  const editorTitle = app.querySelector<HTMLElement>('#editor-title');
  const editorContent =
    app.querySelector<HTMLTextAreaElement>('#editor-content');
  const dialogBackdrop =
    app.querySelector<HTMLDivElement>('#files-dialog-backdrop');
  const dialogForm =
    app.querySelector<HTMLFormElement>('#files-dialog-form');
  const dialogTitle =
    app.querySelector<HTMLElement>('#files-dialog-title');
  const dialogLabel =
    app.querySelector<HTMLLabelElement>('#files-dialog-label');
  const dialogInput =
    app.querySelector<HTMLInputElement>('#files-dialog-input');
  const dialogError =
    app.querySelector<HTMLParagraphElement>('#files-dialog-error');
  const dialogSubmit =
    app.querySelector<HTMLButtonElement>('#files-dialog-submit');

  if (
    !list || !pathLabel || !message ||
    !editor || !editorTitle || !editorContent ||
    !dialogBackdrop || !dialogForm || !dialogTitle ||
    !dialogLabel || !dialogInput || !dialogError || !dialogSubmit
  ) return;

  let editingPath: string | null = null;
  let resolveDialog: ((value: string | null) => void) | null = null;

  function showMessage(text: string): void {
    message!.textContent = text;
  }

  function closeDialog(value: string | null): void {
    if (!resolveDialog) return;

    dialogBackdrop!.hidden = true;
    const resolve = resolveDialog;
    resolveDialog = null;
    resolve(value);
  }

  function openDialog(options: {
    title: string;
    label: string;
    submitLabel: string;
    withInput: boolean;
    danger?: boolean;
  }): Promise<string | null> {
    dialogTitle!.textContent = options.title;
    dialogLabel!.textContent = options.label;
    dialogInput!.value = '';
    dialogInput!.hidden = !options.withInput;
    dialogInput!.required = false;
    dialogLabel!.hidden = false;
    dialogError!.textContent = '';
    dialogSubmit!.textContent = options.submitLabel;
    dialogSubmit!.classList.toggle('danger', options.danger === true);
    dialogBackdrop!.hidden = false;

    return new Promise(resolve => {
      resolveDialog = resolve;

      if (options.withInput) {
        dialogInput!.focus();
      } else {
        dialogSubmit!.focus();
      }
    });
  }

  dialogForm.addEventListener('submit', event => {
    event.preventDefault();

    const value = dialogInput!.hidden ? '' : dialogInput!.value.trim();

    if (!dialogInput!.hidden && !value) {
      dialogError!.textContent = 'Bitte einen Namen eingeben.';
      dialogInput!.focus();
      return;
    }

    closeDialog(value);
  });

  app.querySelector('#files-dialog-cancel')?.addEventListener(
    'click',
    () => closeDialog(null)
  );

  dialogBackdrop.addEventListener('click', event => {
    if (event.target === dialogBackdrop) closeDialog(null);
  });

  dialogBackdrop.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog(null);
    }
  });

  function refresh(): void {
    pathLabel!.textContent = currentPath;
    list!.replaceChildren();

    try {
      const nodes = listDirectory(currentPath);

      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      });

      for (const node of nodes) {
        const row = document.createElement('div');
        row.className = 'file-row';

        const openButton = document.createElement('button');
        openButton.className = 'file-open';

        const icon = node.type === 'directory' ? '▣' : '▤';
        openButton.textContent = `${icon}  ${node.name}`;

        openButton.addEventListener('click', () => {
          if (node.type === 'directory') {
            currentPath = normalizePath(
              `${currentPath}/${node.name}`
            );

            closeEditor();
            refresh();
          } else {
            openEditor(node.name);
          }
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'file-delete';
        deleteButton.textContent = '✕';
        deleteButton.title = 'Löschen';

        deleteButton.addEventListener('click', () => {
          void openDialog({
            title: 'Element löschen',
            label: `"${node.name}" wirklich löschen?`,
            submitLabel: 'Löschen',
            withInput: false,
            danger: true
          }).then(confirmed => {
            if (confirmed === null) return;

            try {
              deleteNode(`${currentPath}/${node.name}`);
              closeEditor();
              refresh();
              showMessage('Element gelöscht.');
            } catch (error) {
              showMessage(String(error));
            }
          });
        });

        row.append(openButton, deleteButton);
        list!.appendChild(row);
      }

      if (nodes.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = 'This directory is empty.';
        list!.appendChild(empty);
      }
    } catch (error) {
      showMessage(String(error));
    }
  }

  function closeEditor(): void {
    editor!.hidden = true;
    editingPath = null;
  }

  function openEditor(name: string): void {
    const path = normalizePath(`${currentPath}/${name}`);
    const node = getNode(path);

    if (!node || node.type !== 'file') return;

    editingPath = path;
    editorTitle!.textContent = node.name;
    editorContent!.value = node.content ?? '';
    editor!.hidden = false;
  }

  app.querySelector('#files-up')?.addEventListener(
    'click',
    () => {
      currentPath = normalizePath(`${currentPath}/..`);
      closeEditor();
      refresh();
    }
  );

  app.querySelector('#new-folder')?.addEventListener(
    'click',
    async () => {
      const name = await openDialog({
        title: 'Neuen Ordner erstellen',
        label: 'Ordnername',
        submitLabel: 'Erstellen',
        withInput: true
      });

      if (name === null) return;
      try {
        createNode(currentPath, name, 'directory');
        refresh();
        showMessage('Ordner erstellt.');
      } catch (error) {
        showMessage(String(error));
      }
    }
  );

  app.querySelector('#new-file')?.addEventListener(
    'click',
    async () => {
      const name = await openDialog({
        title: 'Neue Datei erstellen',
        label: 'Dateiname',
        submitLabel: 'Erstellen',
        withInput: true
      });

      if (name === null) return;
      try {
        createNode(currentPath, name, 'file');
        refresh();
        showMessage('Datei erstellt.');
      } catch (error) {
        showMessage(String(error));
      }
    }
  );

  app.querySelector('#editor-save')?.addEventListener(
    'click',
    () => {
      if (!editingPath) return;

      try {
        writeFile(editingPath, editorContent!.value);
        closeEditor();
        showMessage('Datei gespeichert.');
        refresh();
      } catch (error) {
        showMessage(String(error));
      }
    }
  );

  app.querySelector('#editor-cancel')?.addEventListener(
    'click',
    closeEditor
  );

  refresh();
}
