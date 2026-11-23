import TicketBoard from "./TicketBoard.jsx";

// support requests raised by sellers (including "Contact admin" in the seller dashboard)
export default function SellerTickets() {
  return <TicketBoard userType="seller" em="Raised by merchants" title="Seller tickets" />;
}
