CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_sold_by ON sales(sold_by);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_products_active ON products(active);