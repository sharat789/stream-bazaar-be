import { AppDataSource } from "../data-source";
import { Session } from "../entity/Session";

export class SessionService {
  private sessionRepository = AppDataSource.getRepository(Session);

  async findAll(): Promise<Session[]> {
    return this.sessionRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<Session | null> {
    return this.sessionRepository.findOne({ where: { id } });
  }

  async create(data: Partial<Session>): Promise<Session> {
    const session = this.sessionRepository.create(data);
    return this.sessionRepository.save(session);
  }

  async updateStatus(id: string, status: string): Promise<Session | null> {
    await this.sessionRepository.update(id, { status });
    return this.findOne(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sessionRepository.delete(id);
    return result.affected !== 0;
  }
}
