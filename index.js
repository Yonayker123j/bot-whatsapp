// =====================
// IMPORTS
// =====================
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// =====================
// CONFIGURACIÓN
// =====================
const PREFIX = '!';
const OWNER = '1234567890@c.us'; // opcional
const PORT = process.env.PORT || 3000;

// =====================
// EXPRESS PARA 24/7
// =====================
const app = express();
app.get('/', (req, res) => res.send('🤖 Bot WhatsApp activo ✅'));
app.listen(PORT, () => console.log(`Servidor Express escuchando en puerto ${PORT}`));

// =====================
// CONFIGURACIÓN DEL CLIENTE
// =====================
const client = new Client({
    authStrategy: new LocalAuth({
        // Directorio persistente en Render
        dataPath: '/mnt/data/session'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// =====================
// EVENTOS WHATSAPP
// =====================

// QR para escanear
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📲 Escanea el QR en tu WhatsApp');
});

// Bot listo
client.on('ready', () => {
    console.log('🤖 Bot conectado y listo!');
});

// Fallo de autenticación
client.on('auth_failure', () => {
    console.log('❌ Fallo de autenticación, vuelve a escanear el QR');
});

// Desconexión
client.on('disconnected', reason => {
    console.log('⚠️ Bot desconectado:', reason);
});

// =====================
// BIENVENIDA / DESPEDIDA
// =====================
client.on('group_join', async notification => {
    const chat = await notification.getChat();
    const user = notification.id.participant;

    chat.sendMessage(
        `👋 Bienvenido @${user.split('@')[0]}!\nUsa *${PREFIX}help* para ver comandos`,
        { mentions: [user] }
    );
});

client.on('group_leave', async notification => {
    const chat = await notification.getChat();
    const user = notification.id.participant;

    chat.sendMessage(
        `😢 @${user.split('@')[0]} salió del grupo`,
        { mentions: [user] }
    );
});

// =====================
// MENSAJES / COMANDOS
// =====================
client.on('message_create', async msg => {
    try {
        if (msg.fromMe) return;

        const chat = await msg.getChat();
        const isGroup = chat.isGroup;

        // -------- ANTILINK --------
        if (isGroup && msg.body.includes('https://chat.whatsapp.com')) {
            await msg.delete(true);
            return msg.reply('🚫 Links no permitidos');
        }

        // -------- COMANDOS --------
        if (!msg.body.startsWith(PREFIX)) return;

        const args = msg.body.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        switch (command) {
            case 'ping':
                msg.reply('🏓 Pong');
                break;

            case 'help':
                msg.reply(
`🤖 *MENÚ*
${PREFIX}ping
${PREFIX}help
${PREFIX}reglas
${PREFIX}link
${PREFIX}kick @user`
                );
                break;

            case 'reglas':
                msg.reply(
`📜 *REGLAS DEL GRUPO*
1. Respeto
2. No spam
3. No links
4. No bots`
                );
                break;

            case 'link':
                if (!isGroup) return msg.reply('❌ Solo grupos');
                if (!chat.inviteCode) return msg.reply('❌ No tengo permiso para ver el link');
                msg.reply(`🔗 https://chat.whatsapp.com/${chat.inviteCode}`);
                break;

            case 'kick':
                if (!isGroup) return msg.reply('❌ Solo grupos');

                const admins = chat.participants.filter(p => p.isAdmin || p.isSuperAdmin);
                const isAdmin = admins.some(a => a.id._serialized === msg.author);
                if (!isAdmin) return msg.reply('❌ Solo admins pueden usar este comando');

                const userToKick = msg.mentionedIds[0];
                if (!userToKick) return msg.reply('❌ Menciona a alguien');

                await chat.removeParticipants([userToKick]);
                msg.reply('👢 Usuario eliminado');
                break;

            default:
                msg.reply('❓ Comando no válido');
        }

    } catch (e) {
        console.error('ERROR:', e);
    }
});

// =====================
// INICIALIZAR CLIENTE
// =====================
client.initialize();
