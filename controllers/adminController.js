const Product = require("../models/Product");
const Order = require("../models/Order");

const showDashboard = (req,res)=>{
    let period = req.query.period || "daily";

    if(period !== "daily" && period !== "weekly" && period !== "monthly"){
        period = "daily";
    }

    const now = new Date();
    let startDate = new Date(now);

    if(period === "daily"){
        startDate.setHours(0,0,0,0);
    }else if(period === "weekly"){
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0,0,0,0);
    }else{
        startDate = new Date(now.getFullYear(),now.getMonth(),1);
    }

    const dateRange = {
        $gte: startDate,
        $lte: now
    };

    Order.find({
        paymentStatus: "paid",
        $or: [
            { paidAt: dateRange },
            { paidAt: null, updatedAt: dateRange }
        ]
    }).then((orders)=>{
            let salesTotal = 0;
            const categorySales = [];

            orders.forEach((order)=>{
                salesTotal = salesTotal + order.totalAmount;

                order.items.forEach((item)=>{
                    const categoryName = item.category || "Uncategorized";
                    const itemTotal = item.price * item.quantity;
                    let foundCategory = null;

                    categorySales.forEach((category)=>{
                        if(category.name === categoryName){
                            foundCategory = category;
                        }
                    });

                    if(foundCategory){
                        foundCategory.total = foundCategory.total + itemTotal;
                        foundCategory.quantity = foundCategory.quantity + item.quantity;
                    }else{
                        categorySales.push({
                            name: categoryName,
                            total: itemTotal,
                            quantity: item.quantity
                        });
                    }
                });
            });

            return Product.find()
                .then((products)=>{
                    const categoryStock = [];

                    products.forEach((product)=>{
                        let foundCategory = null;

                        categoryStock.forEach((category)=>{
                            if(category.name === product.category){
                                foundCategory = category;
                            }
                        });

                        if(foundCategory){
                            foundCategory.productCount = foundCategory.productCount + 1;
                            foundCategory.stock = foundCategory.stock + (product.stock || 0);
                        }else{
                            categoryStock.push({
                                name: product.category,
                                productCount: 1,
                                stock: product.stock || 0
                            });
                        }
                    });

                    res.render("admin-dashboard",{
                        isLoggedIn: req.isLoggedIn,
                        period: period,
                        salesTotal: salesTotal,
                        paidOrderCount: orders.length,
                        categorySales: categorySales,
                        categoryStock: categoryStock
                    });
                });
        })
        .catch((error)=>{
            console.log("Admin dashboard error:",error.message);
            res.status(500).send("Could not load the admin dashboard.");
        });
};

const showAddProduct = (req,res)=>{
    res.render("admin-add-product",{
        isLoggedIn: req.isLoggedIn,
        message: ""
    });
};

const addProduct = (req,res)=>{
    const name =req.body.name.trim();
    const image =req.body.image.trim();
    const description =req.body.description.trim();
    const category =req.body.category.trim();
    const price = Number(req.body.price);
    const stock = Number(req.body.stock);


    const product = new Product({
        name: name,
        image: image,
        description: description,
        price: price,
        category: category,
        stock: stock
    });

    product.save()
        .then(()=>{
            res.redirect("/admin");
        })
        .catch((error)=>{
            console.log("Product save error:",error.message);
            res.status(500).send("Could not add product.");
        });
};

module.exports = {
    showDashboard,
    showAddProduct,
    addProduct
};
