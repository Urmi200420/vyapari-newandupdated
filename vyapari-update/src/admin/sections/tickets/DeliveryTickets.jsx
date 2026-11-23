import TicketBoard from "./TicketBoard.jsx";

// tickets raised by delivery personnel (including the delivery dashboard's Support tab)
export default function DeliveryTickets() {
  return <TicketBoard userType="delivery" em="Raised by couriers" title="Delivery personnel tickets" />;
}
