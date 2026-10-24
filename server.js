// ACRIAN — Backend do assistente virtual
// Node.js + Express + Google Gemini. A chave da API fica somente no servidor.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(",").map(s => s.trim()) : true }));
app.use(express.json({ limit: "7mb" }));
// A interface é publicada no GitHub Pages; este servidor atende somente à API.

const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false });
app.use("/api", apiLimiter);

const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "store.json");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({ coletas: [], parceiros: [] }, null, 2));

function readStore() {
  try { return JSON.parse(fs.readFileSync(dataFile, "utf8")); }
  catch { return { coletas: [], parceiros: [] }; }
}
function writeStore(data) { fs.writeFileSync(dataFile, JSON.stringify(data, null, 2)); }
function clean(value, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[<>]/g, "").slice(0, max);
}
function required(fields) { return fields.every(v => typeof v === "string" && v.trim()); }

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "ACRIAN ChatBot", aiConfigured: Boolean(GEMINI_API_KEY) }));

const SYSTEM_PROMPT = `Você é o assistente virtual informativo da ACRIAN, associação de catadores de materiais recicláveis de Alagoinhas, Bahia.
Objetivos: orientar a população sobre separação e descarte de recicláveis, explicar como solicitar coleta, apoiar cadastro de empresas/escolas parceiras e divulgar informações institucionais.
Regras obrigatórias:
- Responda em português brasileiro, com cordialidade, clareza e concisão.
- Não invente endereço, telefone, horário, ecopontos, calendário de coleta, projetos, materiais aceitos nem regras específicas da ACRIAN. Se a informação não estiver no contexto, diga que precisa ser confirmada diretamente com a associação.
- Você pode dar orientações gerais de reciclagem, deixando claro quando a aceitação depende das regras locais.
- Não confirme agendamento, coleta, parceria ou envio de rota; diga que a solicitação foi registrada somente quando o sistema confirmar isso.
- Não solicite dados pessoais desnecessários. Nunca peça senhas, documentos pessoais ou dados financeiros.
- Para eletrônicos, baterias, lâmpadas, produtos químicos ou materiais perigosos, recomende pontos especializados e não oriente misturá-los com recicláveis comuns.
- Não faça alegações de que uma foto garante que um material será aceito.
- Se perguntarem sobre o que você é, explique que é o assistente virtual informativo da ACRIAN.`;

async function askGemini(parts, systemInstruction = SYSTEM_PROMPT) {
  if (!GEMINI_API_KEY) {
    const err = new Error("A IA ainda não foi configurada. Defina GEMINI_API_KEY nas variáveis de ambiente do servidor.");
    err.status = 503; throw err;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 900 }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    console.error("Gemini API error:", data.error?.message || response.status);
    const err = new Error("Não foi possível obter uma resposta da IA agora. Tente novamente mais tarde.");
    err.status = 502; throw err;
  }
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
  if (!text) { const err = new Error("A IA retornou uma resposta vazia. Tente novamente."); err.status = 502; throw err; }
  return text;
}

app.post("/api/chat", async (req, res) => {
  const message = clean(req.body?.message, 1800);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  if (!message) return res.status(400).json({ erro: "Digite uma mensagem." });
  const contents = [];
  for (const item of history) {
    if (!item || !["user", "model"].includes(item.role) || typeof item.text !== "string") continue;
    contents.push({ role: item.role, parts: [{ text: clean(item.text, 1200) }] });
  }
  // Envia o histórico permitido e a mensagem atual numa única chamada.
  try {
    if (!GEMINI_API_KEY) return res.status(503).json({ erro: "A IA ainda não está configurada no servidor." });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [...contents, { role: "user", parts: [{ text: message }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 900 }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error("Falha na API Gemini");
    const resposta = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    if (!resposta) throw new Error("Resposta vazia");
    res.json({ resposta });
  } catch (e) {
    console.error("Chat error:", e.message);
    res.status(502).json({ erro: "Não consegui responder neste momento. Confira a configuração da IA e tente novamente." });
  }
});

app.post("/api/triagem", async (req, res) => {
  const { imagemBase64, mimeType, descricao } = req.body || {};
  if (!imagemBase64 || !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return res.status(400).json({ erro: "Envie uma imagem JPG, PNG ou WebP válida." });
  }
  const raw = String(imagemBase64).replace(/^data:image\/\w+;base64,/, "");
  if (raw.length > 5_500_000) return res.status(413).json({ erro: "Imagem muito grande. Envie uma imagem menor que aproximadamente 4 MB." });
  try {
    const prompt = `Analise visualmente esta foto para uma triagem PRELIMINAR de materiais recicláveis.
Descrição fornecida: ${clean(descricao || "Não informada", 500)}
Responda com: (1) materiais que parecem estar visíveis, (2) cuidados de separação/limpeza, (3) dúvidas ou limitações da imagem, (4) aviso de que a aceitação final depende da ACRIAN.
Não confirme que a associação aceita o material; não identifique pessoas nem extraia dados pessoais da imagem. Se houver bateria, eletrônico, lâmpada, químico ou item perigoso, recomende confirmar o descarte especializado.`;
    const resultado = await askGemini([
      { text: prompt },
      { inlineData: { mimeType, data: raw } }
    ]);
    res.json({ resultado, aviso: "Triagem automática preliminar. A equipe da ACRIAN deve confirmar a aceitação." });
  } catch (e) {
    res.status(e.status || 502).json({ erro: e.message || "Não foi possível analisar a imagem." });
  }
});

app.post("/api/coletas", (req, res) => {
  const b = req.body || {};
  if (!required([b.nome, b.contato, b.endereco, b.materiais])) {
    return res.status(400).json({ erro: "Preencha nome, contato, endereço e materiais." });
  }
  const store = readStore();
  const item = {
    id: `COL-${Date.now().toString(36).toUpperCase()}`,
    criadoEm: new Date().toISOString(),
    nome: clean(b.nome, 100), contato: clean(b.contato, 120),
    endereco: clean(b.endereco, 300), referencia: clean(b.referencia || "", 200),
    materiais: clean(b.materiais, 700), volume: clean(b.volume || "", 100),
    observacoes: clean(b.observacoes || "", 500), status: "Aguardando confirmação"
  };
  store.coletas.push(item);
  writeStore(store);
  res.status(201).json({ mensagem: "Solicitação registrada para análise. A coleta ainda não está confirmada.", solicitacao: { id: item.id, status: item.status } });
});

app.post("/api/parceiros", (req, res) => {
  const b = req.body || {};
  if (!required([b.instituicao, b.responsavel, b.contato, b.tipo])) {
    return res.status(400).json({ erro: "Preencha instituição, responsável, contato e tipo de parceria." });
  }
  const store = readStore();
  const item = {
    id: `PAR-${Date.now().toString(36).toUpperCase()}`,
    criadoEm: new Date().toISOString(),
    instituicao: clean(b.instituicao, 150), responsavel: clean(b.responsavel, 100),
    contato: clean(b.contato, 120), tipo: clean(b.tipo, 100),
    mensagem: clean(b.mensagem || "", 500), status: "Aguardando contato"
  };
  store.parceiros.push(item); writeStore(store);
  res.status(201).json({ mensagem: "Interesse registrado. A equipe ainda precisa entrar em contato para confirmar a parceria.", parceiro: { id: item.id, status: item.status } });
});

// Endpoint administrativo simples para organizar pedidos e planejar rotas.
// Configure ADMIN_TOKEN no Render. Não compartilhe o token publicamente.
app.get("/api/admin/operacao", (req, res) => {
  if (!ADMIN_TOKEN || req.get("x-admin-token") !== ADMIN_TOKEN) {
    return res.status(401).json({ erro: "Acesso administrativo não autorizado." });
  }
  const store = readStore();
  const coletas = store.coletas.filter(x => x.status !== "Concluída");
  res.json({
    coletas,
    parceiros: store.parceiros,
    aviso: "Os endereços estão organizados para planejamento manual. Nenhuma rota foi otimizada nem enviada automaticamente."
  });
});

app.get("/api", (_req, res) => res.json({ nome: "ACRIAN ChatBot API", status: "online" }));
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada na API." });
});

app.listen(PORT, () => console.log(`ACRIAN ChatBot rodando na porta ${PORT}`));
