import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import ejs from 'ejs';
import path from 'path';
import logger from '../logger.js';
import { __dirname } from '../main.js';

let connectedClients: Map<string, FastifyReply> = new Map();

export async function eventRoutes(app: FastifyInstance)
{
    app.get('/notify',(request: FastifyRequest, reply: FastifyReply) => {
    
        const query = request.query as { token?: string };
        const token = query.token;
    
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Transfer-Encoding': 'identity'
        });
    
        // Send an initial "connected" message
        reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
        // Function to send events
        const sendEvent = async (page: string, data: any) => {
            try {
                ejs.renderFile(path.join(__dirname, `../../front/layouts/partial/${page}.ejs`), data, (err, str) => {
                    if (err) {
                        logger.error("Error rendering view:", err);
                        reply.raw.write(`data: ${JSON.stringify({ err })}\n\n`);
                    } else {
                        reply.raw.write(`data: ${JSON.stringify({ html: str })}\n\n`);
                    }
                });
            } catch (err) {
                logger.error("Error rendering view:", err);
                reply.raw.write(`data: ${JSON.stringify({ err })}\n\n`);
            }
        };
        
        console.log('notify', request.id, token);
    
        sendEvent('popup', { type: 'notify', title: 'Connection established', description: 'Please log in or register', color: 'red', callback: '' });
        sendEvent('popup', { type: 'notify', title: 'EERRRRMMM', description: 'saur traur', color: 'green', callback: '' });
    
        if (token)
            connectedClients.set(request.id, reply);
    
        request.raw.on('close', () => {
            if (token)
                connectedClients.delete(request.id);
            reply.raw.end();
        });
    
        // Log SSE errors
        reply.raw.on('error', (err) => {
            app.log.error('SSE error:', err);
        });
    });
}

export function eventSendToAll(data: any)
{
    connectedClients.forEach((client) => {
        client.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

export function eventSendToClient(userId: string, data: any)
{
    const client = connectedClients.get(userId);
    if (client) {
        client.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    } else {
        console.error(`Client with userId ${userId} not found.`);
    }
};