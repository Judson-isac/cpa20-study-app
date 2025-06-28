const http = require('http');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const hostname = '127.0.0.1';
const port = 3000;

// --- Configuração do Multer (Upload de Arquivos) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            avatar TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            simulado_key TEXT,
            correct INTEGER,
            total INTEGER,
            percentage REAL,
            date TEXT,
            user_answers TEXT, -- Adiciona a coluna para as respostas do usuário
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Adiciona a coluna avatar se ela não existir (para bancos existentes)
        db.all("PRAGMA table_info(users)", (err, columns) => {
            if (err) {
                console.error("Erro ao verificar colunas da tabela users:", err.message);
                return;
            }
            const hasAvatar = columns.some(col => col.name === 'avatar');
            if (!hasAvatar) {
                db.run(`ALTER TABLE users ADD COLUMN avatar TEXT`, (err) => {
                    if (err) {
                        console.error("Erro ao adicionar coluna avatar:", err.message);
                    } else {
                        console.log("Coluna 'avatar' adicionada à tabela 'users'.");
                    }
                });
            }
        });

        // Adiciona a coluna user_answers se ela não existir (para bancos existentes)
        db.all("PRAGMA table_info(attempts)", (err, columns) => {
            if (err) {
                console.error("Erro ao verificar colunas da tabela attempts:", err.message);
                return;
            }
            const hasUserAnswers = columns.some(col => col.name === 'user_answers');
            if (!hasUserAnswers) {
                db.run(`ALTER TABLE attempts ADD COLUMN user_answers TEXT`, (err) => {
                    if (err) {
                        console.error("Erro ao adicionar coluna user_answers:", err.message);
                    } else {
                        console.log("Coluna 'user_answers' adicionada à tabela 'attempts'.");
                    }
                });
            }
        });
    }
});

const server = http.createServer((req, res) => {
    // --- Nova Rota para Upload de Avatar ---
    if (req.url === '/upload/avatar' && req.method === 'POST') {
         upload.single('avatar')(req, res, (err) => {
            if (err) {
                console.error("Erro no upload:", err);
                return res.writeHead(500).end('Erro no upload.');
            }
            const userId = req.body.userId;
            const avatarPath = req.file.path.replace(/\\/g, "/");

            if (!userId) {
                fs.unlink(avatarPath, (unlinkErr) => {
                    if (unlinkErr) console.error("Erro ao remover arquivo temporário:", unlinkErr);
                });
                return res.writeHead(400).end('userId não fornecido.');
            }

            db.get(`SELECT avatar FROM users WHERE id = ?`, [userId], (err, row) => {
                if (err) {
                    console.error("Erro ao buscar avatar existente:", err);
                    fs.unlink(avatarPath, (unlinkErr) => {
                        if (unlinkErr) console.error("Erro ao remover arquivo temporário após erro no DB:", unlinkErr);
                    });
                    return res.writeHead(500).end('Erro ao buscar avatar existente.');
                }

                const oldAvatarPath = row ? row.avatar : null;

                const updateSql = `UPDATE users SET avatar = ? WHERE id = ?`;
                db.run(updateSql, [avatarPath, userId], function(err) {
                    if (err) {
                        console.error("Erro ao salvar novo avatar no banco de dados:", err);
                        fs.unlink(avatarPath, (unlinkErr) => {
                            if (unlinkErr) console.error("Erro ao remover arquivo após erro no DB:", unlinkErr);
                        });
                        return res.writeHead(500).end('Erro ao salvar novo avatar no banco de dados.');
                    }

                    const defaultAvatar = 'cpa20-study-app/default-avatar.png';
                    if (oldAvatarPath && oldAvatarPath !== defaultAvatar) {
                        const fullOldAvatarPath = path.join(__dirname, oldAvatarPath);
                        fs.unlink(fullOldAvatarPath, (unlinkErr) => {
                            if (unlinkErr) {
                                if (unlinkErr.code !== 'ENOENT') {
                                    console.error("Erro ao remover avatar antigo:", unlinkErr);
                                }
                            } else {
                                console.log(`Avatar antigo removido: ${fullOldAvatarPath}`);
                            }
                        });
                    }

                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ success: true, path: `/${avatarPath}` }));
                });
            });
        });
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const postData = JSON.parse(body);

                if (req.url === '/register') {
                    const { username, password } = postData;
                    const sql = `INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)`;
                    db.run(sql, [username, password, null], function(err) {
                        if (err) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: 'Usuário já existe.' }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, message: 'Cadastro realizado com sucesso!' }));
                        }
                    });
                } else if (req.url === '/login') {
                     const { username, password } = postData;
                    const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
                    db.get(sql, [username, password], (err, user) => {
                        if (err || !user) {
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: 'Usuário ou senha inválidos.' }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, username: user.username, userId: user.id, avatar: user.avatar }));
                        }
                    });
                } else if (req.url === '/attempts/save') {
                    const { userId, simuladoKey, correct, total, percentage, userAnswers } = postData;
                    const date = new Date().toISOString();

                    const userAnswersJson = JSON.stringify(userAnswers);

                    const sql = `INSERT INTO attempts (user_id, simulado_key, correct, total, percentage, date, user_answers) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    db.run(sql, [userId, simuladoKey, correct, total, percentage, date, userAnswersJson], function(err) {
                        if (err) {
                            console.error("Erro ao salvar tentativa:", err.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: 'Erro ao salvar tentativa.', error: err.message }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            // CORRIGIDO: Retorna o ID da tentativa recém-inserida
                            res.end(JSON.stringify({ success: true, message: 'Tentativa salva com sucesso!', attemptId: this.lastID }));
                        }
                    });
                } else if (req.url === '/attempts/load') {
                    const { userId } = postData;
                    const sql = `SELECT id, simulado_key, correct, total, percentage, date, user_answers FROM attempts WHERE user_id = ? ORDER BY date ASC`;
                    db.all(sql, [userId], (err, rows) => {
                        if (err) {
                            console.error("Erro ao carregar tentativas:", err.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: 'Erro ao carregar tentativas.' }));
                        } else {
                            const results = rows.map(row => ({
                                id: row.id,
                                simulado: row.simulado_key,
                                date: new Date(row.date).toLocaleString('pt-BR'),
                                correct: row.correct,
                                total: row.total,
                                percentage: row.percentage,
                                userAnswers: row.user_answers ? JSON.parse(row.user_answers) : {}
                            }));
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, results }));
                        }
                    });
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ message: 'Rota não encontrada' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Requisição inválida.' }));
            }
        });
    } else if (req.method === 'GET') {
        if (req.url === '/ranking') {
            const sql = `
                SELECT
                    u.username,
                    u.avatar,
                    AVG(a.percentage) as average_score,
                    COUNT(a.id) as total_attempts
                FROM attempts a
                JOIN users u ON u.id = a.user_id
                GROUP BY a.user_id
                ORDER BY average_score DESC
                LIMIT 10
            `;
            db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error("Erro ao gerar ranking:", err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Erro ao gerar ranking.' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, ranking: rows }));
                }
            });
        }
        // Rota para listar materiais de estudo (NOVA ABORDAGEM ASSÍNCRONA)
        else if (req.url === '/study-materials') {
            const modulesFilePath = path.join(__dirname, 'modules.json');

            fs.readFile(modulesFilePath, 'utf8', (err, data) => {
                if (err) {
                    console.error("Erro ao ler modules.json:", err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Erro ao carregar dados dos módulos.' }));
                    return;
                }

                try {
                    const modules = JSON.parse(data);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, modules: modules }));
                } catch (parseErr) {
                    console.error("Erro ao parsear modules.json:", parseErr);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Erro ao processar dados dos módulos.' }));
                }
            });
        }
        else if (req.url.startsWith('/uploads/')) {
            const encodedFilename = req.url.substring('/uploads/'.length);
            const filename = decodeURIComponent(encodedFilename);
            const filePath = path.join(__dirname, 'uploads', filename);

            fs.readFile(filePath, (error, content) => {
                if (error) {
                    console.error("Erro ao ler arquivo de avatar:", error);
                    res.writeHead(404).end('Avatar não encontrado.');
                } else {
                    const ext = path.extname(filePath).toLowerCase();
                    const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
                    const contentType = mimeTypes[ext] || 'application/octet-stream';
                    res.writeHead(200, {'Content-Type': contentType});
                    res.end(content);
                }
            });
            return;
        }
         // Rota para servir arquivos da pasta 'materiais' (CORRIGIDO COM VERIFICAÇÃO DE DIRETÓRIO)
        else if (req.url.startsWith('/materiais/')) {
            const requestedPath = req.url.substring('/materiais/'.length);
            const decodedPath = decodeURIComponent(requestedPath);
            const filePath = path.join(__dirname, 'materiais', decodedPath);

            fs.stat(filePath, (statErr, stats) => {
                if (statErr) {
                    console.error("Erro ao obter status do arquivo:", statErr);
                    res.writeHead(404).end('Arquivo ou diretório de material não encontrado.');
                    return;
                }

                if (stats.isDirectory()) {
                    res.writeHead(404).end('Diretório não pode ser acessado diretamente.');
                    return;
                }

                // If it's a file, proceed with streaming
                const ext = path.extname(filePath).toLowerCase();
                const mimeTypes = {
                    '.pdf': 'application/pdf',
                    '.mp4': 'video/mp4',
                    '.MP4': 'video/mp4',
                    '.txt': 'text/plain',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif'
                };
                const contentType = mimeTypes[ext] || 'application/octet-stream';

                res.writeHead(200, { 'Content-Type': contentType });

                const stream = fs.createReadStream(filePath);
                stream.pipe(res);

                stream.on('error', (err) => {
                    console.error("Erro no stream do arquivo:", err);
                    if (!res.headersSent) {
                        res.writeHead(500).end('Erro ao ler o arquivo.');
                    } else {
                        res.end();
                    }
                });
            });
            return;
        }
        else {
            let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

            const extname = String(path.extname(filePath)).toLowerCase();
            const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
            const contentType = mimeTypes[extname] || 'application/octet-stream';

            fs.readFile(filePath, (error, content) => {
                if (error) {
                    if (error.code == 'ENOENT') { res.writeHead(404); res.end('404: Arquivo não encontrado'); }
                    else { res.writeHead(500); res.end('Erro do servidor: ' + error.code); }
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
        }
    }
});

server.listen(port, hostname, () => {
    console.log(`Servidor rodando em http://${hostname}:${port}/`);
});