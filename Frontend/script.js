document.addEventListener('DOMContentLoaded', function () {  // ensure DOM (html) is fully loaded before running the script

    const adminLoginForm = document.getElementById("admin-login-form");
    const signupForm = document.getElementById("signup-form");

    if (signupForm) {
        signupForm.addEventListener("submit", async function (event) {
            event.preventDefault(); // Prevent default form submission

            let formData = {
                AdminID: document.getElementById("AdminID").value,
                AdminRole: document.getElementById("AdminRole").value,
                Admin_Pass: document.getElementById("Admin_Pass").value

            };

            let messageElement = document.getElementById("message"); // Message display element

            try {
                let response = await fetch("http://localhost:3000/adminSignup", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(formData)
                });

                let result = await response.json();
                messageElement.textContent = result.message || "❌ Unexpected error occurred!";

                if (response.ok) {
                    messageElement.style.color = "green";

                    let redirectPage = "admin-dashboard.html"; // Default
                    if (formData.AdminRole === "Head") {
                        redirectPage = "admin-dashboard.html";
                    } else if (formData.AdminRole === "Products_Head") {
                        redirectPage = "productAdmin-dashboard.html";
                    } else if (formData.AdminRole === "Orders_Head") {
                        redirectPage = "orderAdmin-dashboard.html";
                    }

                    setTimeout(() => {
                        window.location.href = redirectPage;
                    }, 2000);
                } else {
                    messageElement.style.color = "red";
                }
            } catch (error) {
                console.error("Error:", error);
                messageElement.textContent = "❌ Something went wrong!";
                messageElement.style.color = "red";
            }
        });
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListener("submit", async function (e) {
            e.preventDefault(); // Prevent page reload on form submit

            const AdminID = document.getElementById("AdminID").value;
            const Admin_Pass = document.getElementById("Admin_Pass").value;
            const AdminRole = document.getElementById("AdminRole").value;

            try {
                const response = await fetch("http://localhost:3000/adminLogin", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ AdminID, Admin_Pass, AdminRole })
                });

                const data = await response.json();

                if (response.ok) {
                    alert(data.message);
                    if (data.role === "Products_Head") {
                        window.location.href = "/Frontend/productAdmin-dashboard.html";
                    } else if (data.role === "Orders_Head") {
                        window.location.href = "/Frontend/orderAdmin-dashboard.html";
                    } else if (data.role === "Head") {
                        window.location.href = "/Frontend/admin-dashboard.html";
                    } else {
                        alert("❌ Unknown role: " + data.role);
                    }
                } else {
                    alert(data.message || "❌ Something went wrong!");
                }
            } catch (error) {
                console.error("Error:", error);
                alert("❌ Network Error");
            }
        });
    }

    function hideAllSections() {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.style.display = 'none';
        });
    }

    function showSection(sectionId) {
        hideAllSections();
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';  // Show the section
        }
    }

    document.getElementById("viewProductsBtn").addEventListener("click", viewProducts);
    document.getElementById("inventoryDetailsBtn").addEventListener("click", viewInventoryDetails);
    document.getElementById("salesReportBtn").addEventListener("click", viewSalesReport);
    document.getElementById("viewAdminsBtn").addEventListener("click", viewRemoveAdmins);
    document.getElementById("allOrdersBtn").addEventListener("click", viewAllOrders);
    document.getElementById("viewUsersBtn").addEventListener("click", viewCustomers);

    // Function to display password change form
    // Show the modal when the "Change Password" button is clicked
    document.getElementById('changePasswordBtn').addEventListener('click', () => {
        document.getElementById('changePasswordModal').style.display = 'flex';
    });

    // Close the modal when the "Close" button is clicked
    document.getElementById('closeChangePasswordModalBtn').addEventListener('click', () => {
        document.getElementById('changePasswordModal').style.display = 'none';
    });

    // Handle change password form submission
    document.getElementById('changePasswordForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const AdminID = parseInt(document.getElementById('adminIDInput').value.trim(), 10)
        const previousPassword = document.getElementById('previousPasswordInput').value;
        const newPassword = document.getElementById('newPasswordInput').value;

        try {
            const response = await fetch('http://localhost:3000/changePassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    AdminID: AdminID,
                    prevPassword: previousPassword,
                    newPassword: newPassword
                })
            });

            const result = await response.json();
            alert(result.message);
            document.getElementById('changePasswordModal').style.display = 'none';
        } catch (error) {
            alert("❌ Failed to change password.");
        }
    });

    //Function to fetch and display all products
    async function viewProducts() {
        showSection('viewProductsSection');

        const response = await fetch("http://localhost:3000/productInventoryDetails");
        const data = await response.json();

        const productsList = document.getElementById("products-list");
        productsList.innerHTML = "";

        if (data.length > 0) {
            data.forEach(product => {
                const productCard = document.createElement("div");
                productCard.classList.add("product-card", "col-md-6", "col-lg-4");

                productCard.innerHTML = `
                <div class="card shadow-sm border-0 rounded-4 p-4 h-100">
                    <h4 class="text-primary fw-semibold">${product.ProdName}</h4>
                    <p><strong>Product ID:</strong> ${product.ProductID}</p>
                    <p><strong>Price:</strong> $${product.Price}</p>
                    <p><strong>Stock:</strong> ${product.stockQuantity}</p>
                    <p><strong>Rating:</strong> 
                        <span class="badge bg-warning text-dark">${product.Stars} ⭐</span>
                    </p>
                    <p><strong>Category:</strong> ${product.CategoryName}</p>
                    <p class="text-muted"><em>${product.ProdDescription}</em></p>
                </div>
            `;
                productsList.appendChild(productCard);
            });
        } else {
            productsList.innerHTML = "<p class='text-muted text-center'>No products found.</p>";
        }

        document.getElementById("products").style.display = 'block';
    }

    async function viewInventoryDetails() {
        showSection('inventoryDetailsSection');

        const response = await fetch("http://localhost:3000/productInventoryDetails");
        const data = await response.json();
        const inventoryList = document.getElementById("inventory-list");
        inventoryList.innerHTML = "";

        if (data.length > 0) {
            data.forEach(item => {
                const inventoryItem = document.createElement("div");
                inventoryItem.classList.add("inventory-item", "shadow-sm", "rounded-4", "p-4");

                const formattedDate = new Date(item.TransactionDate).toLocaleString("en-US", {
                    timeZone: "UTC",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                });
                inventoryItem.innerHTML = `
                <h4 class="item-title text-primary fw-semibold">${item.ProdName}</h4>
                <p><strong>Product ID:</strong> ${item.ProductID}</p>
                <p><strong>Transaction ID:</strong> ${item.InventoryID}</p>
                <p><strong>Transaction Type:</strong> 
                    <span class="badge ${item.TransactionType === 'ADD' ? 'bg-success' : 'bg-danger'}">${item.TransactionType}</span>
                </p>
                <p><strong>Quantity:</strong> ${item.stockQuantity}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
            `;

                inventoryList.appendChild(inventoryItem);
            });
        } else {
            inventoryList.innerHTML = "<p class='text-muted text-center'>No inventory details found.</p>";
        }

        document.getElementById("inventoryDetails").style.display = 'block';
    }

    // Function to fetch and display the monthly sales report
    async function viewSalesReport() {
        showSection('salesReportSection');

        const response = await fetch("http://localhost:3000/salesReport");
        const data = await response.json();
        const salesReport = document.getElementById("sales-report");
        salesReport.innerHTML = "";

        if (data.length > 0) {
            data.forEach(report => {
                const reportCard = document.createElement("div");
                reportCard.classList.add("report-card");

                reportCard.innerHTML = `
                <div class="card shadow-sm border-0 rounded-4 p-4">
                    <h4 class="text-success fw-semibold">${report.ProdName}</h4>
                    <p><strong>Year:</strong> ${report.Year}</p>
                    <p><strong>Month:</strong> ${report.Month}</p>
                    <p><strong>Quantity Sold:</strong> ${report.TotalQuantitySold}</p>
                    <p><strong>Total Sales:</strong> 
                        <span class="badge bg-success-subtle text-dark">$${report.TotalSales}</span>
                    </p>
                </div>
            `;
                salesReport.appendChild(reportCard);
            });
        } else {
            salesReport.innerHTML = "<p class='text-muted text-center'>No sales report available.</p>";
        }

        document.getElementById("salesReport").style.display = 'block';
    }

    async function viewRemoveAdmins() {
        showSection('viewAdminsSection');
        const adminsList = document.getElementById("admins-list");

        const response = await fetch("http://localhost:3000/viewAdmins");
        const admins = await response.json();

        adminsList.innerHTML = "";

        if (admins.length > 0) {
            admins.forEach(admin => {
                const adminCard = document.createElement("div");
                adminCard.classList.add("admin-card", "card", "shadow-sm", "border-0", "rounded-4", "p-4", "mb-3");
                adminCard.id = `admin-${admin.AdminID}`;

                adminCard.innerHTML = `
                <h4 class="text-primary">${admin.AdminRole}</h4>
                <p><strong>Admin ID:</strong> ${admin.AdminID}</p>
                <p id="status-${admin.AdminID}">Status: 
                    <span class="badge ${admin.AdminStatus === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}">
                        ${admin.AdminStatus}
                    </span>
                </p>
                <button id="toggle-btn-${admin.AdminID}" 
                class="toggle-btn ${admin.AdminStatus === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'}">
                ${admin.AdminStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>`;

                adminsList.appendChild(adminCard);

                const toggleBtn = document.getElementById(`toggle-btn-${admin.AdminID}`);
                toggleBtn.addEventListener('click', async function () {
                    const confirmAction = confirm(`Are you sure you want to ${admin.AdminStatus === 'ACTIVE' ? 'deactivate' : 'activate'} this admin?`);
                    if (confirmAction) {
                        await toggleAdminStatus(admin.AdminID);
                        viewRemoveAdmins(); // Refresh list
                    }
                });
            });
        } else {
            adminsList.innerHTML = "<p class='text-muted text-center'>No admins found.</p>";
        }

        document.getElementById("viewAdmins").style.display = 'block';
    }

    async function toggleAdminStatus(AdminID) {
        const statusElement = document.getElementById(`status-${AdminID}`);
        const buttonElement = document.getElementById(`toggle-btn-${AdminID}`);
        console.log(`Toggling status for Admin ID: ${AdminID}`);
        // Get the current status from the UI
        const currentStatus = statusElement.innerText.includes("ACTIVE") ? "ACTIVE" : "DEACTIVATED";
        const newStatus = currentStatus === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";

        const response = await fetch(`http://localhost:3000/removeAdmin/${AdminID}`, {
            method: 'PUT',
            body: JSON.stringify({ AdminStatus: newStatus }),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();


        // ✅ Update UI without reloading everything
        statusElement.innerHTML = `Status: <strong>${newStatus}</strong>`;
        buttonElement.innerText = newStatus === 'ACTIVE' ? 'Deactivate' : 'Activate';

        console.log(`✅ Admin ${AdminID} status updated to ${newStatus}`);

    }

    async function viewAllOrders() {
        showSection('allOrdersSection');
        const response = await fetch("http://localhost:3000/filteredOrders");
        const data = await response.json();
        const ordersList = document.getElementById("orders-list");
        ordersList.innerHTML = "";

        if (data.length > 0) {
            data.forEach(order => {
                const orderCard = document.createElement("div");
                orderCard.classList.add("order-card");
                const formattedDate = new Date(order.OrderDate).toLocaleString("en-US", {
                    timeZone: "UTC",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                });
                orderCard.innerHTML = `
                <div class="order-info">
                    <h3 class="order-id">🧾 Order # ${order.OrderID}</h3>
                    <p class="customer-name"><strong>Customer:</strong> ${order.UserName}</p>
                    <p class="order-status"><strong>Status:</strong> ${order.OrderStatus}</p>
                    <p class="order-total"><strong>Total Amount:</strong> $${order.TotalAmount}</p>
                    <p class="order-date"><strong>Date:</strong> ${formattedDate}</p>
                </div>
            `;

                ordersList.appendChild(orderCard);
            });
        } else {
            ordersList.innerHTML = "<p>No orders found.</p>";
        }

        document.getElementById("allOrders").style.display = 'block';
    }

    async function viewCustomers() {
        showSection('viewUsersSection');
        const response = await fetch("http://localhost:3000/viewUsers");
        const data = await response.json();
        const customersList = document.getElementById("users-list");
        customersList.innerHTML = "";

        if (data.length > 0) {
            data.forEach(customer => {
                const customerCard = document.createElement("div");
                customerCard.classList.add("customer-card");
                const formattedDate = new Date(customer.CreationDATE).toLocaleString("en-US", {
                    timeZone: "UTC",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                });
                customerCard.innerHTML = `
                <div class="customer-info">
                    <h3 class="customer-name">${customer.UserName} <span class="email">(${customer.Email})</span></h3>
                    <p><strong>Address:</strong> ${customer.HouseNo} - ${customer.StreetNo} - ${customer.BlockName} - ${customer.Society} - ${customer.City} - ${customer.Country}</p>
                    <p><strong>Account Created:</strong> ${formattedDate}</p>
                    <button class="order-history-btn" data-userid="${customer.UserID}">📦 View Order History</button>
                    <div class="order-history" id="orders-${customer.UserID}" style="display: none;"></div>
                </div>
            `;

                customersList.appendChild(customerCard);
            });

            document.querySelectorAll(".order-history-btn").forEach(button => {
                button.addEventListener("click", function () {
                    const userId = this.dataset.userid;
                    fetchOrderHistory(userId);
                });
            });

        } else {
            customersList.innerHTML = "<p>No customers found.</p>";
        }
        document.getElementById("viewUsers").style.display = "block";
    }

    async function fetchOrderHistory(userId) {
        const ordersDiv = document.getElementById(`orders-${userId}`);

        // Toggle visibility
        if (ordersDiv.style.display === "block") {
            ordersDiv.style.display = "none";
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/previousOrders/${userId}`);
            const orders = await response.json();

            ordersDiv.innerHTML = ""; // Clear previous content

            if (orders.length === 0) {
                ordersDiv.innerHTML = "<p>No previous orders found.</p>";
            } else {
                const ordersList = document.createElement("ul");
                ordersList.classList.add("orders-list");

                orders.forEach(order => {
                    const orderItem = document.createElement("li");
                    orderItem.classList.add("order-history-item");

                    const formattedDate = new Date(order.OrderDate).toLocaleString("en-US", {
                        timeZone: "UTC",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true
                    });

                    orderItem.innerHTML = `
                    <strong>Order ID:</strong> ${order.OrderID} <br>
                    <strong>Date:</strong> ${formattedDate} <br>
                    <strong>Total:</strong> $${order.TotalAmount} <br>
                    <strong>Payment:</strong> ${order.PaymentMethod} <br>
                    <strong>Status:</strong> ${order.OrderStatus}
                `;
                    ordersList.appendChild(orderItem);
                });

                ordersDiv.appendChild(ordersList);
            }

            ordersDiv.style.display = "block";
        } catch (error) {
            console.error("Error fetching order history:", error);
            ordersDiv.innerHTML = "<p>❌ Failed to load orders.</p>";
        }
    }

});