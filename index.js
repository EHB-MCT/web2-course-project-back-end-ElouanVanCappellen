const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());              // allow requests from front-end
app.use(express.json());      // read JSON bodies
