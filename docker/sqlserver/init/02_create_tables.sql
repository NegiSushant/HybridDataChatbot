-- ============================================================
-- 02_create_tables.sql
-- Run in context of AgentDB (pass -d AgentDB to sqlcmd)
-- Creates sample tables for the agent to query
-- ============================================================

-- ── Products ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Products]') AND type = 'U')
BEGIN
    CREATE TABLE dbo.Products (
        ProductID     INT           IDENTITY(1,1) PRIMARY KEY,
        ProductName   NVARCHAR(100) NOT NULL,
        Category      NVARCHAR(50)  NOT NULL,
        UnitPrice     DECIMAL(10,2) NOT NULL,
        StockQuantity INT           NOT NULL DEFAULT 0,
        CreatedAt     DATETIME2     NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Table Products created.';
END
GO

-- ── Customers ────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Customers]') AND type = 'U')
BEGIN
    CREATE TABLE dbo.Customers (
        CustomerID   INT           IDENTITY(1,1) PRIMARY KEY,
        FirstName    NVARCHAR(50)  NOT NULL,
        LastName     NVARCHAR(50)  NOT NULL,
        Email        NVARCHAR(100) NOT NULL UNIQUE,
        Region       NVARCHAR(50)  NOT NULL,
        JoinedAt     DATETIME2     NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Table Customers created.';
END
GO

-- ── Sales ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Sales]') AND type = 'U')
BEGIN
    CREATE TABLE dbo.Sales (
        SaleID      INT           IDENTITY(1,1) PRIMARY KEY,
        CustomerID  INT           NOT NULL REFERENCES dbo.Customers(CustomerID),
        ProductID   INT           NOT NULL REFERENCES dbo.Products(ProductID),
        Quantity    INT           NOT NULL,
        TotalAmount DECIMAL(12,2) NOT NULL,
        SaleDate    DATETIME2     NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Table Sales created.';
END
GO
