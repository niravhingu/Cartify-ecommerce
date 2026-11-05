import { useEffect, useMemo, useState } from "react";

import { API_URL as BASE_URL } from "../../api";

const API_URL = `${BASE_URL}/admin/products`;
// only ACTIVE categories can be chosen for a product
const CATEGORIES_URL = `${BASE_URL}/admin/categories?active=true`;
const SUBCATEGORIES_URL = `${BASE_URL}/admin/subcategories`;

const emptyForm = {
    product_name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "",
    subcategory_id: "",
    image: ""
};

function AdminProducts() {
    // =====================================================
    // PRODUCTS & API STATES
    // =====================================================
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState("");

    // =====================================================
    // CATEGORY STATES
    // =====================================================
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [loadingSubcategories, setLoadingSubcategories] = useState(false);

    // =====================================================
    // SEARCH & FILTERS
    // =====================================================
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [stockFilter, setStockFilter] = useState("All");

    // =====================================================
    // MODAL STATES
    // =====================================================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // =====================================================
    // FORM STATES
    // =====================================================
    const [formData, setFormData] = useState(emptyForm);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // =====================================================
    // DELETE STATES
    // =====================================================
    const [deleteProduct, setDeleteProduct] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // =====================================================
    // GET ALL PRODUCTS
    // =====================================================
    const fetchProducts = async () => {
        try {
            setLoading(true);
            setApiError("");

            const response = await fetch(API_URL, {
                method: "GET",
                credentials: "include",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to fetch products"
                );
            }

            setProducts(data.products || []);
        } catch (error) {
            console.error("Fetch Products Error:", error);

            setApiError(
                error.message || "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // GET MAIN CATEGORIES
    // =====================================================
    const fetchCategories = async () => {
        try {
            const response = await fetch(
                CATEGORIES_URL,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to fetch categories"
                );
            }

            setCategories(data.categories || []);
        } catch (error) {
            console.error(
                "Fetch Categories Error:",
                error
            );

            setApiError(
                error.message ||
                "Failed to fetch categories"
            );
        }
    };

    // =====================================================
    // GET SUBCATEGORIES BY MAIN CATEGORY
    // =====================================================
    const fetchSubcategories = async (categoryId) => {
        if (!categoryId) {
            setSubcategories([]);
            return;
        }

        try {
            setLoadingSubcategories(true);
            setFormError("");

            const response = await fetch(
                `${SUBCATEGORIES_URL}/category/${categoryId}`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to fetch subcategories"
                );
            }

            setSubcategories(
                data.subcategories || []
            );
        } catch (error) {
            console.error(
                "Fetch Subcategories Error:",
                error
            );

            setSubcategories([]);

            setFormError(
                error.message ||
                "Failed to fetch subcategories"
            );
        } finally {
            setLoadingSubcategories(false);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================
    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    // =====================================================
    // FORM INPUT CHANGE
    // =====================================================
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setFormError("");
    };

    // =====================================================
    // MAIN CATEGORY CHANGE
    // =====================================================
    const handleCategoryChange = async (e) => {
        const categoryId = e.target.value;

        setFormData((prev) => ({
            ...prev,
            category_id: categoryId,
            subcategory_id: "",
        }));

        setSubcategories([]);
        setFormError("");

        if (categoryId) {
            await fetchSubcategories(categoryId);
        }
    };

    // =====================================================
    // OPEN ADD MODAL
    // =====================================================
    const openAddModal = () => {
        setEditingProduct(null);
        setFormData(emptyForm);
        setSubcategories([]);
        setFormError("");
        setIsModalOpen(true);
    };

    // =====================================================
    // OPEN EDIT MODAL
    // =====================================================
    const openEditModal = async (product) => {
        setEditingProduct(product);
        setFormError("");

        const categoryId =
            product.category_id ?? "";

        const subcategoryId =
            product.subcategory_id ?? "";

        setFormData({
            product_name:
                product.product_name || "",

            description:
                product.description || "",

            price:
                product.price ?? "",

            stock:
                product.stock ?? "",

            category_id:
                categoryId,

            subcategory_id:
                "",

            image:
                product.image || "",
        });

        setSubcategories([]);
        setIsModalOpen(true);

        // Load subcategories of selected category
        if (categoryId) {
            try {
                setLoadingSubcategories(true);

                const response = await fetch(
                    `${SUBCATEGORIES_URL}/category/${categoryId}`,
                    {
                        method: "GET",
                        credentials: "include",
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Failed to fetch subcategories"
                    );
                }

                setSubcategories(
                    data.subcategories || []
                );

                setFormData((prev) => ({
                    ...prev,
                    subcategory_id:
                        subcategoryId,
                }));
            } catch (error) {
                console.error(
                    "Edit Subcategory Error:",
                    error
                );

                setFormError(
                    error.message ||
                    "Failed to load subcategories"
                );
            } finally {
                setLoadingSubcategories(false);
            }
        }
    };

    // =====================================================
    // CLOSE MODAL
    // =====================================================
    const closeModal = () => {
        if (saving) return;

        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData(emptyForm);
        setSubcategories([]);
        setFormError("");
    };

    // =====================================================
    // VALIDATE FORM
    // =====================================================
    const validateForm = () => {
        if (!formData.product_name.trim()) {
            return "Product name is required.";
        }

        if (formData.price === "") {
            return "Price is required.";
        }

        if (Number(formData.price) < 0) {
            return "Price cannot be negative.";
        }

        if (formData.stock === "") {
            return "Stock is required.";
        }

        if (Number(formData.stock) < 0) {
            return "Stock cannot be negative.";
        }

        if (formData.category_id === "") {
            return "Main category is required.";
        }

        if (formData.subcategory_id === "") {
            return "Sub category is required.";
        }

        return "";
    };

    // =====================================================
    // ADD / UPDATE PRODUCT
    // =====================================================
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const validationError =
                validateForm();

            if (validationError) {
                setFormError(validationError);
                return;
            }

            setSaving(true);
            setFormError("");

            const payload = {
                product_name:
                    formData.product_name.trim(),

                description:
                    formData.description.trim(),

                price:
                    Number(formData.price),

                stock:
                    Number(formData.stock),

                category_id:
                    Number(formData.category_id),

                subcategory_id:
                    Number(formData.subcategory_id),

                image:
                    formData.image.trim() || null,
            };

            console.log(
                "Sending Product:",
                payload
            );

            const method =
                editingProduct
                    ? "PATCH"
                    : "POST";

            const url =
                editingProduct
                    ? `${API_URL}/${editingProduct.id}`
                    : API_URL;

            const response = await fetch(
                url,
                {
                    method,

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    credentials: "include",

                    body: JSON.stringify(payload),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Something went wrong"
                );
            }

            alert(
                editingProduct
                    ? "Product updated successfully"
                    : "Product added successfully"
            );

            await fetchProducts();

            closeModal();
        } catch (error) {
            console.error(
                "Product Submit Error:",
                error
            );

            setFormError(
                error.message ||
                "Something went wrong"
            );
        } finally {
            setSaving(false);
        }
    };

    // =====================================================
    // DELETE PRODUCT
    // =====================================================
    const handleDelete = async () => {
        if (!deleteProduct) return;

        try {
            setDeleting(true);
            setApiError("");

            const response = await fetch(
                `${API_URL}/${deleteProduct.id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to delete product"
                );
            }

            setProducts((prevProducts) =>
                prevProducts.filter(
                    (product) =>
                        product.id !==
                        deleteProduct.id
                )
            );

            setDeleteProduct(null);
        } catch (error) {
            console.error(
                "Delete Product Error:",
                error
            );

            setApiError(
                error.message ||
                "Failed to delete product"
            );
        } finally {
            setDeleting(false);
        }
    };

    // =====================================================
    // PRODUCT STOCK STATUS
    // =====================================================
    const getStockStatus = (stock) => {
        const value = Number(stock);

        if (value === 0) {
            return {
                label: "Out of Stock",
                className:
                    "bg-red-500/10 text-red-400 border-red-500/20",
            };
        }

        if (value <= 5) {
            return {
                label: "Low Stock",
                className:
                    "bg-amber-500/10 text-amber-400 border-amber-500/20",
            };
        }

        return {
            label: "In Stock",
            className:
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
    };

    // =====================================================
    // FILTER PRODUCTS
    // =====================================================
    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const productName = (
                product.product_name || ""
            ).toLowerCase();

            const productCategory = (
                `${product.category_name || ""} ${
                    product.subcategory_name || ""
                }`
            ).toLowerCase();

            const searchValue =
                search.toLowerCase().trim();

            const matchesSearch =
                productName.includes(searchValue) ||
                productCategory.includes(searchValue);

            const matchesCategory =
                categoryFilter === "All" ||
                (
                    product.category_name ||
                    ""
                ) === categoryFilter;

            let matchesStock = true;

            if (stockFilter === "In Stock") {
                matchesStock =
                    Number(product.stock) > 5;
            }

            if (stockFilter === "Low Stock") {
                matchesStock =
                    Number(product.stock) > 0 &&
                    Number(product.stock) <= 5;
            }

            if (stockFilter === "Out of Stock") {
                matchesStock =
                    Number(product.stock) === 0;
            }

            return (
                matchesSearch &&
                matchesCategory &&
                matchesStock
            );
        });
    }, [
        products,
        search,
        categoryFilter,
        stockFilter,
    ]);

    // =====================================================
    // STATS
    // =====================================================
    const totalProducts =
        products.length;

    const activeProducts =
        products.filter(
            (product) =>
                Number(product.stock) > 0
        ).length;

    const lowStockProducts =
        products.filter(
            (product) =>
                Number(product.stock) > 0 &&
                Number(product.stock) <= 5
        ).length;

    const outOfStockProducts =
        products.filter(
            (product) =>
                Number(product.stock) === 0
        ).length;

    // =====================================================
    // FORMAT PRICE
    // =====================================================
    const formatPrice = (price) => {
        return `₹${Number(
            price || 0
        ).toLocaleString("en-IN")}`;
    };

    // =====================================================
    // UI
    // =====================================================
    return (
        <div className="space-y-6">

            {/* ================================================= */}
            {/* HEADER */}
            {/* ================================================= */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>
                    <p className="text-sm font-medium text-cyan-400">
                        Admin Panel
                    </p>

                    <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                        Products
                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                        Manage your Cartify products and inventory.
                    </p>
                </div>

                <button
                    onClick={openAddModal}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98]"
                >
                    <span className="text-lg">
                        +
                    </span>

                    Add Product
                </button>

            </div>

            {/* ================================================= */}
            {/* API ERROR */}
            {/* ================================================= */}
            {apiError && (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">

                    <div>
                        <span className="font-semibold">
                            Error:
                        </span>{" "}
                        {apiError}
                    </div>

                    <button
                        onClick={() => {
                            fetchProducts();
                            fetchCategories();
                        }}
                        className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/10"
                    >
                        Retry
                    </button>

                </div>
            )}

            {/* ================================================= */}
            {/* STATS */}
            {/* ================================================= */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">

                <StatCard
                    title="Total Products"
                    value={totalProducts}
                    icon="📦"
                    iconBg="bg-cyan-500/10"
                />

                <StatCard
                    title="In Stock"
                    value={activeProducts}
                    icon="✓"
                    iconBg="bg-emerald-500/10"
                />

                <StatCard
                    title="Low Stock"
                    value={lowStockProducts}
                    icon="⚠"
                    iconBg="bg-amber-500/10"
                />

                <StatCard
                    title="Out of Stock"
                    value={outOfStockProducts}
                    icon="!"
                    iconBg="bg-red-500/10"
                />

            </div>

            {/* ================================================= */}
            {/* FILTER SECTION */}
            {/* ================================================= */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/10">

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">

                    {/* Search */}
                    <div className="relative xl:col-span-2">

                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                            🔍
                        </span>

                        <input
                            type="text"
                            value={search}
                            onChange={(e) =>
                                setSearch(
                                    e.target.value
                                )
                            }
                            placeholder="Search products, categories..."
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-cyan-500"
                        />

                    </div>

                    {/* Main Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) =>
                            setCategoryFilter(
                                e.target.value
                            )
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                    >
                        <option value="All">
                            All Categories
                        </option>

                        {categories.map(
                            (category) => (
                                <option
                                    key={category.id}
                                    value={category.name}
                                >
                                    {category.name}
                                </option>
                            )
                        )}
                    </select>

                    {/* Stock Filter */}
                    <select
                        value={stockFilter}
                        onChange={(e) =>
                            setStockFilter(
                                e.target.value
                            )
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                    >
                        <option value="All">
                            All Stock
                        </option>

                        <option value="In Stock">
                            In Stock
                        </option>

                        <option value="Low Stock">
                            Low Stock
                        </option>

                        <option value="Out of Stock">
                            Out of Stock
                        </option>
                    </select>

                </div>

            </div>

            {/* ================================================= */}
            {/* LOADING */}
            {/* ================================================= */}
            {loading ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center">

                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400"></div>

                    <p className="mt-4 text-sm text-slate-400">
                        Loading products...
                    </p>

                </div>
            ) : filteredProducts.length === 0 ? (

                /* ================================================= */
                /* EMPTY */
                /* ================================================= */
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center">

                    <div className="text-5xl">
                        📦
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-white">
                        No products found
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                        {products.length === 0
                            ? "Your product database is currently empty."
                            : "Try changing your search or filters."}
                    </p>

                    {products.length === 0 && (
                        <button
                            onClick={openAddModal}
                            className="mt-5 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                        >
                            Add Your First Product
                        </button>
                    )}

                </div>
            ) : (

                <>
                    {/* ================================================= */}
                    {/* DESKTOP TABLE */}
                    {/* ================================================= */}
                    <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 xl:block">

                        <div className="overflow-x-auto">

                            <table className="w-full">

                                <thead className="border-b border-slate-800 bg-slate-950/60">

                                    <tr className="text-left text-xs uppercase tracking-wider text-slate-500">

                                        <th className="px-6 py-4">
                                            Product
                                        </th>

                                        <th className="px-6 py-4">
                                            Category
                                        </th>

                                        <th className="px-6 py-4">
                                            Price
                                        </th>

                                        <th className="px-6 py-4">
                                            Stock
                                        </th>

                                        <th className="px-6 py-4">
                                            Status
                                        </th>

                                        <th className="px-6 py-4 text-right">
                                            Actions
                                        </th>

                                    </tr>

                                </thead>

                                <tbody className="divide-y divide-slate-800">

                                    {filteredProducts.map(
                                        (product) => {

                                            const stockStatus =
                                                getStockStatus(
                                                    product.stock
                                                );

                                            return (
                                                <tr
                                                    key={product.id}
                                                    className="transition hover:bg-slate-800/30"
                                                >

                                                    {/* Product */}
                                                    <td className="px-6 py-5">

                                                        <div className="flex items-center gap-4">

                                                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">

                                                                {product.image ? (
                                                                    <img
                                                                        src={
                                                                            product.image
                                                                        }
                                                                        alt={
                                                                            product.product_name
                                                                        }
                                                                        className="h-full w-full object-cover"
                                                                        onError={(
                                                                            e
                                                                        ) => {
                                                                            e.currentTarget.style.display =
                                                                                "none";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center text-xl">
                                                                        📦
                                                                    </div>
                                                                )}

                                                            </div>

                                                            <div className="min-w-0">

                                                                <p className="truncate font-semibold text-white">
                                                                    {
                                                                        product.product_name
                                                                    }
                                                                </p>

                                                                <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                                                    {
                                                                        product.description ||
                                                                        "No description"
                                                                    }
                                                                </p>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* Category */}
                                                    <td className="px-6 py-5">

                                                        <div className="flex flex-col gap-1">

                                                            <span className="w-fit rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400">
                                                                {
                                                                    product.category_name ||
                                                                    "No Category"
                                                                }
                                                            </span>

                                                            <span className="text-xs text-slate-500">
                                                                {
                                                                    product.subcategory_name ||
                                                                    "No Sub Category"
                                                                }
                                                            </span>

                                                        </div>

                                                    </td>

                                                    {/* Price */}
                                                    <td className="px-6 py-5">

                                                        <span className="font-semibold text-white">
                                                            {
                                                                formatPrice(
                                                                    product.price
                                                                )
                                                            }
                                                        </span>

                                                    </td>

                                                    {/* Stock */}
                                                    <td className="px-6 py-5">

                                                        <span className="font-medium text-slate-300">
                                                            {
                                                                product.stock
                                                            }
                                                        </span>

                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-6 py-5">

                                                        <span
                                                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${stockStatus.className}`}
                                                        >
                                                            {
                                                                stockStatus.label
                                                            }
                                                        </span>

                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-5">

                                                        <div className="flex justify-end gap-2">

                                                            <button
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        product
                                                                    )
                                                                }
                                                                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-400"
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    setDeleteProduct(
                                                                        product
                                                                    )
                                                                }
                                                                className="rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                                                            >
                                                                Delete
                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                    {/* ================================================= */}
                    {/* MOBILE / TABLET CARDS */}
                    {/* ================================================= */}
                    <div className="grid grid-cols-1 gap-4 xl:hidden">

                        {filteredProducts.map(
                            (product) => {

                                const stockStatus =
                                    getStockStatus(
                                        product.stock
                                    );

                                return (
                                    <div
                                        key={product.id}
                                        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10"
                                    >

                                        <div className="flex gap-4">

                                            {/* Image */}
                                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">

                                                {product.image ? (
                                                    <img
                                                        src={
                                                            product.image
                                                        }
                                                        alt={
                                                            product.product_name
                                                        }
                                                        className="h-full w-full object-cover"
                                                        onError={(
                                                            e
                                                        ) => {
                                                            e.currentTarget.style.display =
                                                                "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-2xl">
                                                        📦
                                                    </div>
                                                )}

                                            </div>

                                            {/* Details */}
                                            <div className="min-w-0 flex-1">

                                                <h3 className="truncate font-semibold text-white">
                                                    {
                                                        product.product_name
                                                    }
                                                </h3>

                                                <div className="mt-1 flex flex-wrap items-center gap-2">

                                                    <span className="rounded-md bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-400">
                                                        {
                                                            product.category_name ||
                                                            "No Category"
                                                        }
                                                    </span>

                                                    <span className="text-[11px] text-slate-500">
                                                        {
                                                            product.subcategory_name ||
                                                            "No Sub Category"
                                                        }
                                                    </span>

                                                </div>

                                                <p className="mt-2 text-lg font-bold text-cyan-400">
                                                    {
                                                        formatPrice(
                                                            product.price
                                                        )
                                                    }
                                                </p>

                                            </div>

                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-3">

                                            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">

                                                <p className="text-xs text-slate-500">
                                                    Stock
                                                </p>

                                                <p className="mt-1 font-semibold text-white">
                                                    {
                                                        product.stock
                                                    }
                                                </p>

                                            </div>

                                            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">

                                                <p className="text-xs text-slate-500">
                                                    Status
                                                </p>

                                                <span
                                                    className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${stockStatus.className}`}
                                                >
                                                    {
                                                        stockStatus.label
                                                    }
                                                </span>

                                            </div>

                                        </div>

                                        <div className="mt-4 flex gap-2">

                                            <button
                                                onClick={() =>
                                                    openEditModal(
                                                        product
                                                    )
                                                }
                                                className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-400"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setDeleteProduct(
                                                        product
                                                    )
                                                }
                                                className="flex-1 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </div>
                                );
                            }
                        )}

                    </div>
                </>
            )}

            {/* ================================================= */}
            {/* ADD / EDIT PRODUCT MODAL */}
            {/* ================================================= */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

                    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">

                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4 sm:px-6">

                            <div>

                                <h2 className="text-lg font-bold text-white">
                                    {editingProduct
                                        ? "Edit Product"
                                        : "Add Product"}
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    {editingProduct
                                        ? "Update product information."
                                        : "Add a new product to Cartify."}
                                </p>

                            </div>

                            <button
                                onClick={closeModal}
                                disabled={saving}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                            >
                                ✕
                            </button>

                        </div>

                        {/* Form */}
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5 p-5 sm:p-6"
                        >

                            {/* Form Error */}
                            {formError && (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {formError}
                                </div>
                            )}

                            {/* Product Name */}
                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Product Name *
                                </label>

                                <input
                                    type="text"
                                    name="product_name"
                                    value={
                                        formData.product_name
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="Enter product name"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
                                />

                            </div>

                            {/* Description */}
                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        formData.description
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    rows="4"
                                    placeholder="Enter product description"
                                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
                                />

                            </div>

                            {/* Price + Stock */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                {/* Price */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium text-slate-300">
                                        Price *
                                    </label>

                                    <input
                                        type="number"
                                        name="price"
                                        value={
                                            formData.price
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
                                    />

                                </div>

                                {/* Stock */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium text-slate-300">
                                        Stock *
                                    </label>

                                    <input
                                        type="number"
                                        name="stock"
                                        value={
                                            formData.stock
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
                                    />

                                </div>

                            </div>

                            {/* ================================================= */}
                            {/* MAIN CATEGORY + SUB CATEGORY */}
                            {/* ================================================= */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                {/* Main Category */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium text-slate-300">
                                        Main Category *
                                    </label>

                                    <select
                                        name="category_id"
                                        value={
                                            formData.category_id
                                        }
                                        onChange={
                                            handleCategoryChange
                                        }
                                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                                    >

                                        <option value="">
                                            Select Main Category
                                        </option>

                                        {categories.map(
                                            (category) => (
                                                <option
                                                    key={
                                                        category.id
                                                    }
                                                    value={
                                                        category.id
                                                    }
                                                >
                                                    {
                                                        category.name
                                                    }
                                                </option>
                                            )
                                        )}

                                    </select>

                                </div>

                                {/* Sub Category */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium text-slate-300">
                                        Sub Category *
                                    </label>

                                    <select
                                        name="subcategory_id"
                                        value={
                                            formData.subcategory_id
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        disabled={
                                            !formData.category_id ||
                                            loadingSubcategories
                                        }
                                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >

                                        <option value="">
                                            {loadingSubcategories
                                                ? "Loading sub categories..."
                                                : !formData.category_id
                                                    ? "Select main category first"
                                                    : subcategories.length === 0
                                                        ? "No sub categories"
                                                        : "Select Sub Category"}
                                        </option>

                                        {subcategories.map(
                                            (subcategory) => (
                                                <option
                                                    key={
                                                        subcategory.id
                                                    }
                                                    value={
                                                        subcategory.id
                                                    }
                                                >
                                                    {
                                                        subcategory.name
                                                    }
                                                </option>
                                            )
                                        )}

                                    </select>

                                </div>

                            </div>

                            {/* Image */}
                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Image URL
                                </label>

                                <input
                                    type="url"
                                    name="image"
                                    value={
                                        formData.image
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="https://example.com/product.jpg"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
                                />

                                {formData.image && (
                                    <div className="mt-3 flex items-center gap-3">

                                        <img
                                            src={
                                                formData.image
                                            }
                                            alt="Preview"
                                            className="h-16 w-16 rounded-xl border border-slate-700 object-cover"
                                            onError={(
                                                e
                                            ) => {
                                                e.currentTarget.style.display =
                                                    "none";
                                            }}
                                        />

                                        <p className="text-xs text-slate-500">
                                            Image preview
                                        </p>

                                    </div>
                                )}

                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">

                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving ||
                                        loadingSubcategories
                                    }
                                    className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingProduct
                                            ? "Update Product"
                                            : "Add Product"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* ================================================= */}
            {/* DELETE CONFIRMATION MODAL */}
            {/* ================================================= */}
            {deleteProduct && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

                    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-xl">
                            🗑️
                        </div>

                        <h2 className="mt-4 text-xl font-bold text-white">
                            Delete Product?
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-400">

                            Are you sure you want to delete{" "}

                            <span className="font-semibold text-white">
                                {
                                    deleteProduct.product_name
                                }
                            </span>

                            ? This action cannot be undone.

                        </p>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                            <button
                                onClick={() =>
                                    setDeleteProduct(null)
                                }
                                disabled={deleting}
                                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {deleting
                                    ? "Deleting..."
                                    : "Delete Product"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}


// =====================================================
// STAT CARD COMPONENT
// =====================================================
function StatCard({
    title,
    value,
    icon,
    iconBg,
}) {
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10 sm:p-5">

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-xs font-medium text-slate-500 sm:text-sm">
                        {title}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                        {value}
                    </p>

                </div>

                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${iconBg}`}
                >
                    {icon}
                </div>

            </div>

        </div>
    );
}

export default AdminProducts;