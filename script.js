// ACRIAN ChatBot — interface web
// Como o frontend e o backend são servidos pelo mesmo serviço Render, usamos rotas relativas.
// Depois de publicar o backend no Render, substitua pela URL do seu serviço, sem barra no final.
// Exemplo: const API = "https://acrian-chatbot.onrender.com";
const API = "https://acrian-ai.onrender.com/";
const mensagens = document.getElementById("mensagens");
const formChat = document.getElementById("formChat");
const input = document.getElementById("mensagemInput");
const enviarBtn = document.getElementById("enviarBtn");
const atalhoForm = document.getElementById("atalhoForm");
let historico = [];
let ocupada = false;

function addMessage(text, role = "bot") {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "bot" ? "♻" : "●";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  // textContent impede que conteúdo retornado pela IA seja interpretado como HTML.
  bubble.textContent = text;
  article.append(avatar, bubble);
  mensagens.appendChild(article);
  mensagens.scrollTop = mensagens.scrollHeight;
  return article;
}
function setBusy(value) {
  ocupada = value; enviarBtn.disabled = value;
  enviarBtn.textContent = value ? "…" : "➤";
}
async function apiPost(route, body) {
  const response = await fetch(API + route, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || "Não foi possível concluir a solicitação.");
  return data;
}
async function sendMessage(text) {
  const message = text.trim();
  if (!message || ocupada) return;
  addMessage(message, "user");
  input.value = "";
  const loading = addMessage("Estou consultando as informações. Só um instante…", "bot");
  setBusy(true);
  try {
    const data = await apiPost("/api/chat", { message, history: historico });
    loading.querySelector(".bubble").textContent = data.resposta;
    historico.push({ role: "user", text: message }, { role: "model", text: data.resposta });
    historico = historico.slice(-8);
  } catch (error) {
    loading.querySelector(".bubble").textContent = error.message;
  } finally { setBusy(false); }
}
formChat.addEventListener("submit", e => { e.preventDefault(); sendMessage(input.value); });
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); formChat.requestSubmit(); }
});
document.getElementById("limparChat").addEventListener("click", () => {
  historico = []; mensagens.replaceChildren();
  addMessage("Nova conversa iniciada! Como posso ajudar com reciclagem, coleta ou parcerias?", "bot");
  closeForm();
});
document.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => {
  const action = btn.dataset.action;
  if (action === "coleta") showColetaForm();
  else if (action === "parceria") showParceiroForm();
  else if (action === "triagem") showTriagemForm();
  else if (action === "reciclagem") sendMessage("Quais materiais podem ser reciclados e como devo separá-los? Explique que a aceitação final depende das regras confirmadas pela ACRIAN.");
  else if (action === "informacoes") sendMessage("Quais informações institucionais sobre endereço, horários, ecopontos e projetos da ACRIAN estão confirmadas? Não invente dados que não estejam disponíveis.");
}));
function closeForm() { atalhoForm.hidden = true; atalhoForm.replaceChildren(); }
function renderForm(title, description, fields, onSubmit) {
  atalhoForm.hidden = false; atalhoForm.replaceChildren();
  const h = document.createElement("h3"); h.textContent = title;
  const p = document.createElement("p"); p.textContent = description;
  const form = document.createElement("form"); form.className = "field-grid";
  fields.forEach(f => {
    const wrap = document.createElement("div"); wrap.className = "field" + (f.full ? " full" : "");
    const label = document.createElement("label"); label.textContent = f.label; label.htmlFor = "f-" + f.name;
    let el;
    if (f.options) {
      el = document.createElement("select");
      const first = document.createElement("option"); first.value = ""; first.textContent = "Selecione…"; el.appendChild(first);
      f.options.forEach(opt => { const o = document.createElement("option"); o.value = opt; o.textContent = opt; el.appendChild(o); });
    } else if (f.type === "textarea") { el = document.createElement("textarea"); el.rows = 3; }
    else { el = document.createElement("input"); el.type = f.type || "text"; if (f.accept) el.accept = f.accept; }
    el.id = "f-" + f.name; el.name = f.name; el.required = Boolean(f.required); if (f.placeholder) el.placeholder = f.placeholder;
    wrap.append(label, el);
    if (f.help) { const help = document.createElement("small"); help.className = "file-help"; help.textContent = f.help; wrap.appendChild(help); }
    form.appendChild(wrap);
  });
  const actions = document.createElement("div"); actions.className = "form-buttons full";
  const submit = document.createElement("button"); submit.className = "primary-btn"; submit.type = "submit"; submit.textContent = "Enviar solicitação";
  const cancel = document.createElement("button"); cancel.className = "secondary-btn"; cancel.type = "button"; cancel.textContent = "Cancelar"; cancel.onclick = closeForm;
  actions.append(submit, cancel); form.appendChild(actions);
  const result = document.createElement("div"); result.className = "form-result"; result.hidden = true;
  form.addEventListener("submit", async e => {
    e.preventDefault(); submit.disabled = true; submit.textContent = "Enviando…";
    const values = Object.fromEntries(new FormData(form).entries());
    try { const data = await onSubmit(values); result.className = "form-result"; result.textContent = data.mensagem + (data.solicitacao?.id ? " Protocolo: " + data.solicitacao.id : data.parceiro?.id ? " Protocolo: " + data.parceiro.id : ""); result.hidden = false; form.reset(); addMessage(result.textContent, "bot"); }
    catch (err) { result.className = "form-result form-error"; result.textContent = err.message; result.hidden = false; }
    finally { submit.disabled = false; submit.textContent = "Enviar solicitação"; }
  });
  atalhoForm.append(h, p, form, result);
  atalhoForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function showColetaForm() {
  renderForm("Solicitar coleta de recicláveis", "O envio registra um pedido para avaliação. Não significa que a coleta esteja confirmada.", [
    {name:"nome",label:"Nome",required:true},{name:"contato",label:"Telefone ou e-mail para retorno",required:true},
    {name:"endereco",label:"Endereço completo da coleta",required:true,full:true},
    {name:"referencia",label:"Ponto de referência",full:true},
    {name:"materiais",label:"Quais materiais você tem?",required:true,placeholder:"Ex.: papelão, garrafas PET, latas",full:true},
    {name:"volume",label:"Quantidade aproximada",placeholder:"Ex.: 5 sacos ou 10 caixas"},
    {name:"observacoes",label:"Observações",type:"textarea",full:true}
  ], values => apiPost("/api/coletas", values));
}
function showParceiroForm() {
  renderForm("Cadastro de parceiro", "Para empresas, escolas e instituições interessadas em colaborar com ações ambientais.", [
    {name:"instituicao",label:"Nome da instituição",required:true},
    {name:"tipo",label:"Tipo de instituição/parceria",required:true,options:["Empresa","Escola","Órgão público","Condomínio","Organização social","Outra"]},
    {name:"responsavel",label:"Pessoa responsável",required:true},
    {name:"contato",label:"Telefone ou e-mail",required:true},
    {name:"mensagem",label:"Como gostaria de colaborar?",type:"textarea",full:true}
  ], values => apiPost("/api/parceiros", values));
}
function showTriagemForm() {
  atalhoForm.hidden = false; atalhoForm.replaceChildren();
  const h = document.createElement("h3"); h.textContent = "Triagem preliminar por foto";
  const p = document.createElement("p"); p.textContent = "A IA tentará identificar visualmente os materiais. A análise não garante que a ACRIAN aceite o material.";
  const form = document.createElement("form"); form.className = "field-grid";
  const fileWrap = document.createElement("div"); fileWrap.className = "field full";
  const label = document.createElement("label"); label.textContent = "Foto do material"; label.htmlFor = "fotoMaterial";
  const file = document.createElement("input"); file.type = "file"; file.id = "fotoMaterial"; file.accept = "image/jpeg,image/png,image/webp"; file.required = true;
  const help = document.createElement("small"); help.className = "file-help"; help.textContent = "JPG, PNG ou WebP. Escolha uma foto sem rostos, documentos ou dados pessoais.";
  fileWrap.append(label,file,help);
  const descWrap = document.createElement("div"); descWrap.className = "field full";
  const dl = document.createElement("label"); dl.textContent = "Descrição (opcional)"; dl.htmlFor = "descMaterial";
  const desc = document.createElement("textarea"); desc.id = "descMaterial"; desc.rows = 2; desc.placeholder = "Descreva o material e a quantidade aproximada.";
  descWrap.append(dl,desc);
  const actions = document.createElement("div"); actions.className = "form-buttons full";
  const submit = document.createElement("button"); submit.className = "primary-btn"; submit.textContent = "Analisar foto"; submit.type = "submit";
  const cancel = document.createElement("button"); cancel.className = "secondary-btn"; cancel.textContent = "Cancelar"; cancel.type = "button"; cancel.onclick = closeForm;
  actions.append(submit,cancel); form.append(fileWrap,descWrap,actions);
  const result = document.createElement("div"); result.className = "form-result"; result.hidden = true;
  form.addEventListener("submit", async e => {
    e.preventDefault(); const image = file.files[0]; if (!image) return;
    if (image.size > 4 * 1024 * 1024) { result.hidden = false; result.className = "form-result form-error"; result.textContent = "A imagem deve ter no máximo 4 MB."; return; }
    submit.disabled = true; submit.textContent = "Analisando…"; result.hidden = false; result.className = "form-result"; result.textContent = "A IA está analisando a imagem…";
    try {
      const base64 = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(image); });
      const data = await apiPost("/api/triagem", { imagemBase64:base64, mimeType:image.type, descricao:desc.value });
      result.textContent = data.resultado + "\n\n" + data.aviso; addMessage(result.textContent, "bot");
    } catch(err) { result.className = "form-result form-error"; result.textContent = err.message; }
    finally { submit.disabled = false; submit.textContent = "Analisar foto"; }
  });
  atalhoForm.append(h,p,form,result); atalhoForm.scrollIntoView({behavior:"smooth",block:"nearest"});
}
