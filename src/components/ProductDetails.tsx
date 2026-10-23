"use client";

import Link from "next/link";
import { useState } from "react";
import type { Listing } from "@/lib/types";

const currency = (value: number) => `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(value)} lei`;

export default function ProductDetails({ listing, listings, inBasket, onAdd, backHref }: {
  backHref: string;
  listing: Listing;
  listings: Listing[];
  inBasket: number;
  onAdd: (listing: Listing, quantity: number) => boolean;
}) {
  const { product, offer, store } = listing;
  const [previewColorId, setPreviewColorId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const selectedColor = product.colors?.find(color => color.id === offer.colorId);
  const previewColor = product.colors?.find(color => color.id === previewColorId);
  const images = selectedColor?.images ?? product.images ?? [];
  const image = previewColor?.images[0] ?? images[imageIndex] ?? images[0];
  const variants = listings.filter(item => item.product.id === product.id && item.store.id === store.id);
  const maxQuantity = Math.max(0, Math.min(20, offer.quantityAvailable ?? 20) - inBasket);
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQuantity;
  const reviews = product.reviews ?? [];
  const questions = product.questions ?? [];
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  const visibleReviews = reviews.filter(review => ratingFilter === "all" || review.rating === Number(ratingFilter));
  const specifications: Record<string, string> = {
    Category: product.category,
    "Selling unit": product.unit,
    ...(product.brand ? { Brand: product.brand } : {}),
    ...(product.model ? { Model: product.model } : {}),
    ...(product.size ? { Size: product.size } : {}),
    ...(selectedColor ? { Colour: selectedColor.name } : {}),
    ...product.specifications,
  };

  return <article className="product-detail">
    <nav className="product-breadcrumb" aria-label="Breadcrumb">
      <Link href={backHref} scroll={false}>← Back to shopping</Link><span>/</span><span>{product.category}</span><span>/</span><span>{store.name}</span>
    </nav>
    <header className="product-detail-heading">
      <div><span className="eyebrow">{product.brand ?? product.category}</span><h1>{product.name}</h1><p>{product.description}</p></div>
      <span className="product-code">Product: {product.id}</span>
    </header>
    <div className="product-detail-top">
      <div className="product-gallery">
        <div className={`product-main-image art-${product.category.toLowerCase()}`}>
          {image ? <img src={image.src} alt={image.alt} width={600} height={600} /> : <div className="product-image-fallback"><span role="img" aria-label={product.name}>{product.emoji}</span><small>Product photo not provided</small></div>}
          {product.sampleDetails && <span className="illustration-label">Demo product illustration</span>}
        </div>
        {images.length > 1 && <div className="gallery-thumbnails" aria-label="Product images">
          {images.map((photo, index) => <button key={photo.src} aria-label={`View image ${index + 1}: ${photo.alt}`} aria-pressed={!previewColor && imageIndex === index} onClick={() => { setImageIndex(index); setPreviewColorId(null); }}>
            <img src={photo.src} alt="" width={72} height={72} />
          </button>)}
        </div>}
      </div>
      <div className="product-choice-panel">
        <a className="product-rating-link" href="#reviews">{averageRating === null ? "No reviews yet" : <><span aria-hidden="true">★</span> {averageRating.toFixed(1)} <span>({reviews.length} {product.sampleDetails ? "sample reviews" : "reviews"})</span></>}</a>
        <dl className="product-facts">
          <div><dt>Size / pack</dt><dd>{product.size ?? product.unit}</dd></div>
          <div><dt>Colour</dt><dd>{selectedColor?.name ?? product.specifications?.Colour ?? "Not specified"}</dd></div>
        </dl>
        {!!product.colors?.length && <div className="color-selector">
          <div className="color-selector-title"><strong>Choose a colour</strong><span>{previewColor ? `Preview: ${previewColor.name}` : selectedColor?.name ?? "Select a colour"}</span></div>
          <div className="color-thumbnails" aria-label="Product colours" onMouseLeave={() => setPreviewColorId(null)}>
            {product.colors.map(color => {
              const variant = variants.find(item => item.offer.colorId === color.id);
              const content = <><img src={color.images[0]?.src} alt={`${product.name} in ${color.name}`} width={80} height={80} /><span><i style={{ background: color.hex }} />{color.name}</span>{variant && !variant.available && <small>{variant.reason === "Out of stock" ? "Out of stock" : "Unavailable now"}</small>}</>;
              return variant ? <Link key={color.id} href={`/products/${encodeURIComponent(variant.offer.id)}`} prefetch={false} className={`color-thumbnail ${color.id === offer.colorId ? "selected" : ""}`} aria-label={`Select ${color.name}`} aria-current={color.id === offer.colorId ? "true" : undefined} onMouseEnter={() => setPreviewColorId(color.id)} onFocus={() => setPreviewColorId(color.id)} onBlur={() => setPreviewColorId(null)}>{content}</Link>
                : <div key={color.id} className="color-thumbnail not-offered" onMouseEnter={() => setPreviewColorId(color.id)}>{content}<small>Not sold here</small></div>;
            })}
          </div>
          <p className="product-help">Hover to preview. Click or tap to choose. Your selected colour: <strong>{selectedColor?.name ?? "None"}</strong>.</p>
        </div>}
        <div className="product-buy-card">
          <div className="product-price">{currency(offer.price)}<small>per {product.unit}</small></div>
          <div className={`product-availability ${listing.available ? "available" : ""}`} role="status">{listing.available ? "Available for delivery" : listing.reason}</div>
          <p className="stock-confidence">Stock confidence: {offer.stockConfidence ?? "unverified"}</p>
          <p className="product-stock">{offer.quantityAvailable != null ? `${offer.quantityAvailable} ${offer.quantityAvailable === 1 ? "unit" : "units"} reported in stock at ${store.name}` : "Exact stock quantity not provided by this seller."}</p>
          <p className="product-seller">Sold by <strong>{store.name}</strong><span>{store.address}</span></p>
          {listing.available && <div className="product-delivery"><span>↗</span><div><strong>{listing.etaMinutes}–{listing.etaMinutes + 10} min</strong><small>Estimated delivery to your selected address</small></div></div>}
          <div className="product-purchase-actions">
            <label>Quantity<input aria-label="Product quantity" type="number" min={1} max={Math.max(1, maxQuantity)} value={quantity || ""} disabled={!listing.available || maxQuantity === 0} onChange={event => { setQuantity(Number(event.target.value)); setMessage(""); }} /></label>
            <button className="primary-button" disabled={!listing.available || !validQuantity} onClick={() => { if (onAdd(listing, quantity)) setMessage(`${quantity} × ${product.name}${selectedColor ? ` · ${selectedColor.name}` : ""} added to your basket.`); else setMessage("Could not add this item. Check the basket message."); }}>Add to basket <span>＋</span></button>
          </div>
          {listing.available && !validQuantity && <p className="product-help">{maxQuantity === 0 ? "The available quantity is already in your basket." : `Choose between 1 and ${maxQuantity} units.`}</p>}
          {inBasket > 0 && <p className="product-help">{inBasket} of this option already in your basket.</p>}
          {message && <p className="product-add-message" role="status">{message}</p>}
          <p className="product-help">Delivery and the MRB platform fee are shown in your basket.</p>
        </div>
      </div>
    </div>
    <nav className="product-section-nav" aria-label="Product information">
      <a href="#description">Description</a><a href="#specifications">Specifications</a><a href="#reviews">Reviews ({reviews.length})</a><a href="#questions">Questions & answers ({questions.length})</a>
    </nav>
    {product.sampleDetails && <p className="product-demo-note">Sample catalogue: these illustrations, specifications, stock counts, reviews and answers demonstrate the product page. They are not live seller or customer data.</p>}
    <section id="description" className="product-info-section">
      <span className="eyebrow">GET TO KNOW IT</span><h2>Description</h2>
      {(product.longDescription?.length ? product.longDescription : [product.description]).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </section>
    <section id="specifications" className="product-info-section">
      <span className="eyebrow">THE DETAILS</span><h2>Specifications</h2>
      <table className="product-specifications"><caption>Product information for {product.name}</caption><tbody>{Object.entries(specifications).map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table>
      {!Object.keys(product.specifications ?? {}).length && <p className="product-help">Additional technical specifications have not been provided.</p>}
    </section>
    <section id="reviews" className="product-info-section">
      <span className="eyebrow">CUSTOMER EXPERIENCES</span><h2>Reviews</h2>
      {reviews.length ? <>
        <div className="review-summary"><div><strong>{averageRating!.toFixed(1)}<small>/ 5</small></strong><p>{reviews.length} {product.sampleDetails ? "sample reviews" : "reviews"}</p></div>
          <div className="rating-distribution">{[5, 4, 3, 2, 1].map(rating => { const count = reviews.filter(review => review.rating === rating).length; return <div key={rating}><span>{rating} ★</span><meter min={0} max={reviews.length} value={count} aria-label={`${rating} stars: ${count} reviews`} /><span>{count}</span></div>; })}</div>
          <label>Filter by rating<select aria-label="Filter reviews by rating" value={ratingFilter} onChange={event => setRatingFilter(event.target.value)}><option value="all">All ratings</option>{[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} stars</option>)}</select></label>
        </div>
        <div className="product-reviews">{visibleReviews.map(review => <article key={review.id}><div className="review-author"><strong>{review.author}</strong><time dateTime={review.date}>{new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(review.date))}</time></div><div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}<span>{"☆".repeat(5 - review.rating)}</span></div><h3>{review.title}</h3><p>{review.body}</p></article>)}</div>
        {!visibleReviews.length && <p>No reviews with this rating yet.</p>}
      </> : <div className="product-detail-empty"><strong>No reviews yet</strong><p>There are no customer reviews available for this product.</p></div>}
    </section>
    <section id="questions" className="product-info-section">
      <span className="eyebrow">GOOD TO KNOW</span><h2>Questions & answers</h2>
      {questions.length ? <div className="product-questions">{questions.map(question => <article key={question.id}><h3>{question.question}</h3>{question.answer ? <><p>{question.answer}</p>{question.answeredBy && <small>Answered by {question.answeredBy}</small>}</> : <p>No answer yet.</p>}</article>)}</div> : <div className="product-detail-empty"><strong>No questions yet</strong><p>No product questions or answers have been provided.</p></div>}
    </section>
  </article>;
}
