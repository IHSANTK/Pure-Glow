
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Products = require('../models/Products');
const Admin = require('../models/admin');
const multer =  require('multer')
const cloudinary = require('../config/cloudinary')
const upload = require('../config/multer.js');
require('dotenv').config()



const loginpage = (req, res) => {
    const token = req.cookies.admin_jwt;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.id) {
                // Token is valid, redirect to admin dashboard
                return res.redirect('/admin');
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }
    // If no token or invalid token, render login page
    res.render('admin/login');
};

const admindashbord = async (req, res) => {
    const token = req.cookies.admin_jwt;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.id) {
                // Count users where orders field is not null
                let countUsersWithOrders = await User.countDocuments({ orders: { $ne: null } });

                // Aggregate to count the total number of orders across all users
                let totalOrdersCount = await User.aggregate([
                    { 
                        $match: { orders: { $exists: true, $ne: null } } // Match documents where orders field exists and is not null
                    },
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: { $size: "$orders" } } // Sum the size of orders array for each user
                        }
                    }
                ]);
            
                    const latestOrders = await User.aggregate([
                        {
                            $match: {
                                orders: { $exists: true, $ne: null } // Filter users with non-empty orders
                            }
                        }, 
                        {
                            $unwind: "$orders" // Deconstruct the orders array
                        },
                        {
                            $project: {
                                _id: "$orders._id", // Exclude the default MongoDB ID field
                                userId: "$_id", // Include the userId for reference
                                paymentMethod: "$orders.paymentMethod",
                                orderDate: "$orders.orderDate",
                                shippingAddress: "$orders.shippingAddress",
                                products: "$orders.products"
                            }
                        },
                        {
                            $sort: { orderDate: -1 } // Sort by orderDate in descending order (latest first)
                        },
                        {
                            $limit: 10 // Limit to only the latest 10 orders
                        }
                    ]);

                    const latestOrdersforcategory = await User.aggregate([
                        {
                            $match: {
                                orders: { $exists: true, $ne: null } // Filter users with non-empty orders
                            }
                        },
                        {
                            $unwind: "$orders" // Deconstruct the orders array
                        },
                        {
                            $unwind: "$orders.products" // Deconstruct the products array within each order
                        },
                        {
                            $group: {
                                _id: "$orders.products.category", // Group by category
                                count: { $sum: 1 } // Count products for each category
                            }
                        }
                    ]);
                    
                    // Initialize an object to hold category-based order counts
                    let orderCounts = {};
                    
                    // Iterate through the latestOrdersforcategory array and assign counts to respective properties in the orderCounts object
                    latestOrdersforcategory.forEach(category => {
                        orderCounts[category._id] = category.count;
                    });
                    
                  
            console.log(orderCounts);
          

                let product = await Products.findOne();


                const count = await Products.countDocuments();

                return res.render('admin/index', { 
                    countUsersWithOrders,
                    orderCounts , // Serialize the object
                    latestOrders, 
                    totalOrdersCount: totalOrdersCount.length > 0 ? totalOrdersCount[0].totalOrders : 0,
                    productcount: count 
                });            }
        } catch (error) {
            console.error("Error:", error);
        }
    }
    // If no token or invalid token, redirect to admin login
    res.redirect('/adminlogin');
};

const logindatas = async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (admin && admin.password === password) {
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
        res.cookie('admin_jwt', token, { httpOnly: true });
        res.redirect('/admin');
    } else {
        res.redirect('/adminlogin');
    }
};

let blockuser = async (req, res) => {
    const userId = req.body.userId;
    try {
        const user = await User.findById(userId);
        if (user) {
            user.blocked = !user.blocked; // Toggle block status
            await user.save();
        }
        res.redirect('/userlist');
    } catch (error) {
        console.error('Error toggling user block status:', error);
        res.status(500).send('Error toggling user block status');
    }
}

let userslist = async (req, res) => {

   
    try {
        const data = await User.find();
        res.render('admin/customers', { data });
    } catch (error) {
        console.error('Error retrieving users:', error);
        res.status(500).send('Error retrieving users');
    }

    
 
}

let renderindexblock =(req, res) => {
    res.render('user/index');
}

let categorilist = async(req, res) => {
    try {
        // Find the admin document
        const admin = await Admin.findOne();

        // If admin document not found, send error response
        if (!admin) {
            return res.status(400).send('Admin not found');
        }

        // Extract categories array from the admin document
        const categories = admin.categories

        console.log( categories);

        // Render the categories list view with the categories data
        res.render('admin/categorie-list', { data:categories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
let categoriesadd= async(req,res)=>{ 

    res.render('admin/categories-add')

}
const updatecategory = async (req, res) => {
    try {
        const { name } = req.body;

        // Find the admin document
        let admin = await Admin.findOne();

        if (!admin) {
            return res.status(400).send('Admin not found');
        }

        // Push the new category to the categories array
        admin.categories.push({ categoryName: name });

        // Save the updated admin document
        await admin.save();

        res.redirect('/categorie-list');
    
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}; 

const categorieedit = async (req, res) => {
    try {
        // Access the ID parameter from the URL
        const id = req.params.id;

        // Find the admin document containing the category to edit
        const admin = await Admin.findOne({ 'categories._id': id });

        // If admin document not found, send error response
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        // Find the category to edit in the categories array
        const category = admin.categories.find(category => category._id == id);

        // If category not found, send error response
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        // Render the categories edit page with the category data
        res.render('admin/categories-edit', { category });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const categorieeditdatas = async (req, res) => {
    try {
        // Access the category ID from the URL
        const categoryId = req.params.id;
        // Access the new category name from the request body
        const newName = req.body.newName;

        // Find the admin document
        const admin = await Admin.findOne();

        // If admin document not found, send error response
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        // Find the category to edit in the categories array
        const category = admin.categories.find(cat => cat._id == categoryId);

        // If category not found, send error response
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        // Update the categoryName with the new name
        category.categoryName = newName;

        // Save the modified admin document
        await admin.save();

        // Redirect to the categories list page
        res.redirect('/categorie-list');
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

let deletecategorie = async (req, res) => {
    try {
      
        const categoryId= req.params.id;
       
        const category = await Admin.findOneAndUpdate(
            { 'categories._id': categoryId }, 
            { $pull: { categories: { _id: categoryId } } }, 
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.redirect('/categorie-list')
       
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
const productlist = async (req, res) => {
    try {
        // Find all products from the Products collection
        const products = await Products.find();

        // Pagination logic
        const page = parseInt(req.query.page) || 1; // Get page number from query parameter or default to 1
        const ITEMS_PER_PAGE = 9; // Number of products to display per page
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = page * ITEMS_PER_PAGE;
        const totalProducts = products.length;
        const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

        // Slice products array to get products for the current page
        const productsForPage = products.slice(startIndex, endIndex);

        // Render the product grid list page with the products for the current page
        res.render('admin/product-grid', { products: productsForPage, totalPages, currentPage: page });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).render('error', { errorMessage: "Internal Server Error" });
    }
};
 
 let productadd = async(req,res)=>{
 
    let data = await Admin.findOne();

    let category = data.categories
  
      res.render('admin/product-add',{category});
 
 }
 const AddProductlist = async (req, res) => {
    const imageData = req.files || [];
    const productData = req.body;

    try {
        const { ProductName, Price, description, Category } = productData;
        const imageUrls = [];

        // Upload images to cloudinary and get secure URLs
        for (const file of imageData) {
            const result = await cloudinary.uploader.upload(file.path);
            imageUrls.push(result.secure_url);
        }

        // Create a new product object
        const newProduct = new Products({
            productName: ProductName,
            productPrice: Price,
            description: description,
            category: Category,
            image: imageUrls,
            addedAt: new Date() // Set the addedAt field to current time
        });

        // Save the new product document
        await newProduct.save();

        // Redirect to the product list page
        res.redirect('/product-list');
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const productedit = async (req, res) => {
    try {
        // Access the product ID from the URL
        const id = req.params.id;

        // Find the product document by its ID
        const product = await Products.findById(id);

        // If product document not found, send error response
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Render the product edit page with the product details
        res.render('admin/product-edit', { data: product });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
   
const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { ProductName, Price, description, category } = req.body;
        const imageData = req.files || [];

        let updateFields = {
            'productName': ProductName,
            'productPrice': Price,
            'description': description,
            'category': category
        };

        // If new images are uploaded, upload them to Cloudinary and update image URLs
        if (imageData.length > 0) {
            let imageUrls = [];
            for (const file of imageData) {
                const result = await cloudinary.uploader.upload(file.path);
                imageUrls.push(result.secure_url);
            }
            updateFields['image'] = imageUrls;
        }

        // Update product details
        const product = await Products.findByIdAndUpdate(
            productId, // Find document by ID
            updateFields, // Update with new data
            { new: true } // Return the updated document
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.redirect('/product-list');
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const deleteproduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // Find the product by its _id and delete it
        const product = await Products.findByIdAndDelete(productId);

        // Check if product exists
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.redirect('/product-list');
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};



const productdisable = async (req, res) => {
    try {
        const productId = req.params.id;
        console.log(productId);
        // Find the product document containing the product with the given productId
        const product = await Products.findOne({ '_id': productId });

        console.log(product);

        if (product) {
                product.disable = !product.disable;
                // Save the changes to the database
                await product.save();
                return res.status(200).json({ message: "Product disabled status updated successfully" });
          
        } else {
            return res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};


const adminprofile =(req,res)=>{
       
 res.render('admin/admin-profile')
  

}

const productdetiel = async (req, res) => {
    try {
        let productId = req.params.id;
        let product = await Products.findOne({ '_id': productId });

        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('admin/product-detail', { product}); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

const orderslist = async (req, res) => {  
    try {
        const usersWithOrders = await User.aggregate([
            {
                $match: {
                    orders: { $exists: true, $ne: null } // Filter users with non-empty orders
                }
            }, 
            {
                $unwind: "$orders" // Deconstruct the orders array
            },
            {
                $project: {
                    _id: "$orders._id", // Exclude the default MongoDB ID field
                    userId: "$_id", // Include the userId for reference
                    paymentMethod: "$orders.paymentMethod",
                    orderDate: "$orders.orderDate",
                    shippingAddress: "$orders.shippingAddress",
                    products: "$orders.products"
                }
            }
        ]);

        // console.log(usersWithOrders);

        res.render('admin/order-list', { orders: usersWithOrders }); // Pass orders as a variable to the template
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
}

const orederstatus = async (req, res) => {
    try {
        console.log("hi");

        // Extract order ID, product ID, and new status from request parameters and body
        const { orderId, productId, newStatus } = req.body;
        console.log("orderid", orderId, "productid", productId, newStatus);

        // Find the user based on the order ID
        const user = await User.findOne({ 'orders._id': orderId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find the order within the user's orders array based on order ID
        const order = user.orders.find(order => order._id.toString() === orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
 
        // Find the product within the order based on product ID
        const product = order.products.find(product => product._id.toString() === productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found in order' });
        } 

        // Update the order status for the specific product
        product.orderStatus = newStatus;

        // Save the updated user document
        await user.save();

        // Redirect to the orders list page
        res.redirect('/orederslist');

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};




const adminlogout = (req, res) => {
    res.clearCookie('admin_jwt'); // Clear the JWT token stored in cookies
    res.redirect('/adminlogin');
};

module.exports={
    loginpage,
    admindashbord,
    logindatas,
    blockuser,
    userslist,
    renderindexblock,
    categorilist,
    categoriesadd,
    updatecategory,
    categorieedit,
    categorieeditdatas, 
    deletecategorie,
    productlist,
    productadd,
    AddProductlist,
    productedit,
    updateProduct,
    deleteproduct,
    productdisable,
    adminprofile,
    productdetiel,
    orderslist,
    orederstatus,
    adminlogout,
    
}