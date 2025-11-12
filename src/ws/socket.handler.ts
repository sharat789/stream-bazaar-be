import { Server as SocketIOServer, Socket } from "socket.io";

export const setupSocketHandlers = (io: SocketIOServer) => {
  const viewerCounts = new Map<string, number>();

  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    // Join a session
    socket.on("join-session", (sessionId: string) => {
      socket.join(sessionId);
      const count = (viewerCounts.get(sessionId) || 0) + 1;
      viewerCounts.set(sessionId, count);
      console.log(`User joined session ${sessionId}. Count: ${count}`);
      io.to(sessionId).emit("viewer-count", count);
    });

    // Leave a session
    socket.on("leave-session", (sessionId: string) => {
      socket.leave(sessionId);
      const count = Math.max(0, (viewerCounts.get(sessionId) || 1) - 1);
      viewerCounts.set(sessionId, count);
      console.log(`User left session ${sessionId}. Count: ${count}`);
      io.to(sessionId).emit("viewer-count", count);
    });

    // Handle reactions
    socket.on(
      "send-reaction",
      ({ sessionId, type }: { sessionId: string; type: string }) => {
        console.log(`Reaction received: ${type} in session ${sessionId}`);
        io.to(sessionId).emit("new-reaction", { type, timestamp: new Date() });
      }
    );

    // Disconnect
    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};
