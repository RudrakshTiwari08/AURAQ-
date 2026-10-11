/**
 * AURAQ Backend — Persistent Data Store
 * In-memory state store preloaded with realistic boutique inventory and historical records.
 */

export interface Variant {
  size: string;
  colour: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  variants: Variant[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface Order {
  id: string;
  customer_name: string;
  contact: string;
  product: string;
  size: string;
  colour: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
}

export interface Message {
  role: 'customer' | 'assistant';
  text: string;
  time: string;
}

export interface Conversation {
  id: string;
  customer_label: string;
  escalated: boolean;
  last_message_at: string;
  messages: Message[];
}

export interface Business {
  id: string;
  name: string;
  type: string;
  description: string;
  hours: string;
  city: string;
  contact: string;
  telegram_link: string;
}

export const db = {
  business: {
    id: 'biz_01',
    name: 'ATELIER NOIR',
    type: 'Clothing',
    description: 'Independent nocturnal garment house crafting heavyweight staples and raw denim in limited numbered runs.',
    hours: 'Tuesday – Sunday, 11:00 – 20:00 CET',
    city: 'Milan',
    contact: '@ateliernoir_milano',
    telegram_link: 'https://t.me/auraq_sales_bot?start=ateliernoir'
  } as Business,

  products: [
    {
      id: 'prod_1',
      name: 'Heavyweight Boxy Tee',
      price: 58,
      category: 'T-Shirts',
      variants: [
        { size: 'S', colour: 'Noir', stock: 14 },
        { size: 'M', colour: 'Noir', stock: 8 },
        { size: 'L', colour: 'Noir', stock: 22 },
        { size: 'M', colour: 'Oxblood', stock: 5 }
      ]
    },
    {
      id: 'prod_2',
      name: 'Raw Selvedge Denim',
      price: 165,
      category: 'Jeans',
      variants: [
        { size: '30', colour: 'Indigo', stock: 12 },
        { size: '32', colour: 'Indigo', stock: 7 },
        { size: '34', colour: 'Indigo', stock: 4 }
      ]
    },
    {
      id: 'prod_3',
      name: 'Overdyed Crimson Hoodie',
      price: 120,
      category: 'Hoodies',
      variants: [
        { size: 'S', colour: 'Crimson', stock: 9 },
        { size: 'M', colour: 'Crimson', stock: 0 },
        { size: 'L', colour: 'Crimson', stock: 15 },
        { size: 'XL', colour: 'Crimson', stock: 6 }
      ]
    },
    {
      id: 'prod_4',
      name: 'Waxed Combat Boot',
      price: 240,
      category: 'Shoes',
      variants: [
        { size: '41', colour: 'Black', stock: 6 },
        { size: '42', colour: 'Black', stock: 3 },
        { size: '43', colour: 'Black', stock: 10 }
      ]
    }
  ] as Product[],

  faqs: [
    {
      id: 'faq_1',
      question: 'What is your shipping window for online drops?',
      answer: 'All orders ship via insured courier within 24 to 48 hours of owner confirmation. Tracking is dispatched directly to your Telegram handle.'
    },
    {
      id: 'faq_2',
      question: 'How do your tees and hoodies fit?',
      answer: 'Our cuts feature a relaxed, structured drop-shoulder silhouette. If you prefer a traditional slim cut, size down by one.'
    },
    {
      id: 'faq_3',
      question: 'Can I exchange or return an item if the size is incorrect?',
      answer: 'Yes. We accept exchanges within 14 days of delivery as long as garments remain unworn with original tags attached.'
    },
    {
      id: 'faq_4',
      question: 'Where can I see items in person?',
      answer: 'Our flagship studio is located at Via Tortona 19, Milan. Open Tuesday to Sunday, 11:00 to 20:00.'
    }
  ] as FAQ[],

  orders: [
    {
      id: 'ord_101',
      customer_name: 'Elena Rostova',
      contact: '@elena_rostova',
      product: 'Overdyed Crimson Hoodie',
      size: 'L',
      colour: 'Crimson',
      quantity: 1,
      status: 'pending',
      created_at: '2026-10-11 11:42'
    },
    {
      id: 'ord_102',
      customer_name: 'Marcus Vance',
      contact: '@marcusvance',
      product: 'Raw Selvedge Denim',
      size: '32',
      colour: 'Indigo',
      quantity: 1,
      status: 'pending',
      created_at: '2026-10-11 10:15'
    },
    {
      id: 'ord_103',
      customer_name: 'Camille Laurent',
      contact: '@camille_l',
      product: 'Heavyweight Boxy Tee',
      size: 'M',
      colour: 'Noir',
      quantity: 2,
      status: 'confirmed',
      created_at: '2026-10-10 18:30'
    },
    {
      id: 'ord_104',
      customer_name: 'David K.',
      contact: '@david_k_77',
      product: 'Waxed Combat Boot',
      size: '42',
      colour: 'Black',
      quantity: 1,
      status: 'rejected',
      created_at: '2026-10-10 14:10'
    },
    {
      id: 'ord_105',
      customer_name: 'Aria Chen',
      contact: '@ariachen',
      product: 'Heavyweight Boxy Tee',
      size: 'S',
      colour: 'Oxblood',
      quantity: 1,
      status: 'confirmed',
      created_at: '2026-10-09 21:05'
    }
  ] as Order[],

  conversations: [
    {
      id: 'conv_1',
      customer_label: 'Elena Rostova (@elena_rostova)',
      escalated: true,
      last_message_at: '11:42 AM',
      messages: [
        { role: 'customer', text: 'Hi! Do you have the Crimson Hoodie in Large in stock?', time: '11:40 AM' },
        { role: 'assistant', text: 'Yes, 15 pieces in Large Crimson are available right now at $120. Would you like me to register an order request for you?', time: '11:40 AM' },
        { role: 'customer', text: 'Yes please, 1 Large Crimson to Milan. Can you hold it?', time: '11:41 AM' },
        { role: 'assistant', text: 'Order request submitted to the owner! You will receive confirmation and payment coordinates as soon as they review it.', time: '11:42 AM' }
      ]
    },
    {
      id: 'conv_2',
      customer_label: 'Marcus Vance (@marcusvance)',
      escalated: false,
      last_message_at: '10:15 AM',
      messages: [
        { role: 'customer', text: 'Are the Raw Selvedge jeans stiff or pre-washed?', time: '10:13 AM' },
        { role: 'assistant', text: 'They are unwashed 14oz Japanese raw denim. They break in and fade uniquely based on how you move in them.', time: '10:14 AM' },
        { role: 'customer', text: 'Awesome. Put me down for a size 32 in Indigo.', time: '10:15 AM' },
        { role: 'assistant', text: 'Order request submitted! Waiting for the owner to confirm your pair.', time: '10:15 AM' }
      ]
    },
    {
      id: 'conv_3',
      customer_label: 'Guest #4892',
      escalated: false,
      last_message_at: '09:05 AM',
      messages: [
        { role: 'customer', text: 'What time does the studio open today?', time: '09:04 AM' },
        { role: 'assistant', text: 'The showroom is open today from 11:00 AM to 8:00 PM at Via Tortona 19.', time: '09:05 AM' }
      ]
    }
  ] as Conversation[]
};
