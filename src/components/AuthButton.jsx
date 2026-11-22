import GlassButton from "./GlassButton.jsx";

// A button for the login boxes. On the main login page it is a GlassButton;
// on the seller page pass className="btn btn-solid" (or "btn btn-ghost") to match that page.
export default function AuthButton({ solid = false, className, children, ...rest }) {
  if (className) {
    return (
      <button type="button" className={className} style={{ width: "100%", marginTop: "10px", padding: "14px", fontSize: "16px" }} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <GlassButton variant={solid ? "solid" : "ghost"} block {...rest}>
      {children}
    </GlassButton>
  );
}