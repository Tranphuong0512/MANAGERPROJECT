import fs from 'fs';
import path from 'path';

const DELETED_ITEMS_FILE = path.join(process.cwd(), '.next', 'apec_deleted_items.json');

let deletedSet = new Set<string>();
let lastLoadTime = 0;
const CACHE_TTL_MS = 3000; // Kiểm tra lại file sau mỗi 3 giây thay vì đọc disk trên từng item

function loadDeletedItems(force = false) {
  const now = Date.now();
  if (!force && now - lastLoadTime < CACHE_TTL_MS) {
    return;
  }
  lastLoadTime = now;

  try {
    if (fs.existsSync(DELETED_ITEMS_FILE)) {
      const content = fs.readFileSync(DELETED_ITEMS_FILE, 'utf8');
      if (content) {
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          deletedSet = new Set(data.map(s => String(s).toLowerCase().trim()));
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc file deleted items:', err);
  }
}

function saveDeletedItems() {
  try {
    const dir = path.dirname(DELETED_ITEMS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DELETED_ITEMS_FILE, JSON.stringify(Array.from(deletedSet)), 'utf8');
    lastLoadTime = Date.now();
  } catch (err) {
    console.warn('Lỗi ghi file deleted items:', err);
  }
}

// Initial load
loadDeletedItems(true);

export function addDeletedItem(id: string | number, name?: string) {
  if (id) {
    const strId = String(id).trim().toLowerCase();
    deletedSet.add(strId);
    const cleanId = strId.replace(/^apec_type_t_/, '').replace(/^apec_type_/, '').replace(/^apec_/, '').replace(/^t_/, '');
    deletedSet.add(cleanId);
  }
  if (name) {
    deletedSet.add(String(name).trim().toLowerCase());
  }
  saveDeletedItems();
}

export function isItemDeleted(id: string | number | undefined | null, name?: string): boolean {
  loadDeletedItems();
  if (!id && !name) return false;
  if (id) {
    const strId = String(id).trim().toLowerCase();
    const cleanId = strId.replace(/^apec_type_t_/, '').replace(/^apec_type_/, '').replace(/^apec_/, '').replace(/^t_/, '');
    if (deletedSet.has(strId) || deletedSet.has(cleanId)) return true;
  }
  if (name) {
    const strName = String(name).trim().toLowerCase();
    if (deletedSet.has(strName)) return true;
  }
  return false;
}
