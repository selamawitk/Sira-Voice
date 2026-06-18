const { Server } = require('socket.io');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(userId.toString());
      }
    });

    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(conversationId.toString());
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(conversationId.toString());
      }
    });

    socket.on('send_message', async (data) => {
      try {
        const { conversationId, senderId, text, receiverId } = data;

        if (!conversationId || !senderId || !text) return;

        const newMessage = await Message.create({
          conversationId,
          sender: senderId,
          text
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: newMessage._id
        });

        io.to(conversationId.toString()).emit('receive_message', newMessage);

        if (receiverId) {
          io.to(receiverId.toString()).emit('conversation_updated', {
            conversationId,
            lastMessage: newMessage
          });
        }
      } catch (error) {
        console.error('Socket messaging pipeline error:', error.message);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io server instance has not been initialized');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO
};