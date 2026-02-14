/**
 * Order API Routes
 */

import { Router, type Request, type Response } from 'express';
import * as db from '../../shared/db.js';

export const orderRoutes = Router();

// Get order by ID
orderRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get order by chain ID
orderRoutes.get('/chain/:orderId', async (req: Request, res: Response) => {
  try {
    const order = await db.getOrderByChainId(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Retry a failed order (for manual intervention)
orderRoutes.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status !== 'failed' && order.status !== 'expired') {
      return res.status(400).json({ error: 'Only failed or expired orders can be retried' });
    }
    
    await db.updateOrderStatus(order.id, 'pending', { errorMessage: undefined });
    res.json({ message: 'Order queued for retry' });
  } catch (err) {
    console.error('Error retrying order:', err);
    res.status(500).json({ error: 'Failed to retry order' });
  }
});

// Cancel an order (only if pending)
orderRoutes.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }
    
    await db.updateOrderStatus(order.id, 'cancelled');
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    console.error('Error cancelling order:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});
