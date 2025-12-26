const { MongoClient } = require('mongodb');
const { mongoUri } = require('./config');

let db = null;

async function connectDB() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db("Web2_courseproject");
    console.log("Connected to MongoDB");
    return db;
}

function getDB() {
    if (!db) throw new Error("Database not connected yet");
    return db;
}

module.exports = { connectDB, getDB };