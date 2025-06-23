const express = require('express');
const cors = require('cors');
const db = require('./Database');
const sql = require('mssql');
const bcrypt = require('bcrypt');  // For hashing
const Database = require('./Database');
const app = express();
app.use('/img', express.static('backend/img'));

app.use(cors());
app.use(express.json());

const config = {
    port: 1433,
    user: "hamza",
    password: "1234",
    server: "HPi58",
    database: "Project",
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    port: 1433
};

// Utility function for sending JSON responses
const sendResponse = (res, statusCode, message) => {
    res.status(statusCode).json(typeof message === "string" ? { message } : message);
};

// =================== ADMIN AUTHENTICATION ===================

app.post("/adminSignup", async (req, res) => {
    try {
        const { AdminID, AdminRole, Admin_Pass } = req.body;

        const checkQuery = `SELECT COUNT(*) AS count FROM Admin WHERE AdminID = @AdminID`;
        const result = await db.executeQuery(checkQuery, { AdminID: { type: sql.Int, value: AdminID } });

        if (result[0].count > 0) {
            return sendResponse(res, 400, "❌ AdminID already exists. Please choose a different one.");
        }

        const insertQuery = `INSERT INTO Admin (AdminID, AdminRole, Admin_Pass, AdminStatus) 
                            VALUES (@AdminID, @AdminRole, @Admin_Pass, 'ACTIVE')`;
        await db.executeQuery(insertQuery, {
            AdminID: { type: sql.Int, value: AdminID },
            AdminRole: { type: sql.VarChar, value: AdminRole },
            Admin_Pass: { type: sql.VarChar, value: Admin_Pass }
        });
        sendResponse(res, 201, { message: "✅ Admin registered successfully!", AdminID, AdminRole });
    } catch (error) {
        sendResponse(res, 500, "❌ Internal Server Error");
    }
});

app.post("/adminLogin", async (req, res) => {

    try {
        const { AdminID, Admin_Pass, AdminRole } = req.body;

        const query = `SELECT AdminRole, AdminStatus FROM Admin WHERE AdminID = @AdminID AND Admin_Pass = @Admin_Pass AND AdminRole = @AdminRole`;
        const result = await db.executeQuery(query, {
            AdminID: { type: sql.Int, value: AdminID },
            Admin_Pass: { type: sql.VarChar, value: Admin_Pass },
            AdminRole: { type: sql.VarChar, value: AdminRole }
        });

        if (result.length === 0) {
            return res.status(401).json({ message: "❌ Invalid Admin ID, Password, or Role" });
        }

        if (result[0].AdminStatus === 'DEACTIVATED') {
            return res.status(403).json({ message: "❌ This account has been deactivated by the Head Admin." });
        }

        return res.status(200).json({ message: "✅ Login successful", role: result[0].AdminRole });
    } catch (error) {
        return res.status(500).json({ message: "❌ Internal Server Error" });
    }
});

app.post("/changePassword", async (req, res) => {
    try {
        const { AdminID, prevPassword, newPassword } = req.body;

        if (!AdminID || !prevPassword || !newPassword) {
            return res.status(400).json({ message: "❌ Missing required fields." });
        }

        // Query to check if AdminID exists and get the current password
        const checkAdminQuery = `
            SELECT AdminID, Admin_Pass 
            FROM Admin 
            WHERE AdminID = @AdminID
        `;

        const checkAdminResult = await db.executeQuery(checkAdminQuery, {
            AdminID: { type: sql.Int, value: AdminID }
        });

        if (checkAdminResult.length === 0) {
            // Admin not found
            return res.status(404).json({ message: "❌ Admin ID not found." });
        }

        // Check if previous password matches
        const storedPassword = checkAdminResult[0].Admin_Pass;
        if (storedPassword !== prevPassword) {
            // Password mismatch
            return res.status(401).json({ message: "❌ Current password is incorrect." });
        }

        // Query to update the password
        const updatePasswordQuery = `
            UPDATE Admin 
            SET Admin_Pass = @newPassword 
            WHERE AdminID = @AdminID
        `;

        await db.executeQuery(updatePasswordQuery, {
            AdminID: { type: sql.Int, value: AdminID },
            newPassword: { type: sql.VarChar, value: newPassword }
        });

        return res.status(200).json({ message: "✅ Password changed successfully." });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "❌ Internal Server Error" });
    }
});

// =================== PRODUCTS MANAGEMENT (PRODUCTS HEAD) ===================

// Fetch All Products
app.get("/productInventoryDetails", async (req, res) => {
    try {
        const query = `
            SELECT 
                P.ProductID, 
                P.ProdName, 
                P.Price, 
                P.ProdDescription,
                P.Stars,
                C.CategoryName, 
                I.InventoryID, 
                I.TransactionType, 
                I.stockQuantity, 
                FORMAT(I.TransactionDate, 'yyyy-MM-dd HH:mm:ss') AS TransactionDate
            FROM Products P
            LEFT JOIN Inventory I ON P.ProductID = I.ProductID
            LEFT JOIN Categories C ON P.CategoryID = C.CategoryID
            ORDER BY I.TransactionDate DESC
        `;
        const result = await sql.query(query);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: "❌ Error fetching product and inventory details" });
    }
});

app.post("/addProduct", async (req, res) => {
    try {
        const { ProdName, CategoryID, SupplierID, Price, Stock, ProdDescription } = req.body;

        // Validate input
        if (!ProdName || !CategoryID || !SupplierID || !Price || !Stock || !ProdDescription) {
            return res.status(400).json({ error: "❌ All fields are required" });
        }
        if (Stock <= 0) {
            return res.status(400).json({ error: "❌ Stock must be positive" });
        }
        if (Price <= 0) {
            return res.status(400).json({ error: "❌ Price must be positive" });
        }

        // Check if Category exists
        const categoryCheck = await db.executeQuery(
            "SELECT 1 FROM Categories WHERE CategoryID = @CategoryID",
            { CategoryID: { type: sql.Int, value: CategoryID } }
        );

        if (categoryCheck.length === 0) {
            return res.status(400).json({ error: "❌ Invalid CategoryID" });
        }

        // Check if Supplier exists
        const supplierCheck = await db.executeQuery(
            "SELECT 1 FROM Suppliers WHERE SupplierID = @SupplierID",
            { SupplierID: { type: sql.Int, value: SupplierID } }
        );

        if (supplierCheck.length === 0) {
            return res.status(400).json({ error: "❌ Invalid SupplierID" });
        }

        // Insert the product into the Products table
        const productQuery = `
            INSERT INTO Products (ProdName, CategoryID, Price, ProdDescription)
            OUTPUT INSERTED.ProductID
            VALUES (@ProdName, @CategoryID, @Price, @ProdDescription)`;

        const productResult = await db.executeQuery(productQuery, {
            ProdName: { type: sql.VarChar, value: ProdName },
            CategoryID: { type: sql.Int, value: CategoryID },
            Price: { type: sql.Decimal, value: Price },
            ProdDescription: { type: sql.VarChar, value: ProdDescription },
        });

        if (!productResult || productResult.length === 0) {
            return res.status(500).json({ error: "❌ Product insertion failed" });
        }

        const productID = productResult[0].ProductID;

        // Insert the product-supplier relation in ProductSuppliers table
        const productSupplierQuery = `
            INSERT INTO ProductSuppliers (ProductID, SupplierID)
            VALUES (@ProductID, @SupplierID)`;

        await db.executeQuery(productSupplierQuery, {
            ProductID: { type: sql.Int, value: productID },
            SupplierID: { type: sql.Int, value: SupplierID }
        });

        // Add stock to the Inventory table
        const inventoryQuery = `
            INSERT INTO Inventory (ProductID, TransactionType, stockQuantity, TransactionDate)
            VALUES (@ProductID, 'ADD', @Stock, GETDATE())`;

        await db.executeQuery(inventoryQuery, {
            ProductID: { type: sql.Int, value: productID },
            Stock: { type: sql.Int, value: Stock }
        });

        res.status(201).json({
            message: "✅ Product added successfully!",
            ProductID: productID
        });
    } catch (error) {
        console.error("❌ Error adding product:", error);
        res.status(500).json({
            error: "❌ Failed to add product",
            details: error.message
        });
    }
});

app.post('/addSupplier', async (req, res) => {
    const { SupplierName, StreetNo, BuildingName, IndustrialArea, City, Country, PostalCode, PhoneNo } = req.body;

    // Validate inputs
    if (!SupplierName || !StreetNo || !City || !Country || !PhoneNo) {
        return res.status(400).json({
            message: "❌ Please provide SupplierName, StreetNo, City, Country, and at least one phone number."
        });
    }

    // Parse comma-separated phone numbers into an array
    const ContactNumbers = PhoneNo.split(',').map(p => p.trim()).filter(p => p.length > 0);

    if (ContactNumbers.length === 0) {
        return res.status(400).json({ message: "❌ At least one valid phone number is required." });
    }

    try {
        const pool = await sql.connect(config);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Insert into Suppliers
        const insertSupplierResult = await request
            .input("SupplierName", sql.VarChar(25), SupplierName)
            .query("INSERT INTO Suppliers (SupplierName) OUTPUT INSERTED.SupplierID VALUES (@SupplierName)");

        const supplierID = insertSupplierResult.recordset[0].SupplierID;

        // Insert into Supplier_Address
        await new sql.Request(transaction)
            .input("SupplierID", sql.Int, supplierID)
            .input("BuildingName", sql.VarChar(50), BuildingName || null)
            .input("StreetNo", sql.Int, StreetNo)
            .input("IndustrialArea", sql.VarChar(50), IndustrialArea || null)
            .input("City", sql.VarChar(50), City)
            .input("Country", sql.VarChar(50), Country)
            .input("PostalCode", sql.VarChar(5), PostalCode || null)
            .query(`
                INSERT INTO Supplier_Address (SupplierID, BuildingName, StreetNo, IndustrialArea, City, Country, PostalCode)
                VALUES (@SupplierID, @BuildingName, @StreetNo, @IndustrialArea, @City, @Country, @PostalCode)
            `);

        // Insert all phone numbers
        for (const phone of ContactNumbers) {
            await new sql.Request(transaction)
                .input("SupplierID", sql.Int, supplierID)
                .input("PhoneNo", sql.VarChar(15), phone)
                .query(`
                    INSERT INTO Supplier_Contact_Info (SupplierID, PhoneNo)
                    VALUES (@SupplierID, @PhoneNo)
                `);
        }

        await transaction.commit();
        res.status(201).json({ message: "✅ Supplier added successfully." });

    } catch (error) {
        console.error("❌ Error adding supplier:", error);
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: "❌ Failed to add supplier." });
    }
});

app.get("/suppliers", async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                s.SupplierID, 
                s.SupplierName,
                sa.BuildingName,
                sa.StreetNo,
                sa.IndustrialArea,
                sa.City,
                sa.Country,
                sa.PostalCode,
                sci.PhoneNo
            FROM Suppliers s
            LEFT JOIN Supplier_Address sa ON s.SupplierID = sa.SupplierID
            LEFT JOIN Supplier_Contact_Info sci ON s.SupplierID = sci.SupplierID
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching Suppliers:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.put("/updateProduct/:id", async (req, res) => {
    const { ProdName, Price, ProdDescription, CategoryID } = req.body;
    const { id } = req.params; // Get the product ID from the URL parameters

    const updateProductQuery = `
        UPDATE Products 
        SET ProdName = @ProdName, 
            Price = @Price, 
            ProdDescription = @ProdDescription,
            CategoryID = @CategoryID 
        WHERE ProductID = @id;
    `;

    try {
        const productResult = await db.executeQuery(updateProductQuery, {
            ProdName: { type: sql.VarChar, value: ProdName },
            Price: { type: sql.Decimal, value: Price },
            ProdDescription: { type: sql.VarChar, value: ProdDescription },
            CategoryID: { type: sql.Int, value: CategoryID },
            id: { type: sql.Int, value: id }  // Ensure that the 'id' is passed correctly
        });

        if (productResult.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "❌ Product not found" });
        }

        console.log("Product updated successfully:", productResult);
        res.status(200).json({ message: "✅ Product updated successfully" });

    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "❌ Error updating product" });
    }
});

app.delete("/deleteProduct/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Delete related records from CartItems (to avoid FK constraint issues)
        await db.executeQuery("DELETE FROM CartItems WHERE ProductID = @id", {
            id: { type: sql.Int, value: id }
        });

        const deleteQuery = "DELETE FROM Products WHERE ProductID = @id";
        const result = await db.executeQuery(deleteQuery, {
            id: { type: sql.Int, value: id }
        });

        res.status(200).json({ success: true, message: "✅ Product deleted successfully" });

    } catch (error) {
        console.error("❌ Error deleting product:", error);
        res.status(500).json({
            error: "❌ Failed to delete product",
            details: error.message
        });
    }
});

app.put("/updateInventory/:id", async (req, res) => {
    const { changeQuantity, transactionType } = req.body;
    const { id } = req.params;

    try {
        let updateInventoryQuery = '';
        let updateProductQuery = '';

        if (transactionType === "ADD") {
            updateInventoryQuery = `
                UPDATE Inventory
                SET stockQuantity = stockQuantity + @changeQuantity,
                    TransactionType = @transactionType,
                    TransactionDate = GETDATE()
                WHERE ProductID = @id
            `;
            updateProductQuery = `
                UPDATE Products
                SET Stock = Stock + @changeQuantity
                WHERE ProductID = @id
            `;
        } else if (transactionType === "REMOVE") {
            updateInventoryQuery = `
                UPDATE Inventory
                SET stockQuantity = stockQuantity - @changeQuantity,
                    TransactionType = @transactionType,
                    TransactionDate = GETDATE()
                WHERE ProductID = @id
            `;
            updateProductQuery = `
                UPDATE Products
                SET Stock = Stock - @changeQuantity
                WHERE ProductID = @id
            `;
        } else {
            return res.status(400).json({ message: "❌ Invalid transaction type. Use 'ADD' or 'REMOVE'" });
        }

        // First update Inventory
        await db.executeQuery(updateInventoryQuery, {
            transactionType: { type: sql.VarChar, value: transactionType },
            changeQuantity: { type: sql.Int, value: changeQuantity },
            id: { type: sql.Int, value: id }
        });

        // Then update Products
        await db.executeQuery(updateProductQuery, {
            changeQuantity: { type: sql.Int, value: changeQuantity },
            id: { type: sql.Int, value: id }
        });

        res.status(200).json({ message: "✅ Inventory and product stock updated successfully" });

    } catch (error) {
        console.error("❌ Error updating inventory:", error);
        res.status(500).json({ message: "❌ Internal Server Error" });
    }
});

app.get("/productWithReviews/:productId", async (req, res) => {
    const productId = req.params.productId;

    try {
        const request = new sql.Request();
        request.input('productId', sql.Int, productId); // declare input

        const query = `
            SELECT
                P.ProdName,
                R.Rating, 
                R.ReviewText, 
                R.ReviewDate
            FROM Products P
            LEFT JOIN Reviews R ON P.ProductID = R.ProductID
            WHERE P.ProductID = @productId
            ORDER BY R.ReviewDate DESC
        `;

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Product not found or no reviews available" });
        }

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ error: "❌ Error fetching product and reviews" });
    }
});

app.get("/productSuppliers/:productId", async (req, res) => {
    const productId = req.params.productId;
    try {
        const request = new sql.Request();
        request.input('productId', sql.Int, productId);

        const query = `
            SELECT 
                S.SupplierID, 
                S.SupplierName, 
                SA.BuildingName,
                SA.StreetNo,
                SA.IndustrialArea,
                SA.City,
                SA.Country,
                SA.PostalCode,
                SCI.PhoneNo
            FROM Suppliers S
            INNER JOIN ProductSuppliers PS ON S.SupplierID = PS.SupplierID
            LEFT JOIN Supplier_Address SA ON S.SupplierID = SA.SupplierID
            LEFT JOIN Supplier_Contact_Info SCI ON S.SupplierID = SCI.SupplierID
            WHERE PS.ProductID = @productId
        `;

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "No suppliers found for this product" });
        }

        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching suppliers: ", error);
        res.status(500).json({ error: "Failed to fetch suppliers" });
    }
});

app.post("/changeSupplier/:id", async (req, res) => {
    try {
        const { id: productId } = req.params;
        const {
            supplierName,
            supplierContact,
            address // address is an object now
        } = req.body;

        if (!supplierName || !supplierContact || !address) {
            return res.status(400).json({ message: "All supplier details are required." });
        }

        const {
            buildingName,
            streetNo,
            industrialArea,
            city,
            country,
            postalCode
        } = address;

        const pool = await sql.connect(config);

        // Step 1: Find matching supplier
        const query = `
            SELECT S.SupplierID
            FROM Suppliers S
            JOIN Supplier_Contact_Info C ON S.SupplierID = C.SupplierID
            JOIN Supplier_Address A ON S.SupplierID = A.SupplierID
            WHERE S.SupplierName = @supplierName
              AND C.PhoneNo = @supplierContact
              AND A.BuildingName = @buildingName
              AND A.StreetNo = @streetNo
              AND A.IndustrialArea = @industrialArea
              AND A.City = @city
              AND A.Country = @country
              AND A.PostalCode = @postalCode
        `;

        const result = await pool.request()
            .input("supplierName", sql.VarChar, supplierName)
            .input("supplierContact", sql.VarChar, supplierContact)
            .input("buildingName", sql.VarChar, buildingName)
            .input("streetNo", sql.Int, streetNo)
            .input("industrialArea", sql.VarChar, industrialArea)
            .input("city", sql.VarChar, city)
            .input("country", sql.VarChar, country)
            .input("postalCode", sql.VarChar, postalCode)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Supplier not found with the provided details." });
        }

        const newSupplierID = result.recordset[0].SupplierID;

        // Step 2: Update the ProductSuppliers table
        await pool.request()
            .input("ProductID", sql.Int, productId)
            .input("NewSupplierID", sql.Int, newSupplierID)
            .query(`
                UPDATE ProductSuppliers
                SET SupplierID = @NewSupplierID
                WHERE ProductID = @ProductID
            `);

        res.status(200).json({ message: "Supplier updated successfully!" });

    } catch (error) {
        console.error("Error updating supplier:", error);
        res.status(500).json({ message: "❌ Internal Server Error" });
    }
});

// Products Head: Low Stock Alerts
app.get("/lowStockAlerts", async (req, res) => {
    try {
        const query = `SELECT P.ProdName, I.stockQuantity 
                    FROM Products P 
                    JOIN Inventory I ON P.ProductID = I.ProductID 
                    WHERE I.stockQuantity < 5`;
        const result = await db.executeQuery(query);
        sendResponse(res, 200, result);
    } catch (error) {
        sendResponse(res, 500, "Internal Server Error");
    }
});

// =================== Head Of Admins (View Everything, No Changes) ===================

// Monthly Sales
app.get("/salesReport", async (req, res) => {
    try {
        const query = `
            SELECT 
                P.ProductID,
                P.ProdName,
                YEAR(O.OrderDate) AS Year, 
                MONTH(O.OrderDate) AS Month, 
                SUM(OI.Quantity) AS TotalQuantitySold,
                SUM(OI.Quantity * P.Price) AS TotalSales
            FROM Orders O
            JOIN OrderItems OI ON O.OrderID = OI.OrderID
            JOIN Products P ON OI.ProductID = P.ProductID
            GROUP BY P.ProductID, P.ProdName, YEAR(O.OrderDate), MONTH(O.OrderDate)
            ORDER BY Year DESC, Month DESC, TotalSales DESC;
        `;
        const result = await db.executeQuery(query);
        sendResponse(res, 200, result);
    } catch (error) {
        sendResponse(res, 500, "❌ Internal Server Error");
    }
});

app.get("/viewAdmins", async (req, res) => {
    try {
        const result = await sql.query`SELECT AdminID, AdminRole, AdminStatus FROM Admin`;
        res.json(result.recordset);

    } catch (error) {
        console.error("Error fetching admins:", error);  // Log the error in case of failure
        res.status(500).json({ error: "❌ Internal Server Error" });
    }
});

// API to deactivate/activate an admin based on AdminID
app.put("/removeAdmin/:AdminID", async (req, res) => {
    const { AdminID } = req.params;
    const { AdminStatus } = req.body; // Get the new status from request body
    console.log("AdminID:", AdminID, "AdminStatus:", AdminStatus);
    const updateQuery = `UPDATE Admin SET AdminStatus = @AdminStatus WHERE AdminID = @AdminID`;
    await db.executeQuery(updateQuery, {
        AdminID: { type: sql.Int, value: AdminID },
        AdminStatus: { type: sql.VarChar, value: AdminStatus }
    });

    res.status(200).json({ message: `✅ Admin status updated to ${AdminStatus}` });
});

// =================== ORDERS MANAGEMENT (ORDERS HEAD) ===================

// Update Order Status
app.put("/updateOrder/:id", async (req, res) => {
    const { OrderStatus, PaymentStatus } = req.body;
    const { id } = req.params;

    const query = "UPDATE Deliveries SET OrderStatus = @OrderStatus, PaymentStatus = @PaymentStatus WHERE OrderID = @id";

    await db.executeQuery(query, {
        OrderStatus: { type: sql.VarChar, value: OrderStatus },
        PaymentStatus: { type: sql.VarChar, value: PaymentStatus },
        id: { type: sql.Int, value: id }
    });
    res.status(200).json({ message: "Order updated successfully!" });
});

// Filter Orders by Status and Date Range
app.get("/filteredOrders", async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        let query = `SELECT 
        O.OrderID,
            O.UserID,
            U.UserName,
            O.CartID,
            O.TotalAmount,
            O.OrderDate,
            O.PaymentMethod,
            O.CouponID,
            D.ExpectedDate,
            D.OrderStatus,
            D.PaymentStatus
            FROM Orders O
            JOIN Deliveries D ON O.OrderID = D.OrderID
            JOIN Users U ON U.UserID = O.UserID
            WHERE 1 = 1`;
        // 1=1 is a trick to avoid checking if the WHERE clause is needed
        const params = {};

        if (status) {
            query += " AND D.OrderStatus = @status";
            params.status = { type: sql.VarChar, value: status };
        }
        if (startDate && endDate) {
            query += " AND O.OrderDate BETWEEN @startDate AND @endDate";
            params.startDate = { type: sql.Date, value: startDate };
            params.endDate = { type: sql.Date, value: endDate };
        }

        const result = await db.executeQuery(query, params);
        sendResponse(res, 200, result);
    } catch (error) {
        sendResponse(res, 500, "Internal Server Error");
    }
});

app.get("/viewUsers", async (req, res) => {
    try {
        const query = `
        WITH AddressRanked AS (
            SELECT 
                U.UserID,
                U.UserName,
                U.Email,
                U.DOC AS CreationDATE,
                UA.HouseNo,
                UA.StreetNo,
                UA.BlockName,
                UA.Society,
                UA.City,
                UA.Country,
                ROW_NUMBER() OVER (PARTITION BY U.UserID ORDER BY UA.AddressID) AS rn
            FROM Users U
            LEFT JOIN Users_Address UA ON U.UserID = UA.UserID
        )
        SELECT 
            UserID,
            UserName,
            Email,
            HouseNo,
            StreetNo,
            BlockName,
            Society,
            City,
            Country,
            CreationDATE
        FROM AddressRanked
        WHERE rn = 1
        ORDER BY UserID`;

        const users = await db.executeQuery(query);
        sendResponse(res, 200, users);
    } catch (error) {
        sendResponse(res, 500, "❌ Internal Server Error");
    }
});

// Analyzing Customer Order History
app.get("/previousOrders/:UserID", async (req, res) => {
    try {
        const { UserID } = req.params;

        const query = `
            SELECT O.OrderID, O.OrderDate, O.TotalAmount, O.PaymentMethod, D.OrderStatus
            FROM Orders O
            JOIN Deliveries D ON O.OrderID = D.OrderID
            WHERE O.UserID = @UserID
            ORDER BY O.OrderDate DESC`;

        const result = await db.executeQuery(query, { UserID: { type: sql.Int, value: UserID } });
        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching previous orders:", error);
        res.status(500).json({ error: "❌ Internal Server Error" });
    }
});

// Assign a Coupon Based on Order History
app.post("/addCoupon", async (req, res) => {
    try {
        const { UserID, CouponCode, DiscountPercent, ExpiryDate } = req.body;

        const query = `INSERT INTO Coupons(UserID, Code, DiscountPercent, ExpiryDate)
        VALUES(@UserID, @CouponCode, @DiscountPercent, @ExpiryDate)`;

        await db.executeQuery(query, {
            UserID: { type: sql.Int, value: UserID },
            CouponCode: { type: sql.VarChar, value: CouponCode },
            DiscountPercent: { type: sql.Int, value: DiscountPercent },  // ✅ Fixed variable name
            ExpiryDate: { type: sql.Date, value: ExpiryDate }
        });

        res.status(200).json({ message: "✅ Coupon Assigned Successfully!" });
    } catch (error) {
        console.error("Error assigning coupon:", error);  // 🔍 Log the actual error for debugging
        res.status(500).json({ error: "❌ Internal Server Error" });
    }
});

// ========================= USER APIs =========================

app.get("/Users", async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const data = pool.request().query("select * from Users");
        data.then((res1) => {
            return res.json(res1);
        });
    } catch (err) {
        console.log(err);
    }
});

//user  id creation
async function createUser(userName, password, email, contactNumbers = []) {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const pool = await sql.connect(config);

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Insert user and get UserID
        const insertUserResult = await request
            .input('UserName', sql.VarChar(25), userName)
            .input('Password', sql.NVarChar(255), hashedPassword)
            .input('Email', sql.VarChar(50), email)
            .query(`
                INSERT INTO Users (Passwords, UserName, Email)
                OUTPUT INSERTED.UserID
                VALUES (@Password, @UserName, @Email)
            `);

        const userID = insertUserResult.recordset[0].UserID;

        // Insert contact numbers if any
        for (const phone of contactNumbers) {
            await request
                .input('UserID', sql.Int, userID)
                .input('PhoneNo', sql.VarChar(15), phone)
                .query(`
                    INSERT INTO Users_Contact_Info (UserID, PhoneNo)
                    VALUES (@UserID, @PhoneNo)
                `);
        }

        await transaction.commit();

        return { success: true };
    } catch (err) {
        console.error('Error creating user:', err);
        return { success: false, error: err.message };
    } finally {
        sql.close();
    }
}

//login
async function loginUser(userName, password) {
    let pool = await sql.connect(config);
    let result = await pool.request()
        .input('UserName', sql.VarChar(25), userName)
        .query(`SELECT UserID, UserName, Email, Passwords FROM Users WHERE UserName = @UserName`);

    if (result.recordset.length === 0) { //checks if nothing in resultset
        //console.log('User not found!');
        return null;
    }

    let user = result.recordset[0]; //picks up first user from result as name is unique

    // Compare entered password with stored hash
    const isMatch = await bcrypt.compare(password, user.Passwords);//compares passwords
    if (!isMatch) {

        console.log('Incorrect password!');
        return null;
    }

    console.log('Login successful!');
    return { userID: user.UserID, userName: user.UserName, email: user.Email };
}

app.post("/register", async (req, res) => {
    const { userName, password, email, contactNumbers = [] } = req.body;

    if (
        !userName || !password || !email
    ) {
        return res.status(400).json({ error: "All required fields must be filled." });
    }

    try {
        const result = await createUser(userName, password, email, contactNumbers);

        if (result.success) {
            res.status(201).json({ message: " User created successfully!" });
        } else {
            res.status(500).json({ error: `Failed to create user: ${result.error}` });
        }
    } catch (err) {
        console.error("Error in /register route:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

//used to take input of user to login
app.post("/login", async (req, res) => {
    const { userName, password } = req.body;
    if (!userName || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }
    const user = await loginUser(userName, password);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json(user);
});

app.put("/updateUser", async (req, res) => {
    const { userName, newEmail, newPhones, password, newPassword = [] } = req.body;

    if (!userName || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    let transaction;

    try {
        const user = await loginUser(userName, password); // Authenticate user
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const userID = user.userID;
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Update Email
        if (newEmail) {
            await new sql.Request(transaction)
                .input("UserID", sql.Int, userID)
                .input("NewEmail", sql.VarChar(50), newEmail)
                .query(`UPDATE Users SET Email = @NewEmail WHERE UserID = @UserID`);
        }

        // Update Password
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await new sql.Request(transaction)
                .input("UserID", sql.Int, userID)
                .input("NewPassword", sql.NVarChar(255), hashedPassword)
                .query(`UPDATE Users SET Passwords = @NewPassword WHERE UserID = @UserID`);
        }
        // Replace phone numbers
        if (Array.isArray(newPhones) && newPhones.length > 0) {
            // Delete existing numbers
            await new sql.Request(transaction)
                .input("UserID", sql.Int, userID)
                .query(`DELETE FROM Users_Contact_Info WHERE UserID = @UserID`);

            // Insert new numbers
            for (const phone of newPhones) {
                await new sql.Request(transaction)
                    .input("UserID", sql.Int, userID)
                    .input("PhoneNo", sql.VarChar(15), phone.trim())
                    .query(`INSERT INTO Users_Contact_Info (UserID, PhoneNo) VALUES (@UserID, @PhoneNo)`);
            }
        }

        await transaction.commit();
        res.json({ message: "✅ User information updated successfully!" });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("Error updating user:", err);
        res.status(500).json({ error: "❌ Error updating user details" });
    };
});

app.get("/categories", async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT CategoryID, CategoryName FROM Categories");

        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/products", async (req, res) => {
    try {
        const { sortBy, category, search } = req.query;
        let baseQuery = `
      SELECT p.*, c.CategoryName
      FROM Products p
      JOIN Categories c ON p.CategoryID = c.CategoryID
      WHERE 1=1
    `;

        const request = sql.connect(config).then(pool => pool.request());

        if (category) {
            baseQuery += ` AND p.CategoryID = @category`;
            (await request).input("category", sql.Int, category);
        }

        if (search) {
            baseQuery += ` AND p.ProdName LIKE @search`;
            (await request).input("search", sql.VarChar, `%${search}%`);
        }

        if (sortBy === "pricelowtohigh") {
            baseQuery += " ORDER BY p.Price ASC";
        } else if (sortBy === "pricehightolow") {
            baseQuery += " ORDER BY p.Price DESC";
        } else if (sortBy === "rating") {
            baseQuery += " ORDER BY p.Stars DESC";
        } else {
            baseQuery += " ORDER BY p.ProdName ASC";
        }

        const result = await (await request).query(baseQuery);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//add to cart
app.get("/product/reviews", async (req, res) => {
    const { productID } = req.query;

    if (!productID) {
        return res.status(400).json({ error: "Product ID is required" });
    }

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input("ProductID", sql.Int, productID)
            .query(`
        SELECT r.ReviewID, r.ReviewText, r.Rating, r.ReviewDate, u.UserName 
        FROM Reviews r
        JOIN Users u ON r.UserID = u.UserID
        WHERE r.ProductID = @ProductID
        ORDER BY r.ReviewDate DESC
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "No reviews found for this product" });
        }

        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/cart/:userID", async (req, res) => {
    const { userID } = req.params;

    if (!userID) {
        return res.status(400).json({ error: "User ID is required" });
    }

    try {
        let pool = await sql.connect(config);

        // Get cart details
        let cartResult = await pool.request()
            .input("UserID", sql.Int, userID)
            .query(`
        SELECT c.CartID, ci.ProductID, p.ProdName, ci.Quantity, p.Price, (ci.Quantity * p.Price) AS TotalPrice
        FROM ShoppingCart c
        JOIN CartItems ci ON c.CartID = ci.CartID
        JOIN Products p ON ci.ProductID = p.ProductID
        WHERE c.UserID = @UserID
      `);

        if (cartResult.recordset.length === 0) {
            return res.status(404).json({ error: "Cart is empty or does not exist" });
        }

        res.json(cartResult.recordset);
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/add-to-cart", async (req, res) => {
    const { userID, productID, quantity } = req.body;

    if (!userID || !productID || !quantity) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        let pool = await sql.connect(config);

        // Check if the user has an existing cart
        let cartResult = await pool.request()
            .input("UserID", sql.Int, userID)
            .query("SELECT CartID FROM ShoppingCart WHERE UserID = @UserID");

        let cartID = cartResult.recordset.length > 0 ? cartResult.recordset[0].CartID : null;

        // If no cart exists, create one
        if (!cartID) {
            let newCart = await pool.request()
                .input("UserID", sql.Int, userID)
                .query(`
          INSERT INTO ShoppingCart(UserID, CreatedAt) 
          VALUES (@UserID, GETDATE()); 
          SELECT SCOPE_IDENTITY() AS CartID;
        `);
            cartID = newCart.recordset[0].CartID;
        }

        // Get product stock and price
        let productResult = await pool.request()
            .input("ProductID", sql.Int, productID)
            .query("SELECT I.stockQuantity, P.Price FROM Products P JOIN Inventory I ON P.ProductID = I.ProductID WHERE I.ProductID = @ProductID");

        if (productResult.recordset.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        let { Stock, Price } = productResult.recordset[0];

        if (Stock < quantity) {
            return res.status(400).json({ error: "Not enough stock available" });
        }

        // Check if product is already in cart
        let cartItemResult = await pool.request()
            .input("CartID", sql.Int, cartID)
            .input("ProductID", sql.Int, productID)
            .query("SELECT Quantity FROM CartItems WHERE CartID = @CartID AND ProductID = @ProductID");

        if (cartItemResult.recordset.length > 0) {
            // Update quantity if item exists
            await pool.request()
                .input("CartID", sql.Int, cartID)
                .input("ProductID", sql.Int, productID)
                .input("Quantity", sql.Int, quantity)
                .query("UPDATE CartItems SET Quantity = Quantity + @Quantity WHERE CartID = @CartID AND ProductID = @ProductID");
        } else {
            // Insert new cart item if not exists
            await pool.request()
                .input("CartID", sql.Int, cartID)
                .input("ProductID", sql.Int, productID)
                .input("Quantity", sql.Int, quantity)
                .query("INSERT INTO CartItems (CartID, ProductID, Quantity) VALUES (@CartID, @ProductID, @Quantity)");
        }

        // Reduce stock
        await pool.request()
            .input("ProductID", sql.Int, productID)
            .input("Quantity", sql.Int, quantity)
            .query(`
        UPDATE Inventory SET stockQuantity = stockQuantity - @Quantity WHERE ProductID = @ProductID;
    `);
        res.status(200).json({ message: "Product added to cart successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/update-cart", async (req, res) => {
    const { userID, productID, change } = req.body;

    if (!userID || !productID || change === undefined) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        let pool = await sql.connect(config);

        // Check if the cart exists
        let cartResult = await pool.request()
            .input("UserID", sql.Int, userID)
            .query("SELECT CartID FROM ShoppingCart WHERE UserID = @UserID");

        if (cartResult.recordset.length === 0) {
            return res.status(404).json({ error: "Cart not found" });
        }

        let cartID = cartResult.recordset[0].CartID;

        // Check if the product exists in the cart
        let cartItemResult = await pool.request()
            .input("CartID", sql.Int, cartID)
            .input("ProductID", sql.Int, productID)
            .query("SELECT Quantity FROM CartItems WHERE CartID = @CartID AND ProductID = @ProductID");

        if (cartItemResult.recordset.length === 0) {
            return res.status(404).json({ error: "Product not found in cart" });
        }

        let currentQuantity = cartItemResult.recordset[0].Quantity;

        // Update quantity in cart
        await pool.request()
            .input("CartID", sql.Int, cartID)
            .input("ProductID", sql.Int, productID)
            .input("Quantity", sql.Int, currentQuantity + change)
            .query("UPDATE CartItems SET Quantity = @Quantity WHERE CartID = @CartID AND ProductID = @ProductID");

        // Update stockQuantity in Inventory table (increment or decrement based on 'change')
        await pool.request()
            .input("ProductID", sql.Int, productID)
            .input("Change", sql.Int, change)
            .query(`
                UPDATE Inventory
                SET stockQuantity = stockQuantity - @Change
                WHERE ProductID = @ProductID
            `);

        res.status(200).json({ message: "Cart updated successfully and stock adjusted" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/remove-from-cart", async (req, res) => {
    const { userID, productID } = req.body;  // No need for quantity, we will remove all quantities of the product

    if (!userID || !productID) {
        return res.status(400).json({ error: "UserID and ProductID are required" });
    }

    try {
        let pool = await sql.connect(config);

        // Check if the cart exists
        let cartResult = await pool.request()
            .input("UserID", sql.Int, userID)
            .query("SELECT CartID FROM ShoppingCart WHERE UserID = @UserID");

        if (cartResult.recordset.length === 0) {
            return res.status(404).json({ error: "Cart not found" });
        }

        let cartID = cartResult.recordset[0].CartID;

        // Check if the product exists in the cart
        let cartItemResult = await pool.request()
            .input("CartID", sql.Int, cartID)
            .input("ProductID", sql.Int, productID)
            .query("SELECT Quantity FROM CartItems WHERE CartID = @CartID AND ProductID = @ProductID");

        if (cartItemResult.recordset.length === 0) {
            return res.status(404).json({ error: "Product not found in cart" });
        }

        // Remove the product from the cart completely
        await pool.request()
            .input("CartID", sql.Int, cartID)
            .input("ProductID", sql.Int, productID)
            .query("DELETE FROM CartItems WHERE CartID = @CartID AND ProductID = @ProductID");

        // Restore the stock
        let cartItemQuantity = cartItemResult.recordset[0].Quantity;
        await pool.request()
            .input("ProductID", sql.Int, productID)
            .input("Quantity", sql.Int, cartItemQuantity)
            .query(`UPDATE Inventory SET stockQuantity = stockQuantity + @Quantity WHERE ProductID = @ProductID;
                `);
        res.status(200).json({ message: "Product removed from cart successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/place-order", async (req, res) => {
    const {
        userID,
        shippingAddress,
        paymentMethod, // "CASH" or "CARD"
        cardNo,
        expDate,
        couponID
    } = req.body;

    // Destructure address fields
    const {
        streetNo,
        houseNo,
        blockName,
        society,
        city,
        country
    } = shippingAddress || {};

    // Validation
    if (!userID || !streetNo || !houseNo || !society || !city || !country || !paymentMethod) {
        return res.status(400).json({
            error: "Missing required fields: userID, address details, or payment method."
        });
    }

    if (paymentMethod === "CARD" && (!cardNo || !expDate)) {
        return res.status(400).json({
            error: "CardNo and ExpDate are required for CARD payment method"
        });
    }

    try {
        const pool = await sql.connect(config);
        const request = pool.request()
            .input("UserID", sql.Int, userID)
            .input("StreetNo", sql.Int, streetNo)
            .input("HouseNo", sql.Int, houseNo)
            .input("BlockName", sql.VarChar(10), blockName || null)
            .input("Society", sql.VarChar(50), society)
            .input("City", sql.VarChar(50), city)
            .input("Country", sql.VarChar(50), country)
            .input("PaymentMethod", sql.VarChar(5), paymentMethod)
            .input("CardNo", sql.VarChar(16), cardNo || null)
            .input("ExpDate", sql.Date, expDate || null)
            .input("CouponID", sql.Int, couponID || null);

        const result = await request.execute("PlaceOrders");

        res.status(200).json({
            message: "✅ Order placed successfully.",
            details: result.recordset
        });
    } catch (err) {
        console.error("❌ Error placing order:", err);
        res.status(400).json({
            error: err.originalError?.info?.message || err.message || "Failed to place order"
        });
    }
});

app.get("/printCoupons/:userId", async (req, res) => {
    const userId = req.params.userId;

    try {
        const result = await sql.query`SELECT * FROM Coupons WHERE UserID = ${userId}`;

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching coupons.'
        });
    }
});

app.post('/discount', async (req, res) => {
    const { totalPrice, couponId } = req.body;

    if (!totalPrice || !couponId) {
        return res.status(400).json({ message: 'Total Price and Coupon ID are required' });
    }

    try {
        const result = await sql.query`
      SELECT DiscountPercent, ExpiryDate
      FROM Coupons
      WHERE CouponID = ${couponId}
    `;

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const coupon = result.recordset[0];

        const currentDate = new Date();
        const expiryDate = new Date(coupon.ExpiryDate);

        if (currentDate > expiryDate) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        const price = parseFloat(totalPrice);
        const discount = (price * coupon.DiscountPercent) / 100;
        const discountedPrice = price - discount;

        return res.json({ discountedPrice });
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

app.post("/checkCartBeforeOrder", async (req, res) => {
    const { userID } = req.body;

    try {
        // 1. Check if the user is logged in
        if (!userID) {
            return res.status(401).json({ message: "❌ You must be logged in to place an order" });
        }

        // 2. Get cart items for the user
        let pool = await sql.connect(config);
        const cartResult = await pool.request()
            .input("userID", sql.Int, userID)
            .query(`SELECT * FROM Cart WHERE UserID = @userID`);

        // 3. Check if cart is empty
        if (cartResult.recordset.length === 0) {
            return res.status(403).json({ message: "❌ Your cart is empty. Please add at least one product." });
        }

        // Proceed with the order placement
        return res.status(200).json({ message: "✅ Cart has items. You can place the order." });

    } catch (error) {
        console.error("Error checking cart before placing order:", error);
        return res.status(500).json({ message: "❌ Internal Server Error" });
    }
});

app.post("/addReview/:productID", async (req, res) => {
    try {
        const { productID } = req.params;
        const { userID, rating, reviewText } = req.body;

        const pool = await sql.connect(config);

        // Step 1: Fetch UserName
        const userResult = await pool.request()
            .input("UserID", sql.Int, userID)
            .query(`SELECT UserName FROM Users WHERE UserID = @UserID`);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ message: "❌ User not found" });
        }

        const userName = userResult.recordset[0].UserName;

        // Step 2: Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "❌ Rating must be between 1 and 5" });
        }

        // Step 3: Insert review
        await pool.request()
            .input("UserID", sql.Int, userID)
            .input("ProductID", sql.Int, productID)
            .input("Rating", sql.Int, rating)
            .input("ReviewText", sql.VarChar, reviewText)
            .query(`
        INSERT INTO Reviews (UserID, ProductID, Rating, ReviewText)
        VALUES (@UserID, @ProductID, @Rating, @ReviewText)
      `);

        // Step 4: Find the latest eligible OrderID for this product and user
        const orderIDResult = await pool.request()
            .input("userID", sql.Int, userID)
            .input("productID", sql.Int, productID)
            .query(`
        SELECT TOP 1 oi.OrderID
        FROM Orders o
        JOIN OrderItems oi ON o.OrderID = oi.OrderID
        JOIN Deliveries d ON o.OrderID = d.OrderID
        WHERE o.UserID = @userID AND oi.ProductID = @productID AND oi.ReviewFlag = 1 AND d.OrderStatus = 'SHIPPED'
      `);

        if (orderIDResult.recordset.length > 0) {
            const orderID = orderIDResult.recordset[0].OrderID;

            // Step 5: Set ReviewFlag to 0
            await pool.request()
                .input("orderID", sql.Int, orderID)
                .input("productID", sql.Int, productID)
                .query(`
          UPDATE OrderItems
          SET ReviewFlag = 0
          WHERE OrderID = @orderID AND ProductID = @productID AND ReviewFlag = 1
        `);
        }

        return res.status(201).json({ message: "✅ Review added successfully!" });

    } catch (error) {
        console.error("Error adding review:", error);
        return res.status(500).json({ message: "❌ Internal Server Error" });
    }
});

app.post("/checkReviewEligibility", async (req, res) => {
    const { userID, productID } = req.body;

    try {
        const pool = await sql.connect(config);

        // 1. Get all order IDs for the user
        const ordersResult = await pool.request()
            .input("userID", sql.Int, userID)
            .query(`SELECT OrderID FROM Orders WHERE UserID = @userID`);

        const userOrderIDs = ordersResult.recordset.map(row => row.OrderID);

        if (userOrderIDs.length === 0) {
            return res.status(403).json({ message: "❌ No orders found for this user" });
        }

        // 2. Find an order where this product was purchased
        const orderItemsQuery = `
      SELECT OrderID FROM OrderItems 
      WHERE OrderID IN (${userOrderIDs.join(',')}) AND ProductID = @productID and ReviewFlag=1
    `;
        const orderItemsResult = await pool.request()
            .input("productID", sql.Int, productID)
            .query(orderItemsQuery);

        if (orderItemsResult.recordset.length === 0) {
            return res.status(403).json({ message: "❌ Please Order the Product to make a Review." });
        }

        const eligibleOrderID = orderItemsResult.recordset[0].OrderID;

        // 3. Check order status and ReviewFlag
        const deliveryRequest = pool.request();
        deliveryRequest.input("eligibleOrderID", sql.Int, eligibleOrderID);
        deliveryRequest.input("productID", sql.Int, productID);

        const deliveryResult = await deliveryRequest.query(`
      SELECT d.OrderStatus, oi.ReviewFlag
      FROM Deliveries d
      JOIN OrderItems oi ON d.OrderID = oi.OrderID
      WHERE d.OrderID = @eligibleOrderID AND oi.ProductID = @productID
    `);

        if (
            deliveryResult.recordset.length === 0 ||
            deliveryResult.recordset[0].OrderStatus !== 'SHIPPED'
        ) {
            return res.status(403).json({ message: "❌ Product was ordered but not yet shipped" });
        }

        if (deliveryResult.recordset[0].ReviewFlag === false) {
            return res.status(403).json({ message: "❌ Review already submitted (flag 0)" });
        }

        // ✅ Eligible
        return res.status(200).json({ message: "✅ Eligible to add review" });

    } catch (error) {
        console.error("Error checking review eligibility:", error);
        return res.status(500).json({ message: "❌ Internal Server Error" });
    }
});

app.get('/product-ratings', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT 
                ProductID,
                AVG(CAST(Rating AS FLOAT)) AS AverageRating
            FROM Reviews
            GROUP BY ProductID
        `);

        const ratingsMap = {};
        result.recordset.forEach(row => {
            ratingsMap[row.ProductID] = parseFloat(row.AverageRating.toFixed(2));
        });

        res.json({
            success: true,
            ratings: ratingsMap
        });
    } catch (err) {
        console.error("Error fetching product ratings:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch product ratings"
        });
    }
});

// Start the Server
const PORT = 3000;
app.listen(PORT, async () => {
    await db.connect();
    console.log(`🚀 Server is running on port ${PORT} !`);
});