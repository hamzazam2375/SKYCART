document.addEventListener('DOMContentLoaded', function () {
    // Buttons for navigation
    document.getElementById("viewOrdersBtn").addEventListener("click", showOrdersSection);
    document.getElementById("UsersBtn").addEventListener("click", showUsersSection);

    // Sections
    const ordersSection = document.getElementById("ordersSection");
    const usersSection = document.getElementById("UsersSection");

    // Event Listener for showing orders section
    function showOrdersSection() {
        ordersSection.style.display = "block";
        usersSection.style.display = "none";
        displayOrders([]); // Empty array to test
    }

    // Event Listener for showing users section
    function showUsersSection() {
        usersSection.style.display = "block";
        ordersSection.style.display = "none";
        fetchUsers();  // Fetch users when the "View Users" button is clicked
    }

    // Function to fetch order history for a user
    async function fetchOrderHistory(userId) {
        const ordersDiv = document.getElementById(`orders-${userId}`);

        if (ordersDiv.style.display === "block") { // Toggle visibility
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

    // Fetch & Filter Orders
    document.getElementById("filterOrdersBtn").addEventListener("click", async () => {
        const status = document.getElementById("status").value;
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;

        try {
            const response = await fetch(`http://localhost:3000/filteredOrders?status=${status}&startDate=${startDate}&endDate=${endDate}`);
            const orders = await response.json();
            displayOrders(orders);
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    });

    function displayOrders(orders) {
        const ordersList = document.getElementById("ordersList");
        ordersList.innerHTML = "";
        if (orders.length === 0) {
            ordersList.innerHTML = "<p>No orders found.</p>";
            return;
        }
        orders.forEach(order => {
            // Check if OrderID is an array, and if so, use the first value
            const orderId = Array.isArray(order.OrderID) ? order.OrderID[0] : order.OrderID;
            console.log("Order ID:", orderId); // This should now show a single value

            const orderItem = document.createElement("div");
            orderItem.classList.add("order-item");

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
        <div>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Status:</strong> ${order.OrderStatus}</p>
            <p><strong>Payment:</strong> ${order.PaymentStatus}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <button class="update-order-btn" data-orderid="${orderId}">Update Order</button>
        `;

            ordersList.appendChild(orderItem);
            // Attach event listener to the button
            const updateOrderBtn = orderItem.querySelector(".update-order-btn");
            updateOrderBtn.addEventListener("click", function () {
                const orderId = this.dataset.orderid;
                console.log("Updating order:", orderId); // Check the order ID being passed
                showModal(orderId); // Show the modal with the selected order ID
            });
        });
    }

    // Show the modal
    function showModal(orderId) {
        document.getElementById('modalOrderId').value = orderId;
        document.getElementById('updateOrderModal').style.display = 'flex';
    }

    // Close the modal
    document.getElementById('cancelUpdateBtn').addEventListener('click', function () {
        document.getElementById('updateOrderModal').style.display = 'none';
    });

    // Handle form submission (update order)
    document.getElementById('updateOrderForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const orderId = document.getElementById('modalOrderId').value;
        const orderStatus = document.getElementById('modalStatus').value;
        const paymentStatus = document.getElementById('modalPayment').value;

        try {
            const response = await fetch(`http://localhost:3000/updateOrder/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ OrderStatus: orderStatus, PaymentStatus: paymentStatus })
            });

            const result = await response.json();
            alert(result.message);
            document.getElementById("filterOrdersBtn").click(); // Refresh orders after update

            // Close the modal after submission
            document.getElementById('updateOrderModal').style.display = 'none';
        } catch (error) {
            console.error("Error updating order:", error);
            alert("Failed to update order. Please try again.");
        }
    });

    // Function to fetch and display users
    async function fetchUsers() {
        const usersList = document.getElementById("usersList");

        try {
            const response = await fetch("http://localhost:3000/viewUsers");
            if (!response.ok) {
                console.error("Failed to fetch users:", response.statusText);
                return;
            }

            const users = await response.json();
            console.log("Users:", users); // Check the structure of the returned data
            usersList.innerHTML = "";

            if (users.length > 0) {
                users.forEach(user => {
                    const userItem = document.createElement("div");
                    userItem.classList.add("user-item");

                    const formattedDateTime = new Date(user.CreationDATE).toLocaleString();
                    userItem.innerHTML = `
                    <h3>${user.UserName} (${user.Email})</h3>
                    <p>Address: ${user.HouseNo} - ${user.StreetNo} - ${user.BlockName} - ${user.Society} - ${user.City} - ${user.Country}</p>
                    <p>Account Created On: ${formattedDateTime}</p>
                    <button class="order-history-btn" data-userid="${user.UserID}">Orders History</button>
                    <div class="order-history" id="orders-${user.UserID}" style="display: none;"></div>
                    <button class="assign-coupon-btn" data-userid="${user.UserID}">Assign Coupon</button>
                    <div id="couponFormSection-${user.UserID}" class="coupon-form-section" style="display: none;">
                        <h2>Assign a Coupon</h2>
                        <form id="couponForm-${user.UserID}">
                            <label for="couponCode">Coupon Code:</label>
                            <input type="text" id="couponCode-${user.UserID}" name="couponCode" placeholder="Enter Coupon Code" required>
                            <label for="discount">Discount Percentage:</label>
                            <input type="number" id="discount-${user.UserID}" name="discount" placeholder="Enter Discount Percentage" required>
                            <label for="expiryDate">Expiry Date (YYYY-MM-DD):</label>
                            <input type="date" id="expiryDate-${user.UserID}" name="expiryDate" required>
                            <button type="submit" class="assignCouponBtn">Assign Coupon</button>
                        </form>
                        <div id="couponMessage-${user.UserID}" class="coupon-message"></div>
                    </div>
                `;
                    usersList.appendChild(userItem);
                    // Event Listener for order history button
                    const orderHistoryBtn = userItem.querySelector(".order-history-btn");
                    orderHistoryBtn.addEventListener("click", function () {
                        const userId = this.dataset.userid;
                        fetchOrderHistory(userId);
                    });

                    const assignCouponBtn = userItem.querySelector(".assign-coupon-btn");
                    assignCouponBtn.addEventListener("click", function () {
                        const userId = this.dataset.userid;
                        const couponFormSection = document.getElementById(`couponFormSection-${userId}`);
                        couponFormSection.style.display = couponFormSection.style.display === "none" ? "block" : "none";
                    });

                    // Event Listener for coupon form submit
                    const couponForm = document.getElementById(`couponForm-${user.UserID}`);
                    couponForm.addEventListener("submit", function (event) {
                        event.preventDefault();
                        assignCoupon(user.UserID);
                    });
                });
            } else {
                usersList.innerHTML = "<p>No users found.</p>";
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            usersList.innerHTML = "<p>Error loading users.</p>";
        }
    }

    async function assignCoupon(userId) {
        const couponCode = document.getElementById(`couponCode-${userId}`).value;
        const discount = document.getElementById(`discount-${userId}`).value;
        const expiryDate = document.getElementById(`expiryDate-${userId}`).value;

        if (!couponCode || !discount || !expiryDate) {
            showMessage(userId, "Please fill in all fields.", "error");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/addCoupon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    UserID: userId,
                    CouponCode: couponCode,
                    DiscountPercent: parseInt(discount),
                    ExpiryDate: expiryDate
                })
            });

            const result = await response.json();

            if (result.success) {
                showMessage(userId, "Coupon added successfully!", "success");
                document.getElementById(`couponForm-${userId}`).reset(); // Reset the form
            } else {
                showMessage(userId, result.message || "Failed to add coupon. Please try again.", "error");
            }
        } catch (error) {
            console.error("Error assigning coupon:", error);
            showMessage(userId, "Error assigning coupon. Please try again.", "error");
        }
    }

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

    // Function to show success or error message
    function showMessage(userId, message, type) {
        const messageContainer = document.getElementById(`couponMessage-${userId}`);
        messageContainer.textContent = message;
        messageContainer.classList.remove("success", "error");
        messageContainer.classList.add(type);
        messageContainer.style.display = "block";

        // Hide message after 5 seconds
        setTimeout(() => {
            messageContainer.style.display = "none";
        }, 5000);
    }
});
