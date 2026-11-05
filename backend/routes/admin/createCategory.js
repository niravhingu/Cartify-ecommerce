const express=require("express");

const {createCategory,getAllCategories,getCategoryById,updateCategory,deleteCategory}= require("../../controllers/admin/createCategory");

const router=express.Router();

router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

router.post("/",createCategory);
router.patch("/:id",updateCategory);

router.delete("/:id",deleteCategory);





module.exports=router;

