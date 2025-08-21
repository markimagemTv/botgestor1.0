// ...código anterior (WhatsApp, Telegram, etc.)

const contatosPath = './contatos.json';
let contatos = {};

// Carrega contatos do arquivo, se existir
if (fs.existsSync(contatosPath)) {
  contatos = JSON.parse(fs.readFileSync(contatosPath));
}

// Comando para cadastrar contato
bot.onText(/\/cadastrar (\w+) ([+\d]+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const nome = match[1];
  const numero = match[2];

  contatos[nome] = numero;
  fs.writeFileSync(contatosPath, JSON.stringify(contatos, null, 2));

  bot.sendMessage(chatId, `Contato "${nome}" cadastrado com o número ${numero}.`);
});

// Comando para agendar usando nome do contato
bot.onText(/\/agendar (\w+) (\S+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const nomeContato = match[1];
  const horario = match[2];
  const mensagem = match[3];

  const numero = contatos[nomeContato];

  if (!numero) {
    bot.sendMessage(chatId, `Contato "${nomeContato}" não encontrado! Cadastre usando /cadastrar.`);
    return;
  }

  bot.sendMessage(chatId, `Mensagem agendada para ${nomeContato} (${numero}) às ${horario}: "${mensagem}"`);

  setTimeout(async () => {
    if (whatsappSock) {
      await whatsappSock.sendMessage(numero + '@s.whatsapp.net', { text: mensagem });
      bot.sendMessage(chatId, `Mensagem enviada para ${nomeContato} via WhatsApp!`);
    } else {
      bot.sendMessage(chatId, `WhatsApp não está conectado!`);
    }
  }, calcularTimeout(horario));
});
