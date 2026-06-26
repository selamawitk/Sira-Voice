import express from 'express';
import Conversation from '../models/Conversation.js'; 
import Message from '../models/Message.js';
import Contract from '../models/Contract.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      $or: [{ employer: userId }, { worker: userId }]
    })
      .populate('employer', 'fullName email avatar role')
      .populate('worker', 'fullName email avatar role')
      .populate('job', 'title salary paymentType')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/conversations', protect, async (req, res) => {
  try {
    const { workerId, employerId, jobId } = req.body;
    
    if (!workerId || !employerId || !jobId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const contractExists = await Contract.findOne({
      employerId,
      workerId,
      jobId,
      status: { $in: ['active', 'completed', 'paid'] }
    });

    if (!contractExists) {
      return res.status(403).json({ success: false, message: 'Chat is only available after a contract is created. You must be hired first.' });
    }

    let conversation = await Conversation.findOne({
      employer: employerId,
      worker: workerId,
      job: jobId
    });

    if (!conversation) {
      conversation = await Conversation.create({
        employer: employerId,
        worker: workerId,
        job: jobId
      });
    }

    conversation = await Conversation.findById(conversation._id)
      .populate('employer', 'fullName email avatar role')
      .populate('worker', 'fullName email avatar role')
      .populate('job', 'title salary paymentType');

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (
      conversation.employer.toString() !== userId.toString() &&
      conversation.worker.toString() !== userId.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await Message.find({ conversationId })
      .populate('sender', 'fullName email avatar role')
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;