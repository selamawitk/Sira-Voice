import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { sendMessageNotification } from '../services/notificationService.js';

let io;

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) {
        socket.userId = decoded.id;
      }
    }
    next();
  } catch {
    next();
  }
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:3000',
        'http://192.168.1.100:3000'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log('🚀 Socket connected:', socket.id, userId || 'no auth');

    if (userId) {
      socket.join(userId);
    }

    socket.on('join', (id) => {
      if (id) {
        socket.userId = id.toString();
        socket.join(socket.userId);
        console.log(`👤 User ${socket.userId} joined room`);
      }
    });

    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on('send_message', async (data) => {
      try {
        const senderId = socket.userId || data.senderId;
        const { conversationId, text } = data;

        if (!conversationId || !text?.trim()) {
          socket.emit('error', { message: 'Missing conversationId or text' });
          return;
        }

        if (!senderId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        if (
          conversation.employer.toString() !== senderId &&
          conversation.worker.toString() !== senderId
        ) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const message = await Message.create({
          conversationId,
          sender: senderId,
          text: text.trim()
        });

        conversation.lastMessage = message._id;
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'fullName email avatar role');

        io.to(`conversation:${conversationId}`).emit('receive_message', populatedMessage);

        const updatePayload = {
          conversationId,
          lastMessage: populatedMessage
        };
        io.to(conversation.employer.toString()).emit('conversation_updated', updatePayload);
        io.to(conversation.worker.toString()).emit('conversation_updated', updatePayload);

        const receiverId = conversation.employer.toString() === senderId
          ? conversation.worker.toString()
          : conversation.employer.toString();
        const senderName = populatedMessage?.sender?.fullName || 'Someone';
        const preview = text.trim().slice(0, 100);
        sendMessageNotification(io, receiverId, senderName, preview, conversationId);
      } catch (error) {
        console.error('❌ send_message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ conversationId, userId }) => {
      if (conversationId && userId) {
        socket.to(`conversation:${conversationId}`).emit('typing', { userId, conversationId });
      }
    });

    socket.on('messages_read', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        const uid = socket.userId;
        if (!uid) return;
        await Message.updateMany(
          { conversationId, sender: { $ne: uid }, read: false },
          { $set: { read: true } }
        );
        io.to(`conversation:${conversationId}`).emit('messages_read_ack', {
          conversationId,
          readBy: uid
        });
      } catch (error) {
        console.error('❌ messages_read error:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected (${reason}):`, socket.id);
    });

    socket.on('error', (err) => {
      console.error('⚠️ Socket Error:', err);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
