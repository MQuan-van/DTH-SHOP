import mongoose from 'mongoose';
const { Schema } = mongoose;
const conversationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  customerId: { type: Schema.Types.ObjectId, required: true, unique: true },
  status: { type: String, enum: ['open','resolved'], default: 'open' },
  nextSeq: { type: Number, default: 0 }, customerReadSeq: { type: Number, default: 0 }, staffReadSeq: { type: Number, default: 0 },
  lastMessageSeq: { type: Number, default: 0 }, lastPreview: { type: String, default: '' }, lastMessageAt: Date,
}, { timestamps: true, collection: 'store_chat_conversations' });
conversationSchema.index({ updatedAt: -1, _id: -1 });
const messageSchema = new Schema({
  id: { type: String, required: true, unique: true }, conversationId: { type: String, required: true },
  senderId: { type: Schema.Types.ObjectId, required: true }, senderRole: { type: String, enum: ['customer','admin'], required: true },
  clientId: { type: String, required: true }, requestHash: { type: String, required: true, select: false },
  seq: { type: Number, required: true }, text: { type: String, default: '' },
  image: { mime: String, width: Number, height: Number, bytes: Number, data: { type: Buffer, select: false } },
}, { timestamps: true, collection: 'store_chat_messages' });
messageSchema.index({ conversationId: 1, seq: 1 }, { unique: true });
messageSchema.index({ conversationId: 1, senderId: 1, clientId: 1 }, { unique: true });
messageSchema.index({ senderId: 1, createdAt: -1 });
export const Conversation = mongoose.model('StoreChatConversation', conversationSchema);
export const Message = mongoose.model('StoreChatMessage', messageSchema);
export const supportModels = [Conversation, Message];
export async function purgeCustomerSupport(customerId) {
  const conversation = await Conversation.findOne({ customerId }).lean();
  if (conversation) { await Message.deleteMany({ conversationId: conversation.id }); await Conversation.deleteOne({ _id: conversation._id }); }
}
export function messageView(m) {
  return { id: m.id, clientId: m.clientId, conversationId: m.conversationId, seq: m.seq, text: m.text, senderRole: m.senderRole, createdAt: m.createdAt,
    image: m.image?.mime ? { mime: m.image.mime, width: m.image.width, height: m.image.height, bytes: m.image.bytes,
      path: `/chat/conversations/${m.conversationId}/messages/${m.id}/image` } : null };
}
