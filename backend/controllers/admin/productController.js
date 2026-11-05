const pool = require("../../config/db");

// Image must be empty or a real http(s) URL / site path. Returns the cleaned
// value, null (no image) or false (invalid).
const parseImage = (value) => {
    const v = String(value ?? "").trim();
    if (!v) return null;
    if (v.length > 2000) return false;
    return /^https?:\/\//i.test(v) || v.startsWith("/") ? v : false;
};

// =====================================================
// GET ALL PRODUCTS
// =====================================================
const getAllProducts = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT
                p.id,
                p.product_name,
                p.description,
                p.price,
                p.stock,
                p.image,
                p.created_at,
                p.updated_at,

                p.category_id,
                c.name AS category_name,

                p.subcategory_id,
                s.name AS subcategory_name

            FROM products p

            LEFT JOIN categories c
                ON p.category_id = c.id

            LEFT JOIN subcategories s
                ON p.subcategory_id = s.id

            ORDER BY p.created_at DESC
        `);

        return res.status(200).json({
            message: "Products Fetched Successfully",
            totalProducts: result.rows.length,
            products: result.rows
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// GET PRODUCT BY ID
// =====================================================
const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const productId = Number(id);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const result = await pool.query(`
            SELECT
                p.id,
                p.product_name,
                p.description,
                p.price,
                p.stock,
                p.image,
                p.created_at,
                p.updated_at,

                p.category_id,
                c.name AS category_name,

                p.subcategory_id,
                s.name AS subcategory_name

            FROM products p

            LEFT JOIN categories c
                ON p.category_id = c.id

            LEFT JOIN subcategories s
                ON p.subcategory_id = s.id

            WHERE p.id = $1
        `, [productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Product Not Found"
            });
        }

        return res.status(200).json({
            message: "Product Fetched Successfully",
            product: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// CREATE PRODUCT
// =====================================================
const createProduct = async (req, res, next) => {
    try {
        const {
            product_name,
            description,
            price,
            stock,
            category_id,
            subcategory_id,
            image
        } = req.body;


        // -----------------------------
        // Required fields
        // -----------------------------
        if (!product_name || product_name.trim() === "") {
            return res.status(400).json({
                message: "Product name is required"
            });
        }

        if (price === undefined || price === null || price === "") {
            return res.status(400).json({
                message: "Price is required"
            });
        }

        if (stock === undefined || stock === null || stock === "") {
            return res.status(400).json({
                message: "Stock is required"
            });
        }

        if (category_id === undefined || category_id === null || category_id === "") {
            return res.status(400).json({
                message: "Main category is required"
            });
        }

        if (subcategory_id === undefined || subcategory_id === null || subcategory_id === "") {
            return res.status(400).json({
                message: "Subcategory is required"
            });
        }


        // -----------------------------
        // Convert numbers
        // -----------------------------
        const categoryId = Number(category_id);
        const subcategoryId = Number(subcategory_id);
        const productPrice = Number(price);
        const productStock = Number(stock);


        // -----------------------------
        // Validate numbers
        // -----------------------------
        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            return res.status(400).json({
                message: "Invalid main category"
            });
        }

        if (!Number.isInteger(subcategoryId) || subcategoryId <= 0) {
            return res.status(400).json({
                message: "Invalid subcategory"
            });
        }

        if (Number.isNaN(productPrice) || productPrice < 0) {
            return res.status(400).json({
                message: "Invalid price"
            });
        }

        if (!Number.isInteger(productStock) || productStock < 0) {
            return res.status(400).json({
                message: "Invalid stock"
            });
        }


        const imageUrl = parseImage(image);

        if (imageUrl === false) {
            return res.status(400).json({
                message: "Image must be a valid http(s) URL"
            });
        }

        if (productPrice > 10000000) {
            return res.status(400).json({
                message: "Price is too large"
            });
        }


        // -----------------------------
        // Check Main Category
        // -----------------------------
        const categoryCheck = await pool.query(
            `
            SELECT id
            FROM categories
            WHERE id = $1
              AND is_active = true
            `,
            [categoryId]
        );

        if (categoryCheck.rows.length === 0) {
            return res.status(400).json({
                message: "Selected main category does not exist"
            });
        }


        // -----------------------------
        // Check Subcategory
        // IMPORTANT:
        // Subcategory must belong
        // to selected Main Category
        // -----------------------------
        const subcategoryCheck = await pool.query(
            `
            SELECT id
            FROM subcategories
            WHERE id = $1
              AND category_id = $2
              AND is_active = true
            `,
            [subcategoryId, categoryId]
        );

        if (subcategoryCheck.rows.length === 0) {
            return res.status(400).json({
                message: "Selected subcategory does not belong to selected main category"
            });
        }


        // -----------------------------
        // Insert Product
        // -----------------------------
        const result = await pool.query(
            `
            INSERT INTO products
            (
                product_name,
                description,
                price,
                stock,
                category_id,
                subcategory_id,
                image
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            `,
            [
                product_name.trim(),
                description?.trim() || null,
                productPrice,
                productStock,
                categoryId,
                subcategoryId,
                imageUrl
            ]
        );


        return res.status(201).json({
            message: "Product Created Successfully",
            product: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// UPDATE PRODUCT
// =====================================================
const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        const productId = Number(id);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }


        const {
            product_name,
            description,
            price,
            stock,
            category_id,
            subcategory_id,
            image
        } = req.body;


        // -----------------------------
        // Required fields
        // -----------------------------
        if (!product_name || product_name.trim() === "") {
            return res.status(400).json({
                message: "Product name is required"
            });
        }

        if (price === undefined || price === null || price === "") {
            return res.status(400).json({
                message: "Price is required"
            });
        }

        if (stock === undefined || stock === null || stock === "") {
            return res.status(400).json({
                message: "Stock is required"
            });
        }

        if (category_id === undefined || category_id === null || category_id === "") {
            return res.status(400).json({
                message: "Main category is required"
            });
        }

        if (subcategory_id === undefined || subcategory_id === null || subcategory_id === "") {
            return res.status(400).json({
                message: "Subcategory is required"
            });
        }


        // -----------------------------
        // Convert numbers
        // -----------------------------
        const categoryId = Number(category_id);
        const subcategoryId = Number(subcategory_id);
        const productPrice = Number(price);
        const productStock = Number(stock);


        // -----------------------------
        // Validate numbers
        // -----------------------------
        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            return res.status(400).json({
                message: "Invalid main category"
            });
        }

        if (!Number.isInteger(subcategoryId) || subcategoryId <= 0) {
            return res.status(400).json({
                message: "Invalid subcategory"
            });
        }

        if (Number.isNaN(productPrice) || productPrice < 0) {
            return res.status(400).json({
                message: "Invalid price"
            });
        }

        if (!Number.isInteger(productStock) || productStock < 0) {
            return res.status(400).json({
                message: "Invalid stock"
            });
        }


        // -----------------------------
        // Check Product
        // -----------------------------
        const productCheck = await pool.query(
            `
            SELECT id
            FROM products
            WHERE id = $1
            `,
            [productId]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Product Not Found"
            });
        }


        const imageUrl = parseImage(image);

        if (imageUrl === false) {
            return res.status(400).json({
                message: "Image must be a valid http(s) URL"
            });
        }

        if (productPrice > 10000000) {
            return res.status(400).json({
                message: "Price is too large"
            });
        }


        // -----------------------------
        // Check Main Category
        // -----------------------------
        const categoryCheck = await pool.query(
            `
            SELECT id
            FROM categories
            WHERE id = $1
              AND is_active = true
            `,
            [categoryId]
        );

        if (categoryCheck.rows.length === 0) {
            return res.status(400).json({
                message: "Selected main category does not exist"
            });
        }


        // -----------------------------
        // Check Subcategory
        // -----------------------------
        const subcategoryCheck = await pool.query(
            `
            SELECT id
            FROM subcategories
            WHERE id = $1
              AND category_id = $2
              AND is_active = true
            `,
            [subcategoryId, categoryId]
        );

        if (subcategoryCheck.rows.length === 0) {
            return res.status(400).json({
                message: "Selected subcategory does not belong to selected main category"
            });
        }


        // -----------------------------
        // Update Product
        // -----------------------------
        const result = await pool.query(
            `
            UPDATE products
            SET
                product_name = $1,
                description = $2,
                price = $3,
                stock = $4,
                category_id = $5,
                subcategory_id = $6,
                image = $7,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $8

            RETURNING *
            `,
            [
                product_name.trim(),
                description?.trim() || null,
                productPrice,
                productStock,
                categoryId,
                subcategoryId,
                imageUrl,
                productId
            ]
        );


        return res.status(200).json({
            message: "Product Updated Successfully",
            product: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// DELETE PRODUCT
// =====================================================
const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        const productId = Number(id);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }


        const result = await pool.query(
            `
            DELETE FROM products
            WHERE id = $1
            RETURNING *
            `,
            [productId]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Product Not Found"
            });
        }


        return res.status(200).json({
            message: "Product Deleted Successfully",
            product: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};