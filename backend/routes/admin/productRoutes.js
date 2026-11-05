const express = require("express");

const {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require("../../controllers/admin/productController");

const router = express.Router();


// GET ALL PRODUCTS
router.get("/", getAllProducts);


// GET SINGLE PRODUCT
router.get("/:id", getProductById);


// CREATE PRODUCT
router.post("/", createProduct);


// UPDATE PRODUCT
router.patch("/:id", updateProduct);


// DELETE PRODUCT
router.delete("/:id", deleteProduct);


module.exports = router;