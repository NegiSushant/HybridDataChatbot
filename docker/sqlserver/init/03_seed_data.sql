-- ============================================================
-- 03_seed_data.sql
-- Run in context of AgentDB (pass -d AgentDB to sqlcmd)
-- Seeds sample data only if tables are empty
-- ============================================================

-- ── Products ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT TOP 1 1 FROM dbo.Products)
BEGIN
    INSERT INTO dbo.Products (ProductName, Category, UnitPrice, StockQuantity) VALUES
        ('Laptop Pro 15',      'Electronics',  85000.00, 50),
        ('Wireless Mouse',     'Electronics',   1500.00, 200),
        ('USB-C Hub',          'Electronics',   2500.00, 150),
        ('Standing Desk',      'Furniture',    22000.00, 30),
        ('Ergonomic Chair',    'Furniture',    18000.00, 40),
        ('Notebook A5',        'Stationery',     150.00, 500),
        ('Ballpoint Pens 10pk','Stationery',     250.00, 800),
        ('Monitor 27"',        'Electronics',  32000.00, 60),
        ('Webcam HD',          'Electronics',   4500.00, 80),
        ('Desk Lamp LED',      'Furniture',     1800.00, 120);
    PRINT 'Products seeded.';
END
GO

-- ── Customers ────────────────────────────────────────────────
IF NOT EXISTS (SELECT TOP 1 1 FROM dbo.Customers)
BEGIN
    INSERT INTO dbo.Customers (FirstName, LastName, Email, Region, JoinedAt) VALUES
        ('Riya',    'Sharma',   'riya.sharma@example.com',   'North', '2023-01-15'),
        ('Amit',    'Verma',    'amit.verma@example.com',    'South', '2023-03-22'),
        ('Priya',   'Singh',    'priya.singh@example.com',   'East',  '2023-05-10'),
        ('Rohan',   'Gupta',    'rohan.gupta@example.com',   'West',  '2023-06-01'),
        ('Sneha',   'Iyer',     'sneha.iyer@example.com',    'North', '2023-07-18'),
        ('Vikram',  'Nair',     'vikram.nair@example.com',   'South', '2023-08-05'),
        ('Divya',   'Rao',      'divya.rao@example.com',     'East',  '2023-09-12'),
        ('Arjun',   'Kumar',    'arjun.kumar@example.com',   'West',  '2023-10-25'),
        ('Meera',   'Joshi',    'meera.joshi@example.com',   'North', '2024-01-03'),
        ('Karan',   'Mehta',    'karan.mehta@example.com',   'South', '2024-02-14');
    PRINT 'Customers seeded.';
END
GO

-- ── Sales ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT TOP 1 1 FROM dbo.Sales)
BEGIN
    INSERT INTO dbo.Sales (CustomerID, ProductID, Quantity, TotalAmount, SaleDate) VALUES
        -- Q1 2024
        (1,  1, 1,  85000.00, '2024-01-10'),
        (2,  2, 2,   3000.00, '2024-01-15'),
        (3,  5, 1,  18000.00, '2024-02-02'),
        (4,  8, 1,  32000.00, '2024-02-18'),
        (5,  3, 3,   7500.00, '2024-03-05'),
        -- Q2 2024
        (6,  9, 2,   9000.00, '2024-04-12'),
        (7,  4, 1,  22000.00, '2024-04-28'),
        (8,  1, 2, 170000.00, '2024-05-03'),
        (9,  6, 10,  1500.00, '2024-05-20'),
        (10, 7, 5,   1250.00, '2024-06-08'),
        -- Q3 2024
        (1,  8, 1,  32000.00, '2024-07-15'),
        (2,  9, 1,   4500.00, '2024-07-22'),
        (3,  2, 4,   6000.00, '2024-08-05'),
        (4, 10, 2,   3600.00, '2024-08-19'),
        (5,  1, 1,  85000.00, '2024-09-01'),
        -- Q4 2024
        (6,  4, 2,  44000.00, '2024-10-10'),
        (7,  5, 1,  18000.00, '2024-10-25'),
        (8,  3, 5,  12500.00, '2024-11-03'),
        (9,  8, 1,  32000.00, '2024-11-15'),
        (10, 1, 1,  85000.00, '2024-12-20');
    PRINT 'Sales seeded.';
END
GO

PRINT '✅ All seed data loaded successfully.';
GO
