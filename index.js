const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());              // allow requests from front-end
app.use(express.json());      // read JSON bodies

app.post('/login', (req, res) => {
    res.send({ message: "Hello world" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});