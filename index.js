import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs'; // Use promises for cleaner async/await
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON request bodies
app.use(express.json());

// Root folder for file operations
const ROOT_DIR = path.resolve(__dirname, 'data');

// Ensure the root folder exists
async function ensureDir() {
    try {
        await fs.mkdir(ROOT_DIR, { recursive: true });
    } catch (err) {}
}
ensureDir();

/**
 * Security helper: Prevents ".." traversal to keep operations inside ROOT_DIR
 */
const getSafePath = (reqPath) => {
    const safePath = path.normalize(path.join(ROOT_DIR, reqPath || '')).replace(/^(\.\.[\/\\])+/, '');
    return safePath.startsWith(ROOT_DIR) ? safePath : ROOT_DIR;
};

// 1. LIST: Get all files and folders in a directory as JSON
app.get('/list', async (req, res) => {
    try {
        const targetPath = getSafePath(req.query.path);
        const entries = await fs.readdir(targetPath, { withFileTypes: true });
        
        const result = entries.map(dirent => ({
            name: dirent.name,
            type: dirent.isDirectory() ? 'folder' : 'file'
        }));
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Could not list directory' });
    }
});

// 2. READ: Get content of a specific file
app.get('/read', async (req, res) => {
    try {
        const filePath = getSafePath(req.query.path);
        const data = await fs.readFile(filePath, 'utf8');
        res.send(data).status(200);
    } catch (err) {
        res.status(404).json({ error: 'File not found' });
    }
});

// 3. CREATE/UPDATE: Create or overwrite a file
app.post('/write', async (req, res) => {
    try {
        const { path: reqPath, content } = req.body;
        const filePath = getSafePath(reqPath);
        
        // Create nested directories if they don't exist
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        await fs.writeFile(filePath, content, 'utf8');
        res.json({ message: 'File saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to write file' });
    }
});

// 4. DELETE: Remove a file
app.delete('/delete', async (req, res) => {
    try {
        const filePath = getSafePath(req.query.path);
        await fs.unlink(filePath);
        res.json({ message: 'File deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

/**
 * Helper: Recursively scans folders to build a nested JSON tree
 */
async function getFilesRecursively(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    const files = await Promise.all(entries.map(async (dirent) => {
        const fullPath = path.resolve(dir, dirent.name);
        const relativePath = path.relative(ROOT_DIR, fullPath);
        
        if (dirent.isDirectory()) {
            return {
                name: dirent.name,
                path: relativePath,
                type: 'folder',
                children: await getFilesRecursively(fullPath) // Recursive call
            };
        }
        return { 
            name: dirent.name, 
            path: relativePath, 
            type: 'file' 
        };
    }));
    return files;
}

// 5. RECURSIVE LIST: Get the entire tree starting from ROOT_DIR
app.get('/list-all', async (req, res) => {
    try {
        const tree = await getFilesRecursively(ROOT_DIR);
        res.json(tree);
    } catch (err) {
        res.status(500).json({ error: 'Failed to scan directory recursively' });
    }
});

app.listen(PORT, () => {
    console.log(`File Manager API running at http://localhost:${PORT}`);
});
