const pool = require("../../config/db");

const createCategory = async (req, res, next) => {
    try {
        const {
            name,
            slug,
            description,
            image
        } = req.body;

        const cleanSlug = slugify(slug || name);

        if (!name || !name.trim() || !cleanSlug) {
            return res.status(400).json({
                message: "Category name and slug are required"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO categories (
                name,
                slug,
                description,
                image
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [
                name.trim(),
                cleanSlug,
                description || null,
                image || null
            ]
        );

        return res.status(201).json({
            message: "Category Created Successfully",
            category: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

const slugify = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const getAllCategories = async (req, res, next) => {
    try {
        // ?active=true -> only active categories (used by the "add product" form)
        const onlyActive = String(req.query.active) === "true";

        const result = await pool.query(`
            SELECT
                c.id,
                c.name,
                c.slug,
                c.description,
                c.image,
                c.is_active,
                c.created_at,
                c.updated_at,
                (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id) AS product_count,
                (SELECT COUNT(*)::int FROM subcategories s WHERE s.category_id = c.id) AS subcategory_count
            FROM categories c
            ${onlyActive ? "WHERE c.is_active = true" : ""}
            ORDER BY ${onlyActive ? "c.name ASC" : "c.id DESC"}
        `);

        return res.status(200).json({
            message: "Categories Fetched Successfully",
            totalCategories: result.rows.length,
            categories: result.rows
        });
    } catch (error) {
        next(error);
    }
};

const getCategoryById =async(req , res ,next )=>{
    try{
        const categoryId= Number(req.params.id);
        const result=await pool.query(
            `select 
            id,
            name,
            slug,
            description,
            image,
            is_active,
            created_at,
            updated_at
            FROM categories
            WhERE id = $1 `,[categoryId]
        );
        if (result.rows.length === 0){
            return res.status(404).json({
                message:"Category Not Found"
            });
        }

        return res.status(200).json({
            message:"Category Fetched Successfully",
            category:result.rows[0]
        });

    }
    catch(error){
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const categoryId = Number(req.params.id);

        const {
            name,
            slug,
            description,
            image,
            is_active
        } = req.body;

        if (
            !name ||
            !slug ||
            is_active === undefined
        ) {
            return res.status(400).json({
                message: "Name, slug and status are required"
            });
        }

        const result = await pool.query(
            `
            UPDATE categories
            SET
                name = $1,
                slug = $2,
                description = $3,
                image = $4,
                is_active = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
            `,
            [
                name.trim(),
                slugify(slug),
                description || null,
                image || null,
                Boolean(is_active),
                categoryId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Category Not Found"
            });
        }

        return res.status(200).json({
            message: "Category Updated Successfully",
            category: result.rows[0]
        });

    } catch (error) {
        next(error);
    }

};

const deleteCategory = async (req, res, next) => {
    try {
        const categoryId = Number(req.params.id);

        // Check category exists or not
        const categoryResult = await pool.query(
            `
            SELECT id
            FROM categories
            WHERE id = $1
            `,
            [categoryId]
        );

        if (categoryResult.rows.length === 0) {
            return res.status(404).json({
                message: "Category Not Found"
            });
        }

        // Check products exist in this category
        const productsResult = await pool.query(
            `
            SELECT id
            FROM products
            WHERE category_id = $1
            `,
            [categoryId]
        );

        if (productsResult.rows.length > 0) {
            return res.status(400).json({
                message:
                    "Cannot delete category because products are assigned to it"
            });
        }

        // Delete category
        const result = await pool.query(
            `
            DELETE FROM categories
            WHERE id = $1
            RETURNING *
            `,
            [categoryId]
        );

        return res.status(200).json({
            message: "Category Deleted Successfully",
            category: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


module.exports = {
    createCategory,getAllCategories,getCategoryById,updateCategory,deleteCategory
};