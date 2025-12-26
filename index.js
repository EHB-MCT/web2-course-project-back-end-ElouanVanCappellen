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
        console.log("Using DB:", db.databaseName);
        const users = db.collection("users");

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

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(req.body);

        if (!email || !password) {
            return res.status(400).send(new Error("Missing email or password"));
        }

        const db = getDB();
        console.log("Using DB:", db.databaseName);
        const users = db.collection("users");

        const user = await users.findOne({ email });

        if (!user) {
            return res.status(401).send(new Error("Invalid credentials"));
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) return res.status(500).send(new Error("Compare failed"));

            if (result === true) {
                // send user info (don’t send password hash back)
                res.send({ email: user.email, message: "Login succesful" });
            } else {
                res.status(401).send(new Error("Invalid credentials"));
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).send(new Error("Server error"));
    }
});

app.get('/routes/:id', async (req, res) => {
    try {
        const db = getDB();
        const routesCol = db.collection('Routes');

        let id;
        try {
            id = new ObjectId(req.params.id);
        } catch {
            return fail(res, 400, 'Invalid route id');
        }

        const route = await routesCol.findOne({ _id: id });
        if (!route) {
            return fail(res, 404, 'Route not found');
        }

        return ok(res, { route });
    } catch (err) {
        console.error(err);
        return fail(res, 500, 'Server error');
    }
});

app.post('/routes', async (req, res) => {
    try {
        const {
            name,
            city,
            distance_km,
            elevation_m,
            creator,
            description,
            checkpoints,
        } = req.body;

        if (!name || !city || distance_km == null || elevation_m == null || !creator || !checkpoints) {
            return fail(res, 400, 'Missing name, city, distance_km, elevation_m, creator or checkpoints');
        }

        if (!Array.isArray(checkpoints) || checkpoints.length < 2) {
            return fail(res, 400, 'Checkpoints must be an array with at least 2 items');
        }

        for (const cp of checkpoints) {
            if (!cp.name || cp.latitude == null || cp.longitude == null || cp.order == null) {
                return fail(res, 400, 'Checkpoints must include name, latitude, longitude and order');
            }
        }

        const db = getDB();
        const routesCol = db.collection('Routes');

        const doc = {
            name,
            city,
            distance_km: parseFloat(distance_km),
            elevation_m: parseFloat(elevation_m),
            creator,
            description: description || '',
            checkpoints,
            popularity: 0,
            created_at: new Date(),
        };

        const result = await routesCol.insertOne(doc);

        return ok(res, { message: 'Route created', route_id: result.insertedId }, 201);
    } catch (err) {
        console.error(err);
        return fail(res, 500, 'Server error');
    }
});

app.put('/routes/:id', async (req, res) => {
    try {
        const updates = req.body;
        if (!updates || Object.keys(updates).length === 0) {
            return fail(res, 400, 'No fields provided to update');
        }

        const db = getDB();
        const routesCol = db.collection('Routes');

        let id;
        try {
            id = new ObjectId(req.params.id);
        } catch {
            return fail(res, 400, 'Invalid route id');
        }

        const result = await routesCol.updateOne({ _id: id }, { $set: updates });

        if (result.matchedCount === 0) {
            return fail(res, 404, 'Route not found');
        }

        return ok(res, { message: 'Route updated' });
    } catch (err) {
        console.error(err);
        return fail(res, 500, 'Server error');
    }
});
