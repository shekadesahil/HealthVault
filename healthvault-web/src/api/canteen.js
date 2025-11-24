// src/api/canteen.js
import client from './client'

// List canteen orders (supports ?status=, ?patient=, ?user=)
export function listOrders(params = {}) {
  return client.get('/canteen-orders/', { params })
}

// Create a new order
export function createOrder(payload) {
  // { patient?: number, user?: number }
  return client.post('/canteen-orders/', payload)
}

// Add an item to an order
export function addItem(orderId, { menu_item, qty }) {
  return client.post(`/canteen-orders/${orderId}/add-item/`, { menu_item, qty })
}

// Update order status (preparing | ready | delivered | cancelled)
export function updateOrderStatus(orderId, status) {
  return client.patch(`/canteen-orders/${orderId}/`, { status })
}

// ✅ Export this so Orders.jsx can import it
export function cancelOrder(orderId) {
  return updateOrderStatus(orderId, 'cancelled')
}

// Menu lookup for compose UI
export function listMenu(params = {}) {
  return client.get('/menu/', { params })
}
