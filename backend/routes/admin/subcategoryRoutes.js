const express = require("express");

const {
    getAllSubcategories,
    getSubcategoriesByCategory,
    getSubcategoryById,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory
} = require("../../controllers/admin/subcategoryController");

const router = express.Router();


// GET ALL
router.get("/", getAllSubcategories);


// GET BY MAIN CATEGORY
// IMPORTANT: this must come before /:id
router.get(
    "/category/:categoryId",
    getSubcategoriesByCategory
);


// GET BY ID
router.get("/:id", getSubcategoryById);


// CREATE
router.post("/", createSubcategory);


// UPDATE
router.patch("/:id", updateSubcategory);


// DELETE
router.delete("/:id", deleteSubcategory);


module.exports = router;