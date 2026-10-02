const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test API
app.get("/", (req, res) => {
    res.json({
        message: "ShopNamimi API is running!"
    });
});
// GET ALL PRODUCTS
app.get("/api/products", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to get products",
            error: error.message
        });
    }
});

// GET ONE PRODUCT
app.get("/api/products/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM products WHERE id = $1",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to get product",
            error: error.message
        });
    }
});

// ADD PRODUCT
app.post("/api/products", async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            image,
            category,
            stock
        } = req.body;

        const result = await pool.query(
            `INSERT INTO products
            (name, description, price, image, category, stock)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                name,
                description,
                price,
                image,
                category,
                stock
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to add product",
            error: error.message
        });
    }
});
// Test database
app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "PostgreSQL connected successfully!",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`ShopNamimi API running on port ${PORT}`);
});
