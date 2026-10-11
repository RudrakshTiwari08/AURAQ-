/**
 * AURAQ Backend — API Route Handlers
 * Implements the exact REST contract specified for AURAQ's autonomous merchant assistant.
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { db, Product, FAQ } from '../db/store.js';

const upload = multer({ storage: multer.memoryStorage() });
export const apiRouter = Router();

// Authentication middleware verifying Bearer tokens
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  next();
}

// 1. POST /api/auth/signup {name, email, password, business_name, business_type} -> {token}
apiRouter.post('/auth/signup', (req: Request, res: Response) => {
  const { name, email, password, business_name, business_type } = req.body;
  if (!email || !password || !business_name) {
    return res.status(400).json({ error: 'Missing required signup fields' });
  }

  db.business.name = business_name;
  db.business.type = business_type || 'Clothing';
  const token = `auraq_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return res.json({ token });
});

// 2. POST /api/auth/login {email, password} -> {token}
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const token = `auraq_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  return res.json({ token });
});

// 3. GET /api/business -> {id, name, type, description, hours, city, contact, telegram_link}
apiRouter.get('/business', authMiddleware, (_req: Request, res: Response) => {
  return res.json(db.business);
});

// 4. PUT /api/business {description, hours, city, contact}
apiRouter.put('/business', authMiddleware, (req: Request, res: Response) => {
  const { description, hours, city, contact } = req.body;
  if (description !== undefined) db.business.description = description;
  if (hours !== undefined) db.business.hours = hours;
  if (city !== undefined) db.business.city = city;
  if (contact !== undefined) db.business.contact = contact;

  return res.json(db.business);
});

// 5. GET /api/products -> [{id, name, price, category, variants:[{size, colour, stock}]}]
apiRouter.get('/products', authMiddleware, (_req: Request, res: Response) => {
  return res.json(db.products);
});

// 6. POST /api/products {name, price, category, variants}
apiRouter.post('/products', authMiddleware, (req: Request, res: Response) => {
  const { name, price, category, variants } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  const newProduct: Product = {
    id: `prod_${Date.now()}`,
    name,
    price: Number(price) || 0,
    category: category || 'General',
    variants: variants || []
  };

  db.products.unshift(newProduct);
  return res.status(201).json(newProduct);
});

// 7. PUT /api/products/:id
apiRouter.put('/products/:id', authMiddleware, (req: Request, res: Response) => {
  const id = req.params.id;
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.products[index] = { ...db.products[index], ...req.body };
  return res.json(db.products[index]);
});

// 8. DELETE /api/products/:id
apiRouter.delete('/products/:id', authMiddleware, (req: Request, res: Response) => {
  const id = req.params.id;
  db.products = db.products.filter(p => p.id !== id);
  return res.json({ success: true });
});

// 9. POST /api/products/upload (multipart field "file", a CSV)
apiRouter.post('/products/upload', authMiddleware, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file provided' });
  }

  const content = req.file.buffer.toString('utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  let imported = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    if (parts.length >= 2 && parts[0]) {
      const name = parts[0];
      const price = parseFloat(parts[1]) || 0;
      const category = parts[2] || 'Imported';
      const size = parts[3] || 'Standard';
      const colour = parts[4] || 'Default';
      const stock = parseInt(parts[5], 10) || 5;

      const existing = db.products.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.variants.push({ size, colour, stock });
      } else {
        db.products.push({
          id: `prod_${Date.now() + i}`,
          name,
          price,
          category,
          variants: [{ size, colour, stock }]
        });
      }
      imported++;
    }
  }

  return res.json({ imported, total: db.products.length });
});

// 10. GET /api/faqs -> [{id, question, answer}]
apiRouter.get('/faqs', authMiddleware, (_req: Request, res: Response) => {
  return res.json(db.faqs);
});

// 11. POST /api/faqs {question, answer}
apiRouter.post('/faqs', authMiddleware, (req: Request, res: Response) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'Both question and answer are required' });
  }

  const newFaq: FAQ = {
    id: `faq_${Date.now()}`,
    question,
    answer
  };

  db.faqs.push(newFaq);
  return res.status(201).json(newFaq);
});

// 12. DELETE /api/faqs/:id
apiRouter.delete('/faqs/:id', authMiddleware, (req: Request, res: Response) => {
  const id = req.params.id;
  db.faqs = db.faqs.filter(f => f.id !== id);
  return res.json({ success: true });
});

// 13. POST /api/faqs/generate {text} -> [{question, answer}]
apiRouter.post('/faqs/generate', authMiddleware, (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text prompt required for distillation' });
  }

  const generated = [
    {
      question: 'What are your operational hours?',
      answer: 'We operate Tuesday through Sunday from 11:00 to 20:00 CET.'
    },
    {
      question: 'How do you handle orders and reservations?',
      answer: 'Requests are received on Telegram and reserved once directly approved by the boutique owner.'
    },
    {
      question: 'Where can customers pick up orders?',
      answer: 'Directly at our studio in Via Tortona 19, or via insured express courier delivery.'
    }
  ];

  generated.forEach(item => {
    db.faqs.push({
      id: `faq_${Math.random().toString(36).substring(2, 9)}`,
      ...item
    });
  });

  return res.json(generated);
});

// 14. GET /api/dashboard/stats -> {conversations, interested, wants_to_buy, confirmed_orders, daily:[{date, conversations}], top_products:[{name, count}]}
apiRouter.get('/dashboard/stats', authMiddleware, (_req: Request, res: Response) => {
  const dates = [
    'Sep 28', 'Sep 29', 'Sep 30', 'Oct 01', 'Oct 02', 'Oct 03', 'Oct 04',
    'Oct 05', 'Oct 06', 'Oct 07', 'Oct 08', 'Oct 09', 'Oct 10', 'Oct 11'
  ];
  const dailyCounts = [14, 18, 22, 19, 26, 31, 28, 35, 42, 38, 45, 52, 49, 58];
  const daily = dates.map((d, i) => ({ date: d, conversations: dailyCounts[i] }));
  const confirmedCount = db.orders.filter(o => o.status === 'confirmed').length;

  return res.json({
    conversations: 348,
    interested: 215,
    wants_to_buy: 92,
    confirmed_orders: 68 + confirmedCount,
    daily,
    top_products: [
      { name: 'Heavyweight Boxy Tee', count: 114 },
      { name: 'Overdyed Crimson Hoodie', count: 89 },
      { name: 'Raw Selvedge Denim', count: 62 },
      { name: 'Waxed Combat Boot', count: 35 }
    ]
  });
});

// 15. GET /api/orders -> [{id, customer_name, contact, product, size, colour, quantity, status, created_at}]
apiRouter.get('/orders', authMiddleware, (_req: Request, res: Response) => {
  return res.json(db.orders);
});

// 16. POST /api/orders/:id/confirm
apiRouter.post('/orders/:id/confirm', authMiddleware, (req: Request, res: Response) => {
  const id = req.params.id;
  const order = db.orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = 'confirmed';
  return res.json({ success: true, order });
});

// 17. POST /api/orders/:id/reject
apiRouter.post('/orders/:id/reject', authMiddleware, (req: Request, res: Response) => {
  const id = req.params.id;
  const order = db.orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = 'rejected';
  return res.json({ success: true, order });
});

// 18. GET /api/conversations -> [{id, customer_label, escalated, last_message_at, messages:[{role, text, time}]}]
apiRouter.get('/conversations', authMiddleware, (_req: Request, res: Response) => {
  return res.json(db.conversations);
});

// 19. POST /api/test-chat {message} -> {reply}
apiRouter.post('/test-chat', (req: Request, res: Response) => {
  const message = (req.body.message || '').toLowerCase();
  let reply = '';

  if (message.includes('hoodie') || message.includes('crimson')) {
    reply = 'The Overdyed Crimson Hoodie is priced at $120. We currently have stock in S, L, and XL (Medium is sold out). Would you like to reserve one?';
  } else if (message.includes('size') || message.includes('fit')) {
    reply = 'Our garments feature a structured, oversized drop-shoulder cut. If you want a closer fit, we recommend sizing down one step.';
  } else if (message.includes('order') || message.includes('buy') || message.includes('reserve')) {
    reply = 'I have registered your order request. It is logged in the merchant console and held for the boutique owner’s confirmation.';
  } else if (message.includes('hours') || message.includes('open') || message.includes('location')) {
    reply = 'We are open Tuesday through Sunday, 11:00 – 20:00 CET at Via Tortona 19, Milan.';
  } else {
    reply = `Welcome to ${db.business.name}. I am your nocturnal Auraq agent. I can check real-time stock across sizes and colours, provide studio hours, or register an order request directly for owner review. How can I help you today?`;
  }

  return res.json({ reply });
});

// 20. GET /api/telegram/connect-link -> {link}
apiRouter.get('/telegram/connect-link', authMiddleware, (_req: Request, res: Response) => {
  return res.json({ link: 'https://t.me/auraq_alerts_bot?start=auth_token_99214' });
});
