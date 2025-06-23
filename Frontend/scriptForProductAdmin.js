document.addEventListener('DOMContentLoaded', function () {
    const productsSection = document.getElementById("productsSection");

    document.getElementById("viewProductsBtn").addEventListener("click", () => {
        productsSection.style.display = "block";
        fetchProducts();
    });

    async function fetchProducts() {
        const productsList = document.getElementById("productsList");
        try {
            const response = await fetch("http://localhost:3000/productInventoryDetails");
            const products = await response.json();
            displayProducts(products);
        } catch (error) {
            console.error("Error fetching products:", error);
            productsList.innerHTML = "<p>❌ Failed to load products.</p>";
        }
    }

    function displayProducts(products) {
        const productsList = document.getElementById("productsList");
        productsList.innerHTML = "";

        if (products.length === 0) {
            productsList.innerHTML = "<p>No products found.</p>";
            return;
        }

        products.forEach(product => {
            const productItem = document.createElement("div");
            productItem.classList.add("product-item");

            productItem.innerHTML = `
                <div>
                    <h4>${product.ProdName}</h4>
                    <p><strong>Price:</strong> $${product.Price}</p>
                    <p><strong>Description:</strong> ${product.ProdDescription}</p>
                    <p><strong>Category:</strong> ${product.CategoryName}</p>
                    <p><strong>Stock Quantity:</strong> ${product.stockQuantity}</p>
                </div>
                <div class="product-actions">
                    <button class="update-btn" data-productid="${product.ProductID}">Update</button>
                    <button class="delete-btn" data-productid="${product.ProductID}">Delete</button>
                    <button class="updateInventory-btn" data-productid="${product.ProductID}">Update Inventory</button>
                    <button class="reviews-btn" data-productid="${product.ProductID}">Reviews</button>
                </div>
            `;

            productsList.appendChild(productItem);

            productItem.querySelector(".update-btn").addEventListener("click", () => {
                showUpdateProductModal(product.ProductID, product);
            });

            productItem.querySelector(".delete-btn").addEventListener("click", () => {
                deleteProduct(product.ProductID);
            });

            productItem.querySelector(".updateInventory-btn").addEventListener("click", () => {
                showUpdateInventoryModal(product.ProductID);
            });

            productItem.querySelector(".reviews-btn").addEventListener("click", () => {
                showReviewsModal(product.ProductID);
            });
        });
    }

    function showUpdateProductModal(productId, product) {
        document.getElementById('modalProductId').value = productId;
        document.getElementById('modalProdName').value = product.ProdName;
        document.getElementById('modalPrice').value = product.Price;
        document.getElementById('modalDescription').value = product.ProdDescription;
        document.getElementById('modalCategory').value = product.CategoryID;

        const productModal = document.getElementById('updateProductModal');
        productModal.style.display = 'flex';

        productModal.addEventListener('click', function (e) {
            if (e.target === productModal) {
                productModal.style.display = 'none';
            }
        });
    }

    document.getElementById('updateProductForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const productId = document.getElementById('modalProductId').value;
        const productName = document.getElementById('modalProdName').value;
        const price = parseFloat(document.getElementById('modalPrice').value);
        const description = document.getElementById('modalDescription').value;
        const categoryID = parseInt(document.getElementById('modalCategory').value);

        const response = await fetch(`http://localhost:3000/updateProduct/${productId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ProdName: productName,
                Price: price,
                ProdDescription: description,
                CategoryID: categoryID
            })
        });

        const result = await response.json();
        showMessage("Product updated successfully!", "success");
        fetchProducts();
        document.getElementById('updateProductModal').style.display = 'none';
    });

    async function deleteProduct(productId) {
        try {
            const response = await fetch(`http://localhost:3000/deleteProduct/${productId}`, {
                method: "DELETE"
            });

            const result = await response.json();

            if (result.success) {
                showMessage("Product deleted successfully!", "success");
                fetchProducts();
            } else {
                showMessage(result.error || "Error deleting product.", "error");
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            showMessage("Error deleting product. Please try again.", "error");
        }
    }

    document.getElementById('addProductBtn').addEventListener('click', () => {
        const addProductModal = document.getElementById('addProductModal');
        addProductModal.style.display = 'flex';

        addProductModal.addEventListener('click', function (e) {
            if (e.target === addProductModal) {
                addProductModal.style.display = 'none';
            }
        });
    });

    document.getElementById('addProductForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const prodName = document.getElementById('prodName').value;
        const categoryID = parseInt(document.getElementById('categoryID').value); // selected category ID
        const supplierID = parseInt(document.getElementById('supplierID').value); // selected supplier ID
        const price = parseFloat(document.getElementById('price').value);
        const stock = parseInt(document.getElementById('stock').value);
        const prodDescription = document.getElementById('prodDescription').value;

        // Validate inputs
        if (!prodName || !categoryID || !supplierID || !price || !stock || !prodDescription) {
            return alert("❌ All fields are required");
        }
        if (stock <= 0) {
            return alert("❌ Stock must be positive");
        }
        if (price <= 0) {
            return alert("❌ Price must be positive");
        }

        try {
            const response = await fetch('http://localhost:3000/addProduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ProdName: prodName,
                    CategoryID: categoryID,
                    SupplierID: supplierID,
                    Price: price,
                    Stock: stock,
                    ProdDescription: prodDescription
                })
            });

            const result = await response.json();
            if (response.status === 201) {
                alert(result.message);
                fetchProducts(); // Refresh the products list after adding
                document.getElementById('addProductModal').style.display = 'none'; // Close the modal
            } else {
                alert(result.error || "❌ Failed to add product");
            }
        } catch (error) {
            console.error("Error adding product:", error);
            alert("❌ Error adding product");
        }
    });

    document.getElementById("categoryBtn").addEventListener("click", async () => {
        const categoryList = document.getElementById("categoryList");
        categoryList.style.display = categoryList.style.display === "none" ? "block" : "none";

        if (categoryList.children.length === 0) {
            const res = await fetch("http://localhost:3000/categories"); // Your API endpoint
            const categories = await res.json();
            categories.forEach(cat => {
                const li = document.createElement("li");
                li.textContent = `${cat.CategoryID} - ${cat.CategoryName}`;
                li.addEventListener("click", () => {
                    document.getElementById("categoryID").value = cat.CategoryID;
                    categoryList.style.display = "none";
                });
                categoryList.appendChild(li);
            });
        }
    });

    document.getElementById("supplierBtn").addEventListener("click", async () => {
        const supplierList = document.getElementById("supplierList");
        supplierList.style.display = supplierList.style.display === "none" ? "block" : "none";

        if (supplierList.children.length === 0) {
            const res = await fetch("http://localhost:3000/suppliers"); // Your API endpoint
            const suppliers = await res.json();
            suppliers.forEach(sup => {
                const li = document.createElement("li");
                li.textContent = `ID: ${sup.SupplierID} | Name: ${sup.SupplierName}`;
                li.addEventListener("click", () => {
                    document.getElementById("supplierID").value = sup.SupplierID;
                    supplierList.style.display = "none";
                });
                supplierList.appendChild(li);
            });
        }
    });

    function showUpdateInventoryModal(productId) {
        const inventoryModal = document.getElementById('updateInventoryModal');
        inventoryModal.style.display = 'flex';

        // Close modal when clicking outside
        inventoryModal.addEventListener('click', function (e) {
            if (e.target === inventoryModal) {
                inventoryModal.style.display = 'none';
            }
        });

        // Add the form submit event listener
        document.getElementById('updateInventoryForm').addEventListener('submit', async function (e) {

            const changeQuantity = document.getElementById('changeQuantity').value;
            const transactionType = document.getElementById('transactionType').value;  // "ADD" or "REMOVE"

            try {
                const response = await fetch(`http://localhost:3000/updateInventory/${productId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ changeQuantity, transactionType })
                });

                const result = await response.json();

                // Display success message in the message box
                showMessage(result.message, "success");
                inventoryModal.style.display = 'none';
                fetchProducts();

            } catch (error) {
                console.error("Error updating inventory:", error);
                showMessage("Error updating inventory. Please try again.", "error");
            }
        });
    }

    async function showReviewsModal(productId) {
        const reviewsModal = document.getElementById('reviewsModal');
        const reviewsContent = document.getElementById('reviewsContent');

        reviewsModal.style.display = 'flex';
        reviewsContent.innerHTML = 'Loading reviews...';

        reviewsModal.addEventListener('click', function (e) {
            if (e.target === reviewsModal) {
                reviewsModal.style.display = 'none';
            }
        });

        try {
            const response = await fetch(`http://localhost:3000/productWithReviews/${productId}`);
            if (!response.ok) throw new Error("❌ Failed to fetch reviews");

            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) {
                reviewsContent.innerHTML = `<p>No reviews available for this product.</p>`;
                return;
            }
            reviewsContent.innerHTML = ''; // clear old stuff

            data.forEach(review => {
                const reviewDiv = document.createElement('div');
                reviewDiv.style.borderBottom = '1px solid #ccc';
                reviewDiv.style.padding = '10px 0';
                reviewDiv.innerHTML = `
                <p><strong>Rating:</strong> ${review.Rating ?? 'N/A'} ⭐</p>
                <p><strong>Review:</strong> ${review.ReviewText ?? 'No review provided'}</p>
                <p><strong>Review Date:</strong> ${review.ReviewDate ? new Date(review.ReviewDate).toLocaleDateString() : 'N/A'}</p>
            `;
                reviewsContent.appendChild(reviewDiv);
            });

            // Add Change Supplier button
            const changeBtn = document.createElement('button');
            changeBtn.textContent = 'Change Supplier';
            changeBtn.classList.add('change-supplier-btn');
            changeBtn.onclick = () => openChangeSupplierForm(productId);
            reviewsContent.appendChild(changeBtn);

        } catch (err) {
            console.error(err);
            reviewsContent.innerHTML = `<p>Error loading reviews: ${err.message}</p>`;
        }
    }

    async function openChangeSupplierForm(productId) {
        try {
            const response = await fetch(`http://localhost:3000/productSuppliers/${productId}`);
            const supplierData = await response.json();

            if (response.ok && supplierData.length > 0) {
                // Group contact numbers and consolidate data for each supplier (if needed)
                const supplierMap = {};

                for (const row of supplierData) {
                    const id = row.SupplierID;
                    if (!supplierMap[id]) {
                        supplierMap[id] = {
                            ...row,
                            ContactNumbers: []
                        };
                    }
                    if (row.PhoneNo && !supplierMap[id].ContactNumbers.includes(row.PhoneNo)) {
                        supplierMap[id].ContactNumbers.push(row.PhoneNo);
                    }
                }

                // Assuming you want to work with the first supplier
                const supplier = Object.values(supplierMap)[0];

                // Populate form fields
                document.getElementById('productId').value = productId;
                document.getElementById('supplierName').value = supplier.SupplierName || '';
                document.getElementById('buildingName').value = supplier.BuildingName || '';
                document.getElementById('streetNo').value = supplier.StreetNo || '';
                document.getElementById('industrialArea').value = supplier.IndustrialArea || '';
                document.getElementById('city').value = supplier.City || '';
                document.getElementById('country').value = supplier.Country || '';
                document.getElementById('postalCode').value = supplier.PostalCode || '';
                document.getElementById('supplierContact').value = supplier.ContactNumbers.join(', ');

                // Show modal
                const modal = document.getElementById('changeSupplierModal');
                modal.style.display = 'flex';

                // Close modal on outside click
                modal.addEventListener('click', function (event) {
                    if (event.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            } else {
                alert("No supplier data found for this product.");
            }
        } catch (error) {
            console.error("Error fetching supplier data:", error);
            alert("An error occurred while fetching supplier data.");
        }
    }

    document.getElementById('changeSupplierForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const productId = document.getElementById('productId').value;
        const supplierName = document.getElementById('supplierName').value.trim();
        const supplierContact = document.getElementById('supplierContact').value.trim();

        // Structured address fields
        const buildingName = document.getElementById('buildingName').value.trim();
        const streetNo = parseInt(document.getElementById('streetNo').value);
        const industrialArea = document.getElementById('industrialArea').value.trim();
        const city = document.getElementById('city').value.trim();
        const country = document.getElementById('country').value.trim();
        const postalCode = document.getElementById('postalCode').value.trim();

        const data = {
            supplierName,
            supplierContact,
            address: {
                buildingName,
                streetNo,
                industrialArea,
                city,
                country,
                postalCode
            }
        };

        try {
            const response = await fetch(`http://localhost:3000/changeSupplier/${productId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const successMessageElement = document.getElementById('successMessage');

            if (response.ok) {
                successMessageElement.textContent = "Supplier updated successfully!";
                successMessageElement.classList.add('show');
                document.getElementById('changeSupplierModal').style.display = 'none';

                setTimeout(() => {
                    successMessageElement.classList.remove('show');
                }, 3000);
            } else {
                successMessageElement.textContent = "Failed to update supplier.";
                successMessageElement.style.backgroundColor = '#dc3545';
                successMessageElement.classList.add('show');

                setTimeout(() => {
                    successMessageElement.classList.remove('show');
                }, 3000);
            }
        } catch (error) {
            console.error("Error updating supplier:", error);
            const successMessageElement = document.getElementById('successMessage');
            successMessageElement.textContent = "An error occurred while updating the supplier.";
            successMessageElement.style.backgroundColor = '#dc3545';
            successMessageElement.classList.add('show');

            setTimeout(() => {
                successMessageElement.classList.remove('show');
            }, 3000);
        }
    });

    function showMessage(message, type) {
        const messageBox = document.getElementById('inventoryMessage');
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`;
        messageBox.style.display = 'block';  // Show the message
    }

    function showMessage(message, type) {
        const messageBox = document.getElementById('productMessage');
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`;
        messageBox.style.display = 'block';
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

    document.getElementById("addSupplierBtn").addEventListener("click", () => {
        document.getElementById("addSupplierModal").style.display = "block";
    });

    // Close Modal when clicking outside of it
    document.getElementById("addSupplierModal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("addSupplierModal")) {
            document.getElementById("addSupplierModal").style.display = "none";
        }
    });

    // Submit Supplier Form
    document.getElementById("addSupplierForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("supplierNameInput").value.trim();
        const buildingName = document.getElementById("buildingNameInput").value.trim();
        const streetNo = parseInt(document.getElementById("streetNoInput").value.trim(), 10);
        const industrialArea = document.getElementById("industrialAreaInput").value.trim();
        const city = document.getElementById("cityInput").value.trim();
        const country = document.getElementById("countryInput").value.trim();
        const postalCode = document.getElementById("postalCodeInput").value.trim();
        const contactsRaw = document.getElementById("supplierContactInput").value.trim(); // e.g., "03001234567,0213876543"

        const contactNumbers = contactsRaw.split(",").map(c => c.trim()).filter(c => c);

        const statusMsg = document.getElementById("statusMsg");

        if (!name || !streetNo || !city || !country || contactNumbers.length === 0) {
            statusMsg.innerText = "❌ Please fill in all required fields.";
            statusMsg.style.color = "red";
            statusMsg.classList.add('show');
            return;
        }

        const supplierData = {
            SupplierName: name,
            Address: {
                BuildingName: buildingName || null,
                StreetNo: streetNo,
                IndustrialArea: industrialArea || null,
                City: city,
                Country: country,
                PostalCode: postalCode || null
            },
            ContactNumbers: contactNumbers
        };

        try {
            const response = await fetch("http://localhost:3000/addSupplier", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(supplierData)
            });

            const result = await response.json();

            if (response.status === 201) {
                alert(result.message);
                document.getElementById("addSupplierModal").style.display = "none";
            } else {
                alert(result.message || "❌ Failed to add Supplier. Supplier may already exist.");
            }
        } catch (error) {
            console.error("Error adding supplier:", error);
            alert("❌ Failed to add Supplier");
        }
    });

});
