# ACRIAN ChatBot — protótipo de extensão

Este protótipo usa uma estrutura simples, semelhante à do projeto PotentIA RH:

- `index.html` — interface
- `style.css` — estilos
- `script.js` — lógica do navegador
- `server.js` — API Node.js + Gemini
- `package.json` — dependências e comandos
- `.env.example` — exemplo de variáveis (não contém segredos)

## Como a publicação funciona

**GitHub Pages publica a interface estática. Render executa o backend e mantém a chave Gemini fora do navegador.** São duas publicações ligadas pela URL da API.

### 1. Publicar a interface no GitHub Pages

1. Envie os arquivos `index.html`, `style.css` e `script.js` para a raiz do repositório `Acrian_AI`, junto com os demais arquivos.
2. Em GitHub, abra **Settings → Pages**.
3. Em *Build and deployment*, escolha *Deploy from a branch*, selecione a branch `main` e a pasta `/ (root)`, e salve.
4. Aguarde a publicação. A página deve abrir diretamente pelo endereço do GitHub Pages.

### 2. Publicar o backend no Render

1. No Render, escolha **New + → Web Service** e conecte o repositório `Acrian_AI`.
2. Use estes campos:
   - **Runtime/Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Root Directory:** deixe em branco se `server.js` e `package.json` estiverem na raiz.
3. Em **Environment**, adicione:
   - `GEMINI_API_KEY` — sua chave secreta do Google AI Studio
   - `GEMINI_MODEL` — `gemini-2.5-flash`
   - `ADMIN_TOKEN` — uma sequência longa e secreta para proteger a consulta administrativa
   - `ALLOWED_ORIGIN` — URL exata do site GitHub Pages, por exemplo `https://SEU-USUARIO.github.io` ou a URL do projeto se quiser restringir ao site específico. Se não souber ainda, pode deixar essa variável de fora durante o primeiro teste.
4. Crie o serviço e aguarde o deploy. Copie a URL pública do backend no Render.

**Não coloque `GEMINI_API_KEY` no `script.js`, no HTML ou em qualquer arquivo enviado ao GitHub.**

### 3. Conectar GitHub Pages ao Render

1. Abra `script.js`.
2. No início do arquivo, localize:
   ```js
   const API = "https://COLOQUE-A-URL-DO-SEU-RENDER.onrender.com";
   ```
3. Substitua o endereço pelo endereço real do serviço Render, sem barra no final. Exemplo:
   ```js
   const API = "https://acrian-chatbot.onrender.com";
   ```
4. Salve e envie a alteração ao GitHub.
5. Teste no navegador o endereço `https://SUA-URL-DO-RENDER.onrender.com/api/health`. Deve retornar um JSON com `status: "ok"` e `aiConfigured: true`.

### Observações importantes

- Este é um protótipo. Antes de uso público, a ACRIAN precisa validar os textos, materiais aceitos, endereço, horários, ecopontos e contatos. O chatbot não deve inventar informações oficiais.
- A triagem por foto é preliminar e precisa ser confirmada por uma pessoa da associação.
- O protótipo registra solicitações em arquivo JSON no backend. Em hospedagem com sistema de arquivos efêmero, os registros podem não persistir após reinicializações ou novos deploys. Para operação real, substitua o armazenamento por banco de dados persistente, como PostgreSQL.
- O recurso de rotas não deve ser tratado como otimização automática. Confirme solicitações e trajetos com a equipe da ACRIAN.
- Configure política de privacidade, consentimento e acesso aos dados antes de coletar informações reais de moradores, empresas ou escolas.
