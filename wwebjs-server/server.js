// Minimal whatsapp-web.js backend with REST + Socket.IO
const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
const { Client, LocalAuth } = require('whatsapp-web.js')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*'},
  path: '/socket.io'
})

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { headless: true }
})

let ready = false
let lastQR = null

client.on('qr', (qr) => {
  lastQR = qr
  io.emit('whatsapp-status', { connected: false, hasQR: true })
})

client.on('ready', () => {
  ready = true
  io.emit('whatsapp-status', { connected: true, hasQR: false })
})

client.on('disconnected', () => {
  ready = false
  io.emit('whatsapp-status', { connected: false, hasQR: false })
})

// Emit new message events
client.on('message', (msg) => {
  io.emit('new-message', {
    id: msg.id?._serialized || msg.id?.id || null,
    fromMe: msg.fromMe,
    body: msg.body,
    timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
    type: msg.type,
    from: msg.from,
    to: msg.to
  })
})

client.initialize()

// REST endpoints
app.get('/status', (req, res) => {
  res.json({ connected: ready, hasQR: !!lastQR })
})

app.get('/qr', (req, res) => {
  res.json({ qr: lastQR })
})

app.get('/contacts', async (req, res) => {
  try {
    if (!ready) return res.status(503).json({ error: 'not_ready' })
    const contacts = await client.getContacts()
    const shaped = contacts.map(c => ({
      id: c.id._serialized,
      name: c.name || c.pushname || c.number || 'Unknown',
      number: c.number,
      isGroup: c.isGroup
    }))
    res.json({ data: shaped })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Get profile picture url
app.get('/profile-pic/:jid', async (req, res) => {
  try {
    if (!ready) return res.status(503).json({ error: 'not_ready' })
    const { jid } = req.params
    const url = await client.getProfilePicUrl(jid).catch(() => null)
    res.json({ profilePicUrl: url })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// List chats
app.get('/chats', async (req, res) => {
  try {
    if (!ready) return res.status(503).json({ error: 'not_ready' })
    const chats = await client.getChats()
    const data = chats.map(ch => ({
      id: ch.id._serialized,
      name: ch.name || ch.formattedTitle || 'Unknown',
      isGroup: ch.isGroup,
      unreadCount: ch.unreadCount || 0,
      archived: ch.archived || false,
      pinned: ch.pinned || false,
      lastMessageTime: ch.timestamp || null
    }))
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Get messages for a chat
app.get('/messages/:chatId', async (req, res) => {
  try {
    if (!ready) return res.status(503).json({ error: 'not_ready' })
    const { chatId } = req.params
    const limit = parseInt(req.query.limit || '50', 10)
    const chat = await client.getChatById(chatId)
    const msgs = await chat.fetchMessages({ limit })
    const data = msgs.map(m => ({
      id: m.id?._serialized || m.id?.id || null,
      message: m.body,
      fromMe: m.fromMe,
      timestamp: m.timestamp || Math.floor(Date.now() / 1000),
      messageType: m.type
    }))
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body
    if (!ready) return res.status(503).json({ error: 'not_ready' })
    const resp = await client.sendMessage(to, message)
    res.json({ success: true, id: resp.id.id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/refresh', async (req, res) => {
  try {
    if (!ready) return res.status(503).json({ error: 'not_ready' })
    const contacts = await client.getContacts()
    io.emit('contacts-updated', contacts.map(c => ({
      id: c.id._serialized,
      name: c.name || c.pushname || c.number || 'Unknown',
      number: c.number,
      isGroup: c.isGroup
    })))
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Logout endpoint
app.post('/logout', async (req, res) => {
  try {
    await client.logout()
    ready = false
    lastQR = null
    io.emit('whatsapp-status', { connected: false, hasQR: false })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Restart endpoint
app.post('/restart', async (req, res) => {
  try {
    ready = false
    lastQR = null
    await client.destroy()
    client.initialize()
    io.emit('whatsapp-status', { connected: false, hasQR: false })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`wwebjs server listening on http://localhost:${PORT}`)
})