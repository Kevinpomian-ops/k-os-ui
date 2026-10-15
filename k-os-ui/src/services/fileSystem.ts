
export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
}

const STORAGE_KEY = 'kos-filesystem-v1';

const initialFileSystem: FileNode = {
  name: '/',
  type: 'directory',
  children: [
    {
      name: 'home',
      type: 'directory',
      children: [
        {
          name: 'root',
          type: 'directory',
          children: [
            {
              name: 'welcome.txt',
              type: 'file',
              content: 'Welcome to K-OS!\nYour system. Your rules.'
            },
            {
              name: 'documents',
              type: 'directory',
              children: []
            },
            {
              name: 'downloads',
              type: 'directory',
              children: []
            }
          ]
        }
      ]
    },
    {
      name: 'system',
      type: 'directory',
      children: []
    }
  ]
};

function loadFileSystem(): FileNode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed: unknown = JSON.parse(saved);

      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'type' in parsed &&
        parsed.type === 'directory' &&
        'children' in parsed &&
        Array.isArray(parsed.children)
      ) {
        return parsed as FileNode;
      }
    }
  } catch {
    console.warn('K-OS: File system could not be loaded.');
  }

  return structuredClone(initialFileSystem);
}

let root = loadFileSystem();

function save(nextRoot: FileNode): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRoot));
  root = nextRoot;
}

function parts(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export function normalizePath(path: string): string {
  const result: string[] = [];

  for (const part of parts(path)) {
    if (part === '.') continue;

    if (part === '..') {
      result.pop();
      continue;
    }

    result.push(part);
  }

  return '/' + result.join('/');
}

function findNode(tree: FileNode, path: string): FileNode | null {
  const normalized = normalizePath(path);

  if (normalized === '/') return tree;

  let current: FileNode = tree;

  for (const part of parts(normalized)) {
    const next: FileNode | undefined =
      current.children?.find(node => node.name === part);

    if (!next) return null;

    current = next;
  }

  return current;
}

export function getNode(path: string): FileNode | null {
  return findNode(root, path);
}

export function listDirectory(path: string): FileNode[] {
  const node = getNode(path);

  if (!node || node.type !== 'directory') {
    throw new Error('Directory not found');
  }

  return [...(node.children ?? [])];
}

export function createNode(
  parentPath: string,
  name: string,
  type: 'file' | 'directory'
): void {
  if (
    !name ||
    name === '.' ||
    name === '..' ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0')
  ) {
    throw new Error('Invalid name');
  }

  const nextRoot = structuredClone(root);
  const parent = findNode(nextRoot, parentPath);

  if (!parent || parent.type !== 'directory') {
    throw new Error('Parent directory not found');
  }

  if (parent.children?.some(node => node.name === name)) {
    throw new Error('Name already exists');
  }

  const node: FileNode = {
    name,
    type,
    ...(type === 'directory'
      ? { children: [] }
      : { content: '' })
  };

  parent.children ??= [];
  parent.children.push(node);

  save(nextRoot);
}

export function writeFile(path: string, content: string): void {
  const nextRoot = structuredClone(root);
  const node = findNode(nextRoot, path);

  if (!node || node.type !== 'file') {
    throw new Error('File not found');
  }

  node.content = content;
  save(nextRoot);
}

export function deleteNode(path: string): void {
  const normalized = normalizePath(path);

  if (normalized === '/') {
    throw new Error('Cannot delete root directory');
  }

  const pathParts = parts(normalized);
  const name = pathParts.pop()!;
  const parentPath = '/' + pathParts.join('/');
  const nextRoot = structuredClone(root);
  const parent = findNode(nextRoot, parentPath);

  if (!parent || parent.type !== 'directory') {
    throw new Error('Parent directory not found');
  }

  const index = parent.children?.findIndex(
    node => node.name === name
  ) ?? -1;

  if (index === -1) {
    throw new Error('File or directory not found');
  }

  parent.children!.splice(index, 1);
  save(nextRoot);
}
