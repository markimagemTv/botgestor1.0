const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const QRCode = require('qrcode');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'SEU_TOKEN_DO_TELEGRAM';
// Defina seu chat ID aqui (o ID do Telegram que vai receber o QR automaticamente)
// Para testar, envie qualquer mensagem ao bot e pegue o valor de msg.chat.id no log
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'SEU_CHAT_ID_AQUI';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let whatsappSock;
let lastQrCode = null;

// Teclado persistente
const teclado = {
  reply_markup: {
    keyboard: [
      [{ text: 'Gerar QR WhatsApp' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Inicia WhatsApp e envia QR para Telegram assim que gerar
async function iniciarWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ 
      auth: state,
      printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      if (update.qr) {
        lastQrCode = update.qr;
        // ENVIA QR CODE DIRETO PARA O TELEGRAM ASSIM QUE GERAR!
        try {
          const qrBuffer = await QRCode.toBuffer(update.qr);
          await bot.sendPhoto(TELEGRAM_CHAT_ID, qrBuffer, { caption: 'Escaneie este QR Code com seu WhatsApp!' });
        } catch (e) {
          bot.sendMessage(TELEGRAM_CHAT_ID, 'Erro ao gerar imagem do QR Code.');
        }
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
      if (update.connection === 'open') {
        console.log('WhatsApp conectado!');
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

// Mostra teclado persistente ao iniciar
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Bot iniciado! Use o botão abaixo para gerar o QR Code WhatsApp.', teclado);
});

// Botão "Gerar QR WhatsApp" (funciona se QR ainda estiver disponível)
bot.on('message', async (msg) => {
  if (msg.text === 'Gerar QR WhatsApp') {
    if (lastQrCode) {
      try {
        const qrBuffer = await QRCode.toBuffer(lastQrCode);
        await bot.sendPhoto(msg.chat.id, qrBuffer, { caption: 'Escaneie este QR Code com seu WhatsApp!' });
      } catch (e) {
        bot.sendMessage(msg.chat.id, 'Erro ao gerar imagem do QR Code.');
      }
    } else {
      bot.sendMessage(msg.chat.id, 'Nenhum QR Code disponível no momento. O WhatsApp já pode estar conectado ou em processo de conexão.');
    }
  }
});

// Função exemplo para agendamento
bot.onText(/\/agendar (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const [numero, horario, ...mensagemParts] = match[1].split(' ');
  const mensagem = mensagemParts.join(' ');

  bot.sendMessage(chatId, `Mensagem agendada para ${numero} às ${horario}: "${mensagem}"`);

  setTimeout(async () => {
    if (whatsappSock) {
      await whatsappSock.sendMessage(numero + '@s.whatsapp.net', { text: mensagem });
      bot.sendMessage(chatId, `Mensagem enviada para ${numero} via WhatsApp!`);
    } else {
      bot.sendMessage(chatId, `WhatsApp não está conectado!`);
    }
  }, calcularTimeout(horario));
});

// Função simples para timeout (ajuste para sua lógica de horário)
function calcularTimeout(horario) {
  return 10000; // 10 segundos para teste
}

// Tratamento para erro de polling do Telegram
bot.on('polling_error', (err) => {
  if (err.code === 'ETELEGRAM' && err.message.includes('409 Conflict')) {
    console.error('Erro de polling do Telegram: Só pode rodar UMA instância do bot. Pare qualquer outro serviço/container/bot usando esse token!');
    if (process.env.TELEGRAM_ADMIN_ID) {
      bot.sendMessage(
        process.env.TELEGRAM_ADMIN_ID,
        'Erro: Só pode rodar UMA instância do bot Telegram com esse token! Pare outros bots que estejam rodando.'
      );
    }
    process.exit(1);
  } else {
    console.error('Polling error:', err);
  }
}
);
