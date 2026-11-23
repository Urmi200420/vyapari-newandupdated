import { getProfile } from "../api";
import { formatPrice } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";
import { useAsync, Modal, fmtDate } from "./parts.jsx";

// Bill for an order: includes breakdown of MRP, selling price, discounts, and delivery fee.
export default function Invoice({ order, onClose }) {
  const { data: shop } = useAsync(getProfile);

  const subtotal = order.items.reduce((s, l) => s + l.qty * (l.price || 0), 0);
  const totalMrp = order.items.reduce((s, l) => s + l.qty * (l.mrp || Math.round((l.price || 0) * 1.35)), 0);
  const discountSavings = totalMrp - subtotal;
  const deliveryFee = order.deliveryFee || 0;
  const grandTotal = order.total || subtotal + deliveryFee;

  const p = shop?.pickup || {};

  return (
    <Modal title={"Tax Invoice · ORD-" + order.id} onClose={onClose} wide>
      <div className="invoice-actions no-print">
        <GlassButton variant="solid" onClick={() => window.print()}>
          🖨️ Print / Save as PDF
        </GlassButton>
      </div>

      <div className="invoice-sheet">
        <div className="inv-top">
          <div>
            <h3 className="inv-brand">VYAPARI</h3>
            <p>
              <strong>Sold by:</strong> {shop?.shopName || "Green Basket Traders"}
            </p>
            {shop?.ownerName && <p className="inv-small">Proprietor: {shop.ownerName}</p>}
            {shop?.gstin && <p className="inv-small">GSTIN: {shop.gstin}</p>}
            <p className="inv-small">
              {p.houseNumber ? p.houseNumber + ", " : ""}
              {p.streetAddress || p.line1 || ""}
              {p.landmark ? ", Near " + p.landmark : ""}
              <br />
              {p.city || ""}, {p.state || ""} - {p.pincode || ""}
              <br />
              Phone: {shop?.phone || "N/A"}
            </p>
          </div>
          <div className="inv-right">
            <h3>RETAIL INVOICE</h3>
            <p>
              <b>Invoice No:</b> INV-{order.id}
            </p>
            <p>
              <b>Order ID:</b> ORD-{order.id}
            </p>
            <p>
              <b>Date:</b> {fmtDate(order.createdAt)}
            </p>
            <p>
              <b>Payment Mode:</b> Cash on Delivery (COD)
            </p>
          </div>
        </div>

        <div className="inv-bill">
          <b>Ship &amp; Bill to:</b>
          <p className="customer-name">{order.customer}</p>
          <p className="inv-small">
            {order.address}
            {order.customerPhone ? " · Phone: " + order.customerPhone : ""}
          </p>
        </div>

        <table className="inv-table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th className="num">MRP</th>
              <th className="num">Selling Price</th>
              <th className="num">Qty</th>
              <th className="num">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((l, i) => {
              const itemMrp = l.mrp || Math.round(l.price * 1.35);
              return (
                <tr key={i}>
                  <td>
                    <b>{l.name}</b>
                    {l.category && <span className="inv-item-cat"> ({l.category})</span>}
                  </td>
                  <td className="num muted-txt">{formatPrice(itemMrp)}</td>
                  <td className="num font-bold">{formatPrice(l.price)}</td>
                  <td className="num">{l.qty}</td>
                  <td className="num font-bold">{formatPrice(l.qty * l.price)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4">Total Items MRP</td>
              <td className="num">{formatPrice(totalMrp)}</td>
            </tr>
            {discountSavings > 0 && (
              <tr className="discount-row">
                <td colSpan="4">Marketplace Discount Savings</td>
                <td className="num text-green">- {formatPrice(discountSavings)}</td>
              </tr>
            )}
            <tr>
              <td colSpan="4">Subtotal (Net Selling Price)</td>
              <td className="num">{formatPrice(subtotal)}</td>
            </tr>
            <tr>
              <td colSpan="4">Delivery Charge</td>
              <td className="num">{deliveryFee > 0 ? formatPrice(deliveryFee) : "Free"}</td>
            </tr>
            <tr className="inv-total">
              <td colSpan="4">
                <strong>Grand Total Payable</strong>
              </td>
              <td className="num">
                <strong>{formatPrice(grandTotal)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="inv-footer">
          <p className="inv-small">
            • Prices are inclusive of all applicable taxes.
            <br />
            • This is a computer-generated tax invoice and requires no physical signature.
            <br />• Thank you for ordering on <strong>Vyapari</strong>.
          </p>
        </div>
      </div>
    </Modal>
  );
}
