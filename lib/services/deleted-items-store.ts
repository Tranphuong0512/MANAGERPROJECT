import fs from 'fs';
import path from 'path';

const DELETED_ITEMS_FILE = path.join(process.cwd(), '.next', 'apec_deleted_items.json');

let deletedSet = new Set<string>();

function loadDeletedItems() {
  try {
    if (fs.existsSync(DELETED_ITEMS_FILE)) {
      const data = JSON.parse(fs.readFileSync(DELETED_ITEMS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        deletedSet = new Set(data.map(s => String(s).toLowerCase().trim()));
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
  } catch (err) {
    console.warn('Lỗi ghi file deleted items:', err);
  }
}

// Initial load
loadDeletedItems();

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
