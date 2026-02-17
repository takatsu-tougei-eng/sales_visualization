export interface Order {
  id: number;
  order_number: string;
  order_date: string;
  item_name: string;
  item_type: string;
  time_slot: string;
  quantity: number;
  subtotal: number;
}

export interface DailySummary {
  order_date: string;
  item_type: string;
  time_slot: string;
  total_quantity: number;
  total_amount: number;
}
