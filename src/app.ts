/* eslint-disable @typescript-eslint/no-unused-vars */
import express from 'express';
import mongoose from 'mongoose';
import helmet, { HelmetOptions } from 'helmet';
import cors, { CorsOptions } from 'cors';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';

import homeRoutes from './routes/home';
import AdminsProtocol from './interfaces/adminsProtocol';
import UsersProtocol from './interfaces/usersProtocol';
import AdminErrorProtocol from './interfaces/adminErrorProtocol';
import AdminAskProtocol from './interfaces/adminAskProtocol';
import AdminExcludeProtocol from './interfaces/adminExcludeProtocol';
import AdminFinishProtocol from './interfaces/adminFinishProtocol';

class App {
  private allowOrigins = [
    'http://localhost:3000',
    'https://mcaccountslogin.vercel.app',
  ];
  private app = express();
  public server = http.createServer(this.app);
  private io = new SocketIoServer(this.server, {
    cors: {
      origin: this.allowOrigins,
    },
  });
  private admins: AdminsProtocol[] = [];
  private onlineUsers: UsersProtocol[] = [];

  constructor() {
    this.middlewares();
    this.routes();
    this.route404();
    this.initializeSocket();
  }

  private async middlewares() {
    this.app.use(cors(this.corsOptions()));
    this.app.use(helmet(this.helmetPolicy()));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    // await this.connectDb();
  }

  private routes() {
    this.app.use('/', homeRoutes);
  }

  private route404() {
    this.app.use((req, res, next) => {
      res.status(404).json({ error: { message: 'Route not found' } });
    });
  }

  private initializeSocket() {
    this.io.on('connection', async socket => {
      socket.on('admin-register', () => {
        this.admins.push({
          id: socket.id,
          online: true,
        });
        this.admins.forEach(item =>
          this.io.to(item.id).emit('admin', this.onlineUsers)
        );
        // socket.broadcast.emit('server-admin-is-online', this.admin.online);
      });

      socket.on('admin-error', (data: AdminErrorProtocol) => {
        const { socketId, status } = data;
        this.onlineUsers = this.onlineUsers.map(item => {
          return item.socketId === socketId ? { ...item, socketId, status } : item; // eslint-disable-line
        });
        this.io.to(socketId).emit('client-error', data);
        this.admins.forEach(item =>
          this.io.to(item.id).emit('admin', this.onlineUsers)
        );
        // socket.emit('admin-error', data);
      });

      socket.on('admin-ask', (data: AdminAskProtocol) => {
        const { socketId, status, verification, sms, phone, email } = data;
        this.onlineUsers = this.onlineUsers.map(item => {
          if (item.socketId === socketId) {
            return { ...item, socketId, status, verification, sms, phone, email } // eslint-disable-line
          }
          return item;
        });
        this.io.to(socketId).emit('client-ask', data);
        this.admins.forEach(item =>
          this.io.to(item.id).emit('admin', this.onlineUsers)
        );
      });

      socket.on('admin-exclude', (data: AdminExcludeProtocol) => {
        const { socketId } = data;
        this.onlineUsers = this.onlineUsers.filter(
          item => item.socketId !== socketId
        );
        this.io.to(socketId).emit('client-exclude', data);
        this.admins.forEach(item =>
          this.io.to(item.id).emit('admin', this.onlineUsers)
        );
        // socket.emit('admin-exclude', data);
      });

      socket.on('admin-finish', (data: AdminFinishProtocol) => {
        const { socketId } = data;
        this.onlineUsers = this.onlineUsers.map(item =>
          item.socketId === socketId ? { ...item, status: 'finalizado' } : item
        );
        this.io.to(socketId).emit('client-finish', data);
        this.admins.forEach(item =>
          this.io.to(item.id).emit('admin', this.onlineUsers)
        );
        // socket.emit('admin-exclude', data);
      });

      socket.on('client', (data: UsersProtocol) => {
        const socketId = socket.id;
        const clientIndex = this.onlineUsers.findIndex(
          item => item.socketId === socketId
        );

        if (clientIndex !== -1) {
          this.onlineUsers[clientIndex] = { ...data, socketId };
        } else {
          this.onlineUsers.unshift({ ...data, socketId });
        }

        if (this.admins.length) {
          this.admins.forEach(item =>
            this.io.to(item.id).emit('admin', this.onlineUsers)
          );
        }
      });

      socket.on('disconnect', () => {
        const socketId = socket.id;
        this.onlineUsers = this.onlineUsers
          .map(item => {
            if (item.socketId === socketId &&  item.user !== '-') return { ...item, status: 'offline' }; // eslint-disable-line
            if (item.socketId === socketId &&  item.user === '-') return undefined; // eslint-disable-line
            return item;
          })
          .filter(item => item !== undefined) as UsersProtocol[];

        this.admins = this.admins.filter(item => item.id !== socketId);
        this.admins.forEach(item =>
          this.io.to(item.id).emit('admin', this.onlineUsers)
        );
      });
    });
  }

  private async connectDb() {
    try {
      await mongoose.connect(process.env.MONGODB_URL as string);
    } catch (err) {
      console.error('Erro ao conectar na base de dados');
    }
  }

  private helmetPolicy(): Readonly<HelmetOptions> | undefined {
    return {
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    };
  }

  private corsOptions() {
    const options: CorsOptions = {
      origin: (origin, cb) => {
        if (!origin || this.allowOrigins.includes(origin)) {
          //  Request from localhost will pass
          cb(null, true);
          return;
        }
        // Generate an error on other origins, disabling access
        cb(new Error('You are not authorized :)'), false);
      },
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
    return options;
  }
}

export const server = new App().server;
