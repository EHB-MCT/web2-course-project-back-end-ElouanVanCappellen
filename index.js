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
