// this code whas written with the help of Chatgpt and adapted by Elouan Van Cappellen
// ChatGpt link: https://chatgpt.com/share/69551b13-8c54-8010-bcac-270038e8f18b

require('dotenv').config();
const { MongoClient } = require('mongodb');

let db = null;
let client = null;

async function connectDB() {
    const mongoUri = process.env.MONGO_URI;
    const dbName = process.env.DB_NAME || 'Web2_courseproject';

    if (!mongoUri) {
        throw new Error('Missing MONGO_URI environment variable');
    }

    client = new MongoClient(mongoUri);
    await client.connect();

    db = client.db(dbName);
    console.log('Connected to MongoDB:', db.databaseName);

    return db;
}

function getDB() {
    if (!db) throw new Error("Database not connected yet");
    return db;
}

module.exports = { connectDB, getDB };