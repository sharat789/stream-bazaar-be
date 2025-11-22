import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Session } from "../entity/Session";

export class UserService {
  private userRepository = AppDataSource.getRepository(User);
  private sessionRepository = AppDataSource.getRepository(Session);

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { id: "ASC" },
    });
  }

  async findLiveUsers(): Promise<any[]> {
    // Find all users who have active live sessions
    const liveSessions = await this.sessionRepository.find({
      where: { status: "live" },
      relations: ["creator"],
      order: { startedAt: "DESC" },
    });

    // Transform to include user with their live session
    const liveUsers = liveSessions.map((session) => ({
      id: session.creator.id,
      username: session.creator.username,
      email: session.creator.email,
      role: session.creator.role,
      createdAt: session.creator.createdAt,
      updatedAt: session.creator.updatedAt,
      liveSession: {
        id: session.id,
        title: session.title,
        description: session.description,
        category: session.category,
        tags: session.tags,
        status: session.status,
        startedAt: session.startedAt,
        agoraChannelName: session.agoraChannelName,
      },
    }));

    return liveUsers;
  }

  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, data);
    return this.findOne(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return result.affected !== 0;
  }
}
