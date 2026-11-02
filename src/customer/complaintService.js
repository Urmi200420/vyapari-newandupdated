import { newId } from "./store.js";
export const complaintCategories = [
  "Damaged Product",
  "Defective Product",
  "Wrong Product Delivered",
  "Missing Items",
  "Product Quality Issue",
  "Incorrect Product Description",
  "Other",
];
export const complaintStatuses = [
  "Submitted",
  "Under Review",
  "Resolved",
  "Rejected",
];
export const imageLimits = {
  count: 3,
  perFile: 512 * 1024,
  total: 1024 * 1024,
};
const types = ["image/jpeg", "image/png", "image/webp"];
export function validateImageFiles(files) {
  if (files.length > imageLimits.count) throw Error("Choose up to 3 images.");
  if (files.some((f) => !types.includes(f.type)))
    throw Error("Only JPEG, PNG and WebP images are supported.");
  if (files.some((f) => !f.size || f.size > imageLimits.perFile))
    throw Error("Each image must be non-empty and no larger than 512 KB.");
  if (files.reduce((sum, f) => sum + f.size, 0) > imageLimits.total)
    throw Error("Supporting images must total no more than 1 MB.");
}
export async function readComplaintImages(files) {
  validateImageFiles(files);
  return Promise.all(
    files.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
        (n, i) => bytes[i] === n,
      );
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp =
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
      if (!(
        (file.type === "image/png" && png) ||
        (file.type === "image/jpeg" && jpeg) ||
        (file.type === "image/webp" && webp)
      ))
        throw Error(
          "An image does not match its file type. Choose a valid JPEG, PNG or WebP.",
        );
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(Error("An image could not be read. Try another file."));
        reader.readAsDataURL(file);
      });
      await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = () =>
          reject(
            Error(
              "An image is damaged or cannot be previewed. Try another file.",
            ),
          );
        image.src = dataUrl;
      });
      return { name: file.name, type: file.type, size: file.size, dataUrl };
    }),
  );
}
// A pure operation: replace this persistence boundary with a backend later.
export function createComplaint(state, input) {
  if (state.mode !== "registered")
    throw Error("Registered customer mode is required.");
  if (!input.requestId)
    throw Error(
      "The complaint request is missing its identifier. Reopen the form.",
    );
  const customerId = state.customerId || "vyapari-demo-customer";
  const existing = (state.complaints || []).find(
    (c) => c.requestId === input.requestId && c.customerId === customerId,
  );
  if (existing) return { state, complaint: existing };
  const order = state.orders.find((o) => o.id === input.orderId);
  const product = order?.items.find((p) => p.id === input.productId);
  if (!order || !product)
    throw Error("Choose a product from one of your orders.");
  if (!complaintCategories.includes(input.category))
    throw Error("Choose a complaint category.");
  const description = String(input.description || "").trim();
  if (description.length < 20 || description.length > 2000)
    throw Error("Describe the issue in 20–2,000 characters.");
  const images = input.images || [];
  validateImageFiles(images);
  if (
    images.some(
      (i) =>
        typeof i.dataUrl !== "string" ||
        !i.dataUrl.startsWith(`data:${i.type};base64,`) ||
        i.dataUrl.length > Math.ceil(i.size / 3) * 4 + 50,
    )
  )
    throw Error(
      "One of the supporting images is invalid. Remove it and try again.",
    );
  const complaint = {
    id: `CMP-${newId()}`,
    requestId: input.requestId,
    customerId,
    orderId: order.id,
    product: {
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      sellerId: product.sellerId,
    },
    category: input.category,
    description,
    images: images.map((i) => ({ ...i })),
    date: new Date().toISOString(),
    status: "Submitted",
    sellerId: product.sellerId || "vyapari-demo-seller",
    resolutionRemarks: "",
    resolutionType: "",
    responses: [],
    timeline: [{ type: "submitted", author: "Customer", message: "Complaint submitted", date: new Date().toISOString() }],
  };
  return {
    state: {
      ...state,
      customerId,
      complaints: [complaint, ...(state.complaints || [])],
      notifications: [{ id: `NTF-${newId()}`, recipientId: complaint.sellerId, complaintId: complaint.id, message: `New complaint ${complaint.id} received`, date: new Date().toISOString(), read: false }, ...(state.notifications || [])],
    },
    complaint,
  };
}
