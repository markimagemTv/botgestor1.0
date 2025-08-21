const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'SEU_TOKEN_DO_TELEGRAM';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

async function iniciarWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      if (update.connection === 'close') {
        console.log('WhatsApp desconectado. Apagando credenciais e aguardando novo login...');
        try {
          fs.rmSync('auth_info_baileys', { recursive: true, force: true });
          console.log('auth_info_baileys removido. Reinicie o bot para novo login.');
        } catch(err) {
          console.error('Erro ao apagar pasta de autenticação:', err);
        }
      }
    });

    return sock;
  } catch (err) {
    console.error('Erro ao conectar ao WhatsApp:', err);
    try {
      fs.rmSync('auth_info_baileys', { recursive: true, force: true });
      console.log('Pasta auth_info_baileys removida. Reinicie o bot para novo login WhatsApp.');
    } catch (e) {
      console.error('Erro ao tentar limpar autenticação Baileys:', e);
    }
    process.exit(1);
  }
}

let whatsappSock;

iniciarWhatsApp().then(sock => {
  whatsappSock = sock;
});

// Trata comando /start no Telegram
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Bot iniciado! Envie comandos ou mensagens.');
});

// Comando de agendamento (mantido)
bot.onText(/\/agendar (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const [numero, horario, ...mensagemParts] = match[1].split(' ');
  const mensagem = mensagemParts
