import { useState, useEffect, useMemo, useRef } from 'react';
import type {
  InventoryItem,
  SaleRecord,
  Note,
  Tab,
  ToastMessage,
  AppSettings,
  InventorySort,
  Expense,
  Purchase,
  Customer,
  TeamMember,
  UserRole,
  AuditLogEntry,
  CartLine,
  PaymentStatus,
} from '@/types';
import {
  loadInventory,
  saveInventory,
  loadSales,
  saveSales,
  loadNotes,
  saveNotes,
  loadSettings,
  saveSettings,
  loadExpenses,
  saveExpenses,
  loadPurchases,
  savePurchases,
  loadCustomers,
  saveCustomers,
  loadAuditLog,
  appendAuditEntry,
  hasSeededData,
  markSeeded,
  KEYS,
} from '@/lib/storage';
import { formatDateDMY, todayISO, startOfWeekISO, startOfMonthISO } from '@/lib/format';
import { formatMoney } from '@/lib/currency';
import { downloadCSV } from '@/lib/csv';
import { downloadJSON, parseBackup } from '@/lib/backup';
import { useHashTab } from '@/lib/useHashTab';
import { useTheme } from '@/lib/useTheme';
import { useConversionRate } from '@/lib/useConversionRate';
import { isSupabaseConfigured, subscribeToWorkspaceChanges } from '@/lib/supabaseClient';
import { can } from '@/lib/permissions';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ToastContainer } from '@/components/Toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ConfirmDialog';
import { EditItemModal } from '@/components/EditItemModal';
import { EditSaleModal } from '@/components/EditSaleModal';
import { RestockModal } from '@/components/RestockModal';
import { ImportInventoryModal } from '@/components/ImportInventoryModal';
import { ReceiptModal } from '@/components/ReceiptModal';
import { SaleCart } from '@/components/SaleCart';
import { DebtorsTab } from '@/components/DebtorsTab';
import { ExpensesTab } from '@/components/ExpensesTab';
import { PurchaseHistory } from '@/components/PurchaseHistory';
import { SettingsPanel } from '@/components/SettingsPanel';
import { RevenueChart } from '@/components/RevenueChart';
import { Pagination } from '@/components/Pagination';
import { ReportsTab } from '@/components/ReportsTab';
import { ActivityLogTab } from '@/components/ActivityLogTab';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';

// Sample data — only used to seed the very first launch.
const initialInventory: InventoryItem[] = [
  { id: 'ITM-001', name: 'Softcare Sanitary Pads (Purple/Blue Maxi Long 8s)', category: 'Home & Personal Care', buyingPrice: 2400, sellingPrice: 3500, currentStock: 45, reorderLevel: 15 },
  { id: 'ITM-002', name: 'Always Sanitary Pads (Blue Maxi Thick / Pink Extra Long)', category: 'Home & Personal Care', buyingPrice: 2600, sellingPrice: 3800, currentStock: 60, reorderLevel: 20 },
  { id: 'ITM-003', name: 'White Star Laundry Soap (Long Bar 1kg - Lemon/Aloe)', category: 'Home & Personal Care', buyingPrice: 3800, sellingPrice: 4500, currentStock: 50, reorderLevel: 15 },
  { id: 'ITM-004', name: 'White Star Magic Laundry Soap (Green Bar 600g)', category: 'Home & Personal Care', buyingPrice: 2500, sellingPrice: 3200, currentStock: 40, reorderLevel: 12 },
  { id: 'ITM-005', name: 'White Star Magic Detergent Tub (Green 500g)', category: 'Home & Personal Care', buyingPrice: 3500, sellingPrice: 4500, currentStock: 24, reorderLevel: 8 },
  { id: 'ITM-006', name: 'Nomi Synthetic Detergent Powder Tub (White/Red 500g)', category: 'Home & Personal Care', buyingPrice: 3400, sellingPrice: 4500, currentStock: 36, reorderLevel: 12 },
  { id: 'ITM-007', name: 'Nomi Synthetic Detergent Powder Tub (White/Red 250g)', category: 'Home & Personal Care', buyingPrice: 1800, sellingPrice: 2500, currentStock: 30, reorderLevel: 10 },
  { id: 'ITM-008', name: 'Omo Laundry Detergent Powder (Blue/White Packet)', category: 'Home & Personal Care', buyingPrice: 1200, sellingPrice: 1800, currentStock: 40, reorderLevel: 15 },
  { id: 'ITM-009', name: 'Jamaa Laundry Soap (Pink Long Bar 1kg)', category: 'Home & Personal Care', buyingPrice: 3400, sellingPrice: 4200, currentStock: 20, reorderLevel: 8 },
  { id: 'ITM-010', name: 'Geisha Bathing Soap Bars (Multi-pack variant)', category: 'Home & Personal Care', buyingPrice: 2800, sellingPrice: 3800, currentStock: 15, reorderLevel: 5 },
  { id: 'ITM-011', name: 'Kyoga / Kyogero Herbal Bathing Soap Bars', category: 'Home & Personal Care', buyingPrice: 1500, sellingPrice: 2200, currentStock: 25, reorderLevel: 8 },
  { id: 'ITM-012', name: 'Dettol Soap Bars (Herbal Green / Original White)', category: 'Home & Personal Care', buyingPrice: 2200, sellingPrice: 3000, currentStock: 30, reorderLevel: 10 },
  { id: 'ITM-013', name: 'Imperial Leather Soap Bars (Classic Red/Pink)', category: 'Home & Personal Care', buyingPrice: 2500, sellingPrice: 3500, currentStock: 24, reorderLevel: 8 },
  { id: 'ITM-014', name: 'Cuttie Baby Diapers (Large Master Packs)', category: 'Home & Personal Care', buyingPrice: 18500, sellingPrice: 22000, currentStock: 12, reorderLevel: 4 },
  { id: 'ITM-015', name: 'Pampers Baby-Dry Diapers (Teal Pack - Newborn Size 1)', category: 'Home & Personal Care', buyingPrice: 6500, sellingPrice: 8500, currentStock: 10, reorderLevel: 3 },
  { id: 'ITM-016', name: 'Lovely Family Toilet Paper (Gold Edition Multi-rolls)', category: 'Home & Personal Care', buyingPrice: 4000, sellingPrice: 5500, currentStock: 18, reorderLevel: 6 },
  { id: 'ITM-017', name: 'Lovely Family Toilet Paper (Single Wrapped Rolls)', category: 'Home & Personal Care', buyingPrice: 800, sellingPrice: 1200, currentStock: 64, reorderLevel: 20 },
  { id: 'ITM-018', name: 'Nile / Nilelea Toilet Paper (Plastic Bundles)', category: 'Home & Personal Care', buyingPrice: 4200, sellingPrice: 5800, currentStock: 15, reorderLevel: 5 },
  { id: 'ITM-019', name: 'Vaseline Blue Seal Petroleum Jelly (Original 250ml)', category: 'Home & Personal Care', buyingPrice: 4500, sellingPrice: 6000, currentStock: 20, reorderLevel: 6 },
  { id: 'ITM-020', name: 'Vaseline Blue Seal Petroleum Jelly (Men 250ml)', category: 'Home & Personal Care', buyingPrice: 4800, sellingPrice: 6500, currentStock: 15, reorderLevel: 5 },
  { id: 'ITM-021', name: 'Softcare / Luxury Pocket Tissues (Wrapped Packs)', category: 'Home & Personal Care', buyingPrice: 400, sellingPrice: 700, currentStock: 80, reorderLevel: 25 },
  { id: 'ITM-022', name: 'Downy Fabric Softener (Single-use sachets)', category: 'Home & Personal Care', buyingPrice: 400, sellingPrice: 600, currentStock: 100, reorderLevel: 30 },
  { id: 'ITM-023', name: 'Colgate Toothpaste (Maximum Cavity Protection 100g)', category: 'Oral & Dental Care', buyingPrice: 3500, sellingPrice: 4500, currentStock: 30, reorderLevel: 10 },
  { id: 'ITM-024', name: 'Colgate Toothpaste (Herbal Green 100g)', category: 'Oral & Dental Care', buyingPrice: 3600, sellingPrice: 4600, currentStock: 20, reorderLevel: 8 },
  { id: 'ITM-025', name: 'Pepsodent Toothpaste (Herbal Salt & Mint 150g)', category: 'Oral & Dental Care', buyingPrice: 4000, sellingPrice: 5500, currentStock: 25, reorderLevel: 8 },
  { id: 'ITM-026', name: 'ABC Dent Toothpaste (Maxi Protect Fluoride 70g)', category: 'Oral & Dental Care', buyingPrice: 1500, sellingPrice: 2200, currentStock: 40, reorderLevel: 12 },
  { id: 'ITM-027', name: 'Nice Classic Toothbrushes (12-Piece Display Card)', category: 'Oral & Dental Care', buyingPrice: 8000, sellingPrice: 12000, currentStock: 8, reorderLevel: 3 },
  { id: 'ITM-028', name: 'Dent-Up / White Doctor / Fresh Doctor Toothbrushes', category: 'Oral & Dental Care', buyingPrice: 700, sellingPrice: 1200, currentStock: 72, reorderLevel: 20 },
  { id: 'ITM-029', name: 'Supreme Premium Wheat Flour (2kg Packet)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 5800, sellingPrice: 7000, currentStock: 35, reorderLevel: 12 },
  { id: 'ITM-030', name: 'Fortune Vegetable Cooking Oil (1 Liter Bottle)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 7400, sellingPrice: 8500, currentStock: 24, reorderLevel: 8 },
  { id: 'ITM-031', name: 'Fortune Vegetable Cooking Oil (500ml Pouch Carton 24s)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 64000, sellingPrice: 76800, currentStock: 3, reorderLevel: 1 },
  { id: 'ITM-032', name: 'Sunseed Refined Sunflower Oil (2 Liter jerrycan)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 14800, sellingPrice: 17000, currentStock: 16, reorderLevel: 5 },
  { id: 'ITM-033', name: 'Sunseed Refined Sunflower Oil (1 Liter Bottle)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 7600, sellingPrice: 8800, currentStock: 24, reorderLevel: 8 },
  { id: 'ITM-034', name: 'Roki Fortified Vegetable Edible Oil (Yellow Jerrycan)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 7500, sellingPrice: 8800, currentStock: 18, reorderLevel: 6 },
  { id: 'ITM-035', name: 'Modern Refined Cooking Oil (500ml Pouch Carton 24s)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 60000, sellingPrice: 72000, currentStock: 4, reorderLevel: 1 },
  { id: 'ITM-036', name: 'Habari Iodated Edible Table Salt (500g Bag)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 700, sellingPrice: 1000, currentStock: 120, reorderLevel: 40 },
  { id: 'ITM-037', name: 'Pure Glucose Powder Energy Box (30g)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 600, sellingPrice: 1000, currentStock: 50, reorderLevel: 15 },
  { id: 'ITM-038', name: 'Fortune Spaghetti (Red Wrapper 500g)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 2500, sellingPrice: 3500, currentStock: 30, reorderLevel: 10 },
  { id: 'ITM-039', name: 'Santa Lucia Spaghetti (Blue/Yellow Wrapper 250g)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 1400, sellingPrice: 2000, currentStock: 40, reorderLevel: 12 },
  { id: 'ITM-040', name: 'Diamond Superior Spaghetti (Bulk Master Box 40x200g)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 48000, sellingPrice: 60000, currentStock: 2, reorderLevel: 1 },
  { id: 'ITM-041', name: 'Royco Mchuzi Mix Beef/Original (Master Box 12x12x50g)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 45000, sellingPrice: 57600, currentStock: 2, reorderLevel: 1 },
  { id: 'ITM-042', name: 'Royco Mchuzi Mix (Beef/Original 200g Tub)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 4000, sellingPrice: 5000, currentStock: 15, reorderLevel: 5 },
  { id: 'ITM-043', name: 'Simba Mbili Curry Powder (Traditional Green/Gold Tin)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 1800, sellingPrice: 2500, currentStock: 30, reorderLevel: 10 },
  { id: 'ITM-044', name: 'Assorted Spices (Chicken/Pilau Masala Shakers)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 2200, sellingPrice: 3000, currentStock: 24, reorderLevel: 8 },
  { id: 'ITM-045', name: 'Red Gold Tomato Paste (Pouches/Master Box)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 18000, sellingPrice: 24000, currentStock: 3, reorderLevel: 1 },
  { id: 'ITM-046', name: 'Tund Tomato Sauce (Glass Bottle)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 3200, sellingPrice: 4000, currentStock: 20, reorderLevel: 6 },
  { id: 'ITM-047', name: 'Tund Tomato Paste (Red Tin/Can)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 1500, sellingPrice: 2200, currentStock: 35, reorderLevel: 10 },
  { id: 'ITM-048', name: 'Prestige Margarine (Yellow Plastic Tub 250g/500g)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 3200, sellingPrice: 4200, currentStock: 24, reorderLevel: 8 },
  { id: 'ITM-049', name: 'Blue Band Margarine (Original Tub 250g)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 3500, sellingPrice: 4500, currentStock: 30, reorderLevel: 10 },
  { id: 'ITM-050', name: 'Blue Band Choco Spread Tub', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 3800, sellingPrice: 4800, currentStock: 15, reorderLevel: 5 },
  { id: 'ITM-051', name: 'Weetabix Cereal Breakfast Box (450g)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 12500, sellingPrice: 15000, currentStock: 12, reorderLevel: 4 },
  { id: 'ITM-052', name: 'Bulk Maize Flour / Storage Sacks (Woven Bags)', category: 'Groceries Cooking Baking & Pantry', buyingPrice: 90000, sellingPrice: 115000, currentStock: 5, reorderLevel: 2 },
  { id: 'ITM-053', name: 'Jesa UHT Long Life Full Cream Milk (12 x 500ml Box)', category: 'Dairy & Liquid Beverages', buyingPrice: 24000, sellingPrice: 30000, currentStock: 6, reorderLevel: 2 },
  { id: 'ITM-054', name: 'Lato Flavoured UHT Milk (Vanilla Carton 24 x 125ml)', category: 'Dairy & Liquid Beverages', buyingPrice: 22000, sellingPrice: 28800, currentStock: 4, reorderLevel: 1 },
  { id: 'ITM-055', name: 'Lato Flavoured UHT Milk (Chocolate Carton 24 x 125ml)', category: 'Dairy & Liquid Beverages', buyingPrice: 22000, sellingPrice: 28800, currentStock: 4, reorderLevel: 1 },
  { id: 'ITM-056', name: 'Kazire Aloe Drink / Herbal Tea (Shrink Bulk Pack)', category: 'Dairy & Liquid Beverages', buyingPrice: 18000, sellingPrice: 24000, currentStock: 5, reorderLevel: 2 },
  { id: 'ITM-057', name: 'Sun-Sip Concentrated Juice Jug (5L Multi-Flavor)', category: 'Dairy & Liquid Beverages', buyingPrice: 18000, sellingPrice: 22000, currentStock: 10, reorderLevel: 3 },
  { id: 'ITM-058', name: 'Splash Fruit Drink (Mango 1-Liter Tetra Pak)', category: 'Dairy & Liquid Beverages', buyingPrice: 3800, sellingPrice: 4800, currentStock: 24, reorderLevel: 8 },
  { id: 'ITM-059', name: 'Mountain Dew / Mirinda Fruity Soda (500ml Pet Pack)', category: 'Dairy & Liquid Beverages', buyingPrice: 18000, sellingPrice: 24000, currentStock: 8, reorderLevel: 3 },
  { id: 'ITM-060', name: 'Rwenzori Pure Natural Mineral Water (24 x 500ml Case)', category: 'Dairy & Liquid Beverages', buyingPrice: 11000, sellingPrice: 24000, currentStock: 10, reorderLevel: 4 },
  { id: 'ITM-061', name: 'Smart Bake Fresh Bread / Loaf (Red/White Wrapper)', category: 'Bakery Snacks & Confectionery', buyingPrice: 3800, sellingPrice: 4500, currentStock: 15, reorderLevel: 5 },
  { id: 'ITM-062', name: 'Sliced Bakery Buns / Pastries (Loose Pack)', category: 'Bakery Snacks & Confectionery', buyingPrice: 1500, sellingPrice: 2000, currentStock: 20, reorderLevel: 6 },
  { id: 'ITM-063', name: 'Riham Butter Flavoured Cream Biscuits (Wholesale Box)', category: 'Bakery Snacks & Confectionery', buyingPrice: 12000, sellingPrice: 15000, currentStock: 4, reorderLevel: 1 },
  { id: 'ITM-064', name: 'Britania Mille Biscuits Wholesale Carton (120x30g)', category: 'Bakery Snacks & Confectionery', buyingPrice: 24000, sellingPrice: 36000, currentStock: 2, reorderLevel: 1 },
  { id: 'ITM-065', name: 'Britania Shortcake Biscuits Bulk Carton (108x8g)', category: 'Bakery Snacks & Confectionery', buyingPrice: 16000, sellingPrice: 21600, currentStock: 2, reorderLevel: 1 },
  { id: 'ITM-066', name: 'Britania Milky Day Glucose Biscuits Bulk Carton (108x8g)', category: 'Bakery Snacks & Confectionery', buyingPrice: 16000, sellingPrice: 21600, currentStock: 2, reorderLevel: 1 },
  { id: 'ITM-067', name: 'Lana Waffles / Coco Biscuits Distribution Boxes', category: 'Bakery Snacks & Confectionery', buyingPrice: 14000, sellingPrice: 18000, currentStock: 3, reorderLevel: 1 },
  { id: 'ITM-068', name: 'Gorilla Salted Maize Snacks / Crisps (Hanging Packs)', category: 'Bakery Snacks & Confectionery', buyingPrice: 400, sellingPrice: 600, currentStock: 48, reorderLevel: 15 },
  { id: 'ITM-069', name: 'Newman\'s Salted Maize / Peanut Snack Bags', category: 'Bakery Snacks & Confectionery', buyingPrice: 300, sellingPrice: 500, currentStock: 60, reorderLevel: 20 },
  { id: 'ITM-070', name: 'Classic Smooth Milk Eclairs Candy (Large Purple Jar)', category: 'Bakery Snacks & Confectionery', buyingPrice: 12000, sellingPrice: 18000, currentStock: 3, reorderLevel: 1 },
  { id: 'ITM-071', name: 'Wrestle Ball Bubblegums (Clear Spherical Jar)', category: 'Bakery Snacks & Confectionery', buyingPrice: 10000, sellingPrice: 15000, currentStock: 4, reorderLevel: 1 },
  { id: 'ITM-072', name: 'Dungo Ice Sweets / Mint Hard Candies (Green Hanging Bag)', category: 'Bakery Snacks & Confectionery', buyingPrice: 3500, sellingPrice: 5000, currentStock: 12, reorderLevel: 4 },
  { id: 'ITM-073', name: 'A4 Hardcover Exercise Books (Red Spine 96-Pages wrapped)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 2200, sellingPrice: 3000, currentStock: 50, reorderLevel: 15 },
  { id: 'ITM-074', name: 'Manila Brown Envelopes / Paper Folders (Pack)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 5000, sellingPrice: 7500, currentStock: 5, reorderLevel: 2 },
  { id: 'ITM-075', name: 'Nataraj / Surfer Fine Ball Point Pens (Red Display Box)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 14000, sellingPrice: 25000, currentStock: 3, reorderLevel: 1 },
  { id: 'ITM-076', name: 'Supreme Wave Utility Ink Pens (Blue/Yellow Box)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 12000, sellingPrice: 20000, currentStock: 2, reorderLevel: 1 },
  { id: 'ITM-077', name: 'Nataraj 621 Ruby HB School Writing Pencils (Box)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 3500, sellingPrice: 6000, currentStock: 6, reorderLevel: 2 },
  { id: 'ITM-078', name: 'Amigo Pencil Erasers (Clear Cylindrical Tub)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 6000, sellingPrice: 10000, currentStock: 2, reorderLevel: 1 },
  { id: 'ITM-079', name: 'Beiyue Permanent Office Markers (Display Box)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 8000, sellingPrice: 15000, currentStock: 3, reorderLevel: 1 },
  { id: 'ITM-080', name: 'Jia Yan / Geomix Steel Security Padlocks (32mm Card 12s)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 18000, sellingPrice: 36000, currentStock: 4, reorderLevel: 1 },
  { id: 'ITM-081', name: 'Baglock / Heavy Duty Brass Padlocks (Hanging Cards)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 4500, sellingPrice: 6500, currentStock: 12, reorderLevel: 4 },
  { id: 'ITM-082', name: 'Rill Original Super Glue / Instant Adhesive (Card 12s)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 4000, sellingPrice: 12000, currentStock: 8, reorderLevel: 3 },
  { id: 'ITM-083', name: 'Sona-Max Super Stainless Safety Razor Blades (Card)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 6000, sellingPrice: 12000, currentStock: 5, reorderLevel: 2 },
  { id: 'ITM-084', name: 'Krishna Safety Matchboxes (Clear Wrapped Multi-pack)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 2000, sellingPrice: 3000, currentStock: 20, reorderLevel: 8 },
  { id: 'ITM-085', name: 'Kyoga / Star Domestic Safety Matchboxes (Small Packs)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 1800, sellingPrice: 2500, currentStock: 15, reorderLevel: 6 },
  { id: 'ITM-086', name: 'Vim Scouring Powder Canister (Lemon Fresh Green 500g)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 4500, sellingPrice: 6000, currentStock: 18, reorderLevel: 5 },
  { id: 'ITM-087', name: 'Edpo Clean Liquid Cleaning Squeeze Bottle (Blue Cap)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 2500, sellingPrice: 3500, currentStock: 24, reorderLevel: 8 },
  { id: 'ITM-088', name: 'Mosquito Repellent Coils / Domestic Pest Defense Boxes', category: 'Stationery Hardware & Household Sundries', buyingPrice: 1800, sellingPrice: 2500, currentStock: 30, reorderLevel: 10 },
  { id: 'ITM-089', name: 'Dex Black Hair Shampoo (Retail Unit Pack)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 3500, sellingPrice: 5000, currentStock: 12, reorderLevel: 4 },
  { id: 'ITM-090', name: 'Black Trash Bags / Industrial Garbage Liners (Stack)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 6000, sellingPrice: 9000, currentStock: 10, reorderLevel: 3 },
  { id: 'ITM-091', name: 'Disposable Tableware (Clear Plastic Takeaway Cups Pack 50s)', category: 'Stationery Hardware & Household Sundries', buyingPrice: 6000, sellingPrice: 8500, currentStock: 15, reorderLevel: 5 },
  { id: 'ITM-092', name: 'Polystyrene Takeaway Food Boxes / Catering Aluminum Trays', category: 'Stationery Hardware & Household Sundries', buyingPrice: 12000, sellingPrice: 18000, currentStock: 8, reorderLevel: 3 },
];

const initialSales: SaleRecord[] = [
  {
    id: '1',
    transactionId: 'TXN-seed-1',
    date: '2026-07-19',
    itemName: 'Softcare Sanitary Pads (Purple/Blue Maxi Long 8s)',
    quantitySold: 2,
    totalRevenue: 7000,
    totalProfit: 2200,
    paymentStatus: 'paid',
    amountPaid: 7000,
  },
  {
    id: '2',
    transactionId: 'TXN-seed-2',
    date: '2026-07-19',
    itemName: 'Habari Iodated Edible Table Salt (500g Bag)',
    quantitySold: 4,
    totalRevenue: 4000,
    totalProfit: 1200,
    paymentStatus: 'paid',
    amountPaid: 4000,
  },
];

const DEFAULT_SETTINGS: AppSettings = { businessName: 'Kikuubo Wholesale Tracker', currency: 'UGX' };
// All prices are entered and stored in UGX — the "display currency" in
// Settings only converts what's shown, never what's stored.
const BASE_CURRENCY = 'UGX';
const INVENTORY_PAGE_SIZE = 8;
const SALES_PAGE_SIZE = 10;

// Shared style tokens
const card = 'bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800';
const inputClass =
  'px-4 py-2 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500';
const brandButton =
  'bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-medium transition-all';
const secondaryButton =
  'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 transition-all';
const thText = 'px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase';

export default function App({
  userName,
  userId,
  role,
  team,
  onLogout,
  onTeamChange,
}: {
  userName?: string;
  userId?: string;
  role?: UserRole;
  team?: TeamMember[];
  onLogout?: () => void;
  onTeamChange?: (team: TeamMember[]) => void;
}) {
  const [activeTab, setActiveTab] = useHashTab();
  const [theme, toggleTheme] = useTheme();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [newNote, setNewNote] = useState('');
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // No auth configured means no role, but the app is still fully usable
  // solo — treat that case as full access rather than locking everything.
  const effectiveRole: UserRole = role ?? 'owner';
  const isOwner = effectiveRole === 'owner';

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [receiptLines, setReceiptLines] = useState<SaleRecord[] | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesFrom, setSalesFrom] = useState('');
  const [salesTo, setSalesTo] = useState('');
  const [inventorySort, setInventorySort] = useState<InventorySort | null>(null);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);

  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };
  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Records who did what, for the owner-only Activity Log. Fire-and-forget —
  // logging failures shouldn't block the action that triggered them.
  const logActivity = (action: string, details = '') => {
    const entry: AuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      userId: userId || 'local',
      userName: userName || 'You',
      action,
      details,
    };
    appendAuditEntry(lastSynced.current.auditLog, entry)
      .then((merged) => {
        lastSynced.current.auditLog = merged;
        setAuditLog(merged);
      })
      .catch(() => {
        // Non-critical — don't interrupt the user's actual action over a log write failing.
      });
  };

  // Guards against re-saving data we just received from another device via
  // realtime — without this, every remote update would bounce straight
  // back out as a write, which would bounce back again, forever.
  const skipNextSave = useRef({ inventory: false, sales: false, notes: false, expenses: false, purchases: false, customers: false, settings: false });

  // The last copy of each list this device successfully loaded or saved —
  // the "base" the 3-way merge in storage.ts compares against to tell a
  // genuine deletion apart from "this device just hasn't seen that record".
  const lastSynced = useRef({
    inventory: [] as InventoryItem[],
    sales: [] as SaleRecord[],
    notes: [] as Note[],
    expenses: [] as Expense[],
    purchases: [] as Purchase[],
    customers: [] as Customer[],
    auditLog: [] as AuditLogEntry[],
  });

  useEffect(() => {
    (async () => {
      let inv: InventoryItem[];
      let sls: SaleRecord[];
      if (!(await hasSeededData())) {
        inv = initialInventory;
        sls = initialSales;
        await markSeeded();
      } else {
        inv = await loadInventory([]);
        sls = await loadSales([]);
      }
      const nts = await loadNotes();
      const exp = await loadExpenses();
      const purch = await loadPurchases();
      const custs = await loadCustomers();
      const log = await loadAuditLog();
      const sett = await loadSettings();

      lastSynced.current = { inventory: inv, sales: sls, notes: nts, expenses: exp, purchases: purch, customers: custs, auditLog: log };
      setInventory(inv);
      setSales(sls);
      setNotes(nts);
      setExpenses(exp);
      setPurchases(purch);
      setCustomers(custs);
      setAuditLog(log);
      setSettings(sett);
      setDataLoaded(true);
    })();
  }, []);

  // Live sync: pick up changes made from another device/tab sharing this
  // workspace. No-op when Supabase isn't configured.
  useEffect(() => {
    return subscribeToWorkspaceChanges((key, value) => {
      switch (key) {
        case KEYS.inventory:
          skipNextSave.current.inventory = true;
          lastSynced.current.inventory = value as InventoryItem[];
          setInventory(value as InventoryItem[]);
          break;
        case KEYS.sales:
          skipNextSave.current.sales = true;
          lastSynced.current.sales = value as SaleRecord[];
          setSales(value as SaleRecord[]);
          break;
        case KEYS.notes:
          skipNextSave.current.notes = true;
          lastSynced.current.notes = value as Note[];
          setNotes(value as Note[]);
          break;
        case KEYS.expenses:
          skipNextSave.current.expenses = true;
          lastSynced.current.expenses = value as Expense[];
          setExpenses(value as Expense[]);
          break;
        case KEYS.purchases:
          skipNextSave.current.purchases = true;
          lastSynced.current.purchases = value as Purchase[];
          setPurchases(value as Purchase[]);
          break;
        case KEYS.customers:
          skipNextSave.current.customers = true;
          lastSynced.current.customers = value as Customer[];
          setCustomers(value as Customer[]);
          break;
        case KEYS.auditLog:
          lastSynced.current.auditLog = value as AuditLogEntry[];
          setAuditLog(value as AuditLogEntry[]);
          break;
        case KEYS.settings:
          skipNextSave.current.settings = true;
          setSettings(value as AppSettings);
          break;
      }
    });
  }, []);

  const syncError = (label: string) => (err: Error) => addToast(`Couldn't sync ${label}: ${err.message}`, 'error');

  useEffect(() => {
    if (!dataLoaded) return;
    if (skipNextSave.current.inventory) {
      skipNextSave.current.inventory = false;
      return;
    }
    saveInventory(lastSynced.current.inventory, inventory)
      .then((merged) => {
        lastSynced.current.inventory = merged;
      })
      .catch(syncError('inventory'));
  }, [inventory, dataLoaded]);
  useEffect(() => {
    if (!dataLoaded) return;
    if (skipNextSave.current.sales) {
      skipNextSave.current.sales = false;
      return;
    }
    saveSales(lastSynced.current.sales, sales)
      .then((merged) => {
        lastSynced.current.sales = merged;
      })
      .catch(syncError('sales'));
  }, [sales, dataLoaded]);
  useEffect(() => {
    if (!dataLoaded) return;
    if (skipNextSave.current.notes) {
      skipNextSave.current.notes = false;
      return;
    }
    saveNotes(lastSynced.current.notes, notes)
      .then((merged) => {
        lastSynced.current.notes = merged;
      })
      .catch(syncError('notes'));
  }, [notes, dataLoaded]);
  useEffect(() => {
    if (!dataLoaded) return;
    if (skipNextSave.current.expenses) {
      skipNextSave.current.expenses = false;
      return;
    }
    saveExpenses(lastSynced.current.expenses, expenses)
      .then((merged) => {
        lastSynced.current.expenses = merged;
      })
      .catch(syncError('expenses'));
  }, [expenses, dataLoaded]);
  useEffect(() => {
    if (!dataLoaded) return;
    if (skipNextSave.current.purchases) {
      skipNextSave.current.purchases = false;
      return;
    }
    savePurchases(lastSynced.current.purchases, purchases)
      .then((merged) => {
        lastSynced.current.purchases = merged;
      })
      .catch(syncError('restock history'));
  }, [purchases, dataLoaded]);
  useEffect(() => {
    if (!dataLoaded) return;
    if (skipNextSave.current.customers) {
      skipNextSave.current.customers = false;
      return;
    }
    saveCustomers(lastSynced.current.customers, customers)
      .then((merged) => {
        lastSynced.current.customers = merged;
      })
      .catch(syncError('customers'));
  }, [customers, dataLoaded]);
  useEffect(() => {
    if (!dataLoaded) return;
    if (skipNextSave.current.settings) {
      skipNextSave.current.settings = false;
      return;
    }
    saveSettings(settings).catch(syncError('settings'));
  }, [settings, dataLoaded]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note: Note = { id: String(Date.now()), content: newNote, createdAt: new Date().toISOString() };
    setNotes([note, ...notes]);
    setNewNote('');
  };

  const handleDeleteNote = (id: string) => {
    setConfirmState({
      title: 'Delete note?',
      message: 'This note will be permanently removed.',
      onConfirm: () => {
        setNotes(notes.filter((note) => note.id !== id));
        addToast('Note deleted', 'info');
      },
    });
  };

  const handleUpdateNote = (id: string, content: string) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, content } : note)));
  };

  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
    addToast('Business settings saved', 'success');
    logActivity('Updated business settings', `${next.businessName} · ${next.currency}`);
  };

  const handleExportBackup = () => {
    downloadJSON(`kikuubo-backup-${todayISO()}.json`, {
      exportedAt: new Date().toISOString(),
      inventory,
      sales,
      notes,
      settings,
      expenses,
      purchases,
      customers,
    });
    addToast('Backup downloaded', 'success');
    logActivity('Exported a backup');
  };

  const handleImportBackup = (raw: string) => {
    const backup = parseBackup(raw);
    if (!backup) {
      addToast('That file doesn\u2019t look like a valid backup', 'error');
      return;
    }
    setConfirmState({
      title: 'Restore this backup?',
      message: `This will replace your current inventory, sales, notes, expenses, and restock history with the contents of the backup file (exported ${formatDateDMY(backup.exportedAt)}).`,
      onConfirm: () => {
        setInventory(backup.inventory);
        setSales(backup.sales);
        setNotes(backup.notes);
        setSettings(backup.settings);
        setExpenses(backup.expenses);
        setPurchases(backup.purchases);
        setCustomers(backup.customers);
        addToast('Backup restored', 'success');
        logActivity('Restored a backup', `exported ${formatDateDMY(backup.exportedAt)}`);
      },
    });
  };

  const handleClearData = () => {
    setConfirmState({
      title: 'Clear all data?',
      message: 'This permanently deletes every item, sale, expense, restock record, and note. This cannot be undone.',
      onConfirm: () => {
        setInventory([]);
        setSales([]);
        setNotes([]);
        setExpenses([]);
        setPurchases([]);
        setCustomers([]);
        addToast('All data cleared', 'info');
        logActivity('Cleared all data');
      },
    });
  };

  const today = todayISO();
  const weekStart = startOfWeekISO();
  const monthStart = startOfMonthISO();

  const todaySales = useMemo(() => sales.filter((s) => s.date === today), [sales, today]);
  const weekSales = useMemo(() => sales.filter((s) => s.date >= weekStart), [sales, weekStart]);
  const monthSales = useMemo(() => sales.filter((s) => s.date >= monthStart), [sales, monthStart]);
  const monthExpenses = useMemo(() => expenses.filter((e) => e.date >= monthStart), [expenses, monthStart]);

  const totalRevenueToday = todaySales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalProfitToday = todaySales.reduce((sum, s) => sum + s.totalProfit, 0);
  const totalRevenueWeek = weekSales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalProfitWeek = weekSales.reduce((sum, s) => sum + s.totalProfit, 0);
  const totalRevenueMonth = monthSales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalProfitMonth = monthSales.reduce((sum, s) => sum + s.totalProfit, 0);
  const totalExpensesMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfitMonth = totalProfitMonth - totalExpensesMonth;
  const inventoryValue = useMemo(() => inventory.reduce((sum, i) => sum + i.buyingPrice * i.currentStock, 0), [inventory]);

  const outstandingTotal = useMemo(
    () => sales.reduce((sum, s) => sum + Math.max(0, s.totalRevenue - s.amountPaid), 0),
    [sales]
  );
  const outstandingCustomers = useMemo(() => {
    const names = new Set<string>();
    for (const s of sales) {
      if (s.totalRevenue - s.amountPaid > 0 && s.customerName) names.add(s.customerName);
    }
    return names.size;
  }, [sales]);

  const topItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sales) counts.set(s.itemName, (counts.get(s.itemName) || 0) + s.quantitySold);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [sales]);

  const lowStockItems = useMemo(() => inventory.filter((i) => i.currentStock <= i.reorderLevel), [inventory]);

  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({});

  // Finds the next free ITM-### id rather than trusting array length, since
  // deletions or bulk imports can otherwise produce collisions.
  const nextItemId = (current: InventoryItem[]) => {
    const maxNum = current.reduce((max, i) => {
      const match = i.id.match(/^ITM-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `ITM-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleAddItem = () => {
    if (!newItem.name?.trim()) {
      addToast('Item name is required', 'error');
      return;
    }
    if (!newItem.buyingPrice || !newItem.sellingPrice) {
      addToast('Buying and selling price are required', 'error');
      return;
    }
    if (inventory.some((i) => i.name.toLowerCase() === newItem.name!.trim().toLowerCase())) {
      addToast('An item with this name already exists', 'error');
      return;
    }

    const item: InventoryItem = {
      id: nextItemId(inventory),
      name: newItem.name!.trim(),
      category: newItem.category?.trim() || undefined,
      barcode: newItem.barcode?.trim() || undefined,
      buyingPrice: Number(newItem.buyingPrice),
      sellingPrice: Number(newItem.sellingPrice),
      currentStock: Number(newItem.currentStock) || 0,
      reorderLevel: Number(newItem.reorderLevel) || 5,
    };

    setInventory([...inventory, item]);
    setNewItem({});
    addToast(`${item.name} added to inventory`, 'success');
    logActivity('Added inventory item', item.name);
  };

  const handleSaveEditedItem = (updated: InventoryItem) => {
    setInventory(inventory.map((i) => (i.id === updated.id ? updated : i)));
    setEditingItem(null);
    addToast(`${updated.name} updated`, 'success');
    logActivity('Edited inventory item', updated.name);
  };

  const handleImportInventory = (items: Omit<InventoryItem, 'id'>[]) => {
    setInventory((prev) => {
      let running = [...prev];
      for (const item of items) {
        const id = nextItemId(running);
        running = [...running, { ...item, id }];
      }
      return running;
    });
    setShowImportModal(false);
    addToast(`Imported ${items.length} item${items.length > 1 ? 's' : ''}`, 'success');
    logActivity('Imported inventory', `${items.length} item${items.length > 1 ? 's' : ''}`);
  };

  const updateStock = (id: string, delta: number) => {
    setInventory((prev) => prev.map((item) => (item.id === id ? { ...item, currentStock: Math.max(0, item.currentStock + delta) } : item)));
  };

  const handleRestock = (item: InventoryItem, args: { quantity: number; unitCost: number; supplier: string; date: string }) => {
    const newAverageCost = Math.round((item.currentStock * item.buyingPrice + args.quantity * args.unitCost) / (item.currentStock + args.quantity));
    setInventory((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, currentStock: i.currentStock + args.quantity, buyingPrice: newAverageCost } : i
      )
    );
    const purchase: Purchase = {
      id: String(Date.now()),
      date: args.date,
      itemId: item.id,
      itemName: item.name,
      quantity: args.quantity,
      unitCost: args.unitCost,
      totalCost: args.quantity * args.unitCost,
      supplier: args.supplier || undefined,
    };
    setPurchases((prev) => [...prev, purchase]);
    setRestockingItem(null);
    addToast(`Restocked ${args.quantity} × ${item.name}`, 'success');
    logActivity('Restocked item', `${args.quantity} × ${item.name}`);
  };

  const handleCompleteSale = (args: {
    date: string;
    cart: CartLine[];
    customerId?: string;
    customerName: string;
    paymentStatus: PaymentStatus;
    amountPaid: number;
  }) => {
    for (const line of args.cart) {
      const item = inventory.find((i) => i.id === line.itemId);
      if (!item || item.currentStock < line.quantity) {
        addToast(`Not enough stock for ${line.itemName}`, 'error');
        return;
      }
    }

    const transactionId = `TXN-${Date.now()}`;
    const total = args.cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

    let remainingToAllocate = args.amountPaid;
    const newLines: SaleRecord[] = args.cart.map((line, idx) => {
      const lineRevenue = line.unitPrice * line.quantity;
      const lineProfit = (line.unitPrice - line.unitCost) * line.quantity;
      const isLast = idx === args.cart.length - 1;
      const lineAmountPaid = isLast ? remainingToAllocate : Math.min(Math.round(total > 0 ? (lineRevenue / total) * args.amountPaid : 0), lineRevenue);
      remainingToAllocate -= lineAmountPaid;
      return {
        id: `${transactionId}-${line.itemId}`,
        transactionId,
        date: args.date,
        itemName: line.itemName,
        quantitySold: line.quantity,
        totalRevenue: lineRevenue,
        totalProfit: lineProfit,
        customerId: args.customerId || undefined,
        customerName: args.customerName || undefined,
        paymentStatus: args.paymentStatus,
        amountPaid: lineAmountPaid,
      };
    });

    setSales((prev) => [...prev, ...newLines]);
    setInventory((prev) =>
      prev.map((item) => {
        const line = args.cart.find((l) => l.itemId === item.id);
        return line ? { ...item, currentStock: item.currentStock - line.quantity } : item;
      })
    );
    addToast(`Sale recorded — ${args.cart.length} item${args.cart.length > 1 ? 's' : ''}`, 'success');
    logActivity('Recorded sale', `${args.cart.length} item(s), ${args.paymentStatus}${args.customerName ? ` — ${args.customerName}` : ''}`);
    setReceiptLines(newLines);
  };

  const handleCreateCustomer = (name: string): string => {
    const id = `CUST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const customer: Customer = { id, name, createdAt: new Date().toISOString() };
    setCustomers((prev) => [...prev, customer]);
    logActivity('Added customer', name);
    return id;
  };

  const handleSaveEditedSale = (updated: SaleRecord) => {
    const original = sales.find((s) => s.id === updated.id);
    if (!original) return;
    const item = inventory.find((i) => i.name === updated.itemName);
    const quantityDelta = original.quantitySold - updated.quantitySold;
    if (item) updateStock(item.id, quantityDelta);
    setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingSale(null);
    addToast('Sale updated', 'success');
    logActivity('Edited sale', updated.itemName);
  };

  const deleteItem = (id: string) => {
    const item = inventory.find((i) => i.id === id);
    setConfirmState({
      title: 'Delete item?',
      message: `"${item?.name}" will be permanently removed from inventory.`,
      onConfirm: () => {
        setInventory(inventory.filter((i) => i.id !== id));
        addToast(`${item?.name} removed`, 'info');
        logActivity('Deleted inventory item', item?.name || id);
      },
    });
  };

  const deleteSale = (id: string) => {
    const sale = sales.find((s) => s.id === id);
    setConfirmState({
      title: 'Delete sale record?',
      message: 'This will remove the sale and restore the stock it used.',
      onConfirm: () => {
        if (sale) {
          const item = inventory.find((i) => i.name === sale.itemName);
          if (item) updateStock(item.id, sale.quantitySold);
        }
        setSales(sales.filter((s) => s.id !== id));
        addToast('Sale record deleted', 'info');
        logActivity('Deleted sale', sale?.itemName || id);
      },
    });
  };

  const handleRecordPayment = (transactionId: string, amount: number) => {
    setSales((prev) => {
      const lines = prev.filter((s) => s.transactionId === transactionId);
      const totalRemaining = lines.reduce((sum, l) => sum + Math.max(0, l.totalRevenue - l.amountPaid), 0);
      let remainingToAllocate = amount;
      const updates = new Map<string, number>();
      lines.forEach((l, idx) => {
        const lineRemaining = Math.max(0, l.totalRevenue - l.amountPaid);
        const isLast = idx === lines.length - 1;
        const share = isLast ? remainingToAllocate : Math.min(Math.round((lineRemaining / totalRemaining) * amount), lineRemaining);
        remainingToAllocate -= share;
        updates.set(l.id, l.amountPaid + share);
      });
      return prev.map((s) => {
        if (!updates.has(s.id)) return s;
        const newAmountPaid = updates.get(s.id)!;
        const status: PaymentStatus = newAmountPaid >= s.totalRevenue ? 'paid' : newAmountPaid > 0 ? 'partial' : 'credit';
        return { ...s, amountPaid: newAmountPaid, paymentStatus: status };
      });
    });
    addToast('Payment recorded', 'success');
    logActivity('Recorded payment', money(amount));
  };

  const handleAddExpense = (expense: Omit<Expense, 'id'>) => {
    setExpenses((prev) => [...prev, { ...expense, id: String(Date.now()) }]);
    addToast('Expense recorded', 'success');
    logActivity('Recorded expense', `${expense.category} — ${money(expense.amount)}`);
  };

  const handleDeleteExpense = (id: string) => {
    setConfirmState({
      title: 'Delete expense?',
      message: 'This expense record will be permanently removed.',
      onConfirm: () => {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        addToast('Expense deleted', 'info');
      },
    });
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSideMenuOpen(false);
  };

  const inventoryCategories = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.category).filter((c): c is string => Boolean(c)))).sort(),
    [inventory]
  );

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    return inventory
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
      .filter((i) => !categoryFilter || i.category === categoryFilter);
  }, [inventory, inventorySearch, categoryFilter]);

  const sortedInventory = useMemo(() => {
    if (!inventorySort) return filteredInventory;
    const { key, direction } = inventorySort;
    return [...filteredInventory].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv);
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredInventory, inventorySort]);

  const inventoryPageCount = Math.max(1, Math.ceil(sortedInventory.length / INVENTORY_PAGE_SIZE));
  const clampedInventoryPage = Math.min(inventoryPage, inventoryPageCount);
  const paginatedInventory = sortedInventory.slice(
    (clampedInventoryPage - 1) * INVENTORY_PAGE_SIZE,
    clampedInventoryPage * INVENTORY_PAGE_SIZE
  );

  const handleSortInventory = (key: InventorySort['key']) => {
    setInventorySort((prev) => (prev?.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
    setInventoryPage(1);
  };

  const sortIndicator = (key: InventorySort['key']) => {
    if (inventorySort?.key !== key) return null;
    return <span className="text-violet-500 dark:text-violet-400">{inventorySort.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const filteredSales = useMemo(() => {
    const q = salesSearch.trim().toLowerCase();
    return sales
      .filter((s) => !q || s.itemName.toLowerCase().includes(q) || s.date.includes(q) || s.customerName?.toLowerCase().includes(q))
      .filter((s) => !salesFrom || s.date >= salesFrom)
      .filter((s) => !salesTo || s.date <= salesTo)
      .slice()
      .reverse();
  }, [sales, salesSearch, salesFrom, salesTo]);

  const salesFiltersActive = Boolean(salesSearch || salesFrom || salesTo);
  const salesPageCount = Math.max(1, Math.ceil(filteredSales.length / SALES_PAGE_SIZE));
  const clampedSalesPage = Math.min(salesPage, salesPageCount);
  const paginatedSales = filteredSales.slice((clampedSalesPage - 1) * SALES_PAGE_SIZE, clampedSalesPage * SALES_PAGE_SIZE);

  const exportInventoryCSV = () => {
    downloadCSV(
      `kikuubo-inventory-${today}.csv`,
      ['Item ID', 'Category', 'Item Name', 'Buying Price', 'Selling Price', 'Current Stock', 'Reorder Level'],
      sortedInventory.map((i) => [i.id, i.category || '', i.name, i.buyingPrice, i.sellingPrice, i.currentStock, i.reorderLevel])
    );
    addToast('Inventory exported', 'success');
  };

  const exportSalesCSV = () => {
    downloadCSV(
      `kikuubo-sales-${today}.csv`,
      ['Date', 'Item Name', 'Qty Sold', 'Revenue', 'Profit', 'Customer', 'Status', 'Amount Paid'],
      filteredSales.map((s) => [s.date, s.itemName, s.quantitySold, s.totalRevenue, s.totalProfit, s.customerName || '', s.paymentStatus, s.amountPaid])
    );
    addToast('Sales log exported', 'success');
  };

  const exportExpensesCSV = () => {
    downloadCSV(
      `kikuubo-expenses-${today}.csv`,
      ['Date', 'Category', 'Description', 'Amount'],
      expenses.map((e) => [e.date, e.category, e.description, e.amount])
    );
    addToast('Expenses exported', 'success');
  };

  const exportPurchasesCSV = () => {
    downloadCSV(
      `kikuubo-restocks-${today}.csv`,
      ['Date', 'Item', 'Quantity', 'Unit Cost', 'Total Cost', 'Supplier'],
      purchases.map((p) => [p.date, p.itemName, p.quantity, p.unitCost, p.totalCost, p.supplier || ''])
    );
    addToast('Restock history exported', 'success');
  };

  const { rate, loading: rateLoading, stale: rateStale } = useConversionRate(BASE_CURRENCY, settings.currency);
  const showBaseCurrencyNote = settings.currency !== BASE_CURRENCY;
  const money = (amount: number) => formatMoney(amount * rate, settings.currency);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-white dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950 text-neutral-900 dark:text-white">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog state={confirmState} onCancel={() => setConfirmState(null)} />
      {editingItem && (
        <EditItemModal
          item={editingItem}
          showBaseCurrencyNote={showBaseCurrencyNote}
          onSave={handleSaveEditedItem}
          onClose={() => setEditingItem(null)}
        />
      )}
      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          money={money}
          showBaseCurrencyNote={showBaseCurrencyNote}
          maxQuantity={(inventory.find((i) => i.name === editingSale.itemName)?.currentStock || 0) + editingSale.quantitySold}
          onSave={handleSaveEditedSale}
          onClose={() => setEditingSale(null)}
        />
      )}
      {restockingItem && (
        <RestockModal
          item={restockingItem}
          money={money}
          showBaseCurrencyNote={showBaseCurrencyNote}
          onSave={(args) => handleRestock(restockingItem, args)}
          onClose={() => setRestockingItem(null)}
        />
      )}
      {receiptLines && <ReceiptModal lines={receiptLines} businessName={settings.businessName} money={money} onClose={() => setReceiptLines(null)} />}
      {showImportModal && (
        <ImportInventoryModal existingInventory={inventory} onImport={handleImportInventory} onClose={() => setShowImportModal(false)} />
      )}
      {showScanner && (
        <BarcodeScannerModal
          onDetected={(code) => {
            setNewItem((prev) => ({ ...prev, barcode: code }));
            setShowScanner(false);
            addToast(`Scanned: ${code}`, 'success');
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {sideMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSideMenuOpen(false)} />}

      {/* Side Menu — always dark, violet-to-slate gradient */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-violet-950 via-violet-900 to-slate-900 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 overflow-y-auto ${sideMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex flex-col min-h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-lg block truncate">{settings.businessName}</span>
              <span className="text-xs text-violet-300 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {isSupabaseConfigured ? 'Synced' : 'Local only'}
              </span>
            </div>
            <ThemeToggle theme={theme} onToggle={toggleTheme} className="text-violet-300 hover:bg-white/10 hover:text-white shrink-0" />
          </div>

          <nav className="space-y-2 flex-1">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                  : 'text-violet-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>

            <button
              onClick={() => handleTabChange('inventory')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'inventory'
                  ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                  : 'text-violet-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
              {lowStockItems.length > 0 && (
                <span className="ml-auto text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{lowStockItems.length}</span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('sales')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'sales'
                  ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                  : 'text-violet-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Sales Log
            </button>

            <button
              onClick={() => handleTabChange('debtors')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'debtors'
                  ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                  : 'text-violet-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 3c0-1.1-.9-2-2-2M7 11a4 4 0 118 0" />
              </svg>
              Debtors
              {outstandingCustomers > 0 && (
                <span className="ml-auto text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{outstandingCustomers}</span>
              )}
            </button>

            {can(effectiveRole, 'expenses.view') && (
              <button
                onClick={() => handleTabChange('expenses')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'expenses'
                    ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                    : 'text-violet-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3v-6m-3 6v-1m-4 4h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                Expenses
              </button>
            )}

            {can(effectiveRole, 'reports.view') && (
              <button
                onClick={() => handleTabChange('reports')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'reports'
                    ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                    : 'text-violet-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Reports
              </button>
            )}

            {can(effectiveRole, 'activity.view') && (
              <button
                onClick={() => handleTabChange('activity')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'activity'
                    ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                    : 'text-violet-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Activity Log
              </button>
            )}

            <button
              onClick={() => handleTabChange('notes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'notes'
                  ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                  : 'text-violet-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notes
            </button>

            <button
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'settings'
                  ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                  : 'text-violet-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </nav>

          {onLogout && (
            <div className="pt-4 mt-4 border-t border-white/10">
              {userName && <p className="text-xs text-violet-300 truncate mb-2">Signed in as {userName}</p>}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-violet-300 hover:bg-white/5 hover:text-white transition-all text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-72">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-b border-violet-100 dark:border-neutral-800">
          <div className="flex items-center justify-between h-16 px-4">
            <button onClick={() => setSideMenuOpen(true)} className="lg:hidden p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold capitalize">{activeTab}</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 dark:text-neutral-400 hidden sm:inline">{formatDateDMY(new Date().toISOString())}</span>
              <ThemeToggle
                theme={theme}
                onToggle={toggleTheme}
                className="text-neutral-500 hover:bg-violet-50 hover:text-violet-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              />
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {lowStockItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-amber-700 dark:text-amber-400 text-sm">
                    {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} low on stock:{' '}
                    <span className="font-medium">{lowStockItems.map((i) => i.name).join(', ')}</span>
                  </p>
                </div>
              )}

              {/* Stat Cards — Revenue=blue, Profit=emerald, Total Items=purple, Low Stock=amber */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 text-sm font-medium uppercase tracking-wider">Revenue Today</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">{money(totalRevenueToday)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {can(effectiveRole, 'sales.viewProfit') && (
                  <div className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium uppercase tracking-wider">Profit Today</p>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">{money(totalProfitToday)}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-purple-50 border border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 dark:text-purple-400 text-sm font-medium uppercase tracking-wider">Total Items</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">{inventory.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-600 dark:text-amber-400 text-sm font-medium uppercase tracking-wider">Low Stock</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">{lowStockItems.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Week / Month / Inventory value / Outstanding */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {can(effectiveRole, 'sales.viewProfit') && (
                  <div className={`${card} rounded-xl p-6`}>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium uppercase tracking-wider mb-3">This Week</p>
                    <div className="flex justify-between items-baseline">
                      <span className="text-neutral-500 dark:text-neutral-500 text-sm">Revenue</span>
                      <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">{money(totalRevenueWeek)}</span>
                    </div>
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-neutral-500 dark:text-neutral-500 text-sm">Profit</span>
                      <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{money(totalProfitWeek)}</span>
                    </div>
                  </div>
                )}
                {can(effectiveRole, 'sales.viewProfit') && (
                  <div className={`${card} rounded-xl p-6`}>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium uppercase tracking-wider mb-3">This Month</p>
                    <div className="flex justify-between items-baseline">
                      <span className="text-neutral-500 dark:text-neutral-500 text-sm">Gross Profit</span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{money(totalProfitMonth)}</span>
                    </div>
                    <div className="flex justify-between items-baseline mt-1.5">
                      <span className="text-neutral-500 dark:text-neutral-500 text-sm">Expenses</span>
                      <span className="text-sm font-semibold text-red-500 dark:text-red-400">-{money(totalExpensesMonth)}</span>
                    </div>
                    <div className="flex justify-between items-baseline mt-1.5 pt-1.5 border-t border-violet-100 dark:border-neutral-800">
                      <span className="text-neutral-600 dark:text-neutral-400 text-sm">Net Profit</span>
                      <span className="text-lg font-semibold text-neutral-900 dark:text-white">{money(netProfitMonth)}</span>
                    </div>
                  </div>
                )}
                {can(effectiveRole, 'inventory.viewCost') && (
                  <div className={`${card} rounded-xl p-6`}>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium uppercase tracking-wider mb-3">Inventory Value</p>
                    <div className="flex justify-between items-baseline">
                      <span className="text-neutral-500 dark:text-neutral-500 text-sm">At cost</span>
                      <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">{money(inventoryValue)}</span>
                    </div>
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-neutral-500 dark:text-neutral-500 text-sm">Items tracked</span>
                      <span className="text-lg font-semibold text-neutral-900 dark:text-white">{inventory.length}</span>
                    </div>
                  </div>
                )}
                <div className={`${card} rounded-xl p-6`}>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium uppercase tracking-wider mb-3">Outstanding</p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-neutral-500 dark:text-neutral-500 text-sm">Owed to you</span>
                    <span className="text-lg font-semibold text-amber-600 dark:text-amber-400">{money(outstandingTotal)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-neutral-500 dark:text-neutral-500 text-sm">Customers</span>
                    <span className="text-lg font-semibold text-neutral-900 dark:text-white">{outstandingCustomers}</span>
                  </div>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className={`${card} rounded-xl overflow-hidden`}>
                <div className="px-6 py-4 border-b border-violet-100 dark:border-neutral-800">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Revenue — Last 7 Days</h3>
                </div>
                <div className="p-6">
                  <RevenueChart sales={sales} money={money} />
                </div>
              </div>

              {/* Top Selling Items + Recent Sales */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`${card} rounded-xl overflow-hidden`}>
                  <div className="px-6 py-4 border-b border-violet-100 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Top Selling Items</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {topItems.length === 0 && <p className="text-neutral-500 dark:text-neutral-500 text-sm">No sales recorded yet.</p>}
                    {topItems.map(([name, qty], idx) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 dark:bg-neutral-800 dark:text-neutral-400 text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm text-neutral-900 dark:text-white truncate">{name}</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{qty} sold</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`lg:col-span-2 ${card} rounded-xl overflow-hidden`}>
                  <div className="px-6 py-4 border-b border-violet-100 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Sales</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-violet-50 dark:bg-neutral-800/50">
                        <tr>
                          <th className={thText}>Date</th>
                          <th className={thText}>Item</th>
                          <th className={thText}>Qty</th>
                          <th className={thText}>Revenue</th>
                          {can(effectiveRole, 'sales.viewProfit') && <th className={thText}>Profit</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-100 dark:divide-neutral-800">
                        {sales
                          .slice(-5)
                          .reverse()
                          .map((sale) => (
                            <tr key={sale.id} className="hover:bg-violet-50/60 dark:hover:bg-neutral-800/30">
                              <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">{sale.date}</td>
                              <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">{sale.itemName}</td>
                              <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">{sale.quantitySold}</td>
                              <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-400">{money(sale.totalRevenue)}</td>
                              {can(effectiveRole, 'sales.viewProfit') && (
                                <td className="px-6 py-4 text-sm text-emerald-600 dark:text-emerald-400">{money(sale.totalProfit)}</td>
                              )}
                            </tr>
                          ))}
                        {sales.length === 0 && (
                          <tr>
                            <td colSpan={can(effectiveRole, 'sales.viewProfit') ? 5 : 4} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-500 text-sm">
                              No sales recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {can(effectiveRole, 'inventory.create') && (
                <div className={`${card} rounded-xl p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Add New Item</h3>
                    {can(effectiveRole, 'inventory.import') && (
                      <button
                        onClick={() => setShowImportModal(true)}
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${secondaryButton}`}
                      >
                        Import CSV
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                    <input
                      type="text"
                      placeholder="Item Name"
                      value={newItem.name || ''}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className={inputClass}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Barcode (optional)"
                        value={newItem.barcode || ''}
                        onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        title="Scan barcode"
                        className={`px-3 rounded-lg shrink-0 ${secondaryButton}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2m10-16h2a1 1 0 011 1v2m-3 14h2a1 1 0 001-1v-2M7 8v8m3-8v8m4-8v8m3-8v8" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Category (optional)"
                      value={newItem.category || ''}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      placeholder={showBaseCurrencyNote ? 'Buying Price (UGX)' : 'Buying Price'}
                      value={newItem.buyingPrice || ''}
                      onChange={(e) => setNewItem({ ...newItem, buyingPrice: Number(e.target.value) })}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      placeholder={showBaseCurrencyNote ? 'Selling Price (UGX)' : 'Selling Price'}
                      value={newItem.sellingPrice || ''}
                      onChange={(e) => setNewItem({ ...newItem, sellingPrice: Number(e.target.value) })}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      placeholder="Current Stock"
                      value={newItem.currentStock || ''}
                      onChange={(e) => setNewItem({ ...newItem, currentStock: Number(e.target.value) })}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      placeholder="Reorder Level"
                      value={newItem.reorderLevel || ''}
                      onChange={(e) => setNewItem({ ...newItem, reorderLevel: Number(e.target.value) })}
                      className={inputClass}
                    />
                    <button onClick={handleAddItem} className={`px-4 py-2 rounded-lg ${brandButton}`}>
                      Add Item
                    </button>
                  </div>
                </div>
              )}

              <div className={`${card} rounded-xl overflow-hidden`}>
                <div className="px-6 py-4 border-b border-violet-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Inventory Master <span className="text-neutral-500 dark:text-neutral-500 font-normal text-sm">({sortedInventory.length})</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    {inventoryCategories.length > 0 && (
                      <select
                        value={categoryFilter}
                        onChange={(e) => {
                          setCategoryFilter(e.target.value);
                          setInventoryPage(1);
                        }}
                        className={`${inputClass} py-1.5 text-sm`}
                      >
                        <option value="">All categories</option>
                        {inventoryCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={inventorySearch}
                      onChange={(e) => {
                        setInventorySearch(e.target.value);
                        setInventoryPage(1);
                      }}
                      className={`${inputClass} py-1.5 text-sm`}
                    />
                    {can(effectiveRole, 'inventory.viewCost') && (
                      <button onClick={exportInventoryCSV} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${secondaryButton}`}>
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-violet-50 dark:bg-neutral-800/50">
                      <tr>
                        <th className={thText}>Item ID</th>
                        <th className={thText}>
                          <button onClick={() => handleSortInventory('name')} className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            Item Name {sortIndicator('name')}
                          </button>
                        </th>
                        {can(effectiveRole, 'inventory.viewCost') && (
                          <th className={thText}>
                            <button onClick={() => handleSortInventory('buyingPrice')} className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors">
                              Buying Price {sortIndicator('buyingPrice')}
                            </button>
                          </th>
                        )}
                        <th className={thText}>
                          <button onClick={() => handleSortInventory('sellingPrice')} className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            Selling Price {sortIndicator('sellingPrice')}
                          </button>
                        </th>
                        <th className={thText}>
                          <button onClick={() => handleSortInventory('currentStock')} className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            Stock {sortIndicator('currentStock')}
                          </button>
                        </th>
                        <th className={thText}>Status</th>
                        <th className={thText}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-100 dark:divide-neutral-800">
                      {paginatedInventory.map((item) => (
                        <tr key={item.id} className="hover:bg-violet-50/60 dark:hover:bg-neutral-800/30">
                          <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400 font-mono">{item.id}</td>
                          <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">
                            {item.name}
                            {item.category && (
                              <span className="block text-xs text-neutral-400 dark:text-neutral-500 font-normal mt-0.5">{item.category}</span>
                            )}
                          </td>
                          {can(effectiveRole, 'inventory.viewCost') && (
                            <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">{money(item.buyingPrice)}</td>
                          )}
                          <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-400">{money(item.sellingPrice)}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateStock(item.id, -1)}
                                className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className={item.currentStock <= item.reorderLevel ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}>
                                {item.currentStock}
                              </span>
                              <button
                                onClick={() => updateStock(item.id, 1)}
                                className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {item.currentStock <= item.reorderLevel ? (
                              <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-full">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {can(effectiveRole, 'inventory.restock') && (
                                <button onClick={() => setRestockingItem(item)} title="Restock" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </button>
                              )}
                              {can(effectiveRole, 'inventory.edit') && (
                                <button onClick={() => setEditingItem(item)} title="Edit" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {can(effectiveRole, 'inventory.delete') && (
                                <button onClick={() => deleteItem(item.id)} title="Delete" className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedInventory.length === 0 && (
                        <tr>
                          <td colSpan={can(effectiveRole, 'inventory.viewCost') ? 7 : 6} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-500 text-sm">
                            {inventory.length === 0 ? 'No items in inventory yet. Add your first item above!' : 'No items match your search.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={clampedInventoryPage}
                  pageCount={inventoryPageCount}
                  total={sortedInventory.length}
                  pageSize={INVENTORY_PAGE_SIZE}
                  onPageChange={setInventoryPage}
                />
              </div>

              {can(effectiveRole, 'inventory.viewCost') && (
                <PurchaseHistory purchases={purchases} money={money} onExport={exportPurchasesCSV} />
              )}
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <SaleCart
                inventory={inventory}
                customers={customers}
                onCreateCustomer={handleCreateCustomer}
                money={money}
                showBaseCurrencyNote={showBaseCurrencyNote}
                onComplete={handleCompleteSale}
              />

              <div className={`${card} rounded-xl overflow-hidden`}>
                <div className="px-6 py-4 border-b border-violet-100 dark:border-neutral-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Daily Sales Log <span className="text-neutral-500 dark:text-neutral-500 font-normal text-sm">({filteredSales.length})</span>
                    </h3>
                    {can(effectiveRole, 'sales.viewProfit') && (
                      <button
                        onClick={exportSalesCSV}
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap self-start sm:self-auto ${secondaryButton}`}
                      >
                        Export CSV
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search by item, customer, or date..."
                      value={salesSearch}
                      onChange={(e) => {
                        setSalesSearch(e.target.value);
                        setSalesPage(1);
                      }}
                      className={`${inputClass} py-1.5 text-sm flex-1`}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={salesFrom}
                        onChange={(e) => {
                          setSalesFrom(e.target.value);
                          setSalesPage(1);
                        }}
                        className={`${inputClass} py-1.5 text-sm`}
                      />
                      <span className="text-neutral-500 dark:text-neutral-500 text-sm">to</span>
                      <input
                        type="date"
                        value={salesTo}
                        onChange={(e) => {
                          setSalesTo(e.target.value);
                          setSalesPage(1);
                        }}
                        className={`${inputClass} py-1.5 text-sm`}
                      />
                      {salesFiltersActive && (
                        <button
                          onClick={() => {
                            setSalesSearch('');
                            setSalesFrom('');
                            setSalesTo('');
                            setSalesPage(1);
                          }}
                          className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white whitespace-nowrap"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-violet-50 dark:bg-neutral-800/50">
                      <tr>
                        <th className={thText}>Date</th>
                        <th className={thText}>Item</th>
                        <th className={thText}>Qty</th>
                        <th className={thText}>Revenue</th>
                        <th className={thText}>Status</th>
                        <th className={thText}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-100 dark:divide-neutral-800">
                      {paginatedSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-violet-50/60 dark:hover:bg-neutral-800/30">
                          <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">{sale.date}</td>
                          <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">
                            {sale.itemName}
                            {sale.customerName && <span className="text-neutral-500 dark:text-neutral-500"> — {sale.customerName}</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">{sale.quantitySold}</td>
                          <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-400">{money(sale.totalRevenue)}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 text-xs rounded-full capitalize ${
                                sale.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                  : sale.paymentStatus === 'partial'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                              }`}
                            >
                              {sale.paymentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setReceiptLines(sales.filter((s) => s.transactionId === sale.transactionId))}
                                title="View Receipt"
                                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6m-6-4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                              {can(effectiveRole, 'sales.edit') && (
                                <button onClick={() => setEditingSale(sale)} title="Edit" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {can(effectiveRole, 'sales.delete') && (
                                <button onClick={() => deleteSale(sale.id)} title="Delete" className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedSales.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-500 text-sm">
                            {sales.length === 0 ? 'No sales recorded yet.' : 'No sales match your filters.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={clampedSalesPage}
                  pageCount={salesPageCount}
                  total={filteredSales.length}
                  pageSize={SALES_PAGE_SIZE}
                  onPageChange={setSalesPage}
                />
              </div>
            </div>
          )}

          {/* Debtors Tab */}
          {activeTab === 'debtors' && (
            <DebtorsTab sales={sales} customers={customers} money={money} showBaseCurrencyNote={showBaseCurrencyNote} onRecordPayment={handleRecordPayment} />
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && can(effectiveRole, 'expenses.view') && (
            <ExpensesTab
              expenses={expenses}
              money={money}
              showBaseCurrencyNote={showBaseCurrencyNote}
              onAdd={handleAddExpense}
              onDelete={handleDeleteExpense}
              onExport={exportExpensesCSV}
            />
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && can(effectiveRole, 'reports.view') && (
            <ReportsTab sales={sales} expenses={expenses} businessName={settings.businessName} money={money} />
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activity' && can(effectiveRole, 'activity.view') && <ActivityLogTab log={auditLog} />}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className={`${card} rounded-xl p-6`}>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Quick Notes</h3>
                <div className="flex gap-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a quick note..."
                    rows={3}
                    className={`flex-1 ${inputClass} resize-none`}
                  />
                  <button onClick={handleAddNote} className={`px-6 py-3 rounded-xl self-end ${brandButton}`}>
                    Add Note
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map((note) => (
                  <div key={note.id} className={`${card} rounded-xl p-4`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs text-neutral-500 dark:text-neutral-500">
                        {new Date(note.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button onClick={() => handleDeleteNote(note.id)} className="text-neutral-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <textarea
                      value={note.content}
                      onChange={(e) => handleUpdateNote(note.id, e.target.value)}
                      className="w-full bg-transparent text-neutral-900 dark:text-white text-sm resize-none focus:outline-none"
                      rows={4}
                    />
                  </div>
                ))}

                {notes.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-violet-200 dark:text-neutral-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <p className="text-neutral-500 dark:text-neutral-500">No notes yet. Add your first note above!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsPanel
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onClearData={handleClearData}
              rateLoading={rateLoading}
              rateStale={rateStale}
              rate={rate}
              isSupabaseConfigured={isSupabaseConfigured}
              isOwner={isOwner}
              currentUserId={userId}
              team={team}
              onTeamChange={onTeamChange}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-violet-100 dark:border-neutral-800 py-6 mt-auto no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-300 dark:border-violet-500/50">
                  <img src="/andrew-profile.jpg" alt="Andrew Lumala" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Built by <span className="text-violet-600 dark:text-violet-400 font-semibold">Andrew Lumala</span>
                  </p>
                  <p className="text-neutral-400 dark:text-neutral-600 text-xs">© {new Date().getFullYear()} {settings.businessName}</p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
