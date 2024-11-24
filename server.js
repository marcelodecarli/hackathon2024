// Importa os módulos necessários para configurar o servidor
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 

const app = express();
const SECRET_KEY = 'seu_segredo_aqui'; // Substitua por um segredo seguro para gerar tokens JWT

// Middleware para habilitar o CORS (Cross-Origin Resource Sharing)
app.use(cors());
app.use(bodyParser.json()); // Middleware para processar o corpo das requisições em JSON

// Configura a conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Ajuste conforme necessário
  password: '161019', // Insira a senha se aplicável
  database: 'db_hospital' // Nome do banco de dados
});

// Conecta ao banco de dados e exibe mensagem de sucesso ou erro
db.connect((err) => {
  if (err) throw err;
  console.log('Conectado ao banco de dados MySQL!');
});

// Rota para registrar usuários
app.post('/register', async (req, res) => {
  const { cpf, password } = req.body; // Obtém o cpf e senha do corpo da requisição
  const hashedPassword = await bcrypt.hash(password, 10); // Criptografa a senha para segurança

  // Verifica se o usuário já existe
  db.query('SELECT cpf FROM cadastrado WHERE cpf = ?', [cpf], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      return res.status(400).send('Usuário já existe');
    }

    // Insere o novo usuário no banco de dados
    db.query('INSERT INTO cadastrado (cpf, senha_usuario) VALUES (?, ?)', [cpf, hashedPassword], (err, result) => {
      if (err) throw err;
      res.send('Usuário registrado com sucesso');
    });
  });
});

// Rota para login de usuários
app.post('/login', async (req, res) => {
  const { cpf, password } = req.body; // Obtém o cpf e senha do corpo da requisição

  // Consulta o usuário no banco de dados
  db.query('SELECT * FROM cadastrado WHERE cpf = ?', [cpf], async (err, result) => {
    if (err) throw err;

    // Verifica se o usuário existe e se a senha está correta
    if (result.length === 0 || !(await bcrypt.compare(password, result[0].senha_usuario))) {
      return res.status(400).send('cpf ou senha inválidos');
    }

    // Gera o token JWT
    const token = jwt.sign({ cpf }, SECRET_KEY, { expiresIn: '1h' }); // Define validade de 1 hora
    res.json({ token }); // Retorna o token ao cliente
  });
});

// Middleware para verificar o token JWT nas requisições
const authenticateToken = (req, res, next) => {
  // Extrai o token do cabeçalho de autorização
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

  if (!token) return res.sendStatus(401); // Retorna 401 se não houver token

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403); // Retorna 403 se o token for inválido ou expirado
    req.user = user; // Armazena o cpf do usuário no objeto `req` para uso futuro
    next(); // Passa para a próxima função
  });
};

// Rota para obter dados do usuário logado
app.get('/user', authenticateToken, (req, res) => {
  // Consulta o cpf do usuário com base no cpf armazenado no token
  db.query('SELECT cpf FROM cadastrado WHERE cpf = ?', [req.user.cpf], (err, result) => {
    if (err) throw err;

    if (result.length === 0) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.json(result[0]); // Retorna os dados do usuário
  });
});

// Rota para atualizar informações do usuário
app.put('/user', authenticateToken, async (req, res) => {
  const { newcpf, newPassword } = req.body;  // Obtém o novo cpf e a nova senha
  const hashedPassword = await bcrypt.hash(newPassword, 10); // Criptografa a nova senha

  // Atualiza o cpf e senha do usuário
  db.query('UPDATE cadastrado SET cpf = ?, senha_usuario = ? WHERE cpf = ?', [newcpf, hashedPassword, req.user.cpf], (err, result) => {
    if (err) throw err;

    // Verifica se a atualização foi bem-sucedida
    if (result.affectedRows === 0) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.send('Usuário atualizado com sucesso');
  });
});

// Rota para deletar o usuário
app.delete('/user', authenticateToken, (req, res) => {
  // Exclui o usuário com base no cpf do token
  db.query('DELETE FROM cadastrado WHERE cpf = ?', [req.user.cpf], (err, result) => {
    if (err) throw err;

    if (result.affectedRows === 0) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.send('Usuário deletado com sucesso');
  });
});

// Inicia o servidor na porta 3000
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
