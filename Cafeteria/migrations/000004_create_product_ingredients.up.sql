CREATE TABLE product_ingredients (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity_used NUMERIC(10,3) NOT NULL CHECK (quantity_used > 0),
    PRIMARY KEY (product_id, ingredient_id)
);