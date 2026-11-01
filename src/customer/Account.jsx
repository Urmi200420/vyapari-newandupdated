import { useState } from "react";
import Button from "../components/GlassButton.jsx";
import { newId } from "./store.js";
import { Heading, Address } from "./shared.jsx";
const addressFields = [
  ["label", "Address label"],
  ["name", "Full name"],
  ["phone", "Phone number"],
  ["house", "House / building"],
  ["street", "Street / area"],
  ["city", "City"],
  ["state", "State"],
  ["pin", "PIN code"],
];
export function AddressBook({ state, update, selected, select, notify }) {
  const [editing, setEditing] = useState(null);
  function save(e) {
    e.preventDefault();
    const a = {
      ...Object.fromEntries(new FormData(e.currentTarget)),
      id: editing.id || newId(),
    };
    update((s) => ({
      ...s,
      addresses: [...s.addresses.filter((x) => x.id !== a.id), a],
    }));
    select?.(a.id);
    setEditing(null);
    notify("Address saved.");
  }
  return (
    <section className="cu-panel">
      <div className="cu-between">
        <h2>Shipping addresses</h2>
        <Button onClick={() => setEditing({})}>Add new address</Button>
      </div>
      {state.addresses.length === 0 && <p>Add an address to continue.</p>}
      {state.addresses.map((a) => (
        <div className="cu-address" key={a.id}>
          {select && (
            <label>
              <input
                type="radio"
                name="shipping"
                checked={selected === a.id}
                onChange={() => select(a.id)}
              />{" "}
              Deliver here
            </label>
          )}
          <b>
            {a.label} · {a.name}
          </b>
          <Address a={a} />
          <div className="cu-actions">
            <Button onClick={() => setEditing(a)}>Edit</Button>
            <Button
              onClick={() => {
                if (window.confirm("Delete this saved address?")) {
                  update((s) => ({
                    ...s,
                    addresses: s.addresses.filter((x) => x.id !== a.id),
                  }));
                  if (selected === a.id) select?.("");
                  notify("Address deleted.");
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
      {editing && (
        <form key={editing.id || "new"} onSubmit={save} className="cu-form">
          <h3>{editing.id ? "Edit address" : "New address"}</h3>
          {addressFields.map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                name={key}
                defaultValue={editing[key] || ""}
                required
                pattern={
                  key === "phone"
                    ? "[6-9][0-9]{9}"
                    : key === "pin"
                      ? "[1-9][0-9]{5}"
                      : ".*\\S.*"
                }
                title={
                  key === "phone"
                    ? "Enter a valid 10-digit Indian mobile number"
                    : key === "pin"
                      ? "Enter a 6-digit PIN code"
                      : "This field is required"
                }
                maxLength={key === "phone" ? 10 : key === "pin" ? 6 : 150}
              />
            </label>
          ))}
          <div className="cu-actions">
            <Button variant="solid" type="submit">
              Save address
            </Button>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      )}
    </section>
  );
}

export function Profile({ state, update, notify }) {
  return (
    <>
      <Heading eyebrow="A space of your own">Your profile.</Heading>
      <div className="cu-split">
        <div className="cu-stack">
          <form
            className="cu-panel cu-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              update((s) => ({ ...s, profile: { ...s.profile, ...data } }));
              notify("Profile saved.");
            }}
          >
            <h2>Personal information</h2>
            {[
              ["name", "Full name", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone", "tel"],
            ].map(([key, label, type]) => (
              <label key={key}>
                {label}
                <input
                  name={key}
                  type={type}
                  required
                  pattern={
                    key === "phone"
                      ? "[6-9][0-9]{9}"
                      : key === "name"
                        ? ".*\\S.*"
                        : undefined
                  }
                  defaultValue={state.profile[key]}
                />
              </label>
            ))}
            <Button type="submit" variant="solid">
              Save profile
            </Button>
          </form>
          <form
            className="cu-panel cu-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (f.get("password") !== f.get("confirm"))
                return notify("Passwords do not match.");
              update((s) => ({
                ...s,
                passwordChangedAt: new Date().toISOString(),
              }));
              e.currentTarget.reset();
              notify("Password change simulated. No credentials are stored.");
            }}
          >
            <h2>Simulate password change</h2>
            <p>This frontend demo does not authenticate or save passwords.</p>
            <label>
              New password
              <input
                type="password"
                name="password"
                minLength="8"
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                name="confirm"
                minLength="8"
                required
                autoComplete="new-password"
              />
            </label>
            <Button type="submit">Simulate change</Button>
            {state.passwordChangedAt && (
              <p>
                Last simulated change:{" "}
                {new Date(state.passwordChangedAt).toLocaleString()}
              </p>
            )}
          </form>
          <section className="cu-panel">
            <h2>Account settings</h2>
            <label>
              <input
                type="checkbox"
                checked={state.profile.updates}
                onChange={(e) => {
                  update((s) => ({
                    ...s,
                    profile: { ...s.profile, updates: e.target.checked },
                  }));
                  notify("Preference saved.");
                }}
              />{" "}
              Receive product updates (demo preference)
            </label>
          </section>
        </div>
        <AddressBook {...{ state, update, notify }} />
      </div>
    </>
  );
}
