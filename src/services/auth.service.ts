import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { AuthUtils, JwtPayload } from "../utils/auth.utils";

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Register a new user
   */
  async register(data: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await AuthUtils.hashPassword(data.password);

    // Create user
    const user = this.userRepository.create({
      username: data.username,
      email: data.email,
      password: hashedPassword,
      role: data.role || "user",
    });

    const savedUser = await this.userRepository.save(user);

    // Generate tokens
    const payload: JwtPayload = {
      userId: savedUser.id,
      username: savedUser.username,
      role: savedUser.role,
    };

    const accessToken = AuthUtils.generateAccessToken(payload);
    const refreshToken = AuthUtils.generateRefreshToken(payload);

    // Save refresh token to database
    await this.userRepository.update(savedUser.id, { refreshToken });

    return {
      user: {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginDto): Promise<AuthResponse> {
    // Find user with password field (normally excluded by select: false)
    const user = await this.userRepository.findOne({
      where: { username: data.username },
      select: ["id", "username", "email", "password", "role"],
    });

    if (!user) {
      throw new Error("Invalid username or password");
    }

    // Verify password
    const isPasswordValid = await AuthUtils.comparePassword(
      data.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new Error("Invalid username or password");
    }

    // Generate tokens
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = AuthUtils.generateAccessToken(payload);
    const refreshToken = AuthUtils.generateRefreshToken(payload);

    // Save refresh token to database
    await this.userRepository.update(user.id, { refreshToken });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Verify refresh token
    let decoded: JwtPayload;
    try {
      decoded = AuthUtils.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }

    // Find user and verify refresh token matches
    const user = await this.userRepository.findOne({
      where: { id: decoded.userId },
      select: ["id", "username", "email", "role", "refreshToken"],
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new Error("Invalid refresh token");
    }

    // Generate new tokens
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const newAccessToken = AuthUtils.generateAccessToken(payload);
    const newRefreshToken = AuthUtils.generateRefreshToken(payload);

    // Update refresh token in database
    await this.userRepository.update(user.id, {
      refreshToken: newRefreshToken,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: number): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
  }

  /**
   * Update user info and password
   */
  async updateUser(
    userId: number,
    updateData: Partial<RegisterDto>
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (updateData.password) {
      updateData.password = await AuthUtils.hashPassword(updateData.password);
    }

    const updatedUser = Object.assign(user, updateData);
    return this.userRepository.save(updatedUser);
  }
}
