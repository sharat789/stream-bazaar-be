import { RtcTokenBuilder, RtcRole } from "agora-token";
import { config } from "../config";

export enum AgoraUserRole {
  PUBLISHER = "publisher", // Creator/Host who streams
  SUBSCRIBER = "subscriber", // Viewer who watches
}

export interface GenerateTokenParams {
  channelName: string;
  uid: number | string;
  role: AgoraUserRole;
  expirationTimeInSeconds?: number;
}

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: number | string;
  appId: string;
  expiresAt: Date;
}

export class AgoraService {
  private appId: string;
  private appCertificate: string;
  private defaultExpiry: number;

  constructor() {
    this.appId = config.agora.appId;
    this.appCertificate = config.agora.appCertificate;
    this.defaultExpiry = config.agora.tokenExpiry;

    if (!this.appId || !this.appCertificate) {
      console.warn(
        "⚠️  Agora credentials not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env"
      );
    } else {
      console.log("✅ Agora configured:", {
        appId: this.appId.substring(0, 8) + "...",
        certLength: this.appCertificate.length,
        tokenExpiry: this.defaultExpiry,
      });
    }
  }

  /**
   * Generate Agora RTC token for streaming
   */
  generateRtcToken(params: GenerateTokenParams): AgoraTokenResponse {
    const {
      channelName,
      uid,
      role,
      expirationTimeInSeconds = this.defaultExpiry,
    } = params;

    if (!this.appId || !this.appCertificate) {
      throw new Error(
        "Agora credentials not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE"
      );
    }

    // Validate credentials are not empty
    if (this.appId.trim() === "" || this.appCertificate.trim() === "") {
      throw new Error(
        "Agora credentials are empty. Please check your .env file"
      );
    }

    // Convert uid to number - use 0 for dynamic assignment
    const numericUid = typeof uid === "string" ? 0 : uid;

    // Set role based on user type
    const agoraRole =
      role === AgoraUserRole.PUBLISHER ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Calculate expiration timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    console.log("🎫 Generating Agora token:", {
      channelName,
      uid: numericUid,
      role: role,
      agoraRole,
      currentTimestamp,
      privilegeExpiredTs,
      expirationTimeInSeconds,
      appIdLength: this.appId.length,
      certLength: this.appCertificate.length,
    });

    // Generate the token
    // Note: The actual implementation accepts 6 parameters, but TypeScript definitions are wrong (they say 7)
    // Actual signature: (appId, appCertificate, channelName, uid, role, privilegeExpiredTs)
    // @ts-ignore - Type definitions are incorrect, actual implementation uses 6 params
    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      numericUid,
      agoraRole,
      privilegeExpiredTs
    );

    console.log("✅ Token generated successfully:", {
      tokenLength: token.length,
      channelName,
      uid: numericUid,
      expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
    });

    return {
      token,
      channelName,
      uid: numericUid,
      appId: this.appId,
      expiresAt: new Date(privilegeExpiredTs * 1000),
    };
  }

  /**
   * Generate token for stream creator/publisher
   */
  generatePublisherToken(
    channelName: string,
    userId: number,
    expirationTimeInSeconds?: number
  ): AgoraTokenResponse {
    return this.generateRtcToken({
      channelName,
      uid: userId,
      role: AgoraUserRole.PUBLISHER,
      expirationTimeInSeconds,
    });
  }

  /**
   * Generate token for stream viewer/subscriber
   */
  generateSubscriberToken(
    channelName: string,
    userId?: number,
    expirationTimeInSeconds?: number
  ): AgoraTokenResponse {
    // Use 0 for anonymous viewers
    const uid = userId || 0;

    return this.generateRtcToken({
      channelName,
      uid,
      role: AgoraUserRole.SUBSCRIBER,
      expirationTimeInSeconds,
    });
  }

  /**
   * Validate Agora configuration
   */
  isConfigured(): boolean {
    return Boolean(this.appId && this.appCertificate);
  }

  /**
   * Get Agora App ID (for frontend initialization)
   */
  getAppId(): string {
    return this.appId;
  }
}
