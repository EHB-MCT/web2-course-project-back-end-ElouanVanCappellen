require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

const { connectDB, getDB } = require('./db');
const { ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

connectDB().catch(err => {
    console.error(err);
    process.exit(1);
});

function ok(res, data = {}, status = 200) {
    return res.status(status).json(data);
}

function fail(res, status = 400, message = "Error") {
    return res.status(status).json({ error: message });
}

app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ error: "Missing email, username or password" });
        }

        const db = getDB();
        const users = db.collection("users");

        // Check if email already exists
        const existingEmail = await users.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ error: "Email already registered" });
        }

        // Check if username already exists
        const existingUsername = await users.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({ error: "Username already taken" });
        }

        const hash = await bcrypt.hash(password, 10);

        await users.insertOne({
            email,
            username,
            password: hash,
            created_at: new Date()
        });

        return res.json({ message: "Register successful" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});


app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send(new Error("Missing email or password"));
        }

        const db = getDB();
        const users = db.collection("users");

        const user = await users.findOne({ email });

        if (!user) {
            return res.status(401).send(new Error("Invalid credentials"));
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) return res.status(500).send(new Error("Compare failed"));

            if (result === true) {
                // send user info (don’t send password hash back)
                res.send({ email: user.email, username: user.username, message: "Login succesful" });
            } else {
                res.status(401).send(new Error("Invalid credentials"));
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).send(new Error("Server error"));
    }
});

app.get('/routes', async (req, res) => {
    try {
        const { sortBy, city } = req.query;

        const allowedSort = ['distance', 'date', 'popularity'];
        if (sortBy && !allowedSort.includes(sortBy)) {
            return fail(res, 400, 'Invalid sortBy. Use distance, date or popularity.');
        }

        const db = getDB();
        const routesCol = db.collection('Routes');

        const filter = {};
        if (city) filter.city = city;

        let cursor = routesCol.find(filter);

        if (sortBy === 'distance') cursor = cursor.sort({ distance_km: 1 });
        if (sortBy === 'date') cursor = cursor.sort({ created_at: -1 });
        if (sortBy === 'popularity') cursor = cursor.sort({ popularity: -1 });

        const routes = await cursor.toArray();
        return ok(res, { routes });
    } catch (err) {
        console.error(err);
        return fail(res, 500, 'Server error');
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
            likedBy: [],
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

app.delete('/routes/:id', async (req, res) => {
    try {
        const db = getDB();
        const routesCol = db.collection('Routes');

        let id;
        try {
            id = new ObjectId(req.params.id);
        } catch {
            return fail(res, 400, 'Invalid route id');
        }

        const result = await routesCol.deleteOne({ _id: id });

        if (result.deletedCount === 0) {
            return fail(res, 404, 'Route not found');
        }

        return ok(res, { message: 'Route deleted' });
    } catch (err) {
        console.error(err);
        return fail(res, 500, 'Server error');
    }
});

app.post('/routes/:id/like', async (req, res) => {
    try {
        const { user } = req.body;

        if (!user) {
            return fail(res, 400, "Missing user identifier");
        }

        const db = getDB();
        const routesCol = db.collection("Routes");

        let id;
        try {
            id = new ObjectId(req.params.id);
        } catch {
            return fail(res, 400, "Invalid route id");
        }

        // Only add if user has NOT liked before
        const result = await routesCol.updateOne(
            { _id: id, likedBy: { $ne: user } },
            {
                $addToSet: { likedBy: user },
                $inc: { popularity: 1 }
            }
        );

        if (result.matchedCount === 0) {
            return ok(res, { message: "Already liked or route not found" });
        }

        return ok(res, { message: "Route liked" });
    } catch (err) {
        console.error(err);
        return fail(res, 500, "Server error");
    }
});

app.delete('/routes/:id/like', async (req, res) => {
    try {
        const { user } = req.body;

        if (!user) {
            return fail(res, 400, "Missing user identifier");
        }

        const db = getDB();
        const routesCol = db.collection("Routes");

        let id;
        try {
            id = new ObjectId(req.params.id);
        } catch {
            return fail(res, 400, "Invalid route id");
        }

        // Only remove if user HAS liked before
        const result = await routesCol.updateOne(
            { _id: id, likedBy: user },
            {
                $pull: { likedBy: user },
                $inc: { popularity: -1 }
            }
        );

        if (result.matchedCount === 0) {
            return ok(res, { message: "Not liked yet or route not found" });
        }

        // Prevent popularity going negative
        await routesCol.updateOne(
            { _id: id, popularity: { $lt: 0 } },
            { $set: { popularity: 0 } }
        );

        return ok(res, { message: "Route unliked" });
    } catch (err) {
        console.error(err);
        return fail(res, 500, "Server error");
    }
});


app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});