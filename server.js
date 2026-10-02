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
app.get("/api/setup-orders", async (req, res) => {
    try {

        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                address TEXT,
                total NUMERIC(12,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                product_id INTEGER,
                product_name VARCHAR(255) NOT NULL,
                price NUMERIC(12,2) NOT NULL,
                quantity INTEGER NOT NULL
            );
        `);

        res.json({
            message: "Orders tables created successfully!"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to create orders tables",
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
app.post("/api/orders", async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            customer_name,
            phone,
            address,
            items
        } = req.body;

        // Check required information
        if (!customer_name || !phone || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Customer name, phone and order items are required"
            });
        }

        await client.query("BEGIN");

        let total = 0;

        const orderItems = [];

        // Check products and calculate total from database
        for (const item of items) {

            const productResult = await client.query(
                "SELECT * FROM products WHERE id = $1",
                [item.product_id]
            );

            if (productResult.rows.length === 0) {
                throw new Error(`Product ${item.product_id} not found`);
            }

            const product = productResult.rows[0];

            const quantity = Number(item.quantity);

            if (!Number.isInteger(quantity) || quantity <= 0) {
                throw new Error("Invalid product quantity");
            }

            if (quantity > product.stock) {
                throw new Error(
                    `${product.name} does not have enough stock`
                );
            }

            const price = Number(product.price);

            total += price * quantity;

            orderItems.push({
                product_id: product.id,
                product_name: product.name,
                price: price,
                quantity: quantity
            });
        }

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
