CREATE DATABASE Project;
GO
USE Project;
GO
CREATE TABLE Users
(
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Passwords VARCHAR(25) NOT NULL,
    UserName VARCHAR(25) NOT NULL,
    Email VARCHAR(50) UNIQUE,
    DOC DATETIME DEFAULT GETDATE()
);
GO
CREATE TABLE Users_Address
(
    AddressID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    StreetNo INT NOT NULL,
    HouseNo INT NOT NULL,
    BlockName VARCHAR(10) DEFAULT NULL,
    Society VARCHAR(50),
    City VARCHAR(50) NOT NULL,
    Country VARCHAR(50) NOT NULL,
    FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);
GO
CREATE TABLE Users_Contact_Info
(
    UserID INT NOT NULL,
    PhoneNo VARCHAR (15) UNIQUE,
    PRIMARY KEY (UserID, PhoneNo),
    Foreign Key (UserID) REFERENCES Users (UserID) ON DELETE CASCADE
);
GO
CREATE TABLE Admin
(
    AdminID INT PRIMARY KEY CHECK (AdminID BETWEEN 10000000 AND 99999999),
    AdminRole VARCHAR(15) CHECK (AdminRole IN ('Head', 'Products_Head', 'Orders_Head')),
    Admin_Pass VARCHAR(25) NOT NULL,
    AdminStatus VARCHAR(15) DEFAULT 'ACTIVE' CHECK (AdminStatus IN ('ACTIVE', 'DEACTIVATED')),
);
GO
CREATE TABLE Categories
(
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName VARCHAR(25) UNIQUE NOT NULL
);
GO
CREATE TABLE Products
(
    ProductID INT IDENTITY(1,1) PRIMARY KEY,
    ProdName VARCHAR(25) NOT NULL,
    CategoryID INT NOT NULL,
    Price DECIMAL(10,2) NOT NULL,
    ProdDescription VARCHAR(100),
    Stars INT DEFAULT 1 CHECK (Stars BETWEEN 1 AND 5),
    -- avg of ratings
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID) ON DELETE CASCADE
);
GO
CREATE TABLE Suppliers
(
    SupplierID INT IDENTITY(1,1) PRIMARY KEY,
    SupplierName VARCHAR(25) UNIQUE NOT NULL
);
GO
CREATE TABLE Supplier_Contact_Info
(
    SupplierID INT NOT NULL,
    PhoneNo VARCHAR (15) UNIQUE,
    PRIMARY KEY (SupplierID, PhoneNo),
    Foreign Key (SupplierID) REFERENCES Suppliers (SupplierID) ON DELETE CASCADE
);
GO
CREATE TABLE Supplier_Address
(
    SupplierID INT PRIMARY KEY,
    BuildingName VARCHAR(50) DEFAULT NULL,
    -- Optional: For buildings with names
    StreetNo INT NOT NULL,
    IndustrialArea VARCHAR(50) DEFAULT NULL,
    -- For areas like "Korangi Industrial Zone"
    City VARCHAR(50) NOT NULL,
    Country VARCHAR(50) NOT NULL,
    PostalCode VARCHAR(5) DEFAULT NULL,
    FOREIGN KEY(SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE CASCADE
);
GO
CREATE TABLE ProductSuppliers
(
    ProductID INT NOT NULL,
    SupplierID INT NOT NULL,
    PRIMARY KEY (ProductID, SupplierID),
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE CASCADE,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE CASCADE
);
GO
CREATE TABLE Reviews
(
    ReviewID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ProductID INT NOT NULL,
    Rating INT CHECK (Rating BETWEEN 1 AND 5),
    ReviewText VARCHAR(100),
    ReviewDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE CASCADE
    -- this delete cascade
);
GO
CREATE TABLE ShoppingCart
(
    CartID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);
GO
CREATE TABLE CartItems
(
    CartID INT NOT NULL,
    ProductID INT NOT NULL,
    Quantity INT DEFAULT 1 CHECK (Quantity > 0),
    PRIMARY KEY (CartID, ProductID),
    FOREIGN KEY (CartID) REFERENCES ShoppingCart(CartID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID)ON DELETE NO ACTION
);
GO
CREATE TABLE Coupons
(
    CouponID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL,
    Code VARCHAR(20) UNIQUE NOT NULL,
    DiscountPercent INT CHECK (DiscountPercent BETWEEN 1 AND 100) NOT NULL,
    ExpiryDate DATE NOT NULL,
    FOREIGN KEY(UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);
GO
CREATE TABLE Orders
(
    OrderID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    CartID INT UNIQUE NOT NULL,
    AddressID INT NOT NULL,
    OrderDate DATETIME DEFAULT GETDATE(),
    TotalAmount MONEY NOT NULL,
    PaymentMethod VARCHAR(5) CHECK (PaymentMethod IN ('CASH', 'CARD')) NOT NULL,
    CouponID INT NULL,
    FOREIGN KEY (AddressID) REFERENCES Users_Address(AddressID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (CouponID) REFERENCES Coupons(CouponID) ON DELETE SET NULL
);
GO
CREATE TABLE OrderItems
(
    OrderItemID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT NOT NULL,
    ProductID INT NOT NULL,
    TotalPrice DECIMAL(10,2) NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    ReviewFlag BIT DEFAULT 1,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE NO ACTION
);
GO
CREATE TABLE CardPayments
(
    OrderID INT PRIMARY KEY,
    CardNo VARCHAR(16) NOT NULL,
    ExpDate DATE NOT NULL,
    PaidAmount MONEY NOT NULL,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);
GO
CREATE TABLE Deliveries
(
    OrderID INT PRIMARY KEY,
    ExpectedDate DATE DEFAULT DATEADD(DAY, 2, GETDATE()),
    OrderStatus VARCHAR(20) CHECK (OrderStatus IN ('PENDING', 'SHIPPED')) DEFAULT 'PENDING',
    PaymentStatus VARCHAR(20) CHECK (PaymentStatus IN ('PENDING', 'SUCCESSFULL')) DEFAULT 'PENDING',
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);
GO
CREATE TABLE Inventory
(
    InventoryID INT IDENTITY(1,1) PRIMARY KEY,
    ProductID INT NOT NULL,
    TransactionType VARCHAR(10) CHECK (TransactionType IN ('ADD', 'REMOVE')) NOT NULL,
    stockQuantity INT CHECK (stockQuantity >= 0) NOT NULL,
    TransactionDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE CASCADE
);

----------------------- PROCEDURES AND QUERIES --------------------|

-- GO
-- CREATE PROCEDURE AuthenticateUser
--     @UserName NVARCHAR(25)
-- AS
-- BEGIN
--     SET NOCOUNT ON;
--     SELECT UserID, UserName, Email, Passwords
--     FROM Users
--     WHERE UserName = @UserName;
-- END;

-- GO
-- CREATE PROCEDURE RemoveItemFromCart
--     @CartID INT,
--     @ProductID INT
-- AS
-- BEGIN
--     SET NOCOUNT ON;

--     -- Check if the item exists in the cart and get its quantity
--     DECLARE @CurrentQuantity INT;
--     SELECT @CurrentQuantity = Quantity
--     FROM CartItems
--     WHERE CartID = @CartID AND ProductID = @ProductID;

--     -- If the item is found in the cart
--     IF @CurrentQuantity IS NOT NULL
--     BEGIN
--         -- If more than 1 quantity, decrease by 1
--         IF @CurrentQuantity > 1
--         BEGIN
--             UPDATE CartItems 
--             SET Quantity = Quantity - 1
--             WHERE CartID = @CartID AND ProductID = @ProductID;
--         END
--         ELSE 
--         BEGIN
--             -- If quantity is 1, remove the item from CartItems
--             DELETE FROM CartItems 
--             WHERE CartID = @CartID AND ProductID = @ProductID;

--             -- Check if the cart is now empty
--             IF NOT EXISTS (SELECT 1
--             FROM CartItems
--             WHERE CartID = @CartID)
--             BEGIN
--                 -- Delete the empty cart
--                 DELETE FROM ShoppingCart WHERE CartID = @CartID;
--             END
--         END
--     END
-- END;

GO
CREATE PROCEDURE PlaceOrders
    @UserID INT,
    @StreetNo INT,
    @HouseNo INT,
    @BlockName VARCHAR(10) = NULL,
    @Society VARCHAR(50),
    @City VARCHAR(50),
    @Country VARCHAR(50),
    @PaymentMethod VARCHAR(5),
    @CardNo VARCHAR(16) = NULL,
    @ExpDate DATE = NULL,
    @CouponID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE 
        @CartID INT,
        @TotalAmount MONEY,
        @Discount MONEY = 0,
        @FinalAmount MONEY,
        @OrderID INT,
        @ShippingAddressID INT;

    -- Get user's cart
    SELECT TOP 1
        @CartID = CartID
    FROM ShoppingCart
    WHERE UserID = @UserID;

    IF @CartID IS NULL
    BEGIN
        RAISERROR('No active cart found for the user.', 16, 1);
        RETURN;
    END

    -- Calculate total
    SELECT @TotalAmount = SUM(P.Price * CI.Quantity)
    FROM CartItems CI
        JOIN Products P ON CI.ProductID = P.ProductID
    WHERE CartID = @CartID;

    IF @TotalAmount IS NULL
    BEGIN
        RAISERROR('Cart is empty.', 16, 1);
        RETURN;
    END

    -- Validate Coupon
    IF @CouponID IS NOT NULL
    BEGIN
        IF NOT EXISTS (
            SELECT 1
        FROM Coupons
        WHERE CouponID = @CouponID AND UserID = @UserID
        )
        BEGIN
            RAISERROR('Invalid coupon or not assigned to user.', 16, 1);
            RETURN;
        END

        SELECT @Discount = (DiscountPercent * @TotalAmount) / 100
        FROM Coupons
        WHERE CouponID = @CouponID;

        IF @Discount IS NULL SET @Discount = 0;
    END

    SET @FinalAmount = @TotalAmount - @Discount;

    -- Insert new address
    INSERT INTO Users_Address
        (UserID, StreetNo, HouseNo, BlockName, Society, City, Country)
    VALUES
        (@UserID, @StreetNo, @HouseNo, @BlockName, @Society, @City, @Country);

    SET @ShippingAddressID = SCOPE_IDENTITY();

    -- Insert order
    INSERT INTO Orders
        (UserID, CartID, OrderDate, TotalAmount, PaymentMethod, CouponID, AddressID)
    VALUES
        (@UserID, @CartID, GETDATE(), @FinalAmount, @PaymentMethod, @CouponID, @ShippingAddressID);

    SET @OrderID = SCOPE_IDENTITY();

    IF @OrderID IS NULL
    BEGIN
        RAISERROR('Order insertion failed.', 16, 1);
        RETURN;
    END

    -- Card payment
    IF @PaymentMethod = 'CARD'
    BEGIN
        INSERT INTO CardPayments
            (OrderID, CardNo, ExpDate, PaidAmount)
        VALUES
            (@OrderID, @CardNo, @ExpDate, @FinalAmount);
    END

    -- Delivery record
    INSERT INTO Deliveries
        (OrderID, OrderStatus, PaymentStatus)
    VALUES
        (@OrderID, 'PENDING', CASE WHEN @PaymentMethod = 'CARD' THEN 'SUCCESSFULL' ELSE 'PENDING' END);

    -- Order Items
    INSERT INTO OrderItems
        (OrderID, ProductID, Quantity, TotalPrice)
    SELECT
        @OrderID,
        CI.ProductID,
        SUM(CI.Quantity) AS Quantity,
        SUM(P.Price * CI.Quantity) AS TotalPrice
    FROM CartItems CI
        JOIN Products P ON CI.ProductID = P.ProductID
    WHERE CI.CartID = @CartID
    GROUP BY CI.ProductID;

    -- Clear Cart
    DELETE FROM ShoppingCart WHERE UserID = @UserID;

    PRINT 'Order placed with shipping address.';
END;

-- --------------------------------------------------------------------------------------------------