import { FastifyReply } from 'fastify';

// user id ; reply to send raw messages
export let connectedClients: Map<number, FastifyReply> = new Map();

