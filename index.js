// Código inicial do bot Telegram + WhatsApp (Baileys)

const { WAConnection } = require('@adiwajshing/baileys');

const startBot = async () => {
    const conn = new WAConnection();
    conn.on('qr', (qr) => {
        console.log('QR Code recebido:', qr);
    });

    await conn.connect();
    console.log('Bot conectado como:', conn.user.jid);
};

startBot();