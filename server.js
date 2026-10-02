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
// CREATE ORDERS TABLES
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
// CREATE ORDER
// CREATE ORDER
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

        if (!name || price === undefined) {
            return res.status(400).json({
                message: "Product name and price are required"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO products
            (name, description, price, image, category, stock)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,
            [
                name,
                description || "",
                Number(price),
                image || "",
                category || "Other",
                Number(stock) || 0
            ]
        );

        res.status(201).json({
            message: "Product added successfully",
            product: result.rows[0]
        });

    } catch (error) {
        console.error("ADD PRODUCT ERROR:", error);

        res.status(500).json({
            message: "Failed to add product",
            error: error.message
        });
    }
});

        // Create order
        const orderResult = await client.query(
            `
            INSERT INTO orders
            (customer_name, phone, address, total)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [
                customer_name,
                phone,
                address || "",
                total
            ]
        );

        const order = orderResult.rows[0];

        // Save order items and reduce stock
        for (const item of orderItems) {

            await client.query(
                `
                INSERT INTO order_items
                (order_id, product_id, product_name, price, quantity)
                VALUES ($1, $2, $3, $4, $5)
                `,
                [
                    order.id,
                    item.product_id,
                    item.product_name,
                    item.price,
                    item.quantity
                ]
            );

            await client.query(
                `
                UPDATE products
                SET stock = stock - $1
                WHERE id = $2
                `,
                [
                    item.quantity,
                    item.product_id
                ]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Order created successfully!",
            order: order,
            items: orderItems
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(error);

        res.status(500).json({
            message: "Failed to create order",
            error: error.message
        });

    } finally {

        client.release();

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
