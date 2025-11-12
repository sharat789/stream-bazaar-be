import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/users.service";

export class UserController {
  private userService = new UserService();

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await this.userService.findAll();
      res.json({
        success: true,
        data: users,
        count: users.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const user = await this.userService.findOne(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "name, email, and password are required",
        });
      }

      const userData = {
        name,
        email,
        password, // Note: In production, hash this password before saving!
        role: role || "user",
      };

      const savedUser = await this.userService.create(userData);

      res.status(201).json({
        success: true,
        data: savedUser,
        message: "User created successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const { name, email, password, role } = req.body;

      const user = await this.userService.findOne(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const updateData: Partial<typeof user> = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (password) updateData.password = password; // Note: Hash in production!
      if (role) updateData.role = role;

      const updatedUser = await this.userService.update(id, updateData);

      res.json({
        success: true,
        data: updatedUser,
        message: "User updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const user = await this.userService.findOne(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const deleted = await this.userService.delete(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete user",
        });
      }

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
