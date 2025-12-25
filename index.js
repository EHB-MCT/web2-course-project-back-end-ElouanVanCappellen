const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

const { connectDB, getDB } = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

connectDB().catch(err => {
    console.error(err);
    process.exit(1);
});

app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send(new Error("Missing email or password"));
        }

        const db = getDB();
        const users = db.collection("users");

        // Optional but smart: prevent duplicates
        const existing = await users.findOne({ email });
        if (existing) {
            return res.status(409).send(new Error("User already exists"));
        }

        bcrypt.hash(password, 10, async (err, hash) => {
            if (err) return res.status(500).send(new Error("Hashing failed"));

            await users.insertOne({ email, password: hash });
            res.send({ message: "Register succesful" });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send(new Error("Server error"));
    }
});