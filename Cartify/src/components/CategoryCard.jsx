import { FALLBACK_IMAGE, handleImageError } from "../utils/format";

// Pure presentation: the parent wraps it in a <Link> to /products?category=slug
function CategoryCard({ category }) {
  return (
    <div className="group relative cursor-pointer overflow-hidden rounded-2xl bg-neutral-200">
      <img
        src={category.image || FALLBACK_IMAGE}
        onError={handleImageError}
        alt={category.name}
        loading="lazy"
        className="h-60 w-full object-cover transition duration-500 group-hover:scale-110"
      />

      <div className="absolute inset-0 bg-black/40 transition duration-500 group-hover:bg-black/60" />

      <div className="absolute bottom-4 left-4 right-4">
        <h3 className="truncate text-2xl font-bold text-white">{category.name}</h3>
        {category.product_count !== undefined && (
          <p className="text-sm text-white/80">
            {category.product_count} product{category.product_count === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </div>
  );
}

export default CategoryCard;
