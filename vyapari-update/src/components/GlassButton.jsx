import { Link } from "react-router-dom";

/*
  An iPhone-style glass button.
    <GlassButton to="/login" variant="solid">Log in</GlassButton>   -> a link
    <GlassButton onClick={...}>Add to cart</GlassButton>            -> a button
  variant: "glass" (default, see-through), "solid" (light cream), "ghost" (outline)
  block:   makes it full width
*/
export default function GlassButton({
  to,
  variant = "glass",
  block = false,
  className = "",
  children,
  type = "button",
  ...rest
}) {
  const cls = ["btn", "glass", "btn-" + variant, block ? "block" : "", className].filter(Boolean).join(" ");
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}