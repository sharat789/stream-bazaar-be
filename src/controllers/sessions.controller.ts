import { Request, Response } from "express";
import { SessionService } from "../services/sessions.service";

const sessionService = new SessionService();

export class SessionController {
  async getAll(req: Request, res: Response) {
    try {
      const sessions = await sessionService.findAll();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      const session = await sessionService.findOne(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const session = await sessionService.create(req.body);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ error: "Failed to create session" });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      const session = await sessionService.updateStatus(req.params.id, status);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(400).json({ error: "Failed to update session" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const success = await sessionService.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  }
}
