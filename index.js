const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const QRCode = require('qrcode'); // ADICIONE ESTA LINHA

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'SEU_TOKEN_DO_TELEGRAM';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let whatsappSock;
let lastQrCode = null;

// Função para iniciar o WhatsApp
async function iniciarWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ 
      auth: state,
      printQRInTerminal: true // Opcional: mostra QR no terminal também
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      if (update.qr) {
        lastQrCode = update.qr; // Salva o QR para envio pelo Telegram
      }
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

iniciarWhatsApp().then(sock => {
  whatsappSock = sock;
});

// Comando /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Bot iniciado! Envie comandos ou mensagens.');
});

// Comando para mostrar o QR Code do WhatsApp
bot.onText(/\/qrcode/, async (msg) => {
  const chatId = msg.chat.id;
  if (lastQrCode) {
    // Gera imagem do QR code e envia
    const qrBuffer = await QRCode.toBuffer(lastQrCode);
    bot.sendPhoto(chatId, qrBuffer, { caption: 'Escaneie este QR Code com seu WhatsApp!' });
  } else {
    bot.sendMessage(chatId, 'Nenhum QR Code disponível no momento. O WhatsApp já pode estar conectado ou em processo de conexão.');
  }
});

// ... (restante do código, inclusive agendamento e polling_error)
