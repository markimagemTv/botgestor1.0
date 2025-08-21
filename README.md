# Botgestor 1.0

Bot Telegram que agenda e envia mensagens para WhatsApp usando Baileys.

## Como rodar local

```bash
npm install
cp .env.example .env
# Edite .env com seu token
npm start
```

## Deploy no Railway

- Adicione seu token do Telegram como variável de ambiente: `TELEGRAM_TOKEN`
- Configure persistência para autenticação Baileys se necessário
- `npm start` já está configurado no package.json
