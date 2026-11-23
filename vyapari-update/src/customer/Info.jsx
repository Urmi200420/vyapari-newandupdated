import Button from "../components/GlassButton.jsx";
import { Heading } from "./shared.jsx";
export function Info({ page, notify }) {
  const content = {
    about: [
      "Good finds. Local connections.",
      "Vyapari brings everyday essentials and independent sellers together in one welcoming marketplace. This customer experience uses sample products and local browser data for demonstration.",
    ],
    policies: [
      "Customer policies",
      "Demo orders do not create real purchases. Cash on Delivery is the only payment method. Delivery costs ₹49 below ₹999 and is free from ₹999. In this sample policy, customers may request returns within 7 days for eligible unused products; fresh produce and opened personal-care products are excluded. Contact the seller about damaged or incorrect items. Your demo profile, addresses, cart and orders stay in this browser until its site data is cleared.",
    ],
  };
  return (
    <>
      <Heading eyebrow="Here to help">
        {page === "contact"
          ? "Let’s stay in touch."
          : page === "faq"
            ? "A little clarity."
            : content[page][0]}
      </Heading>
      <section className="cu-panel cu-prose">
        {content[page] && <p>{content[page][1]}</p>}
        {page === "faq" &&
          [
            [
              "Can I shop as a guest?",
              "You can browse everything. Switch to Registered User demo mode to add products and place a sample order.",
            ],
            [
              "How do I pay?",
              "Cash on Delivery only. Pay the shown amount in cash when the order arrives.",
            ],
            [
              "What does delivery cost?",
              "₹49 for orders below ₹999. Orders from ₹999 have free delivery.",
            ],
            [
              "Is this a real order?",
              "No. This is a frontend demonstration. No seller receives your order or personal data.",
            ],
            [
              "Where can I track an order?",
              "Open My Orders, then View & Track Order. History includes both active and delivered orders.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        {page === "contact" && (
          <form
            className="cu-form"
            onSubmit={(e) => {
              e.preventDefault();
              e.currentTarget.reset();
              notify(
                "Demo message recorded on screen only. No message has been sent.",
              );
            }}
          >
            <p>
              Use this demonstration contact form to try the experience.
              Messages are not sent.
            </p>
            <label>
              Name
              <input required name="name" />
            </label>
            <label>
              Email
              <input required name="email" type="email" />
            </label>
            <label>
              Message
              <textarea required name="message" minLength="10" rows="5" />
            </label>
            <Button type="submit" variant="solid">
              Submit demo message
            </Button>
          </form>
        )}
      </section>
    </>
  );
}
