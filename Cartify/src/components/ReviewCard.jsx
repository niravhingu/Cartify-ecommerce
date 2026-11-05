function ReviewCard({ review1 }) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-black p-6 text-center shadow-lg duration-300 hover:scale-105">
      <h3 className="mb-1 text-xl font-bold text-white">{review1.name}</h3>

      {review1.verified && <p className="mb-2 text-xs font-semibold text-emerald-400">✓ Verified buyer</p>}

      <p className="tracking-widest text-amber-400">{review1.rating}</p>

      <p className="mt-3 flex-1 break-words text-white">{review1.comment}</p>

      {review1.product && <p className="mt-4 truncate text-xs text-neutral-400">on {review1.product}</p>}
    </div>
  );
}

export default ReviewCard;
