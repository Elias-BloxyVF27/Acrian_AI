# ACRIAN ChatBot — protótipo de extensão

Protótipo web para atendimento informativo, perguntas frequentes com Gemini, triagem preliminar por foto, registro de solicitações de coleta, cadastro de parceiros e consulta administrativa de pedidos.

## Arquivos
- `server.js`: API Express, chamada ao Gemini e endpoints de solicitações.
- `public/index.html`: interface e espaço circular para a logo.
- `public/style.css`: aparência responsiva.
- `public/script.js`: chat, formulários e envio à API.
- `.env.example`: variáveis que precisam ser configuradas.

## Rodar localmente
Requer Node.js 18 ou superior.
1. Extraia os arquivos e abra o terminal na pasta do projeto.
2. Execute `npm install`.
3. Configure `GEMINI_API_KEY` e `ADMIN_TOKEN` no ambiente. Não coloque a chave no `public/script.js`, HTML ou GitHub.
4. Execute `npm start`.
5. Abra `http://localhost:3000`.

## Hospedar no Render
1. Suba o projeto para um repositório GitHub.
2. Crie um Web Service no Render conectado ao repositório.
3. Build Command: `npm install`.
4. Start Command: `npm start`.
5. Em Environment, adicione `GEMINI_API_KEY`, `GEMINI_MODEL` (opcional, padrão `gemini-2.5-flash`) e `ADMIN_TOKEN` (token longo e aleatório).
6. O frontend e o backend ficam no mesmo serviço e usam rotas relativas.

## Logo circular
Coloque o arquivo da logo na pasta `public` com o nome `logo-acrian.png`. A interface já reserva um espaço circular e mostra um símbolo temporário se o arquivo não existir.

## Consultar solicitações para planejar rotas
Envie uma requisição autenticada para `GET /api/admin/operacao`, usando o cabeçalho `x-admin-token` com o valor de `ADMIN_TOKEN`. Exemplo:
`curl -H "x-admin-token: SEU_TOKEN" https://SEU-SERVICO.onrender.com/api/admin/operacao`

O endpoint organiza os pedidos e endereços para planejamento manual. Este protótipo NÃO calcula rotas geográficas nem envia pedidos automaticamente para grupos de catadores.

## Limitações e cuidados antes de uso real
- **Persistência:** os registros ficam em `data/store.json`. Em hospedagens com sistema de arquivos efêmero, dados podem ser perdidos em reinícios ou novo deploy. Para produção, conecte PostgreSQL ou outro banco persistente e teste backups.
- **Privacidade/LGPD:** colete apenas os dados necessários, informe a finalidade, limite o acesso, defina prazo de retenção e obtenha autorização institucional antes de guardar contatos e endereços reais. Não use dados reais durante demonstrações sem autorização.
- **Coletas:** a resposta confirma apenas o registro da solicitação, não a disponibilidade nem o agendamento definitivo.
- **Informações institucionais:** confirme com a ACRIAN o endereço, telefone, horários, materiais aceitos, ecopontos, projetos e procedimentos antes de publicar.
- **Fotos:** a análise é uma triagem visual automatizada, sujeita a erro; a equipe precisa validar.
- **Rotas e WhatsApp:** não há integração automática com Google Maps, WhatsApp ou grupos internos. Isso exige integração adicional, credenciais e autorização.
- **Segurança:** configure `ALLOWED_ORIGIN` para o domínio do frontend quando aplicável; proteja o token administrativo e não o coloque no navegador. Antes de produção, implemente autenticação administrativa mais robusta, banco persistente, logs adequados e política de privacidade.
