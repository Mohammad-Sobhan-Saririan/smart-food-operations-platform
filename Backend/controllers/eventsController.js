import { addClient, removeClient } from '../services/sseService.js';

export const eventsHandler = (req, res) => {
    const userId = req.user.id;

    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    addClient(userId, res);

    // --- NEW: Heartbeat Interval ---
    // Send a comment every 25 seconds to keep the connection alive
    const heartbeatInterval = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
        // When the client disconnects, clear the interval and remove the client
        clearInterval(heartbeatInterval);
        removeClient(userId);
    });
};