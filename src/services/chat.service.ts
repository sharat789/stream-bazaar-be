import { AppDataSource } from "../data-source";
import { ChatMessage } from "../entity/ChatMessage";
import { LessThan } from "typeorm";

export interface CreateMessageDto {
  message: string;
  userId: number;
  sessionId: string;
}

export class ChatService {
  private chatRepository = AppDataSource.getRepository(ChatMessage);

  /**
   * Get chat messages for a session with pagination
   */
  async getMessages(
    sessionId: string,
    limit: number = 50,
    before?: Date
  ): Promise<ChatMessage[]> {
    const queryBuilder = this.chatRepository
      .createQueryBuilder("chat")
      .leftJoinAndSelect("chat.user", "user")
      .where("chat.sessionId = :sessionId", { sessionId })
      .orderBy("chat.createdAt", "DESC")
      .take(limit);

    if (before) {
      queryBuilder.andWhere("chat.createdAt < :before", { before });
    }

    const messages = await queryBuilder.getMany();

    // Return in ascending order (oldest first)
    return messages.reverse();
  }

  /**
   * Create a new chat message
   */
  async createMessage(data: CreateMessageDto): Promise<ChatMessage> {
    const message = this.chatRepository.create(data);
    return this.chatRepository.save(message);
  }

  /**
   * Delete a chat message (moderation)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const result = await this.chatRepository.delete(messageId);
    return result.affected !== 0;
  }

  /**
   * Get a single message by ID
   */
  async findOne(messageId: string): Promise<ChatMessage | null> {
    return this.chatRepository.findOne({
      where: { id: messageId },
      relations: ["user"],
    });
  }

  /**
   * Get message count for a session
   */
  async getMessageCount(sessionId: string): Promise<number> {
    return this.chatRepository.count({
      where: { sessionId },
    });
  }
}
