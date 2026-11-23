/*
  ONE place that talks to the backend.
  Every dashboard screen imports from here and never calls fetch() itself.

  USE_MOCK = true   -> fake data kept in the browser (works with no backend)
  USE_MOCK = false  -> real Spring Boot calls (see http.js)

  To switch later, create a file called  .env  in the project folder with:
      VITE_USE_MOCK=false
  and restart `npm run dev`.
*/
import * as mock from "./mock.js";
import * as http from "./http.js";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

const impl = USE_MOCK ? mock : http;

// products
export const getItems = impl.getItems; //                 -> [Item]
export const addItem = impl.addItem; //                   (fields, imageFile) -> Item
export const updateItem = impl.updateItem; //             (id, changes, imageFile?) -> Item
export const deleteItem = impl.deleteItem; //             (id)
// orders
export const getOrders = impl.getOrders; //               -> [Order]  (newest first)
export const updateOrderStatus = impl.updateOrderStatus; // (id, status, reason?) -> Order
// analytics
export const getStats = impl.getStats; //                 (days; 0 = all time) -> Stats
export const getReviews = impl.getReviews; //             -> [Review]
// shop
export const getProfile = impl.getProfile; //             -> Profile
export const saveProfile = impl.saveProfile; //           (profile) -> Profile
// wallet
export const getWallet = impl.getWallet; //               -> Wallet
export const requestWithdrawal = impl.requestWithdrawal; // ({ amount, payTo })
// support
export const sendTicket = impl.sendTicket; //             (subject, message)

// delivery personnel
export const getDeliveryProfile = impl.getDeliveryProfile;
export const saveDeliveryProfile = impl.saveDeliveryProfile;
export const toggleDutyStatus = impl.toggleDutyStatus;
export const getDeliveryShipments = impl.getDeliveryShipments;
export const claimShipment = impl.claimShipment;
export const rejectShipment = impl.rejectShipment;
export const startDeliveryRun = impl.startDeliveryRun;
export const verifyDeliveryOtp = impl.verifyDeliveryOtp;
export const getDeliveryWallet = impl.getDeliveryWallet;
export const requestDeliveryWithdrawal = impl.requestDeliveryWithdrawal;