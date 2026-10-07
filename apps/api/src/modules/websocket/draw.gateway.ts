import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WebSocketEventType } from '@nati-lotto/shared-types';
import { DrawsService } from '../draws/draws.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class DrawGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DrawGateway.name);
  private latestWebcamFrame: string | null = null;
  private chatMessages: any[] = [];
  private isWebcamBroadcasting = false;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.broadcastWatchersCount();
  }

  private getLiveWatchersCount(): number {
    try {
      const room = this.server?.sockets?.adapter?.rooms?.get('live:broadcast');
      return room ? room.size : 0;
    } catch {
      return 0;
    }
  }

  private broadcastWatchersCount() {
    try {
      const count = this.getLiveWatchersCount();
      this.server?.to('live:broadcast')?.emit('live:watchers_count', { count });
    } catch (e) {
      // ignore
    }
  }

  @SubscribeMessage('draw:join_live')
  handleJoinLiveRoom(@ConnectedSocket() client: Socket) {
    client.join('live:broadcast');
    const count = this.getLiveWatchersCount();
    this.logger.log(`Client ${client.id} joined live:broadcast room. Total watchers: ${count}`);

    // Send initial live state to this newly connected spectator
    client.emit('live:initial_sync', {
      latestFrame: this.latestWebcamFrame,
      isWebcamBroadcasting: this.isWebcamBroadcasting,
      chatMessages: this.chatMessages,
      watchersCount: count,
    });

    this.broadcastWatchersCount();
    return { event: 'live:joined', data: { watchersCount: count } };
  }

  @SubscribeMessage('draw:leave_live')
  handleLeaveLiveRoom(@ConnectedSocket() client: Socket) {
    client.leave('live:broadcast');
    this.broadcastWatchersCount();
    return { event: 'live:left' };
  }

  // Real-time Webcam Video Frame Relay (Admin -> Spectators across all ports/origins)
  @SubscribeMessage('webcam:frame')
  handleWebcamFrame(@ConnectedSocket() client: Socket, @MessageBody() data: { frame: string }) {
    if (data?.frame) {
      this.latestWebcamFrame = data.frame;
      this.isWebcamBroadcasting = true;
      DrawsService.setLatestWebcamFrame(data.frame);
      // Broadcast to all clients in the live broadcast room
      client.broadcast.to('live:broadcast').emit('webcam:frame', data.frame);
    }
  }

  @SubscribeMessage('webcam:status')
  handleWebcamStatus(@ConnectedSocket() client: Socket, @MessageBody() data: { isLive: boolean }) {
    this.isWebcamBroadcasting = !!data?.isLive;
    if (!this.isWebcamBroadcasting) {
      this.latestWebcamFrame = null;
      DrawsService.setWebcamLive(false);
    } else {
      DrawsService.setWebcamLive(true);
    }
    this.server.to('live:broadcast').emit('webcam:status', data);
  }

  // Real Live Chat (No fake simulated comments)
  @SubscribeMessage('live:chat_send')
  handleLiveChatMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { sender: string; text: string; badge?: string }) {
    if (!data?.text || !data.text.trim()) return;

    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      sender: data.sender?.trim() || 'Player_' + client.id.substr(0, 4),
      text: data.text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      badge: data.badge || 'PLAYER',
    };

    this.chatMessages = [...this.chatMessages.slice(-49), msg];
    this.server.to('live:broadcast').emit('live:chat_message', msg);
  }

  // Live Floating Reactions
  @SubscribeMessage('live:reaction')
  handleLiveReaction(@MessageBody() data: { emoji: string }) {
    if (data?.emoji) {
      this.server.to('live:broadcast').emit('live:reaction', data);
    }
  }

  // Manually Drawn Winner Broadcast
  @SubscribeMessage('live:announce_winner')
  handleAnnounceWinner(@MessageBody() data: { ticketNumber: string; winnerName: string; permitNumber: string }) {
    this.server.to('live:broadcast').emit('live:manual_winner_announced', data);
  }

  @SubscribeMessage('draw:join')
  handleJoinDraw(@ConnectedSocket() client: Socket, @MessageBody() data: { drawId: string }) {
    client.join(`draw:${data.drawId}`);
    this.logger.log(`Client ${client.id} joined draw room: draw:${data.drawId}`);
    return { event: 'draw:joined', data: { drawId: data.drawId } };
  }

  @SubscribeMessage('draw:leave')
  handleLeaveDraw(@ConnectedSocket() client: Socket, @MessageBody() data: { drawId: string }) {
    client.leave(`draw:${data.drawId}`);
    this.logger.log(`Client ${client.id} left draw room: draw:${data.drawId}`);
    return { event: 'draw:left', data: { drawId: data.drawId } };
  }

  // Authoritative Broadcast methods called by Backend Services
  broadcastTicketsUpdated(drawId: string, payload: any) {
    this.server.to(`draw:${drawId}`).emit(WebSocketEventType.DRAW_TICKETS_UPDATED, payload);
    this.server.emit('global:tickets_updated', payload);
  }

  broadcastCountdownTick(drawId: string, remainingSeconds: number) {
    this.server.to(`draw:${drawId}`).emit(WebSocketEventType.DRAW_COUNTDOWN_TICK, {
      drawId,
      remainingSeconds,
      serverTimestamp: Date.now(),
    });
  }

  broadcastLiveDrawStarted(drawId: string, payload: any) {
    this.server.to(`draw:${drawId}`).emit(WebSocketEventType.DRAW_STARTED, payload);
  }

  broadcastLiveDrawRolling(drawId: string, durationMs: number = 3500) {
    this.server.to(`draw:${drawId}`).emit(WebSocketEventType.DRAW_ROLLING, {
      drawId,
      durationMs,
    });
  }

  broadcastWinnerAnnounced(drawId: string, payload: any) {
    this.server.to(`draw:${drawId}`).emit(WebSocketEventType.DRAW_WINNER_ANNOUNCED, payload);
    this.server.emit('global:winner_announced', payload);
  }
}
