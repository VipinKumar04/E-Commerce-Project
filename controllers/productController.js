const Product = require("../models/Product");

const homePage = (req,res)=>{
    res.render("home",{
        isLoggedIn: req.isLoggedIn
    });
};

const getProducts = (req,res)=>{
    const cursor = req.query.cursor;
    const productsPerLoad = 8;
    const query = {};

    if(cursor){
        query._id={$gt: cursor};
    }

    Product.find(query)
        .sort({ _id: 1 })
        .limit(productsPerLoad + 1)
        .then((products)=>{
            const hasMore = products.length > productsPerLoad;

            if(hasMore){
                products.pop();
            }

            let nextCursor = null;

            products.forEach((product)=>{
                nextCursor = product._id;
            });

            res.status(200).json({
                success: true,
                products: products,
                nextCursor: hasMore ? nextCursor : null,
                hasMore: hasMore
            });
        })
        .catch((error)=>{
            console.log("Error fetching products:",error.message);

            res.status(500).json({
                success: false,
                message: "Failed to fetch products"
            });
        });
};

const productDetails = (req,res)=>{
    Product.findById(req.params.id)
        .then((product)=>{
            if(!product){
                return res.status(404).render("product-details",{
                    product: null,
                    isLoggedIn: req.isLoggedIn
                });
            }

            res.render("product-details",{
                product: product,
                isLoggedIn: req.isLoggedIn
            });
        })
        .catch((error)=>{
            console.log("Error fetching product:",error.message);

            res.status(400).render("product-details",{
                product: null,
                isLoggedIn: req.isLoggedIn
            });
        });
};

module.exports={
    homePage,
    getProducts,
    productDetails
};
