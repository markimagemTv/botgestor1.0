// index.js
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'SEU_TOKEN_DO_TELEGRAM';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

async function iniciarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveCreds);

  return sock;
}

let whatsappSock;

iniciarWhatsApp().then(sock => {
  whatsappSock = sock;
});

bot.onText(/\/agendar (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const [numero, horario, ...mensagemParts] = match[1].split(' ');
  const mensagem = mensagemParts.join(' ');

  bot.sendMessage(chatId, `Mensagem agendada para ${numero} às ${horario}: \"${mensagem}\"`);

  setTimeout(async () => {
    if (whatsappSock) {
      await whatsappSock.sendMessage(numero + '@s.whatsapp.net', { text: mensagem });
      bot.sendMessage(chatId, `Mensagem enviada para ${numero} via WhatsApp!`);
    } else {
      bot.sendMessage(chatId, `WhatsApp não está conectado!`);
    }
  }, calcularTimeout(horario));
});

function calcularTimeout(horario) {
  return 10000; // ajuste para o seu formato
}
