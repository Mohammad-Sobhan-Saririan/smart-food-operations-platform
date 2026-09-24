// This object will store active connections, mapping userId to the response object
const clients = {};

// Function to send an event to a specific user
export const sendEventToUser = (userId, data) => {
    const client = clients[userId];
    if (client) {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
};

// Function to add a new client (user) to our list
export const addClient = (userId, res) => {
    clients[userId] = { res };
    console.log(`Client connected: ${userId}`);
};

// Function to remove a client when they disconnect
export const removeClient = (userId) => {
    delete clients[userId];
    console.log(`Client disconnected: ${userId}`);
};

export const broadcastEvent = (data, excludeUserId = null) => {
    console.log('Broadcasting event:', data);
    for (const userId in clients) {
        // Only send the event if the user is NOT the one to be excluded
        if (userId !== excludeUserId) {
            clients[userId].res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }
};