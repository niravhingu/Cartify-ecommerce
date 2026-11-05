const pool = require("../../config/db");


// =====================================================
// GET ALL ACTIVE SUBCATEGORIES
// =====================================================
const getAllSubcategories = async (req, res, next) => {
    try {
        // admin screens need inactive ones too; pass ?active=true for the old behaviour
        const onlyActive = String(req.query.active) === "true";

        const result = await pool.query(`
            SELECT
                sc.id,
                sc.name,
                sc.slug,
                sc.category_id,
                c.name AS category_name,
                sc.is_active,
                sc.created_at,
                sc.updated_at,
                (SELECT COUNT(*)::int FROM products p WHERE p.subcategory_id = sc.id) AS product_count
            FROM subcategories sc
            INNER JOIN categories c
                ON sc.category_id = c.id
            ${onlyActive ? "WHERE sc.is_active = true" : ""}
            ORDER BY c.name ASC, sc.name ASC
        `);

        return res.status(200).json({
            message: "Subcategories Fetched Successfully",
            totalSubcategories: result.rows.length,
            subcategories: result.rows
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// GET SUBCATEGORIES BY MAIN CATEGORY
// =====================================================
const getSubcategoriesByCategory = async (req, res, next) => {
    try {
        const { categoryId } = req.params;

        const categoryIdNumber = Number(categoryId);

        if (!Number.isInteger(categoryIdNumber)) {
            return res.status(400).json({
                message: "Invalid Category ID"
            });
        }

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                slug,
                category_id,
                is_active,
                created_at,
                updated_at
            FROM subcategories
            WHERE category_id = $1
            AND is_active = true
            ORDER BY name ASC
            `,
            [categoryIdNumber]
        );

        return res.status(200).json({
            message: "Subcategories Fetched Successfully",
            totalSubcategories: result.rows.length,
            subcategories: result.rows
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// GET SUBCATEGORY BY ID
// =====================================================
const getSubcategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT
                sc.id,
                sc.name,
                sc.slug,
                sc.category_id,
                c.name AS category_name,
                sc.is_active,
                sc.created_at,
                sc.updated_at
            FROM subcategories sc
            INNER JOIN categories c
                ON sc.category_id = c.id
            WHERE sc.id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Subcategory Not Found"
            });
        }

        return res.status(200).json({
            message: "Subcategory Fetched Successfully",
            subcategory: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// CREATE SUBCATEGORY
// =====================================================
const createSubcategory = async (req, res, next) => {
    try {
        const {
            name,
            slug,
            category_id
        } = req.body;


        // -----------------------------
        // VALIDATION
        // -----------------------------
        if (!name || !slug || !category_id) {
            return res.status(400).json({
                message: "Name, slug and category_id are required"
            });
        }


        const categoryIdNumber = Number(category_id);

        if (!Number.isInteger(categoryIdNumber)) {
            return res.status(400).json({
                message: "Invalid category_id"
            });
        }


        // -----------------------------
        // CHECK MAIN CATEGORY
        // -----------------------------
        const categoryCheck = await pool.query(
            `
            SELECT id
            FROM categories
            WHERE id = $1
            AND is_active = true
            `,
            [categoryIdNumber]
        );

        if (categoryCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Main Category Not Found"
            });
        }


        // -----------------------------
        // CHECK DUPLICATE SLUG
        // -----------------------------
        const slugCheck = await pool.query(
            `
            SELECT id
            FROM subcategories
            WHERE slug = $1
            `,
            [slug.trim().toLowerCase()]
        );

        if (slugCheck.rows.length > 0) {
            return res.status(409).json({
                message: "Subcategory slug already exists"
            });
        }


        // -----------------------------
        // INSERT
        // -----------------------------
        const result = await pool.query(
            `
            INSERT INTO subcategories
            (
                name,
                slug,
                category_id
            )
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [
                name.trim(),
                slug.trim().toLowerCase(),
                categoryIdNumber
            ]
        );


        return res.status(201).json({
            message: "Subcategory Created Successfully",
            subcategory: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// UPDATE SUBCATEGORY
// =====================================================
const updateSubcategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const {
            name,
            slug,
            category_id,
            is_active
        } = req.body;


        if (!name || !slug || !category_id) {
            return res.status(400).json({
                message: "Name, slug and category_id are required"
            });
        }


        const categoryIdNumber = Number(category_id);

        if (!Number.isInteger(categoryIdNumber)) {
            return res.status(400).json({
                message: "Invalid category_id"
            });
        }


        // -----------------------------
        // CHECK MAIN CATEGORY
        // -----------------------------
        const categoryCheck = await pool.query(
            `
            SELECT id
            FROM categories
            WHERE id = $1
            AND is_active = true
            `,
            [categoryIdNumber]
        );

        if (categoryCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Main Category Not Found"
            });
        }


        // -----------------------------
        // CHECK SUBCATEGORY
        // -----------------------------
        const subcategoryCheck = await pool.query(
            `
            SELECT id
            FROM subcategories
            WHERE id = $1
            `,
            [id]
        );

        if (subcategoryCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Subcategory Not Found"
            });
        }


        // -----------------------------
        // CHECK DUPLICATE SLUG
        // -----------------------------
        const cleanSlug = slug.trim().toLowerCase();

        const slugCheck = await pool.query(
            `
            SELECT id
            FROM subcategories
            WHERE slug = $1
            AND id != $2
            `,
            [cleanSlug, id]
        );

        if (slugCheck.rows.length > 0) {
            return res.status(409).json({
                message: "Subcategory slug already exists"
            });
        }


        // -----------------------------
        // UPDATE
        // -----------------------------
        const result = await pool.query(
            `
            UPDATE subcategories
            SET
                name = $1,
                slug = $2,
                category_id = $3,
                is_active = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
            `,
            [
                name.trim(),
                cleanSlug,
                categoryIdNumber,
                is_active ?? true,
                id
            ]
        );


        return res.status(200).json({
            message: "Subcategory Updated Successfully",
            subcategory: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// DELETE SUBCATEGORY
// =====================================================
const deleteSubcategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            UPDATE subcategories
            SET
                is_active = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Subcategory Not Found"
            });
        }


        return res.status(200).json({
            message: "Subcategory Deleted Successfully",
            subcategory: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


module.exports = {
    getAllSubcategories,
    getSubcategoriesByCategory,
    getSubcategoryById,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory
};