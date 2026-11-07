import TicketBoard from "./TicketBoard.jsx";

// complaints and support requests raised by customers
export default function CustomerTickets() {
  return <TicketBoard userType="customer" em="Raised by shoppers" title="Customer tickets" />;
}
